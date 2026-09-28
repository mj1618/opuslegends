/**
 * BIG JIM — the boss rig (DESIGN §6.1, act3_plan "Big Jim rig"). Not a health bar: level geometry + spectacle.
 *
 *   drawBigJim(g, x, y, s, st)   (x, y) = the middle of his seat (where the pear meets the throne), s = scale
 *                                (1 = ~1150 px from seat to pompadour). Draw inside any transform (layer / world).
 *
 * Look: a huge pear-shaped mass in FIG VELVET (nap sheen, rim light from the scene), flared satin lapels (the ledges
 * of the gauntlet), an open cream shirt with a chest rug and a GOLD CHAIN of medallions, curtain-like bell sleeves
 * with gold braid cuffs, fists like anvils with DANGER-RED knuckle rings, a slick black pompadour with a skunk streak,
 * mutton chops, a horseshoe moustache, a cigar, and the MIRRORED AVIATORS — chrome teardrops that reflect the sky and a
 * tiny TANGERINE SLIM that grows as you climb (st.reflect). Each lens has 3 crack stages (0 intact, 1 spider-cracked,
 * 2 shattered: his tiny, very worried eye shows through).
 *
 * Poses (all 0..1, blendable, pure functions of the params so rewinds are exact):
 *   bluff   the BLUFF DISPLAY: arms flung wide and up, sleeves flaring like curtains, lenses blazing, mouth roaring
 *   roar    mouth open (independent: roar on the held B, shock rings)
 *   reel    recoil after a lens crack: head snaps back + tilts, body sways
 *   fists   per-arm fist targets (local coords, relative to (x, y) at s = 1) — two-bone IK reaches them; the fists
 *           are drawn with `drawJimFist` so the play layer can draw the same fist as a slam platform
 *   lift    per-arm fist lift (0 slammed .. 1 raised) when no target is given
 *
 * Also exported: drawJimFist (slam-platform skin), drawJimLens (the lens breakable skin), drawThrone (stacked pool
 * tables), drawJimBust (the gold bust breakable), JIM (palette).
 */
import type { Ctx } from '../core/canvas';
import { css, hex, mix, type RGB } from '../core/color';
import { drawGlow, star4 } from '../core/draw';
import { TAU, clamp01, easeOut, hash } from '../core/math';
import { CF } from '../palette';
import type { Lighting } from '../world/lighting';

export const JIM = {
  fig: '#5E2B4E',
  velvet: '#8A4A76',
  sheen: '#B07AA0',
  shadow: '#2E1428',
  deep: '#1E0C1A',
  lapel: '#4A1E3E',
  satin: '#C08AB4',
  shirt: '#F2E2D4',
  shirtShade: '#C9AFA0',
  skin: '#D8957E',
  skinShade: '#A8664F',
  skinHi: '#EDB9A2',
  hair: '#141018',
  hairHi: '#4A4458',
  streak: '#E8E2EA',
  chrome: '#C9D3DA',
  chromeDark: '#6A7682',
  gold: '#E0B64A',
  goldHi: '#FFE08A',
  goldDark: '#8A6A1E',
  red: '#B3201B',
  hot: '#FF4A3D',
  ink: '#1A1410',
} as const;

const INK = JIM.ink;

export interface BigJimState {
  time: number;
  /** float beat (breathing / chain sway / cigar puffs on the beat) */
  beat: number;
  /** 0..1 bluff display */
  bluff?: number;
  /** 0..1 roar (mouth open + shock rings) */
  roar?: number;
  /** 0..1 recoil after a crack */
  reel?: number;
  /** -1..1 which way the reel tilts his head */
  reelDir?: number;
  /** lens crack stages [left, right]: 0 intact, 1 cracked, 2 shattered */
  crack?: [number, number];
  /** seconds since each lens last cracked (flash / shards), NaN = never */
  crackT?: [number, number];
  /** 0..1 tiny tangerine Slim in the lenses (grows as you climb) */
  reflect?: number;
  /** where Slim's reflection sits in the lens (-1..1 across) */
  reflectX?: number;
  /** fist targets in local coords (s = 1), null = rest pose */
  fists?: [{ x: number; y: number } | null, { x: number; y: number } | null];
  /** the play layer draws this fist itself (a slam platform): the rig stops at the cuff */
  fistHidden?: [boolean, boolean];
  /** per-arm lift when resting (0 down .. 1 up) */
  lift?: [number, number];
  /** head offset (local px) — he leans to glare at the hero */
  lean?: { x: number; y: number };
  /** seconds since the chain snapped (NaN = intact) */
  chainT?: number;
  /** 0..1 lens blaze (flash on the beat in the reveal) */
  blaze?: number;
  /** 0..1 how shrunk / defeated (finale: pounding his film frame) */
  panic?: number;
  /** scene light (rim + sky reflected in the chrome) */
  light?: Lighting;
  /** draw the throne of stacked pool tables under him */
  throne?: boolean;
  /** simplified (tiny / far) — skips nap texture + smoke */
  lod?: number;
}

// ------------------------------------------------------------------ helpers

function ink(g: Ctx, fill: string | CanvasGradient, w = 4): void {
  g.lineJoin = 'round';
  g.lineCap = 'round';
  g.lineWidth = w * 2;
  g.strokeStyle = INK;
  g.stroke();
  g.fillStyle = fill;
  g.fill();
}

const rgb = (c: string): RGB => hex(c);

function rimCol(L: Lighting | undefined, a: number): string {
  if (!L) return `rgba(255,233,194,${a})`;
  return css(mix(L.rim, [255, 255, 255], 0.2), a * (0.4 + 0.6 * L.rimAmt));
}

/** two-bone IK: returns the elbow for shoulder S reaching T with lengths a, b; `side` picks the bend */
function ik(sx: number, sy: number, tx: number, ty: number, a: number, b: number, side: number): { ex: number; ey: number; tx: number; ty: number } {
  let dx = tx - sx;
  let dy = ty - sy;
  let d = Math.hypot(dx, dy);
  // rubber-hose: out of reach, the arm STRETCHES (up to 2.4x) — he reaches the play band whatever the framing
  const st = Math.min(2.4, Math.max(1, d / ((a + b) * 0.97)));
  a *= st;
  b *= st;
  const max = (a + b) * 0.995;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  d = Math.max(d, Math.abs(a - b) + 1);
  const ca = (a * a + d * d - b * b) / (2 * a * d);
  const ang = Math.atan2(dy, dx) + side * Math.acos(Math.max(-1, Math.min(1, ca)));
  return { ex: sx + Math.cos(ang) * a, ey: sy + Math.sin(ang) * a, tx: sx + dx, ty: sy + dy };
}

// ------------------------------------------------------------------ the rig

const SHOULDER = { x: 450, y: -715 };
const UPPER = 330;
const FORE = 320;
const HEAD = { x: 0, y: -1100 };
const HEAD_K = 1.38;
/** rig units -> the public scale (s = 1: seat to pompadour ~1150 px) */
export const JIM_NORM = 1150 / 1480;

/** where his bound parts sit (rig units; world = anchor + p * JIM_NORM * scale) */
export const JIM_PARTS = {
  lensL: { x: -78 * 1.38, y: -1100 },
  lensR: { x: 78 * 1.38, y: -1100 },
  jaw: { x: 0, y: -1100 + 200 * 1.38 },
  lapel: { x: -360, y: -660 },
  fistL: { x: -640, y: -190 },
  fistR: { x: 640, y: -190 },
  chain: { x: 0, y: -578 },
  shoulderL: { x: -450, y: -715 },
  shoulderR: { x: 450, y: -715 },
} as const;

export function drawBigJim(g: Ctx, x: number, y: number, s: number, st: BigJimState): void {
  const bluff = clamp01(st.bluff ?? 0);
  const roar = clamp01(Math.max(st.roar ?? 0, bluff * 0.9));
  const reel = clamp01(st.reel ?? 0);
  const L = st.light;
  const t = st.time;
  const breath = Math.sin(st.beat * Math.PI * 0.5) * 0.012 + bluff * 0.03;
  g.save();
  g.translate(x, y);
  g.scale(s * JIM_NORM, s * JIM_NORM);
  if (st.throne) drawThrone(g, 0, 60, 1, L);
  // body sway (reel) + breathing
  const sway = reel * (st.reelDir ?? 1) * 0.05;
  g.rotate(sway * 0.5);
  // ---------------------------------------------------------------- arm targets (IK)
  const arms: { sx: number; sy: number; ex: number; ey: number; tx: number; ty: number; side: number; hide: boolean }[] = [];
  for (const side of [-1, 1]) {
    const i = side < 0 ? 0 : 1;
    const sx = SHOULDER.x * side;
    const sy = SHOULDER.y - bluff * 40;
    const tgt = st.fists?.[i];
    let tx: number;
    let ty: number;
    if (tgt) {
      tx = tgt.x / JIM_NORM;
      ty = tgt.y / JIM_NORM;
    } else {
      const lift = clamp01(st.lift?.[i] ?? 0);
      // rest: fists on his knees; lift raises them; bluff flings them wide and up
      tx = side * (640 + lift * 40);
      ty = -190 - lift * 300;
      tx = tx + (side * 900 - tx) * bluff;
      ty = ty + (-1150 - ty) * bluff;
    }
    const k = ik(sx, sy, tx, ty, UPPER, FORE, side * (bluff > 0.5 ? -1 : 1) * (tgt ? -1 : 1));
    arms.push({ sx, sy, ...k, side, hide: !!st.fistHidden?.[i] });
  }
  // sleeves BEHIND the body when flung wide (the curtain wings)
  if (bluff > 0.01) for (const a of arms) drawSleeveWing(g, a, bluff, L);
  // ---------------------------------------------------------------- body
  g.save();
  g.scale(1 + breath, 1 - breath * 0.5);
  drawBody(g, L, st.lod ?? 1);
  drawShirt(g, st, L);
  drawLapels(g, L, bluff);
  g.restore();
  // ---------------------------------------------------------------- head
  const lean = st.lean ?? { x: 0, y: 0 };
  g.save();
  g.translate(HEAD.x + lean.x, HEAD.y + lean.y - bluff * 30);
  g.rotate(reel * (st.reelDir ?? 1) * -0.22 + Math.sin(t * 1.3) * 0.01);
  g.translate(-reel * (st.reelDir ?? 1) * 30, reel * -20);
  g.scale(HEAD_K, HEAD_K);
  drawHead(g, st, roar, L);
  g.restore();
  // ---------------------------------------------------------------- arms (front)
  for (const a of arms) drawArm(g, a, bluff, L, t);
  g.restore();
  // roar shock rings (screen-scale, around the mouth)
  if (roar > 0.3) {
    const mx = x + (HEAD.x + lean.x) * s * JIM_NORM;
    const my = y + (HEAD.y + lean.y + 150 * HEAD_K) * s * JIM_NORM;
    g.save();
    g.strokeStyle = `rgba(248,241,220,${0.35 * roar})`;
    g.lineWidth = 6 * s;
    s *= JIM_NORM;
    for (let i = 0; i < 3; i++) {
      const u = (t * 2.2 + i / 3) % 1;
      g.globalAlpha = (1 - u) * roar;
      g.beginPath();
      g.ellipse(mx, my, (120 + u * 520) * s, (70 + u * 300) * s, 0, 0, TAU);
      g.stroke();
    }
    g.restore();
  }
}

function drawBody(g: Ctx, L: Lighting | undefined, lod: number): void {
  // the PEAR
  g.beginPath();
  g.moveTo(0, 40);
  g.bezierCurveTo(330, 50, 520, -20, 520, -250);
  g.bezierCurveTo(520, -480, 470, -650, 420, -730);
  g.bezierCurveTo(380, -800, 250, -830, 150, -835);
  g.lineTo(-150, -835);
  g.bezierCurveTo(-250, -830, -380, -800, -420, -730);
  g.bezierCurveTo(-470, -650, -520, -480, -520, -250);
  g.bezierCurveTo(-520, -20, -330, 50, 0, 40);
  g.closePath();
  const gr = g.createRadialGradient(-170, -420, 40, -60, -360, 700);
  gr.addColorStop(0, JIM.sheen);
  gr.addColorStop(0.35, JIM.velvet);
  gr.addColorStop(0.7, JIM.fig);
  gr.addColorStop(1, JIM.shadow);
  ink(g, gr, 6);
  g.save();
  g.clip();
  // velvet nap: soft vertical sheen bands that follow the belly
  if (lod > 0.5) {
    g.globalAlpha = 0.1;
    g.strokeStyle = '#E8C0DC';
    g.lineWidth = 10;
    for (let i = -6; i <= 6; i++) {
      const bx = i * 80;
      g.beginPath();
      g.moveTo(bx * 0.6, -800);
      g.quadraticCurveTo(bx * 1.25, -350, bx * 0.9, 40);
      g.stroke();
    }
    g.globalAlpha = 1;
  }
  // rim light on the right flank (scene light)
  g.strokeStyle = rimCol(L, 0.8);
  g.lineWidth = 26;
  g.beginPath();
  g.moveTo(400, -770);
  g.bezierCurveTo(480, -650, 540, -470, 520, -250);
  g.stroke();
  // under-belly shadow
  g.fillStyle = 'rgba(20,6,16,0.45)';
  g.beginPath();
  g.ellipse(0, 20, 480, 110, 0, 0, TAU);
  g.fill();
  g.restore();
  // jacket buttons (gold) straining over the belly
  for (const by of [-360, -230]) {
    g.beginPath();
    g.arc(0, by, 22, 0, TAU);
    ink(g, JIM.gold, 3);
    g.fillStyle = JIM.goldHi;
    g.beginPath();
    g.arc(-6, by - 6, 7, 0, TAU);
    g.fill();
    // strain lines
    g.strokeStyle = 'rgba(30,12,26,0.6)';
    g.lineWidth = 4;
    for (const sd of [-1, 1]) {
      g.beginPath();
      g.moveTo(sd * 28, by);
      g.quadraticCurveTo(sd * 70, by - 10, sd * 110, by + 6);
      g.stroke();
    }
  }
  // stubby legs + platform shoes poking out under the pear
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(sd * 150, 30);
    g.lineTo(sd * 300, 30);
    g.lineTo(sd * 320, 100);
    g.lineTo(sd * 130, 100);
    g.closePath();
    ink(g, JIM.shadow, 4);
    // two-tone platform shoe
    g.beginPath();
    g.moveTo(sd * 120, 96);
    g.bezierCurveTo(sd * 140, 70, sd * 330, 66, sd * 380, 104);
    g.lineTo(sd * 380, 138);
    g.lineTo(sd * 120, 138);
    g.closePath();
    ink(g, JIM.shirt, 4);
    g.fillStyle = JIM.shadow;
    g.fillRect(sd > 0 ? 120 : -380, 124, 260, 14);
    g.fillStyle = JIM.gold;
    g.fillRect(sd * 230 - 16, 84, 32, 14);
  }
}

function drawShirt(g: Ctx, st: BigJimState, L: Lighting | undefined): void {
  // open V: cream shirt + a chest rug
  g.beginPath();
  g.moveTo(-230, -835);
  g.lineTo(230, -835);
  g.lineTo(0, -430);
  g.closePath();
  ink(g, JIM.shirt, 4);
  g.beginPath();
  g.moveTo(-160, -830);
  g.lineTo(160, -830);
  g.lineTo(0, -540);
  g.closePath();
  const sk = g.createLinearGradient(0, -815, 0, -560);
  sk.addColorStop(0, JIM.skinShade);
  sk.addColorStop(1, JIM.skin);
  // (the V's skin gradient runs down the chest)
  g.fillStyle = sk;
  g.fill();
  // chest hair
  g.strokeStyle = 'rgba(26,16,20,0.75)';
  g.lineWidth = 4;
  for (let i = 0; i < 16; i++) {
    const hx = (hash(i) - 0.5) * 200 * (1 - hash(i + 5) * 0.4);
    const hy = -800 + hash(i + 9) * 230;
    if (Math.abs(hx) > (-540 - hy) * 0.5) continue;
    g.beginPath();
    g.moveTo(hx, hy);
    g.quadraticCurveTo(hx + 8, hy - 6, hx + 4, hy - 14);
    g.stroke();
  }
  // the GOLD CHAIN: a heavy rope of links in a U, three medallions (snaps when chainT is set)
  const chainT = st.chainT ?? NaN;
  const snapped = !Number.isNaN(chainT);
  const sway = Math.sin(st.beat * Math.PI) * 6;
  if (!snapped || chainT < 0.9) {
    const drop = snapped ? chainT * chainT * 1400 : 0;
    g.save();
    if (snapped) g.globalAlpha = Math.max(0, 1 - chainT / 0.9);
    const pts: [number, number][] = [];
    for (let i = 0; i <= 22; i++) {
      const u = i / 22;
      const cx = -170 + u * 340;
      const cy = -830 + Math.sin(u * Math.PI) * 190 + sway * Math.sin(u * Math.PI);
      pts.push([cx + (snapped ? (u - 0.5) * chainT * 500 : 0), cy + drop * (0.5 + Math.abs(u - 0.5))]);
    }
    for (let i = 0; i < pts.length; i++) {
      const [cx, cy] = pts[i];
      g.beginPath();
      g.ellipse(cx, cy, 13, 9, i % 2 ? 0.6 : -0.6, 0, TAU);
      g.lineWidth = 6;
      g.strokeStyle = INK;
      g.stroke();
      g.lineWidth = 4;
      g.strokeStyle = i % 2 ? JIM.gold : JIM.goldHi;
      g.stroke();
    }
    const med = (mx: number, my: number, r: number, label: string) => {
      g.beginPath();
      g.arc(mx, my, r, 0, TAU);
      const mg = g.createRadialGradient(mx - r * 0.4, my - r * 0.4, r * 0.1, mx, my, r);
      mg.addColorStop(0, JIM.goldHi);
      mg.addColorStop(0.6, JIM.gold);
      mg.addColorStop(1, JIM.goldDark);
      ink(g, mg, 4);
      g.strokeStyle = JIM.goldDark;
      g.lineWidth = 3;
      g.beginPath();
      g.arc(mx, my, r * 0.78, 0, TAU);
      g.stroke();
      g.fillStyle = JIM.goldDark;
      g.font = `bold ${Math.round(r * 0.9)}px "Arial Black", Impact, sans-serif`;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText(label, mx, my + 2);
      star4(g, mx - r * 0.35, my - r * 0.4, r * 0.35, st.time, 'rgba(255,248,220,0.9)');
    };
    const mid = pts[11];
    med(pts[5][0] - 4, pts[5][1] + 36, 30, '$');
    med(pts[17][0] + 4, pts[17][1] + 36, 30, '$');
    med(mid[0], mid[1] + 62, 66, 'BJ');
    g.restore();
  }
  void L;
}

function drawLapels(g: Ctx, L: Lighting | undefined, bluff: number): void {
  for (const sd of [-1, 1]) {
    const flare = 1 + bluff * 0.12;
    g.beginPath();
    g.moveTo(sd * 225, -838);
    g.lineTo(sd * 330, -800);
    // the notch
    g.lineTo(sd * 300, -752);
    // the huge flared wing: this top edge is the gauntlet's LEDGE
    g.lineTo(sd * 500 * flare, -700);
    g.quadraticCurveTo(sd * 470 * flare, -610, sd * 330, -560);
    g.quadraticCurveTo(sd * 150, -500, sd * 8, -420);
    g.lineTo(sd * 0, -430);
    g.closePath();
    const lg = g.createLinearGradient(sd * 400, -700, sd * 60, -460);
    lg.addColorStop(0, JIM.satin);
    lg.addColorStop(0.35, JIM.lapel);
    lg.addColorStop(1, JIM.deep);
    ink(g, lg, 5);
    // satin sheen stripe + gold piping along the outer edge
    g.strokeStyle = 'rgba(240,200,232,0.45)';
    g.lineWidth = 10;
    g.beginPath();
    g.moveTo(sd * 300, -780);
    g.quadraticCurveTo(sd * 330, -660, sd * 170, -520);
    g.stroke();
    g.strokeStyle = JIM.gold;
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(sd * 300, -752);
    g.lineTo(sd * 500 * flare, -700);
    g.quadraticCurveTo(sd * 470 * flare, -610, sd * 330, -560);
    g.stroke();
    // rim on the ledge top (reads as a walkable edge)
    g.strokeStyle = rimCol(L, 0.7);
    g.lineWidth = 6;
    g.beginPath();
    g.moveTo(sd * 305, -757);
    g.lineTo(sd * 494 * flare, -707);
    g.stroke();
  }
  // lapel pin: a gold $ on his left
  g.beginPath();
  g.arc(-360, -660, 22, 0, TAU);
  ink(g, JIM.gold, 3);
  g.fillStyle = JIM.goldDark;
  g.font = 'bold 26px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('$', -360, -658);
}

// ------------------------------------------------------------------ head

function drawHead(g: Ctx, st: BigJimState, roar: number, L: Lighting | undefined): void {
  const t = st.time;
  const panic = clamp01(st.panic ?? 0);
  // jowls + double chin (face origin: lens line at y = 0)
  g.beginPath();
  g.moveTo(-150, -70);
  g.bezierCurveTo(-170, 40, -175, 140, -120, 190);
  g.bezierCurveTo(-70, 235, 70, 235, 120, 190);
  g.bezierCurveTo(175, 140, 170, 40, 150, -70);
  g.bezierCurveTo(140, -150, -140, -150, -150, -70);
  g.closePath();
  const fg = g.createRadialGradient(-50, -10, 20, 0, 40, 240);
  fg.addColorStop(0, JIM.skinHi);
  fg.addColorStop(0.55, JIM.skin);
  fg.addColorStop(1, JIM.skinShade);
  ink(g, fg, 5);
  // chin fold
  g.strokeStyle = 'rgba(120,60,44,0.8)';
  g.lineWidth = 5;
  g.beginPath();
  g.moveTo(-90, 205);
  g.quadraticCurveTo(0, 240, 90, 205);
  g.stroke();
  // ears
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.ellipse(sd * 158, -10, 26, 44, sd * 0.2, 0, TAU);
    ink(g, JIM.skinShade, 4);
  }
  // mutton chops
  for (const sd of [-1, 1]) {
    g.beginPath();
    g.moveTo(sd * 150, -80);
    g.lineTo(sd * 162, 60);
    g.quadraticCurveTo(sd * 150, 130, sd * 100, 130);
    g.lineTo(sd * 118, 30);
    g.lineTo(sd * 110, -60);
    g.closePath();
    ink(g, JIM.hair, 3);
  }
  // THE POMPADOUR: a glossy black wave + a skunk streak
  g.beginPath();
  g.moveTo(-160, -60);
  g.bezierCurveTo(-190, -160, -150, -230, -60, -250);
  g.bezierCurveTo(20, -275, 120, -250, 175, -190);
  g.bezierCurveTo(200, -160, 190, -110, 160, -60);
  g.bezierCurveTo(120, -130, 20, -140, -60, -120);
  g.bezierCurveTo(-110, -110, -140, -90, -160, -60);
  g.closePath();
  const hg = g.createLinearGradient(0, -260, 0, -60);
  hg.addColorStop(0, JIM.hairHi);
  hg.addColorStop(0.4, JIM.hair);
  hg.addColorStop(1, JIM.hair);
  ink(g, hg, 5);
  g.strokeStyle = 'rgba(160,150,190,0.55)';
  g.lineWidth = 5;
  for (let i = 0; i < 4; i++) {
    g.beginPath();
    g.moveTo(-120 + i * 30, -120 + i * 4);
    g.bezierCurveTo(-110 + i * 30, -210, 40 + i * 20, -250, 150, -180 + i * 12);
    g.stroke();
  }
  g.strokeStyle = JIM.streak;
  g.lineWidth = 16;
  g.beginPath();
  g.moveTo(-40, -130);
  g.bezierCurveTo(-30, -220, 60, -250, 130, -205);
  g.stroke();
  // heavy brows over the glasses (angle up in panic, down in the roar)
  g.fillStyle = JIM.hair;
  for (const sd of [-1, 1]) {
    const ang = sd * (0.18 * roar - 0.25 * panic);
    g.save();
    g.translate(sd * 78, -78 - roar * 10 - panic * 16);
    g.rotate(ang);
    g.beginPath();
    g.ellipse(0, 0, 66, 15, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  // nose
  g.beginPath();
  g.ellipse(0, 70, 44, 38, 0, 0, TAU);
  const ng = g.createRadialGradient(-12, 58, 4, 0, 70, 46);
  ng.addColorStop(0, '#F2C4AE');
  ng.addColorStop(1, '#C0705A');
  ink(g, ng, 4);
  // mouth (under the moustache)
  const mo = roar;
  g.save();
  g.translate(0, 168);
  if (mo > 0.08) {
    g.beginPath();
    g.ellipse(0, 0, 70 + 20 * mo, 12 + 62 * mo, 0, 0, TAU);
    ink(g, '#4A0E12', 4);
    g.save();
    g.clip();
    g.fillStyle = '#F4EFE2';
    g.fillRect(-100, -80 * mo - 10, 200, 26 * mo + 12);
    g.fillRect(-100, 50 * mo - 6, 200, 40);
    g.fillStyle = JIM.gold;
    g.fillRect(22, -80 * mo - 10, 22, 26 * mo + 12);
    g.fillStyle = '#C04A5A';
    g.beginPath();
    g.ellipse(0, 50 * mo, 50, 26 * mo, 0, 0, TAU);
    g.fill();
    g.restore();
  } else {
    // the smug GRIN: a crescent of teeth + the gold tooth
    g.beginPath();
    g.moveTo(-66, -6);
    g.quadraticCurveTo(0, 8, 76, -14);
    g.quadraticCurveTo(10, 44, -66, -6);
    g.closePath();
    ink(g, '#F4EFE2', 3);
    g.strokeStyle = 'rgba(26,20,16,0.6)';
    g.lineWidth = 3;
    for (let i = -3; i <= 3; i++) {
      g.beginPath();
      g.moveTo(i * 17, -2);
      g.lineTo(i * 17 + 2, 16 - Math.abs(i) * 2);
      g.stroke();
    }
    g.fillStyle = JIM.gold;
    g.fillRect(19, -3, 16, 16);
    g.fillStyle = JIM.goldHi;
    g.fillRect(22, -1, 5, 5);
  }
  g.restore();
  // horseshoe moustache
  g.beginPath();
  g.moveTo(-10, 100);
  g.bezierCurveTo(-60, 88, -118, 106, -122, 146);
  g.lineTo(-114, 214 + mo * 30);
  g.lineTo(-94, 216 + mo * 30);
  g.lineTo(-90, 150);
  g.bezierCurveTo(-66, 132, -30, 138, 0, 142);
  g.bezierCurveTo(30, 138, 66, 132, 90, 150);
  g.lineTo(94, 216 + mo * 30);
  g.lineTo(114, 214 + mo * 30);
  g.lineTo(122, 146);
  g.bezierCurveTo(118, 106, 60, 88, 10, 100);
  g.closePath();
  ink(g, JIM.hair, 3);
  // the cigar (bobbing on the beat) + smoke
  if (mo < 0.5) {
    const bob = Math.sin(st.beat * TAU) * 3;
    g.save();
    g.translate(70, 160 + bob);
    g.rotate(0.35);
    g.beginPath();
    g.rect(0, -11, 120, 22);
    ink(g, '#6A4428', 3);
    g.fillStyle = JIM.gold;
    g.fillRect(24, -11, 14, 22);
    g.fillStyle = '#8A8478';
    g.fillRect(112, -11, 10, 22);
    drawGlow(g, 122, 0, CF.hotEdge, 26, 0.4 + 0.3 * Math.sin(t * 5));
    g.restore();
    if ((st.lod ?? 1) > 0.5) {
      for (let i = 0; i < 5; i++) {
        const u = (t * 0.35 + i / 5) % 1;
        g.fillStyle = `rgba(200,190,200,${0.22 * (1 - u)})`;
        g.beginPath();
        g.arc(185 + u * 60 + Math.sin(u * 6 + i) * 18, 190 - u * 260, 12 + u * 30, 0, TAU);
        g.fill();
      }
    }
  }
  // THE AVIATORS
  const crack = st.crack ?? [0, 0];
  const ct = st.crackT ?? [NaN, NaN];
  for (const sd of [-1, 1]) {
    const i = sd < 0 ? 0 : 1;
    drawJimLens(g, sd * 78, 0, 1, sd as -1 | 1, {
      crack: crack[i],
      crackT: ct[i],
      reflect: st.reflect ?? 0,
      reflectX: st.reflectX ?? 0,
      blaze: st.blaze ?? 0,
      light: L,
      time: t,
      panic,
    });
  }
  // bridge + temples
  g.strokeStyle = INK;
  g.lineWidth = 12;
  g.beginPath();
  g.moveTo(-18, -38);
  g.quadraticCurveTo(0, -48, 18, -38);
  g.moveTo(-150, -40);
  g.lineTo(-165, -30);
  g.moveTo(150, -40);
  g.lineTo(165, -30);
  g.stroke();
  g.strokeStyle = JIM.chrome;
  g.lineWidth = 5;
  g.stroke();
}

export interface LensState {
  crack: number;
  crackT: number;
  reflect: number;
  reflectX: number;
  blaze: number;
  light?: Lighting;
  time: number;
  panic?: number;
}

/**
 * One aviator lens (teardrop), centre (x, y), scale k, side -1 left / 1 right. Chrome mirror: the scene's sky
 * reflected, a horizon band, a specular streak, a tiny tangerine SLIM (st.reflect), crack stages.
 */
export function drawJimLens(g: Ctx, x: number, y: number, k: number, side: -1 | 1, st: LensState): void {
  const L = st.light;
  g.save();
  g.translate(x, y);
  g.scale(k * side, k);
  const path = () => {
    g.beginPath();
    g.moveTo(-60, -44);
    g.bezierCurveTo(-20, -52, 50, -50, 70, -36);
    g.bezierCurveTo(82, -10, 72, 40, 40, 58);
    g.bezierCurveTo(10, 72, -40, 64, -58, 34);
    g.bezierCurveTo(-72, 10, -72, -30, -60, -44);
    g.closePath();
  };
  path();
  g.lineWidth = 14;
  g.strokeStyle = INK;
  g.stroke();
  // chrome mirror
  const top = L ? css(mix(L.skyTop, [255, 255, 255], 0.15)) : '#5E2B4E';
  const mid = L ? css(mix(L.skyMid, [255, 255, 255], 0.35)) : '#E8577A';
  const low = L ? css(mix(L.skyLow, [255, 255, 255], 0.55)) : '#FFE9C2';
  const lg = g.createLinearGradient(0, -52, 0, 68);
  lg.addColorStop(0, top);
  lg.addColorStop(0.42, mid);
  lg.addColorStop(0.56, low);
  lg.addColorStop(0.58, '#2A2230');
  lg.addColorStop(1, '#6A7682');
  g.fillStyle = lg;
  g.fill();
  g.save();
  path();
  g.clip();
  if (st.crack < 2) {
    // the reflected skyline + a tiny tangerine Slim
    g.fillStyle = 'rgba(30,20,36,0.8)';
    for (let i = 0; i < 7; i++) g.fillRect(-70 + i * 22, 14 - hash(i + 4) * 26, 18, 40);
    if (st.reflect > 0.02) {
      const rs = 0.25 + 0.75 * st.reflect;
      const rx = st.reflectX * 30 * side;
      g.save();
      g.translate(rx, 34);
      g.scale(rs * side, rs);
      g.fillStyle = CF.tangerine;
      g.strokeStyle = INK;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(-14, 0);
      g.lineTo(-18, -30);
      g.quadraticCurveTo(-20, -44, 0, -46);
      g.quadraticCurveTo(20, -44, 18, -30);
      g.lineTo(14, 0);
      g.closePath();
      g.stroke();
      g.fill();
      g.beginPath();
      g.arc(0, -54, 9, 0, TAU);
      g.fillStyle = CF.skin;
      g.fill();
      g.stroke();
      g.strokeStyle = CF.cueMaple;
      g.lineWidth = 3;
      g.beginPath();
      g.moveTo(10, -36);
      g.lineTo(40, -70);
      g.stroke();
      g.restore();
      drawGlow(g, rx, 20, CF.tangerine, 30 * rs, 0.35 * st.reflect);
    }
    // specular streaks
    g.fillStyle = 'rgba(255,255,255,0.75)';
    g.beginPath();
    g.moveTo(-50, -40);
    g.lineTo(-24, -44);
    g.lineTo(-58, 20);
    g.lineTo(-66, 0);
    g.closePath();
    g.fill();
    g.fillStyle = 'rgba(255,255,255,0.4)';
    g.beginPath();
    g.moveTo(-10, -46);
    g.lineTo(2, -46);
    g.lineTo(-40, 40);
    g.lineTo(-46, 34);
    g.closePath();
    g.fill();
  }
  if (st.crack >= 1) {
    // spider crack from the impact point
    const ix = 12;
    const iy = -6;
    g.strokeStyle = 'rgba(255,255,255,0.95)';
    g.lineWidth = 3;
    for (let r = 0; r < 9; r++) {
      const a = (r / 9) * TAU + hash(r) * 0.5;
      let px = ix;
      let py = iy;
      g.beginPath();
      g.moveTo(px, py);
      for (let sgm = 0; sgm < 4; sgm++) {
        px += Math.cos(a + (hash(r * 7 + sgm) - 0.5) * 0.6) * 26;
        py += Math.sin(a + (hash(r * 7 + sgm) - 0.5) * 0.6) * 26;
        g.lineTo(px, py);
      }
      g.stroke();
    }
    g.lineWidth = 2;
    for (const rr of [16, 34]) {
      g.beginPath();
      for (let r = 0; r <= 9; r++) {
        const a = (r / 9) * TAU + hash(r) * 0.5;
        g.lineTo(ix + Math.cos(a) * rr * (0.8 + hash(r + rr) * 0.4), iy + Math.sin(a) * rr * (0.8 + hash(r + rr) * 0.4));
      }
      g.stroke();
    }
  }
  if (st.crack >= 2) {
    // shattered: chunks gone — his tiny worried eye shows through
    g.fillStyle = '#EDB9A2';
    g.beginPath();
    g.moveTo(-40, -30);
    g.lineTo(30, -40);
    g.lineTo(50, 10);
    g.lineTo(10, 40);
    g.lineTo(-40, 20);
    g.closePath();
    g.fill();
    g.lineWidth = 3;
    g.strokeStyle = INK;
    g.stroke();
    g.fillStyle = '#FFFFFF';
    g.beginPath();
    g.ellipse(4, 0, 22, 16, 0, 0, TAU);
    g.fill();
    g.stroke();
    const jit = Math.sin(st.time * 40) * 2;
    g.fillStyle = INK;
    g.beginPath();
    g.arc(4 + jit, 2, 5, 0, TAU);
    g.fill();
    // sweat drop
    g.fillStyle = 'rgba(190,230,255,0.9)';
    g.beginPath();
    g.moveTo(48, -30);
    g.quadraticCurveTo(58, -12, 48, -8);
    g.quadraticCurveTo(38, -12, 48, -30);
    g.fill();
  }
  g.restore();
  // chrome frame
  path();
  g.lineWidth = 6;
  g.strokeStyle = JIM.chrome;
  g.stroke();
  g.restore();
  // blaze: the lenses flash like eyespots (the bluff) + crack flares
  const fl = Math.max(st.blaze, Number.isNaN(st.crackT) ? 0 : Math.max(0, 1 - st.crackT / 0.5));
  if (fl > 0.02) {
    drawGlow(g, x - 20 * side * k, y - 10 * k, '#FFFFFF', 260 * k * (0.6 + fl), 0.8 * fl);
    drawGlow(g, x - 20 * side * k, y - 10 * k, CF.bulb, 520 * k * fl, 0.35 * fl);
    star4(g, x - 26 * side * k, y - 20 * k, 200 * k * fl, 0.2 + st.time * 0.5, `rgba(255,255,255,${0.95 * fl})`, 0.08);
    star4(g, x - 26 * side * k, y - 20 * k, 110 * k * fl, 1.0 + st.time * 0.5, `rgba(255,255,255,${0.7 * fl})`, 0.1);
  }
  // shards falling after a crack
  if (!Number.isNaN(st.crackT) && st.crackT < 1.2) {
    const u = st.crackT;
    g.fillStyle = 'rgba(220,235,245,0.9)';
    for (let i = 0; i < 10; i++) {
      const sx = x + (hash(i) - 0.5) * 120 * k + (hash(i + 3) - 0.5) * 300 * k * u;
      const sy = y + (hash(i + 7) * 40 + 700 * u * u) * k;
      g.save();
      g.translate(sx, sy);
      g.rotate(u * 10 + i);
      g.globalAlpha = Math.max(0, 1 - u / 1.2);
      g.beginPath();
      g.moveTo(-10 * k, -6 * k);
      g.lineTo(12 * k, -2 * k);
      g.lineTo(-2 * k, 12 * k);
      g.closePath();
      g.fill();
      g.restore();
    }
  }
}

// ------------------------------------------------------------------ arms, sleeves, fists

function drawSleeveWing(g: Ctx, a: { sx: number; sy: number; ex: number; ey: number; tx: number; ty: number; side: number }, bluff: number, L: Lighting | undefined): void {
  // the curtain sleeve hanging from the flung arm like a wing (behind the body)
  const sd = a.side;
  const drop = 520 * bluff;
  g.beginPath();
  g.moveTo(a.sx - sd * 40, a.sy + 60);
  g.quadraticCurveTo(a.ex, a.ey - 40, a.tx, a.ty + 40);
  g.lineTo(a.tx + sd * 40, a.ty + drop * 0.7);
  // scalloped hem
  const n = 6;
  const hx0 = a.tx + sd * 40;
  const hy0 = a.ty + drop * 0.7;
  const hx1 = a.sx + sd * 60;
  const hy1 = a.sy + drop;
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const px = hx0 + (hx1 - hx0) * u;
    const py = hy0 + (hy1 - hy0) * u;
    const pu = (i - 0.5) / n;
    g.quadraticCurveTo(hx0 + (hx1 - hx0) * pu, hy0 + (hy1 - hy0) * pu + 60, px, py);
  }
  g.closePath();
  const wg = g.createLinearGradient(a.sx, a.sy, a.tx, a.ty + drop);
  wg.addColorStop(0, JIM.fig);
  wg.addColorStop(0.5, JIM.velvet);
  wg.addColorStop(1, JIM.shadow);
  ink(g, wg, 5);
  // fold lines
  g.strokeStyle = 'rgba(30,10,26,0.5)';
  g.lineWidth = 6;
  for (let i = 1; i < 5; i++) {
    const u = i / 5;
    g.beginPath();
    g.moveTo(a.sx + (a.tx - a.sx) * u, a.sy + (a.ty - a.sy) * u + 40);
    g.lineTo(hx1 + (hx0 - hx1) * u, hy1 + (hy0 - hy1) * u + 30);
    g.stroke();
  }
  g.strokeStyle = JIM.gold;
  g.lineWidth = 8;
  g.beginPath();
  g.moveTo(hx0, hy0);
  g.lineTo(hx1, hy1);
  g.stroke();
  void L;
}

function drawArm(g: Ctx, a: { sx: number; sy: number; ex: number; ey: number; tx: number; ty: number; side: number; hide: boolean }, bluff: number, L: Lighting | undefined, t: number): void {
  // upper arm: a velvet capsule, sheen on top
  g.lineCap = 'round';
  g.lineWidth = 200;
  g.strokeStyle = INK;
  g.beginPath();
  g.moveTo(a.sx, a.sy);
  g.lineTo(a.ex, a.ey);
  g.stroke();
  g.lineWidth = 188;
  g.strokeStyle = JIM.fig;
  g.stroke();
  g.lineWidth = 70;
  g.strokeStyle = 'rgba(176,122,160,0.35)';
  g.beginPath();
  g.moveTo(a.sx - 10, a.sy - 36);
  g.lineTo(a.ex - 10, a.ey - 36);
  g.stroke();
  // forearm: a BELL SLEEVE — a velvet cone flaring to a gold-braid cuff, its hem hanging down (gravity)
  const dx = a.tx - a.ex;
  const dy = a.ty - a.ey;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const nx = -uy;
  const ny = ux;
  const cuffU = Math.max(0.55, 1 - 95 / len);
  const cx = a.ex + dx * cuffU;
  const cy = a.ey + dy * cuffU;
  const w0 = 92;
  const w1 = 150 + bluff * 40;
  // which side of the cone is "down"?
  const dn = ny > 0 ? 1 : -1;
  const sag = 90 + 25 * Math.sin(t * 2 + a.side) + bluff * 60;
  const hx = cx + nx * w1 * dn;
  const hy = cy + ny * w1 * dn;
  g.beginPath();
  g.moveTo(a.ex - nx * w0 * dn, a.ey - ny * w0 * dn);
  g.lineTo(cx - nx * w1 * dn, cy - ny * w1 * dn);
  g.lineTo(hx, hy);
  // the hem droops below the cone
  g.quadraticCurveTo(a.ex + dx * 0.55 + nx * w1 * dn, a.ey + dy * 0.55 + ny * w1 * dn + sag, a.ex + nx * w0 * dn, a.ey + ny * w0 * dn);
  g.closePath();
  const sg = g.createLinearGradient(a.ex - nx * 100, a.ey - ny * 100, a.ex + nx * 150, a.ey + ny * 150 + sag);
  sg.addColorStop(0, JIM.velvet);
  sg.addColorStop(0.5, JIM.fig);
  sg.addColorStop(1, JIM.shadow);
  ink(g, sg, 5);
  // folds running along the sleeve into the drape
  g.strokeStyle = 'rgba(30,10,26,0.5)';
  g.lineWidth = 7;
  for (const u of [0.2, 0.55]) {
    g.beginPath();
    g.moveTo(a.ex + nx * w0 * dn * u, a.ey + ny * w0 * dn * u);
    g.quadraticCurveTo(cx + nx * w1 * dn * u, cy + ny * w1 * dn * u + sag * u * 0.6, cx + nx * w1 * dn * (u + 0.3), cy + ny * w1 * dn * (u + 0.3) + sag * 0.4);
    g.stroke();
  }
  // rim light along the top edge
  g.strokeStyle = rimCol(L, 0.55);
  g.lineWidth = 10;
  g.beginPath();
  g.moveTo(a.ex - nx * (w0 - 8) * dn, a.ey - ny * (w0 - 8) * dn);
  g.lineTo(cx - nx * (w1 - 8) * dn, cy - ny * (w1 - 8) * dn);
  g.stroke();
  // gold braid cuff band across the bell's mouth
  g.lineCap = 'butt';
  g.strokeStyle = INK;
  g.lineWidth = 40;
  g.beginPath();
  g.moveTo(cx - nx * (w1 + 6) * dn - ux * 12, cy - ny * (w1 + 6) * dn - uy * 12);
  g.lineTo(cx + nx * (w1 + 6) * dn - ux * 12, cy + ny * (w1 + 6) * dn - uy * 12);
  g.stroke();
  g.strokeStyle = JIM.gold;
  g.lineWidth = 30;
  g.stroke();
  g.strokeStyle = JIM.goldHi;
  g.lineWidth = 6;
  g.setLineDash([14, 12]);
  g.stroke();
  g.setLineDash([]);
  g.lineCap = 'round';
  // the dark mouth of the bell + the fist coming out of it
  g.fillStyle = JIM.deep;
  g.beginPath();
  g.ellipse(cx, cy, 30, w1 * 0.9, Math.atan2(uy, ux), 0, TAU);
  g.fill();
  const ang = Math.atan2(dy, dx);
  if (!a.hide) drawJimFist(g, a.tx + ux * 10, a.ty + uy * 10, 0.95, a.side, bluff > 0.5 ? 'open' : 'fist', ang);
}

/**
 * Big Jim's FIST — an anvil of knuckles with DANGER-RED knuckle rings (the one red on him). (x, y) = the middle of
 * the fist; k = scale (1 = ~260 px wide); side -1 left hand / 1 right; 'fist' seen from the side (back of the hand up =
 * the flat top a slam platform needs), 'open' = spread fingers (the bluff). `ang` rotates it along the forearm.
 */
export function drawJimFist(g: Ctx, x: number, y: number, k: number, side: number, pose: 'fist' | 'open' = 'fist', ang = Math.PI / 2, slam = 0): void {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  if (pose === 'open') {
    g.rotate(ang - Math.PI / 2);
    g.scale(1.35, 1.35);
    // spread hand: palm + 4 fingers + thumb
    for (let i = 0; i < 4; i++) {
      const a = -0.55 + i * 0.37;
      g.save();
      g.rotate(a);
      g.beginPath();
      g.roundRect(-20, 30, 40, 130, 20);
      ink(g, JIM.skin, 4);
      if (i === 1 || i === 2) {
        g.beginPath();
        g.rect(-24, 70, 48, 20);
        ink(g, JIM.red, 3);
        drawGlow(g, 0, 80, JIM.hot, 30, 0.35);
      }
      g.restore();
    }
    g.beginPath();
    g.ellipse(0, 20, 90, 70, 0, 0, TAU);
    ink(g, JIM.skin, 4);
    g.restore();
    return;
  }
  // FIST (side-on): a heavy block, knuckles forward (toward the hero = +x for the right hand mirrored)
  const sd = side < 0 ? -1 : 1;
  g.scale(sd, 1);
  const sq = 1 - 0.12 * slam;
  g.scale(1 + 0.08 * slam, sq);
  // back of the hand (top = the platform)
  g.beginPath();
  g.moveTo(-130, -70);
  g.quadraticCurveTo(-60, -95, 90, -88);
  g.quadraticCurveTo(140, -80, 140, -30);
  g.lineTo(140, 50);
  g.quadraticCurveTo(140, 92, 90, 94);
  g.lineTo(-100, 94);
  g.quadraticCurveTo(-140, 90, -140, 40);
  g.closePath();
  const fg = g.createLinearGradient(0, -95, 0, 94);
  fg.addColorStop(0, JIM.skinHi);
  fg.addColorStop(0.5, JIM.skin);
  fg.addColorStop(1, JIM.skinShade);
  ink(g, fg, 5);
  // curled fingers (4 knuckle rolls on the front face)
  for (let i = 0; i < 4; i++) {
    const fy = -60 + i * 38;
    g.beginPath();
    g.ellipse(112, fy + 16, 34, 22, 0, 0, TAU);
    ink(g, i % 2 ? JIM.skin : JIM.skinHi, 3);
    g.strokeStyle = 'rgba(120,60,44,0.7)';
    g.lineWidth = 4;
    g.beginPath();
    g.moveTo(40, fy + 30);
    g.lineTo(96, fy + 32);
    g.stroke();
  }
  // DANGER: red knuckle rings on two fingers (+ hot glint)
  for (const i of [1, 2]) {
    const fy = -60 + i * 38 + 16;
    g.beginPath();
    g.roundRect(78, fy - 20, 22, 40, 6);
    ink(g, JIM.red, 3);
    g.fillStyle = JIM.hot;
    g.fillRect(84, fy - 14, 6, 10);
    drawGlow(g, 90, fy, JIM.hot, 34, 0.35);
  }
  // thumb wrapped over
  g.beginPath();
  g.ellipse(30, 40, 70, 28, -0.15, 0, TAU);
  ink(g, JIM.skinHi, 4);
  // hairy knuckles on the back
  g.strokeStyle = 'rgba(26,16,20,0.6)';
  g.lineWidth = 3;
  for (let i = 0; i < 7; i++) {
    const hx = -80 + i * 22;
    g.beginPath();
    g.moveTo(hx, -70);
    g.lineTo(hx + 6, -82);
    g.stroke();
  }
  // a gold pinky ring
  g.beginPath();
  g.roundRect(72, 70, 24, 22, 6);
  ink(g, JIM.gold, 2);
  g.restore();
}

// ------------------------------------------------------------------ the throne

/** The THRONE of stacked pool tables (3 tiers, walnut + felt, brass pockets, a gold crest). (x, y) = seat front middle. */
export function drawThrone(g: Ctx, x: number, y: number, k: number, L?: Lighting): void {
  g.save();
  g.translate(x, y);
  g.scale(k, k);
  const tiers = [
    { w: 1500, y: 360, h: 120 },
    { w: 1300, y: 220, h: 120 },
    { w: 1100, y: 80, h: 120 },
  ];
  // back rest: a tall carved headboard of cue racks behind him
  g.beginPath();
  g.moveTo(-620, 80);
  g.lineTo(-560, -1300);
  g.quadraticCurveTo(0, -1520, 560, -1300);
  g.lineTo(620, 80);
  g.closePath();
  const bg = g.createLinearGradient(0, -1500, 0, 80);
  bg.addColorStop(0, '#3A2418');
  bg.addColorStop(1, '#1E120C');
  ink(g, bg, 6);
  g.strokeStyle = JIM.gold;
  g.lineWidth = 10;
  g.stroke();
  // cue racks fanning out like a peacock
  for (let i = -7; i <= 7; i++) {
    const a = -Math.PI / 2 + i * 0.1;
    g.strokeStyle = INK;
    g.lineWidth = 16;
    g.beginPath();
    g.moveTo(Math.cos(a) * 300, -300 + Math.sin(a) * 300);
    g.lineTo(Math.cos(a) * 1180, -300 + Math.sin(a) * 1150);
    g.stroke();
    g.strokeStyle = i % 2 ? '#E7C48A' : '#B8925A';
    g.lineWidth = 9;
    g.stroke();
  }
  // crest: gold "BJ" shield
  g.beginPath();
  g.moveTo(-110, -1470);
  g.lineTo(110, -1470);
  g.lineTo(110, -1370);
  g.quadraticCurveTo(0, -1300, -110, -1370);
  g.closePath();
  ink(g, JIM.gold, 5);
  g.fillStyle = JIM.goldDark;
  g.font = 'bold 70px "Arial Black", Impact, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText('BJ', 0, -1410);
  for (const t of tiers) {
    // walnut body + felt top + brass pockets
    g.beginPath();
    g.rect(-t.w / 2, t.y - t.h, t.w, t.h);
    ink(g, '#5A3A26', 5);
    g.fillStyle = CF.felt;
    g.fillRect(-t.w / 2 + 10, t.y - t.h + 6, t.w - 20, 22);
    g.fillStyle = '#3A2418';
    g.fillRect(-t.w / 2, t.y - 30, t.w, 30);
    for (const px of [-t.w / 2 + 30, 0, t.w / 2 - 30]) {
      g.beginPath();
      g.arc(px, t.y - t.h + 16, 16, 0, TAU);
      ink(g, '#0B0706', 3);
      g.strokeStyle = JIM.gold;
      g.lineWidth = 5;
      g.stroke();
    }
    // diamond sights on the rail
    g.fillStyle = CF.bulb;
    for (let dx = -t.w / 2 + 100; dx < t.w / 2 - 60; dx += 120) {
      g.beginPath();
      g.moveTo(dx, t.y - t.h - 2);
      g.lineTo(dx + 6, t.y - t.h + 4);
      g.lineTo(dx, t.y - t.h + 10);
      g.lineTo(dx - 6, t.y - t.h + 4);
      g.fill();
    }
  }
  // turned legs of the bottom table
  for (const px of [-700, -350, 350, 700]) {
    g.beginPath();
    g.moveTo(px - 30, 360);
    g.quadraticCurveTo(px - 50, 420, px - 20, 480);
    g.lineTo(px + 20, 480);
    g.quadraticCurveTo(px + 50, 420, px + 30, 360);
    g.closePath();
    ink(g, '#4A2E1C', 4);
  }
  g.restore();
  void L;
}

// ------------------------------------------------------------------ the gold bust (walkdown breakable)

/** a GOLD BUST of Big Jim on a plinth (the act-3 walkdown giant breakable). (x, y) = centre, r ~ 30 at normal size. */
export function drawJimBust(g: Ctx, r: number, seed: number, glint: number): void {
  const k = r / 30;
  g.save();
  g.scale(k, k);
  // plinth
  g.beginPath();
  g.rect(-26, 18, 52, 22);
  ink(g, '#2A1E24', 3);
  g.fillStyle = JIM.gold;
  g.fillRect(-26, 18, 52, 4);
  // shoulders + lapels
  g.beginPath();
  g.moveTo(-34, 18);
  g.quadraticCurveTo(-36, -6, -14, -10);
  g.lineTo(14, -10);
  g.quadraticCurveTo(36, -6, 34, 18);
  g.closePath();
  const gg = g.createLinearGradient(-30, -40, 30, 20);
  gg.addColorStop(0, '#FFF0B8');
  gg.addColorStop(0.4, JIM.gold);
  gg.addColorStop(1, JIM.goldDark);
  ink(g, gg, 3);
  // head: pompadour + aviators
  g.beginPath();
  g.ellipse(0, -24, 16, 18, 0, 0, TAU);
  ink(g, gg, 3);
  g.beginPath();
  g.ellipse(4, -42, 16, 8, 0.3, 0, TAU);
  ink(g, gg, 2);
  g.fillStyle = JIM.goldDark;
  g.fillRect(-12, -28, 10, 7);
  g.fillRect(2, -28, 10, 7);
  g.fillStyle = JIM.goldHi;
  g.fillRect(-10, -27, 3, 3);
  g.fillRect(4, -27, 3, 3);
  // moustache
  g.fillStyle = JIM.goldDark;
  g.fillRect(-9, -16, 18, 4);
  g.restore();
  if (glint > 0.05) star4(g, -10 * k, -30 * k, 22 * k * glint, seed, 'rgba(255,248,220,0.95)');
  void easeOut;
  void rgb;
}
