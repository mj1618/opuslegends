/**
 * SLIM — "INKED COMIC" (Streets of Rage 4 / Final Fight direction), the in-game hero since iteration 9.
 * Heroic brawler anatomy on the shared 3/4 rig: a V-wedge torso with a lat flare and a pec shelf, traps the head
 * sits in, a big 70s camp collar, anatomical arms (deltoid under a rolled sleeve, bicep peak, Popeye forearms that
 * swell below the elbow), fists with knuckles / finger creases / a wrapped thumb, 70s flared jeans over chunky
 * heeled boots, open shirt tails that flutter with speed.
 * Three line weights (silhouette 2.6 / part 1.15 / detail 0.7-0.9), a 3-tone hard cel from ONE key light (up-front):
 * base, shadow (the part shifted away from the light) and a lit edge; spot blacks (collar, under the pecs, the jaw).
 * Face: shaggy feathered hair with a side part and nape flicks, MUTTON CHOPS joined by a horseshoe moustache with a
 * clean, lit chin (never a full beard), a boxer's nose, a heavy brow that carries the expression.
 * Tattoos are bold 2-colour flash stamps (cached sprites).
 */
import { type Ctx, drawSprite, sprite } from '../../core/canvas';
import { TAU } from '../../core/math';
import { CF } from '../../palette';
import { type Rig, type V, tAt } from './rig';
import { type Cmd, Sheet, add, ellipseIn, frame, lerpV, mul, nrm, qpts, seg, shapePath, strokeIn, sub, taper, unit } from './paint';

export const INK = '#1A1410';
const C = {
  skin: '#DE9A6C',
  skinSh: '#A95F3A',
  skinHi: '#F7C697',
  skinFar: '#C3805A',
  skinFarSh: '#8E5232',
  lip: '#9A4A36',
  shirt: CF.tangerine,
  shirtSh: CF.tangerineShade,
  shirtHi: CF.tangerineHi,
  shirtFar: '#E0701A',
  tank: '#F4EFE2',
  tankSh: '#C2B39A',
  stripe: CF.cream,
  denim: '#40609A',
  denimSh: '#26385C',
  denimHi: '#7094C8',
  denimFar: '#2E456E',
  boot: '#6A3F25',
  bootSh: '#351F12',
  bootHi: '#A0683E',
  sole: '#1E130C',
  hair: '#33231A',
  hairSh: '#170E09',
  hairHi: '#7A5640',
  brass: '#C9A45A',
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
const SPOT = 'rgba(40,14,6,0.42)';

// ------------------------------------------------------------------------------ tattoo flash (cached stamps)

function flash(key: string, draw: (g: Ctx) => void) {
  return sprite(`slimxA:${key}`, 22, 16, 11, 8, draw, 4);
}

const TATS = {
  panther: () =>
    flash('panther', (g) => {
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

function tattoo(g: Ctx, s: ReturnType<typeof flash>, at: V, ang: number, sc = 1, alpha = 0.9): void {
  g.globalAlpha = alpha;
  drawSprite(g, s, at[0], at[1], ang, sc, sc);
  g.globalAlpha = 1;
}

/** fill a sub-panel of `form` with its own base/shade, shaded by the FORM's volume (the panel follows the body) */
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

// ------------------------------------------------------------------------------ arms + fists

function armShape(r: Rig, near: boolean, flex: number): Path2D {
  const sh = near ? r.shN : r.shF;
  const el = near ? r.elN : r.elF;
  const wr = near ? r.wrN : r.wrF;
  const p = new Path2D();
  // +n = tricep side for a hanging arm; the bicep (-n) peaks with the flex
  const bi = 10.8 + flex * 4.2;
  seg(p, sh, el, [10.4, 10.2, 7.4], [10.6, bi, 7.4], 0.56);
  // Popeye forearm: swells a third of the way down, tapers hard to the wrist
  seg(p, el, wr, [8, 11, 6.2], [7.6, 10.2, 5.8], 0.3);
  return p;
}

function fistShape(r: Rig, near: boolean, open: boolean): { p: Path2D; f: (x: number, y: number) => V } {
  const wr = near ? r.wrN : r.wrF;
  const a = near ? r.handAN : r.handAF;
  const f = frame(wr, a, 1.08, 1.08);
  const cmds: Cmd[] = open
    ? [
        // open hand: palm + four splayed fingers + thumb
        ['M', -1, -6.5],
        ['Q', 5, -9, 10, -8],
        ['L', 18, -10.5],
        ['Q', 20, -8.5, 18, -6.8],
        ['L', 20, -4.8],
        ['Q', 21.5, -2.4, 19, -1.6],
        ['L', 20.4, 0.8],
        ['Q', 21, 3.4, 18.4, 3.4],
        ['L', 18.2, 5.6],
        ['Q', 17.4, 8, 14.6, 6.8],
        ['L', 12, 6.4],
        ['L', 12.5, 11],
        ['Q', 10.5, 13, 8.6, 10.6],
        ['Q', 4, 9, -1, 6.5],
        ['Z'],
      ]
    : [
        // fist: a heavy block, knuckle ridge at the end, the curled fingers bulge on the front
        ['M', -1, -7.2],
        ['Q', 4, -9.8, 10, -9.4],
        ['Q', 14.5, -9.4, 16.2, -7],
        ['Q', 18.4, -4.8, 17.8, -2],
        ['Q', 18.8, 0.6, 17.6, 3],
        ['Q', 18.4, 5.8, 16.4, 7.6],
        ['Q', 14.2, 10, 9.6, 9.6],
        ['Q', 4, 9.8, -1, 7.2],
        ['Z'],
      ];
  return { p: shapePath(f, cmds), f };
}

function fistDetail(g: Ctx, f: (x: number, y: number) => V, open: boolean, near: boolean): void {
  if (open) {
    strokeIn(g, f, [['M', 12, -5.5], ['L', 17, -7.4], ['M', 12.8, -2], ['L', 18, -3], ['M', 12.8, 1.6], ['L', 17.6, 1.4]], 0.7, INK);
    return;
  }
  // finger creases across the curled fingers + the knuckle ridge
  strokeIn(g, f, [['M', 11.4, -4.6], ['Q', 14.5, -4.9, 17.4, -4.4], ['M', 11.2, -0.6], ['Q', 14.6, -0.8, 17.9, -0.3], ['M', 11, 3.4], ['Q', 14.2, 3.4, 17.4, 4]], 0.7, INK);
  strokeIn(g, f, [['M', 10.6, -8.6], ['Q', 11.6, 0, 10.4, 8.8]], 0.6, 'rgba(26,20,16,0.55)');
  // thumb wrapped over the index finger
  const th = shapePath(f, [['M', 2.5, -9], ['Q', 10, -8, 13.6, -3.4], ['Q', 14.4, -1, 12, -1.2], ['Q', 8, -3.6, 2.5, -4.4], ['Z']]);
  g.fillStyle = near ? C.skinHi : C.skin;
  g.globalAlpha = 0.55;
  g.fill(th);
  g.globalAlpha = 1;
  g.strokeStyle = INK;
  g.lineWidth = 0.8;
  g.stroke(th);
}

function sleeveParts(sheet: Sheet, r: Rig, near: boolean): void {
  const sh = near ? r.shN : r.shF;
  const el = near ? r.elN : r.elF;
  const d = unit(sub(el, sh));
  const n = nrm(d);
  // a short, boxy bowling-shirt sleeve over the deltoid, flaring to a rolled cuff at mid-bicep
  const a = add(sh, mul(d, -1));
  const b = add(sh, mul(d, 8.5));
  const p = new Path2D();
  seg(p, a, b, [10, 11.4, 12.2], [10.2, 11.6, 12.4], 0.5);
  sheet.add({
    p,
    fill: near ? C.shirt : C.shirtFar,
    shade: C.shirtSh,
    sh: 7,
    hi: near ? C.shirtHi : undefined,
    hs: 1.2,
    detail: (g) => {
      // rolled cuff: a band with a cream edge line + a fold shadow above it
      const c0 = add(b, mul(d, -4.6));
      const q = new Path2D();
      const p0 = add(c0, mul(n, 16));
      const p1 = add(c0, mul(n, -16));
      q.moveTo(p0[0], p0[1]);
      q.lineTo(p1[0], p1[1]);
      q.lineTo(p1[0] + d[0] * 8, p1[1] + d[1] * 8);
      q.lineTo(p0[0] + d[0] * 8, p0[1] + d[1] * 8);
      q.closePath();
      g.fillStyle = near ? C.shirt : C.shirtSh;
      g.fill(q);
      g.strokeStyle = C.stripe;
      g.lineWidth = 1.2;
      g.beginPath();
      const e0 = add(c0, mul(d, 2.4));
      g.moveTo(e0[0] + n[0] * 16, e0[1] + n[1] * 16);
      g.lineTo(e0[0] - n[0] * 16, e0[1] - n[1] * 16);
      g.stroke();
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.beginPath();
      g.moveTo(p0[0], p0[1]);
      g.lineTo(p1[0], p1[1]);
      g.stroke();
      // a crease from the shoulder seam
      taper(g, qpts(add(sh, mul(n, 5)), add(lerpV(sh, b, 0.5), mul(n, 7)), add(c0, mul(n, 5)), 5), 0.9, 0.2, 'rgba(90,30,0,0.55)');
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
    sh: 5,
    hi: near ? C.skinHi : undefined,
    hs: 1.1,
    detail: (g) => {
      const au = Math.atan2(el[1] - sh[1], el[0] - sh[0]);
      const af = Math.atan2(wr[1] - el[1], wr[0] - el[0]);
      tattoo(g, near ? TATS.panther() : TATS.dagger(), lerpV(sh, el, 0.72), au, 0.8);
      tattoo(g, near ? TATS.swallow() : TATS.banner(), lerpV(el, wr, 0.42), af, 0.95);
      // anatomy: bicep split into the elbow, the forearm's brachioradialis line (brush-tapered, thin)
      const n = nrm(unit(sub(el, sh)));
      const n2 = nrm(unit(sub(wr, el)));
      taper(g, qpts(add(lerpV(sh, el, 0.62), mul(n, -2)), add(lerpV(sh, el, 0.86), mul(n, -6)), add(el, mul(n, -4)), 5), 1.1, 0.2, 'rgba(26,20,16,0.5)');
      taper(g, qpts(add(el, mul(n2, -5)), add(lerpV(el, wr, 0.3), mul(n2, -9)), add(lerpV(el, wr, 0.62), mul(n2, -4)), 5), 1.1, 0.2, 'rgba(26,20,16,0.5)');
      // wrist band of shadow
      taper(g, qpts(add(lerpV(el, wr, 0.9), mul(n2, 6)), lerpV(el, wr, 0.93), add(lerpV(el, wr, 0.9), mul(n2, -6)), 4), 0.9, 0.3, 'rgba(26,20,16,0.35)');
    },
  });
  sleeveParts(sheet, r, near);
  if (withFist) fistParts(sheet, r, near);
}

function fistParts(sheet: Sheet, r: Rig, near: boolean): void {
  const open = near ? r.pose.openN : r.pose.openF;
  const { p, f } = fistShape(r, near, open);
  sheet.add({
    p,
    fill: near ? C.skin : C.skinFar,
    shade: near ? C.skinSh : C.skinFarSh,
    sh: 2.6,
    hi: near ? C.skinHi : undefined,
    hs: 0.9,
    detail: (g) => fistDetail(g, f, open, near),
  });
}

// ------------------------------------------------------------------------------ legs + boots

function legShape(r: Rig, near: boolean): Path2D {
  const hp = near ? r.hipN : r.hipF;
  const kn = near ? r.kneeN : r.kneeF;
  const an = near ? r.ankN : r.ankF;
  const p = new Path2D();
  // +n = back of the leg for a leg pointing down (hamstring / calf)
  seg(p, hp, kn, [9.4, 8.8, 6.8], [9.4, 9.4, 7], 0.42);
  // 70s flare: the jeans widen to the hem over the boot
  seg(p, kn, an, [7, 6.6, 10], [7, 6, 10], 0.42);
  return p;
}

function bootShape(r: Rig, near: boolean): { p: Path2D; f: (x: number, y: number) => V } {
  const an = near ? r.ankN : r.ankF;
  const fa = near ? r.footN : r.footF;
  const f = frame(an, fa);
  // chunky round-toe boot with a stacked heel (the hem covers the shaft)
  const p = shapePath(f, [
    ['M', -8, -4],
    ['L', 6, -4],
    ['Q', 13, -3.4, 16.5, 0],
    ['Q', 21, 2, 20.5, 5.6],
    ['L', 20, 7.4],
    ['L', 2, 7.4],
    ['L', 0.5, 5.8],
    ['L', -2.8, 5.8],
    ['L', -3.2, 7.4],
    ['L', -9.2, 7.4],
    ['Q', -10.4, 1.5, -8, -4],
    ['Z'],
  ]);
  return { p, f };
}

function legParts(sheet: Sheet, r: Rig, near: boolean): void {
  const p = legShape(r, near);
  const hp = near ? r.hipN : r.hipF;
  const kn = near ? r.kneeN : r.kneeF;
  const an = near ? r.ankN : r.ankF;
  // boot first: the flared hem sits over it
  const b = bootShape(r, near);
  sheet.add({
    p: b.p,
    fill: near ? C.boot : C.bootSh,
    shade: C.bootSh,
    sh: 2.2,
    detail: (g) => {
      g.fillStyle = C.sole;
      g.fill(shapePath(b.f, [['M', -11, 4.6], ['L', 22, 4.6], ['L', 22, 9], ['L', -11, 9], ['Z']]));
      if (near) {
        g.fillStyle = C.bootHi;
        g.fill(shapePath(b.f, [['M', 8, -2.4], ['Q', 14, -1.6, 17, 1.6], ['L', 13, 1.6], ['Q', 11, -0.6, 8, -0.8], ['Z']]));
      }
    },
  });
  sheet.add({
    p,
    fill: near ? C.denim : C.denimFar,
    shade: C.denimSh,
    sh: 5,
    hi: near ? C.denimHi : undefined,
    hs: 1,
    detail: (g) => {
      // outseam (gold thread), knee fold, hem shadow
      const n = nrm(unit(sub(kn, hp)));
      const n2 = nrm(unit(sub(an, kn)));
      g.strokeStyle = 'rgba(214,180,110,0.6)';
      g.lineWidth = 0.7;
      g.beginPath();
      const s0 = add(hp, mul(n, -4));
      const s1 = add(kn, mul(n, -3.5));
      const s2 = add(an, mul(n2, -6));
      g.moveTo(s0[0], s0[1]);
      g.quadraticCurveTo(s1[0], s1[1], s2[0], s2[1]);
      g.stroke();
      taper(g, qpts(add(kn, mul(n, 6)), add(kn, mul(n, 1)), add(kn, mul(n2, -4)), 4), 1.1, 0.2, 'rgba(10,14,30,0.6)');
      taper(g, qpts(add(lerpV(kn, an, 0.2), mul(n2, 5)), lerpV(kn, an, 0.32), add(lerpV(kn, an, 0.4), mul(n2, -3)), 4), 0.8, 0.2, 'rgba(10,14,30,0.45)');
    },
  });
}

// ------------------------------------------------------------------------------ torso

function torsoPath(r: Rig): Path2D {
  const f = (u: number, v: number) => tAt(r, u, v);
  // (x = u up the spine, y = v forward): waist, lat flare, rear delt, trap, neck, far shoulder, pec shelf, belly
  return shapePath(f, [
    ['M', -4, -13],
    ['Q', 12, -15.5, 24, -21],
    ['Q', 36, -27, 47, -26],
    ['Q', 56, -23.5, 58, -14],
    ['Q', 60.5, -6, 58, 2],
    ['L', 55.5, 11],
    ['Q', 56, 20, 49, 24.5],
    ['Q', 42, 28.5, 33.5, 27],
    ['Q', 27, 25, 20, 21.5],
    ['Q', 9, 20, 1, 17],
    ['L', -4, 16],
    ['Z'],
  ]);
}

function shirtTails(sheet: Sheet, r: Rig): void {
  // the open shirt's tails hang past the belt and flutter back with speed / air
  const f = (u: number, v: number) => tAt(r, u, v);
  const fl = r.pose.flow;
  const w = Math.sin(r.t * 31 + r.hip[0]) * Math.min(1, Math.abs(fl) / 6);
  const back = shapePath(f, [
    ['M', 8, -14],
    ['Q', -3, -14.5, -10 + fl * 0.2, -15.5 - fl * 0.6 - w * 1.2],
    ['Q', -11 + fl * 0.3, -10 - fl * 0.4 - w, -8.5, -9],
    ['Q', -11, -4, -10, 2],
    ['L', 6, 2],
    ['Z'],
  ]);
  sheet.add({ p: back, fill: C.shirtSh, part: 1 });
  const front = shapePath(f, [
    ['M', 8, 17],
    ['Q', -4, 18.5, -11 - Math.max(0, fl) * 0.3, 21 - fl * 0.5 + w],
    ['L', -8, 12],
    ['L', 8, 12],
    ['Z'],
  ]);
  sheet.add({ p: front, fill: C.shirtFar, shade: C.shirtSh, sh: 3, part: 1 });
}

function torsoParts(sheet: Sheet, r: Rig): void {
  const tp = torsoPath(r);
  const f = (u: number, v: number) => tAt(r, u, v);
  sheet.add({
    p: tp,
    fill: C.shirt,
    shade: C.shirtSh,
    sh: 9,
    hi: C.shirtHi,
    hs: 1.6,
    detail: (g) => {
      // the open shirt shows the cream ribbed tank: a band down the chest, shaded with the TORSO's form
      const tank = shapePath(f, [['M', 57, 1], ['Q', 49, 4.5, 44, 5.5], ['Q', 24, 6.5, -7, 7], ['L', -7, 40], ['L', 62, 40], ['Z']]);
      panel(g, tank, tp, C.tank, C.tankSh, 9);
      // scoop neck: skin over the collarbones, the chest cleft
      const neckSkin = shapePath(f, [['M', 58, 2], ['Q', 50, 5, 46, 8.5], ['Q', 45, 12, 48, 15], ['Q', 53, 14.5, 58, 13], ['Z']]);
      panel(g, neckSkin, tp, C.skin, C.skinSh, 4);
      taper(g, qpts(f(51, 12.5), f(49, 11.5), f(47.5, 10), 4), 1, 0.2, 'rgba(26,20,16,0.6)');
      // tank ribs
      g.strokeStyle = 'rgba(120,100,80,0.35)';
      g.lineWidth = 0.6;
      const ribs = new Path2D();
      for (let v = 9; v < 17; v += 2.4) shapePath(f, [['M', 44, v + 0.5], ['L', -6, v]], ribs);
      g.stroke(ribs);
      // far shirt front over the far side of the chest (darker: it turns away)
      const farFront = shapePath(f, [['M', 54, 13], ['Q', 40, 18.5, 22, 17.5], ['Q', 8, 17, -7, 18], ['L', -7, 40], ['L', 62, 40], ['Z']]);
      panel(g, farFront, tp, C.shirtFar, C.shirtSh, 9);
      // spot black under the pec shelf (the shirt drapes off the chest)
      g.fillStyle = SPOT;
      g.fill(shapePath(f, [['M', 32, 5.5], ['Q', 28, 12, 30, 18], ['Q', 24, 16, 20, 17.5], ['Q', 22, 10, 25, 6], ['Z']]));
      // belt + brass buckle in the gap
      g.fillStyle = '#2A1A10';
      g.fill(shapePath(f, [['M', 2.8, 4], ['L', 2.8, 20], ['L', -6, 20], ['L', -6, 4], ['Z']]));
      g.fillStyle = C.brass;
      g.fill(shapePath(f, [['M', 2.2, 8.6], ['L', 2.2, 15.4], ['L', -4.2, 15.4], ['L', -4.2, 8.6], ['Z']]));
      g.strokeStyle = INK;
      g.lineWidth = 0.6;
      g.stroke(shapePath(f, [['M', 0.6, 10.4], ['L', 0.6, 13.6], ['L', -2.6, 13.6], ['L', -2.6, 10.4], ['Z']]));
      // the cream bowling-shirt panel stripe down the near front
      const stripe = shapePath(f, [['M', 52, -17], ['Q', 26, -11.5, -7, -10.5], ['L', -7, -6.8], ['Q', 26, -8, 52, -13.4], ['Z']]);
      panel(g, stripe, tp, C.stripe, C.tankSh, 9);
      // pocket + SLIM stitch
      g.strokeStyle = C.shirtSh;
      g.lineWidth = 0.8;
      g.stroke(shapePath(f, [['M', 40, -4.5], ['L', 30, -3.6], ['Q', 29.6, 1.5, 30.4, 5]]));
      g.strokeStyle = C.stripe;
      g.lineWidth = 0.55;
      g.stroke(shapePath(f, [['M', 38.5, -2], ['Q', 37, 0, 38, 2], ['M', 36, -2.6], ['L', 35.6, 2.4], ['M', 33.6, -2.4], ['L', 33.4, 2.6]]));
      // shirt folds: hard shadow wedges from the armpit + the lat (tapered brush, never full-weight seams)
      taper(g, qpts(f(44, -20), f(34, -16), f(22, -17), 6), 2, 0.2, 'rgba(120,40,0,0.55)');
      taper(g, qpts(f(16, -12), f(8, -9), f(0, -9.5), 5), 1.6, 0.2, 'rgba(120,40,0,0.45)');
      // lapel edges (the open front)
      g.strokeStyle = INK;
      g.lineWidth = 0.9;
      g.stroke(shapePath(f, [['M', 57, 1], ['Q', 49, 4.5, 44, 5.5], ['Q', 24, 6.5, -7, 7], ['M', 54, 13], ['Q', 40, 18.5, 22, 17.5], ['Q', 8, 17, -7, 18]]));
    },
  });
  // the big 70s camp collar: spread points over the traps (drawn after the neck, see paintInk)
}

function collarParts(sheet: Sheet, r: Rig): void {
  const f = (u: number, v: number) => tAt(r, u, v);
  const fl = r.pose.flow;
  const lift = Math.max(0, fl) * 0.3;
  const near = shapePath(f, [['M', 60, -7], ['Q', 59, 1.5, 55.5, 5], ['L', 45.5 + lift, 0.5], ['Q', 51, -2, 52.5, -10], ['Z']]);
  sheet.add({ p: near, fill: C.shirtHi, shade: C.shirt, sh: 2, part: 1, sil: true });
  const far = shapePath(f, [['M', 57, 10], ['Q', 55.5, 14.5, 55, 17], ['L', 47, 17.5], ['Q', 51, 14, 53, 9], ['Z']]);
  sheet.add({ p: far, fill: C.shirtFar, shade: C.shirtSh, sh: 2, part: 1 });
}

function seatPath(r: Rig): Path2D {
  // jeans seat / crotch that the legs grow out of
  const p = new Path2D();
  const f = (u: number, v: number) => tAt(r, u, v);
  const c = f(-4, 0);
  const pa = Math.atan2(r.hipF[1] - r.hipN[1], r.hipF[0] - r.hipN[0]);
  ellipseIn(p, [c[0], c[1] + 2], 14, 9.2, pa);
  return p;
}

// ------------------------------------------------------------------------------ the cue

function cueParts(sheet: Sheet, r: Rig): void {
  const { butt, tip, dir } = r.cue;
  const n = nrm(dir);
  const L = r.b.cueLen;
  const at = (k: number, w: number): V => [butt[0] + dir[0] * L * k + n[0] * w, butt[1] + dir[1] * L * k + n[1] * w];
  const p = new Path2D();
  const w0 = 3.4;
  const w1 = 1.7;
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
    sh: 1.3,
    part: 1,
    detail: (g) => {
      band(0, 0.36, C.cueButt)(g);
      band(0.355, 0.37, CF.cream)(g);
      band(0.93, 0.975, CF.cream)(g);
      band(0.975, 1.02, C.tipBlue)(g);
      // two gold trophy notches in the butt
      band(0.06, 0.075, CF.gold)(g);
      band(0.1, 0.115, CF.gold)(g);
      // a varnish glint along the shaft
      g.strokeStyle = 'rgba(255,246,232,0.7)';
      g.lineWidth = 0.7;
      g.beginPath();
      const s0 = at(0.42, -0.9);
      const s1 = at(0.88, -0.6);
      g.moveTo(s0[0], s0[1]);
      g.lineTo(s1[0], s1[1]);
      g.stroke();
    },
  });
}

// ------------------------------------------------------------------------------ head

/** head size (units: ~40 tall incl. hair) */
const HS = 1.04;

function headParts(sheet: Sheet, r: Rig, afterNeck: () => void): void {
  const f = frame(r.head, r.headA, HS, HS);
  const face = r.face;
  const fl = r.pose.flow;
  // neck: a short bull neck buried in the traps
  const neck = new Path2D();
  seg(neck, r.neck, f(-1, 7), [9.6, 9.4, 8.6], [9.4, 9.6, 9]);
  sheet.add({
    p: neck,
    fill: C.skin,
    shade: C.skinSh,
    sh: 3.6,
    part: 1.1,
    detail: (g) => {
      // sternomastoid line
      taper(g, qpts(f(-4, 8), f(0, 14), f(5, 19), 4), 1, 0.2, 'rgba(26,20,16,0.4)');
    },
  });
  // back hair (the nape shag behind the neck: drawn before the skull)
  const nape = shapePath(f, [
    ['M', -6, 2],
    ['Q', -13, 4, -15.5, 9],
    ['L', -21 - fl * 0.25, 14.5],
    ['Q', -17, 14.5, -15, 13],
    ['L', -17.5 - fl * 0.2, 19],
    ['Q', -13, 17.5, -11, 14],
    ['L', -10.5, 18.5],
    ['Q', -8, 14, -6, 10],
    ['Z'],
  ]);
  sheet.add({ p: nape, fill: C.hair, shade: C.hairSh, sh: 2.4, part: 0.9 });
  afterNeck();
  // skull + heavy square jaw
  const skull = shapePath(f, [
    ['M', -11.5, -9],
    ['Q', -8, -17.5, 2, -17.5],
    ['Q', 11.5, -16.5, 12.8, -9],
    ['L', 14, -5.4],
    ['Q', 13.2, -3.6, 13.8, -2.2],
    ['L', 14.8, 4.5],
    ['Q', 15.6, 7.4, 15, 9.2],
    ['Q', 16.4, 11.4, 15.8, 13.8],
    ['Q', 15, 17, 11, 17.2],
    ['Q', 4, 16.8, -2.5, 12.6],
    ['Q', -6.5, 9, -8.5, 5.5],
    ['Q', -12.5, 0.5, -11.5, -9],
    ['Z'],
  ]);
  sheet.add({
    p: skull,
    fill: C.skin,
    shade: C.skinSh,
    sh: 3.6,
    hi: C.skinHi,
    hs: 1.2,
    detail: (g) => {
      // eye-socket shade under the brow ridge, cheekbone plane, the chin's lit knob
      g.fillStyle = 'rgba(120,50,20,0.38)';
      g.fill(shapePath(f, [['M', 2.5, -5.6], ['Q', 8, -7.6, 14, -5.2], ['L', 13.8, -1.8], ['Q', 8, -3.8, 2.8, -2.6], ['Z']]));
      g.fillStyle = 'rgba(255,214,170,0.55)';
      g.fill(shapePath(f, [['M', 10.8, 11.6], ['Q', 14, 11, 15, 12.8], ['Q', 14.4, 15.4, 11.6, 15.2], ['Q', 10.2, 13.6, 10.8, 11.6], ['Z']]));
      // ear (the shag covers its top)
      const ear = shapePath(f, [['M', -2.5, -2.5], ['Q', -7, -3.5, -7.2, 1.5], ['Q', -7, 5.5, -3, 5], ['Q', -1.4, 2, -2.5, -2.5], ['Z']]);
      g.fillStyle = C.skinSh;
      g.fill(ear);
      g.strokeStyle = INK;
      g.lineWidth = 0.8;
      g.stroke(ear);
      g.stroke(shapePath(f, [['M', -3.6, -0.8], ['Q', -5.6, 0.6, -4, 3]]));
      eyes(g, f, face);
    },
  });
  // MUTTON CHOPS: sideburns that widen down the cheek to the jaw corner + a separate drooping moustache.
  // The cheek between them, the chin and the jaw front stay clean skin (never a full beard).
  const chops = shapePath(f, [
    ['M', -5.4, -4.6],
    ['L', -0.8, -4.6],
    ['Q', 0.6, 0.5, 3.4, 4.6],
    ['Q', 5.6, 7.4, 5.2, 9.6],
    ['L', 3.4, 11.4],
    ['L', 2.4, 10.2],
    ['L', 0.6, 12.8],
    ['L', -0.4, 11.2],
    ['L', -2.4, 12.4],
    ['Q', -6.2, 9.4, -6.6, 4],
    ['Z'],
    // the moustache: thick under the nose, drooping past the mouth corner
    ['M', 17.4, 6.4],
    ['Q', 15.6, 4.4, 12.6, 5.2],
    ['Q', 10.2, 5.8, 9.4, 8],
    ['L', 9.6, 11.4],
    ['Q', 10.8, 11.6, 11.2, 10],
    ['Q', 12.2, 8, 14.4, 8],
    ['Q', 16.6, 8.2, 17.4, 6.4],
    ['Z'],
  ]);
  sheet.add({
    p: chops,
    fill: C.hair,
    shade: C.hairSh,
    sh: 2,
    part: 0.9,
    detail: (g) => {
      taper(g, qpts(f(-3.8, -2.4), f(-3.4, 3.6), f(0.6, 8.6), 6), 1.4, 0.2, C.hairHi);
      taper(g, qpts(f(11.2, 6.6), f(13.6, 5.6), f(16.4, 6.4), 4), 1, 0.2, C.hairHi);
    },
  });
  sheet.add({ p: new Path2D(), fill: 'transparent', part: 0, sil: false, over: (g) => mouth(g, f, face) });
  // nose: a boxer's bulb breaking the profile
  const nose = shapePath(f, [['M', 12.6, -3.8], ['Q', 15.6, -2.2, 17.4, 1.2], ['Q', 19.2, 4, 16.4, 5], ['Q', 14.4, 5.6, 12.8, 4], ['Z']]);
  sheet.add({
    p: nose,
    fill: C.skin,
    shade: C.skinSh,
    sh: 1.6,
    hi: C.skinHi,
    hs: 0.8,
    part: 0.9,
    detail: (g) => {
      g.fillStyle = 'rgba(60,20,10,0.8)';
      const c = f(15.2, 4);
      g.beginPath();
      g.ellipse(c[0], c[1], 1.1, 0.6, r.headA, 0, TAU);
      g.fill();
    },
  });
  // 70s shag: crown volume, choppy layers stepping down the back, feathered wings swept back over the ear, a jagged fringe
  const hair = shapePath(f, [
    ['M', 13.4, -9.6],
    ['Q', 15.6, -14.6, 11, -18.4],
    ['L', 12.4, -20.4],
    ['Q', 6, -24.6, -2.5, -23.2],
    ['Q', -9.5, -22.6, -14, -19],
    ['L', -12.4, -17.6],
    ['Q', -18.4, -14.6, -18.8, -8.4],
    ['L', -17, -8],
    ['Q', -19.8, -2.4, -18, 3],
    ['L', -16.2, 2.6],
    ['Q', -14.6, 7.4, -10, 9],
    ['Q', -8.4, 4, -7.2, 0.5],
    ['Q', -6, -3.6, -4.6, -5],
    ['L', -0.6, -5],
    ['Q', 1.6, -7.2, 4.6, -7.4],
    ['L', 6.2, -5.8],
    ['L', 7.6, -8.2],
    ['L', 10.2, -7],
    ['L', 10.8, -8.8],
    ['Q', 12.4, -8.6, 13.4, -9.6],
    ['Z'],
  ]);
  sheet.add({
    p: hair,
    fill: C.hair,
    shade: C.hairSh,
    sh: 3.4,
    hi: C.hairHi,
    hs: 1.3,
    detail: (g) => {
      // clumps of sheen flowing back from the side part (not a band: separate locks)
      taper(g, qpts(f(9.5, -18), f(4, -21.5), f(-3, -21), 6), 2.6, 0.3, C.hairHi);
      taper(g, qpts(f(5, -15.5), f(-3, -17.6), f(-11, -14), 6), 2.2, 0.3, C.hairHi);
      taper(g, qpts(f(2, -11), f(-6, -11.5), f(-14, -5), 6), 1.8, 0.2, C.hairHi);
      taper(g, qpts(f(0, -7.5), f(-6, -6.5), f(-10, 1), 5), 1.3, 0.2, C.hairHi);
      g.strokeStyle = C.hairSh;
      g.lineWidth = 0.8;
      g.stroke(shapePath(f, [['M', 9, -19], ['Q', 5, -14, 6.5, -8.6], ['M', 7, -12.8], ['Q', -2, -15, -12, -9.5], ['M', -12.6, 0], ['Q', -13, 4, -11.4, 7.4]]));
    },
  });
  sheet.add({ p: new Path2D(), fill: 'transparent', part: 0, sil: false, over: (g) => browBar(g, f, face.brow, face.eyes) });
}

function eyes(g: Ctx, f: (x: number, y: number) => V, face: Rig['face']): void {
  const e = face.eyes;
  const spots: [number, number, number][] = [
    [6.8, -2.6, 1],
    [12.6, -2.8, 0.62],
  ];
  for (const [x, y, k] of spots) {
    const c = f(x, y);
    if (e === 'closed' || e === 'happy') {
      g.strokeStyle = INK;
      g.lineWidth = 1.3;
      g.stroke(shapePath(f, e === 'happy' ? [['M', x - 2.4 * k, y + 1], ['Q', x, y - 1.8, x + 2.4 * k, y + 1]] : [['M', x - 2.4 * k, y], ['Q', x, y + 1.3, x + 2.4 * k, y]]));
      continue;
    }
    const ry = e === 'squint' || e === 'angry' ? 1.35 : e === 'wide' ? 2.7 : 2;
    const rx = (e === 'wide' ? 2.8 : 2.5) * k;
    g.fillStyle = '#FBF6EC';
    g.beginPath();
    g.ellipse(c[0], c[1], rx, ry, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.75;
    g.stroke();
    if (e === 'x') {
      g.lineWidth = 1;
      g.stroke(shapePath(f, [['M', x - 1.7, y - 1.7], ['L', x + 1.7, y + 1.7], ['M', x + 1.7, y - 1.7], ['L', x - 1.7, y + 1.7]]));
      continue;
    }
    if (e === 'spiral') {
      g.lineWidth = 0.7;
      g.beginPath();
      for (let a = 0; a < TAU * 2; a += 0.4) {
        const rr = 0.2 + a * 0.17;
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
    g.arc(c[0] + face.lx * 0.9 * k, c[1] + face.ly * 0.5, (e === 'wide' ? 1.05 : 1.3) * k, 0, TAU);
    g.fill();
    // upper lid line (heavy: reads as a squint at game scale)
    g.lineWidth = 1.1;
    g.beginPath();
    g.ellipse(c[0], c[1], rx, ry, 0, Math.PI * 1.08, Math.PI * 1.92);
    g.stroke();
  }
}

function browBar(g: Ctx, f: (x: number, y: number) => V, brow: number, eyes: string): void {
  if (eyes === 'spiral' || eyes === 'x') brow = -0.7;
  // brow > 0 = angry (the inner end, near the nose, drops), < 0 = worried (inner end rises)
  const d = brow * 1.9;
  const p = shapePath(f, [
    ['M', 2, -6.8 - d * 0.35],
    ['Q', 6, -8.8 + d * 0.1, 10.2, -6.6 + d],
    ['L', 10.6, -4.8 + d],
    ['Q', 6, -6.6 + d * 0.1, 2.4, -4.8 - d * 0.35],
    ['Z'],
    ['M', 11.6, -6.2 + d * 0.9],
    ['Q', 13.4, -7.4 + d * 0.3, 15, -6.6 - d * 0.2],
    ['L', 14.6, -5 - d * 0.2],
    ['Q', 13.2, -5.6 + d * 0.3, 11.8, -4.6 + d * 0.9],
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
    g.lineWidth = 1.1;
    g.stroke(shapePath(f, [['M', 11.4, 10.4], ['Q', 13.4, 11, 15, 9.8]]));
    return;
  }
  if (m === 'grin' || m === 'grit') {
    const p = shapePath(f, [['M', 11, 9.4], ['Q', 13.4, 10, 15.6, 9], ['Q', 15.2, 12.6, 13.2, 12.8], ['Q', 11.4, 12.6, 11, 9.4], ['Z']]);
    g.fillStyle = '#FBF6EC';
    g.fill(p);
    g.strokeStyle = INK;
    g.lineWidth = 0.85;
    g.stroke(p);
    if (m === 'grit') g.stroke(shapePath(f, [['M', 11.2, 10.9], ['L', 15.3, 10.6]]));
    return;
  }
  if (m === 'shout' || m === 'o') {
    const o = face.open;
    const h = m === 'o' ? 2.4 + o * 1.6 : 2.6 + o * 3.8;
    const w = m === 'o' ? 1.9 : 2.8;
    const c = f(13.2, 10 + h * 0.42);
    g.fillStyle = '#3A1210';
    g.beginPath();
    g.ellipse(c[0], c[1], w, h * 0.56, 0, 0, TAU);
    g.fill();
    g.strokeStyle = INK;
    g.lineWidth = 0.9;
    g.stroke();
    if (m === 'shout') {
      g.fillStyle = '#FBF6EC';
      g.fillRect(c[0] - w * 0.7, c[1] - h * 0.56, w * 1.4, 1.3);
      g.fillStyle = C.lip;
      g.beginPath();
      g.ellipse(c[0], c[1] + h * 0.34, w * 0.6, h * 0.16, 0, 0, TAU);
      g.fill();
    }
    return;
  }
  g.strokeStyle = INK;
  g.lineWidth = 0.9;
  g.stroke(shapePath(f, [['M', 11, 10.4], ['L', 12, 9.7], ['L', 13, 10.6], ['L', 14, 9.7], ['L', 15, 10.4]]));
}

// ------------------------------------------------------------------------------ body assembly

export function paintInk(g: Ctx, r: Rig): void {
  const sheet = new Sheet();
  const P = r.pose;
  const cueF = r.cue.hand === 'F' && !r.cue.second;
  const cueBack = !!P.cueBack;
  // a cue pointing up and BACK (the shoulder carry, the follow-through) passes behind the head, not across the face
  const cueHead = !cueF && !cueBack && r.cue.dir[0] < -0.15 && r.cue.dir[1] < 0;
  // back to front
  if (cueBack) cueParts(sheet, r);
  if (!P.farFront) armParts(sheet, r, false, !cueF);
  if (cueF && !cueBack) {
    cueParts(sheet, r);
    fistParts(sheet, r, false);
  } else if (cueF) fistParts(sheet, r, false);
  shirtTails(sheet, r);
  legParts(sheet, r, false);
  sheet.add({ p: seatPath(r), fill: C.denim, shade: C.denimSh, sh: 3 });
  legParts(sheet, r, true);
  torsoParts(sheet, r);
  if (P.farFront) armParts(sheet, r, false, false);
  if (cueHead) cueParts(sheet, r);
  headParts(sheet, r, () => collarParts(sheet, r));
  if (!cueF && !cueBack && !cueHead) cueParts(sheet, r);
  if (P.farFront) fistParts(sheet, r, false);
  armParts(sheet, r, true);
  sheet.draw(g, { outer: 2.6, part: 1.15, ink: INK, lx: LX, ly: LY });
}
