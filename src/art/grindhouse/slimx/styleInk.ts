/**
 * CANDIDATE A — "INKED COMIC" (Streets of Rage 4 / Final Fight direction).
 * Heroic brawler anatomy on the shared 3/4 rig: V-wedge torso, bull neck, anatomical arm shapes (deltoid, bicep,
 * tricep, a forearm that swells near the elbow), mitten fists with two knuckle creases, 70s flared jeans over chunky
 * boots. Three line weights (silhouette 2.6 / part 1.2 / detail 0.8), 3-tone hard cel from ONE key light (up-front),
 * brush-tapered anatomy lines, spot blacks under the chest and jaw. Tattoos are bold 2-colour flash stamps (cached).
 */
import { type Ctx, drawSprite, sprite } from '../../core/canvas';
import { TAU } from '../../core/math';
import { CF } from '../../palette';
import { type Rig, type V, tAt } from './rig';
import { type Cmd, Sheet, add, ellipseIn, frame, lerpV, mul, nrm, qpts, seg, shapePath, strokeIn, sub, taper, unit } from './paint';

export const INK = '#1A1410';
const C = {
  skin: '#D8956A',
  skinSh: '#A4603C',
  skinHi: '#F4BE92',
  skinFar: '#BD7C54',
  skinFarSh: '#8E5232',
  shirt: CF.tangerine,
  shirtSh: CF.tangerineShade,
  shirtHi: CF.tangerineHi,
  tank: '#F4EFE2',
  tankSh: '#C9BBA3',
  stripe: CF.cream,
  denim: '#3E5C8A',
  denimSh: '#27395A',
  denimHi: '#6A8BBB',
  denimFar: '#324C74',
  boot: '#5A3622',
  bootSh: '#2E1B10',
  sole: '#1E130C',
  hair: '#2E2019',
  hairSh: '#150D09',
  hairHi: '#6E4E3A',
  brass: '#B08E4E',
  teal: '#3E8C84',
  brick: '#9A4A3A',
  cueMaple: CF.cueMaple,
  cueSh: CF.cueMapleShade,
  cueButt: CF.cueButt,
  tipBlue: '#3F7FB8',
};

/** key light: up and in front of him (character space unit vector) */
const LX = 0.55;
const LY = -0.83;

// ------------------------------------------------------------------------------ tattoo flash (cached stamps)

function flash(key: string, draw: (g: Ctx) => void) {
  return sprite(`slimxA:${key}`, 22, 16, 11, 8, draw, 4);
}

const TATS = {
  panther: () =>
    flash('panther', (g) => {
      // snarling panther head: black mass, teal eye, brick mouth
      g.fillStyle = INK;
      g.beginPath();
      g.moveTo(-8, -3);
      g.quadraticCurveTo(-6, -8, -1, -6);
      g.lineTo(1, -8);
      g.lineTo(3, -5);
      g.quadraticCurveTo(8, -4, 9, 1);
      g.quadraticCurveTo(6, 5, 1, 5);
      g.quadraticCurveTo(-5, 6, -8, -3);
      g.fill();
      g.fillStyle = C.brick;
      g.beginPath();
      g.moveTo(3, 1);
      g.lineTo(8.5, 1.5);
      g.lineTo(4, 4);
      g.fill();
      g.fillStyle = C.teal;
      g.beginPath();
      g.ellipse(2, -2, 1.6, 1, 0.3, 0, TAU);
      g.fill();
    }),
  swallow: () =>
    flash('swallow', (g) => {
      g.fillStyle = C.teal;
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(-9, 2);
      g.quadraticCurveTo(-3, -1, 1, 0);
      g.quadraticCurveTo(4, -7, 9, -6);
      g.quadraticCurveTo(5, -3, 4, 0);
      g.quadraticCurveTo(7, 2, 8, 5);
      g.quadraticCurveTo(3, 3, 0, 3);
      g.quadraticCurveTo(-4, 5, -9, 2);
      g.fill();
      g.stroke();
      g.fillStyle = C.brick;
      g.beginPath();
      g.arc(0.5, 1.5, 1.4, 0, TAU);
      g.fill();
    }),
  banner: () =>
    flash('banner', (g) => {
      // 8-BALL banner: a black ball on a brick scroll
      g.fillStyle = C.brick;
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(-10, -2);
      g.lineTo(10, -3);
      g.lineTo(9, 2);
      g.lineTo(-9, 3);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = INK;
      g.beginPath();
      g.arc(0, -0.3, 4.6, 0, TAU);
      g.fill();
      g.fillStyle = '#F4EFE2';
      g.beginPath();
      g.arc(0.6, -1, 2, 0, TAU);
      g.fill();
      g.fillStyle = INK;
      g.font = '800 3px Arial, sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('8', 0.6, -0.8);
    }),
  dagger: () =>
    flash('dagger', (g) => {
      // dagger through a heart
      g.fillStyle = C.brick;
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(0, 4.5);
      g.bezierCurveTo(-7, 0, -5, -6, -1, -3.5);
      g.bezierCurveTo(1, -6, 7, -4, 0, 4.5);
      g.fill();
      g.stroke();
      g.fillStyle = C.teal;
      g.beginPath();
      g.moveTo(-10, -0.8);
      g.lineTo(6, -0.8);
      g.lineTo(10, 0);
      g.lineTo(6, 0.8);
      g.lineTo(-10, 0.8);
      g.closePath();
      g.fill();
      g.stroke();
      g.fillStyle = INK;
      g.fillRect(-7, -2.4, 1.4, 4.8);
    }),
};

function tattoo(g: Ctx, s: ReturnType<typeof flash>, at: V, ang: number, sc = 1, alpha = 0.92): void {
  g.globalAlpha = alpha;
  drawSprite(g, s, at[0], at[1], ang, sc, sc);
  g.globalAlpha = 1;
}

// ------------------------------------------------------------------------------ parts

function armShape(r: Rig, near: boolean, flex: number): Path2D {
  const sh = near ? r.shN : r.shF;
  const el = near ? r.elN : r.elF;
  const wr = near ? r.wrN : r.wrF;
  const p = new Path2D();
  // +n side = tricep for a hanging arm; the bicep peaks on -n with the flex
  const bi = 10.5 + flex * 3.8;
  seg(p, sh, el, [10.5, 9.5, 7], [11, bi, 7], 0.45);
  seg(p, el, wr, [7.5, 9.8, 6.3], [7, 8.8, 5.8], 0.38);
  return p;
}

function fistShape(r: Rig, near: boolean, open: boolean): { p: Path2D; f: (x: number, y: number) => V } {
  const wr = near ? r.wrN : r.wrF;
  const a = near ? r.handAN : r.handAF;
  const f = frame(wr, a);
  const cmds: Cmd[] = open
    ? [['M', -1, -6.5], ['Q', 6, -8.5, 11, -7], ['L', 17, -8], ['Q', 19, -5, 16, -3.5], ['L', 18, -1], ['Q', 19, 2, 16, 2.5], ['L', 17, 5], ['Q', 16, 8, 12, 7], ['Q', 5, 9, -1, 6.5], ['Z']]
    : [
        ['M', -1, -7],
        ['Q', 4, -9.5, 10, -9],
        ['Q', 13.5, -9, 15, -7],
        ['Q', 17.5, -6, 16.8, -3.2],
        ['Q', 17.8, -1, 16.8, 1.2],
        ['Q', 17.8, 3.6, 16.4, 5.6],
        ['Q', 15, 8.8, 10, 8.8],
        ['Q', 4, 9.5, -1, 7],
        ['Z'],
      ];
  return { p: shapePath(f, cmds), f };
}

function fistDetail(g: Ctx, f: (x: number, y: number) => V, open: boolean): void {
  if (open) return;
  // two knuckle creases + the thumb wrapped over the fingers
  strokeIn(g, f, [['M', 12.8, -3.4], ['L', 16.4, -3.1], ['M', 12.8, 1], ['L', 16.4, 1.2], ['M', 12.6, 4.9], ['L', 15.8, 5.3]], 0.75, INK);
  // thumb wrapped over the fingers
  const th = shapePath(f, [['M', 3, -8.6], ['Q', 9.5, -7, 12.8, -2.4], ['Q', 13.2, -0.4, 11.4, -0.5], ['Q', 8, -3, 3, -4.6], ['Z']]);
  g.fillStyle = 'rgba(255,215,170,0.35)';
  g.fill(th);
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.stroke(th);
}

function legShape(r: Rig, near: boolean): Path2D {
  const hp = near ? r.hipN : r.hipF;
  const kn = near ? r.kneeN : r.kneeF;
  const an = near ? r.ankN : r.ankF;
  const p = new Path2D();
  // +n = back of the leg for a leg pointing down (hamstring / calf)
  seg(p, hp, kn, [10, 9.2, 6.8], [10, 10, 7.2], 0.45);
  // 70s flare: the jeans widen to the hem over the boot
  seg(p, kn, an, [7, 7.4, 9.4], [7.2, 6.4, 9.4], 0.4);
  return p;
}

function bootShape(r: Rig, near: boolean): { p: Path2D; f: (x: number, y: number) => V } {
  const an = near ? r.ankN : r.ankF;
  const fa = near ? r.footN : r.footF;
  const f = frame(an, fa);
  const p = shapePath(f, [['M', -7, -3], ['L', 6, -3], ['Q', 12, -2.5, 15, 1], ['Q', 18.5, 3, 18, 7], ['L', -8.5, 7], ['Q', -9.5, 2, -7, -3], ['Z']]);
  return { p, f };
}

function torsoPath(r: Rig): Path2D {
  const f = (u: number, v: number) => tAt(r, u, v);
  // (x = u up the spine, y = v forward)
  return shapePath(f, [
    ['M', -5, -15],
    ['L', -5, 16],
    ['Q', 8, 20.5, 20, 21],
    ['Q', 31, 26, 39, 24.5],
    ['Q', 47, 25, 50, 16],
    ['Q', 55, 12, 56.5, 4],
    ['L', 57.5, -6],
    ['Q', 55, -17, 48, -25],
    ['Q', 42, -32, 33, -28],
    ['Q', 22, -23, 12, -18],
    ['Q', 3, -16.5, -5, -15],
    ['Z'],
  ]);
}

function seatPath(r: Rig): Path2D {
  // jeans seat / crotch that the legs grow out of
  const p = new Path2D();
  const f = (u: number, v: number) => tAt(r, u, v);
  const c = f(-3, 0);
  const pa = Math.atan2(r.hipF[1] - r.hipN[1], r.hipF[0] - r.hipN[0]);
  ellipseIn(p, [c[0], c[1] + 2], 15.5, 9.5, pa);
  return p;
}

function cueParts(sheet: Sheet, r: Rig): void {
  const { butt, tip, dir } = r.cue;
  const n = nrm(dir);
  const L = r.b.cueLen;
  const at = (k: number, w: number): V => [butt[0] + dir[0] * L * k + n[0] * w, butt[1] + dir[1] * L * k + n[1] * w];
  const p = new Path2D();
  const w0 = 3.1;
  const w1 = 1.55;
  const a = at(0, w0);
  p.moveTo(a[0], a[1]);
  const b = at(1, w1);
  p.lineTo(b[0], b[1]);
  p.arc(tip[0], tip[1], w1, Math.atan2(n[1], n[0]), Math.atan2(-n[1], -n[0]), true);
  const c = at(0, -w0);
  p.lineTo(c[0], c[1]);
  p.arc(butt[0], butt[1], w0, Math.atan2(-n[1], -n[0]), Math.atan2(n[1], n[0]), true);
  p.closePath();
  const band = (k0: number, k1: number, col: string) => (g: Ctx) => {
    const q = new Path2D();
    const A = at(k0, 5);
    const B = at(k1, 5);
    const Cc = at(k1, -5);
    const Dd = at(k0, -5);
    q.moveTo(A[0], A[1]);
    q.lineTo(B[0], B[1]);
    q.lineTo(Cc[0], Cc[1]);
    q.lineTo(Dd[0], Dd[1]);
    q.closePath();
    g.fillStyle = col;
    g.fill(q);
  };
  sheet.add({
    p,
    fill: C.cueMaple,
    shade: C.cueSh,
    sh: 1.2,
    part: 1,
    detail: (g) => {
      band(0, 0.36, C.cueButt)(g);
      band(0.3, 0.33, C.cueMaple)(g);
      band(0.93, 0.975, CF.cream)(g);
      band(0.975, 1.01, C.tipBlue)(g);
      // two gold trophy notches in the butt
      band(0.06, 0.075, CF.gold)(g);
      band(0.1, 0.115, CF.gold)(g);
    },
  });
}

// ------------------------------------------------------------------------------ head

function headParts(sheet: Sheet, r: Rig): void {
  const f = frame(r.head, r.headA);
  const face = r.face;
  // neck: a short bull neck buried in the traps
  const neck = new Path2D();
  seg(neck, r.neck, f(-1, 6), [9, 8.5, 8], [9, 9, 8.5]);
  sheet.add({ p: neck, fill: C.skin, shade: C.skinSh, sh: 3.2, part: 1.2 });
  // skull + heavy jaw
  const skull = shapePath(f, [
    ['M', -11, -8],
    ['Q', -9, -17, 1, -16],
    ['Q', 11, -15, 12.5, -6],
    ['L', 13.5, -2],
    ['Q', 15.5, 3, 14.5, 7],
    ['Q', 14.5, 12, 11, 14.5],
    ['Q', 5, 17.5, -1, 15.5],
    ['Q', -8.5, 13.5, -10.5, 6],
    ['Q', -13, -1, -11, -8],
    ['Z'],
  ]);
  sheet.add({
    p: skull,
    fill: C.skin,
    shade: C.skinSh,
    sh: 3.4,
    hi: C.skinHi,
    hs: 1.1,
    detail: (g) => {
      // spot black under the jaw / eye socket shadow
      g.fillStyle = 'rgba(90,40,20,0.35)';
      g.fill(shapePath(f, [['M', 3, -6], ['Q', 8, -8, 14, -5.5], ['L', 14, -2.5], ['Q', 8, -4.5, 3, -3.5], ['Z']]));
      eyes(g, f, face);
    },
  });
  // mutton chops (+ horseshoe moustache), one dark mass
  const chops = shapePath(f, [
    ['M', -6.5, -3.5],
    ['Q', -2, -4, 0.5, -1],
    ['Q', 2, 4, 6.5, 6],
    ['Q', 11, 3.6, 15.8, 5],
    ['Q', 17.6, 6.6, 16.2, 8.6],
    ['Q', 14.6, 8.4, 14, 9.6],
    ['L', 14.2, 13.8],
    ['Q', 13.3, 14.8, 12.4, 13.8],
    ['L', 12.2, 10],
    ['Q', 10.8, 9.4, 9.8, 10],
    ['L', 9.6, 14.2],
    ['Q', 8, 15.6, 5, 14.6],
    ['Q', -1, 14.5, -4.5, 11],
    ['Q', -8, 5, -6.5, -3.5],
    ['Z'],
  ]);
  sheet.add({
    p: chops,
    fill: C.hair,
    shade: C.hairSh,
    sh: 2,
    part: 0.9,
    sil: true,
    detail: (g) => {
      // a few hair strokes catching the light
      g.strokeStyle = C.hairHi;
      g.lineWidth = 0.7;
      g.stroke(shapePath(f, [['M', -4, 1], ['Q', -2, 6, 0, 10], ['M', 1, 2], ['Q', 3, 5, 5, 7]]));
    },
  });
  // mouth sits in the horseshoe
  sheet.add({ p: new Path2D(), fill: 'transparent', part: 0, sil: false, over: (g) => mouth(g, f, face) });
  // nose: a boxer's bulb breaking the profile
  const nose = shapePath(f, [['M', 12.3, -3.2], ['Q', 16.8, -1.5, 17.3, 2.4], ['Q', 17.4, 4.6, 14.6, 4.4], ['Q', 12.8, 4.3, 12.2, 2.8], ['Z']]);
  sheet.add({ p: nose, fill: C.skin, shade: C.skinSh, sh: 1.4, part: 0.9 });
  // 70s shag: volume over the crown, feathered flicks at the nape, swept fringe
  const hair = shapePath(f, [
    ['M', 13.5, -8.5],
    ['Q', 15.5, -15, 9, -19],
    ['Q', 0, -24, -10, -20],
    ['Q', -17, -16, -18, -7],
    ['Q', -18.5, 0, -16, 5],
    ['L', -20.5, 9],
    ['Q', -17, 10.5, -14, 9],
    ['L', -17.5, 14.5],
    ['Q', -12, 14.5, -9.5, 9],
    ['Q', -7.5, 3, -6.5, -3.5],
    ['Q', -2, -7, 4, -9],
    ['Q', 9, -10, 13.5, -8.5],
    ['Z'],
  ]);
  sheet.add({
    p: hair,
    fill: C.hair,
    shade: C.hairSh,
    sh: 3,
    hi: C.hairHi,
    hs: 1.2,
    detail: (g) => {
      // feathered wings: two light bands swept back from the part + dark strand lines
      taper(g, qpts(f(11, -15), f(2, -20), f(-13, -14), 8), 3.2, 0.3, C.hairHi);
      taper(g, qpts(f(6, -11), f(-4, -13), f(-15, -4), 8), 2, 0.2, C.hairHi);
      g.strokeStyle = C.hairSh;
      g.lineWidth = 0.8;
      g.stroke(shapePath(f, [['M', 9, -12], ['Q', -1, -15, -12, -9], ['M', -13, 1], ['Q', -15, 6, -18, 11]]));
    },
  });
  // heavy brow ridge (over the hair's fringe shadow)
  sheet.add({ p: new Path2D(), fill: 'transparent', part: 0, sil: false, over: (g) => browBar(g, f, face.brow, face.eyes) });
}

function eyes(g: Ctx, f: (x: number, y: number) => V, face: Rig['face']): void {
  const e = face.eyes;
  const spots: [number, number, number][] = [
    [5.5, -3, 1],
    [12, -3.2, 0.7],
  ];
  for (const [x, y, k] of spots) {
    const c = f(x, y);
    if (e === 'closed' || e === 'happy') {
      g.strokeStyle = INK;
      g.lineWidth = 1.2;
      g.stroke(shapePath(f, e === 'happy' ? [['M', x - 2.4 * k, y + 0.8], ['Q', x, y - 1.8, x + 2.4 * k, y + 0.8]] : [['M', x - 2.4 * k, y], ['Q', x, y + 1.2, x + 2.4 * k, y]]));
      continue;
    }
    const ry = e === 'squint' || e === 'angry' ? 1.25 : e === 'wide' ? 2.6 : 1.9;
    const rx = (e === 'wide' ? 2.8 : 2.4) * k;
    g.fillStyle = '#FBF6EC';
    g.beginPath();
    g.ellipse(c[0], c[1], rx, ry, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.7;
    g.stroke();
    if (e === 'x') {
      g.lineWidth = 0.9;
      g.stroke(shapePath(f, [['M', x - 1.6, y - 1.6], ['L', x + 1.6, y + 1.6], ['M', x + 1.6, y - 1.6], ['L', x - 1.6, y + 1.6]]));
      continue;
    }
    if (e === 'spiral') {
      g.lineWidth = 0.7;
      g.beginPath();
      for (let a = 0; a < TAU * 2; a += 0.4) {
        const rr = 0.2 + a * 0.16;
        const px = c[0] + Math.cos(a) * rr;
        const py = c[1] + Math.sin(a) * rr;
        if (a === 0) g.moveTo(px, py);
        else g.lineTo(px, py);
      }
      g.stroke();
      continue;
    }
    g.fillStyle = INK;
    g.beginPath();
    g.arc(c[0] + face.lx * 0.9 * k, c[1] + face.ly * 0.5, (e === 'wide' ? 1 : 1.25) * k, 0, TAU);
    g.fill();
  }
}

function browBar(g: Ctx, f: (x: number, y: number) => V, brow: number, eyes: string): void {
  if (eyes === 'spiral' || eyes === 'x') brow = -0.7;
  const d = brow * 1.6;
  const p = shapePath(f, [
    ['M', 1.5, -6.2 - d * 0.3],
    ['Q', 5, -8.2 + d * 0.2, 8.3, -6.8 + d],
    ['Q', 11.5, -8 + d * 0.3, 15, -6.4 - d * 0.2],
    ['L', 14.5, -4.8 - d * 0.2],
    ['Q', 11.5, -6 + d * 0.3, 8.3, -4.6 + d],
    ['Q', 5, -6 + d * 0.2, 2, -4.4 - d * 0.3],
    ['Z'],
  ]);
  g.fillStyle = INK;
  g.fill(p);
}

function mouth(g: Ctx, f: (x: number, y: number) => V, face: Rig['face']): void {
  const m = face.mouth;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  if (m === 'smirk') {
    g.strokeStyle = INK;
    g.lineWidth = 1;
    g.stroke(shapePath(f, [['M', 9.2, 11.2], ['Q', 11, 11.8, 12.6, 10.3]]));
    return;
  }
  if (m === 'grin' || m === 'grit') {
    const p = shapePath(f, [['M', 8.8, 10.2], ['Q', 11, 10.8, 13.2, 9.8], ['Q', 12.8, 13, 11, 13.2], ['Q', 9.2, 13, 8.8, 10.2], ['Z']]);
    g.fillStyle = '#FBF6EC';
    g.fill(p);
    g.strokeStyle = INK;
    g.lineWidth = 0.8;
    g.stroke(p);
    if (m === 'grit') g.stroke(shapePath(f, [['M', 9, 11.6], ['L', 13, 11.4], ['M', 11, 10.6], ['L', 11, 13]]));
    return;
  }
  if (m === 'shout' || m === 'o') {
    const o = face.open;
    const h = m === 'o' ? 2.2 + o * 1.5 : 2.5 + o * 3.5;
    const w = m === 'o' ? 1.8 : 2.6;
    const c = f(11, 10.8 + h * 0.4);
    g.fillStyle = '#3A1210';
    g.beginPath();
    g.ellipse(c[0], c[1], w, h * 0.55, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.9;
    g.stroke();
    if (m === 'shout') {
      g.fillStyle = '#FBF6EC';
      g.fillRect(c[0] - w * 0.7, c[1] - h * 0.55, w * 1.4, 1.2);
    }
    return;
  }
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.stroke(shapePath(f, [['M', 8.8, 11], ['L', 9.8, 10.3], ['L', 10.8, 11.2], ['L', 11.8, 10.3], ['L', 12.8, 11]]));
}

// ------------------------------------------------------------------------------ body assembly

function torsoParts(sheet: Sheet, r: Rig): void {
  const tp = torsoPath(r);
  const f = (u: number, v: number) => tAt(r, u, v);
  sheet.add({
    p: tp,
    fill: C.shirt,
    shade: C.shirtSh,
    sh: 5.5,
    hi: C.shirtHi,
    hs: 1.3,
    detail: (g) => {
      // the open shirt shows the cream tank: panel shaded with the TORSO's form
      const tank = shapePath(f, [['M', 58, -3], ['Q', 50, 1.5, 44, 3.5], ['Q', 26, 6.5, -7, 7.5], ['L', -7, 40], ['L', 60, 40], ['Z']]);
      panel(g, tank, tp, C.tank, C.tankSh, 5.5);
      // far shirt front over the far side of the chest
      const farFront = shapePath(f, [['M', 52, 16], ['Q', 36, 18.5, 18, 18], ['Q', 6, 17.5, -7, 18.5], ['L', -7, 40], ['L', 60, 40], ['Z']]);
      panel(g, farFront, tp, C.shirt, C.shirtSh, 5.5);
      // belt + buckle in the gap
      const belt = shapePath(f, [['M', 2.5, 6], ['L', 2.5, 19], ['L', -6, 19], ['L', -6, 6], ['Z']]);
      g.fillStyle = '#2A1A10';
      g.fill(belt);
      const bk = shapePath(f, [['M', 2, 9.5], ['L', 2, 15], ['L', -4, 15], ['L', -4, 9.5], ['Z']]);
      g.fillStyle = C.brass;
      g.fill(bk);
      // cream bowling-shirt panel stripe down the near front
      const stripe = shapePath(f, [['M', 47, -15], ['Q', 24, -11, -7, -10.5], ['L', -7, -7.6], ['Q', 24, -8.2, 47, -12], ['Z']]);
      panel(g, stripe, tp, C.stripe, C.tankSh, 5.5);
      // pocket + SLIM stitch
      g.strokeStyle = C.shirtSh;
      g.lineWidth = 0.8;
      g.stroke(shapePath(f, [['M', 38, -3], ['L', 29, -2.2], ['L', 29.5, 5.5]]));
      // anatomy under the shirt: a pec shadow, tapered brush lines (thin inside, never full-weight seams)
      taper(g, qpts(f(40, 3), f(32, 12), f(27, 22), 6), 1.6, 0.2, 'rgba(26,20,16,0.7)');
      taper(g, qpts(f(44, 3), f(45.5, -2), f(52, -3), 5), 1.2, 0.2, 'rgba(26,20,16,0.6)');
      // lapel edges
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.stroke(shapePath(f, [['M', 58, -3], ['Q', 50, 1.5, 44, 3.5], ['Q', 26, 6.5, -7, 7.5], ['M', 52, 16], ['Q', 36, 18.5, 18, 18], ['Q', 6, 17.5, -7, 18.5]]));
    },
  });
}

/** fill a sub-panel of `form` with its own base/shade, shaded by the FORM's volume */
function panel(g: Ctx, sub: Path2D, form: Path2D, base: string, shade: string, k: number): void {
  g.save();
  g.clip(sub);
  g.fillStyle = shade;
  g.fill(form);
  g.translate(LX * k, LY * k);
  g.fillStyle = base;
  g.fill(form);
  g.restore();
}

function sleeveParts(sheet: Sheet, r: Rig, near: boolean): void {
  const sh = near ? r.shN : r.shF;
  const el = near ? r.elN : r.elF;
  const d = unit(sub(el, sh));
  const end = add(sh, mul(d, 10));
  const p = new Path2D();
  seg(p, add(sh, mul(d, -1)), end, [11.6, 11.4, 11], [11.8, 11.6, 11.2]);
  const cuffA = add(sh, mul(d, 6.5));
  sheet.add({
    p,
    fill: near ? C.shirt : C.shirtSh,
    shade: C.shirtSh,
    sh: 3,
    part: 0,
    detail: (g) => {
      // rolled cuff: a cream-lined band
      const n = nrm(d);
      const q = new Path2D();
      const a0 = add(cuffA, mul(n, 14));
      const a1 = add(cuffA, mul(n, -14));
      const b1 = add(a1, mul(d, 6));
      const b0 = add(a0, mul(d, 6));
      q.moveTo(a0[0], a0[1]);
      q.lineTo(a1[0], a1[1]);
      q.lineTo(b1[0], b1[1]);
      q.lineTo(b0[0], b0[1]);
      q.closePath();
      g.fillStyle = near ? C.shirtHi : C.shirt;
      g.fill(q);
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(a0[0], a0[1]);
      g.lineTo(a1[0], a1[1]);
      g.stroke();
    },
  });
}

function armParts(sheet: Sheet, r: Rig, near: boolean, withFist = true): void {
  const flex = near ? r.flex : r.pose.flex * 0.6;
  const p = armShape(r, near, flex);
  const sh = near ? r.shN : r.shF;
  const el = near ? r.elN : r.elF;
  const wr = near ? r.wrN : r.wrF;
  sheet.add({
    p,
    fill: near ? C.skin : C.skinFar,
    shade: near ? C.skinSh : C.skinFarSh,
    sh: 3.4,
    hi: near ? C.skinHi : undefined,
    hs: 1,
    detail: (g) => {
      const au = Math.atan2(el[1] - sh[1], el[0] - sh[0]);
      const af = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
      // sleeve tattoos: bold flash stamps along the limb
      tattoo(g, near ? TATS.panther() : TATS.dagger(), lerpV(sh, el, 0.62), au, 0.85);
      tattoo(g, near ? TATS.swallow() : TATS.banner(), lerpV(el, wr, 0.45), af, 0.9);
      // muscle lines: bicep split + elbow crease, tapered
      const n = nrm(unit(sub(el, sh)));
      const bi = lerpV(sh, el, 0.55);
      taper(g, qpts(add(bi, mul(n, -3)), add(lerpV(sh, el, 0.8), mul(n, -6)), add(el, mul(n, -3)), 5), 1.2, 0.2, 'rgba(26,20,16,0.55)');
      taper(g, qpts(add(el, mul(n, 2)), add(el, mul(n, -1)), lerpV(el, wr, 0.2), 4), 1.1, 0.2, 'rgba(26,20,16,0.6)');
    },
  });
  sleeveParts(sheet, r, near);
  if (withFist) fistParts(sheet, r, near);
}

function fistParts(sheet: Sheet, r: Rig, near: boolean): void {
  const open = near ? r.pose.openN : r.pose.openF;
  const { p, f } = fistShape(r, near, open);
  sheet.add({ p, fill: near ? C.skin : C.skinFar, shade: near ? C.skinSh : C.skinFarSh, sh: 2.4, detail: (g) => fistDetail(g, f, open) });
}

function legParts(sheet: Sheet, r: Rig, near: boolean): void {
  const p = legShape(r, near);
  const hp = near ? r.hipN : r.hipF;
  const kn = near ? r.kneeN : r.kneeF;
  const an = near ? r.ankN : r.ankF;
  sheet.add({
    p,
    fill: near ? C.denim : C.denimFar,
    shade: C.denimSh,
    sh: 3.4,
    hi: near ? C.denimHi : undefined,
    hs: 1,
    detail: (g) => {
      // outseam + knee fold
      const n = nrm(unit(sub(kn, hp)));
      g.strokeStyle = 'rgba(210,190,140,0.55)';
      g.lineWidth = 0.7;
      g.beginPath();
      const s0 = add(hp, mul(n, -4));
      const s1 = add(kn, mul(n, -3.5));
      const n2 = nrm(unit(sub(an, kn)));
      const s2 = add(an, mul(n2, -5.5));
      g.moveTo(s0[0], s0[1]);
      g.quadraticCurveTo(s1[0], s1[1], s2[0], s2[1]);
      g.stroke();
      taper(g, qpts(add(kn, mul(n, 5)), kn, add(kn, mul(n2, -4)), 4), 1, 0.2, 'rgba(10,14,30,0.6)');
    },
  });
  const b = bootShape(r, near);
  sheet.add({
    p: b.p,
    fill: near ? C.boot : C.bootSh,
    shade: C.bootSh,
    sh: 2,
    detail: (g) => {
      g.fillStyle = C.sole;
      g.fill(shapePath(b.f, [['M', -10, 4.6], ['L', 20, 4.6], ['L', 20, 9], ['L', -10, 9], ['Z']]));
      g.fillStyle = 'rgba(255,220,180,0.25)';
      g.fill(shapePath(b.f, [['M', 7, -1.5], ['Q', 12, -1, 14, 1.5], ['L', 11, 1.8], ['Z']]));
    },
  });
}

export function paintInk(g: Ctx, r: Rig): void {
  const sheet = new Sheet();
  const P = r.pose;
  const cueF = r.cue.hand === 'F' && !r.cue.second;
  // back to front
  if (!P.farFront) armParts(sheet, r, false, !cueF);
  if (cueF) {
    cueParts(sheet, r);
    fistParts(sheet, r, false);
  }
  legParts(sheet, r, false);
  const seat = seatPath(r);
  sheet.add({ p: seat, fill: C.denim, shade: C.denimSh, sh: 3 });
  legParts(sheet, r, true);
  torsoParts(sheet, r);
  if (P.farFront) armParts(sheet, r, false, false);
  headParts(sheet, r);
  if (!cueF) cueParts(sheet, r);
  if (P.farFront) fistParts(sheet, r, false);
  armParts(sheet, r, true);
  sheet.draw(g, { outer: 2.6, part: 1.2, ink: INK, lx: LX, ly: LY });
}
