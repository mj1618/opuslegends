/**
 * Cliff wall (parallax 0.55): chalk headlands with fluted faces, flint bands, turf caps, cave
 * mouths, a sea arch, nesting ledges, the lighthouse; plus the live band on top of it:
 *   kick/stomp -> blowholes spray + caves exhale mist   hats -> nesting gulls bob on 8ths
 *   cowbell    -> bell buoys clang and tilt              snare -> surf bursts on the rocks
 *   riff       -> chalk calves off the cliff edges       bar   -> lighthouse beam sweeps the sky
 */
import { type BeatInfo, hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { type RGB, css, hex, mix } from '../core/color';
import { drawGlow, puff } from '../core/draw';
import { TAU, clamp01, easeOut, hash, lerp, rng } from '../core/math';
import { PAL, RGBP } from '../palette';
import { type ArtCamera, type LayerView, pushLayer, screenX, screenY } from './camera';
import { type Lighting, atmos, lit } from './lighting';
import { nodules, noisyLine, polyTo, turf } from './paint';
import { TiledLayer } from './tiledLayer';

const W = 3400;
const TOP = -760;
const H = 660;
/** sea line of this layer (layer coords) */
export const CLIFF_SEA = -150;

interface Mass {
  x0: number;
  x1: number;
  h: number;
  seed: number;
}

const MASSES: Mass[] = [
  { x0: 160, x1: 1260, h: 400, seed: 1 },
  { x0: 1640, x1: 2720, h: 450, seed: 2 },
  { x0: 2960, x1: 3310, h: 280, seed: 3 },
];

export class Cliffs {
  readonly layer: TiledLayer;

  constructor() {
    this.layer = new TiledLayer(W, TOP, H, 0.55, 9, (ch, Wt, Ht, anchors) => paintCliffs(ch, Wt, Ht, anchors), 0.6);
  }

  /** Lighthouse beam (draw BEFORE the cliff layer so the tower occludes the beam base). */
  drawBeam(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo): void {
    if (L.beam < 0.02) return;
    const v = this.layer.view(cam);
    this.layer.eachAnchor(v, 'lighthouse', 2400, (a, x) => {
      const lx = screenX(v, x);
      const ly = screenY(v, a.y - 118);
      // rotating beam: faces the camera (flare) on every downbeat
      const th = b.barPhase * TAU;
      const reach = Math.sin(th);
      const flare = Math.pow(Math.max(0, Math.cos(th)), 12);
      g.save();
      g.globalCompositeOperation = 'lighter';
      const col = mix(hex(PAL.lamp), L.rim, 0.2);
      for (const dir of [1, -1]) {
        const len = 1900 * reach * dir;
        if (Math.abs(len) < 20) continue;
        const gr = g.createLinearGradient(lx, ly, lx + len, ly - 120);
        gr.addColorStop(0, css(col, 0.32 * L.beam));
        gr.addColorStop(0.6, css(col, 0.08 * L.beam));
        gr.addColorStop(1, css(col, 0));
        g.fillStyle = gr;
        for (const [a0, a1] of [
          [-150, 10],
          [-110, -30],
        ]) {
          g.beginPath();
          g.moveTo(lx, ly - 3);
          g.lineTo(lx + len, ly + a0);
          g.lineTo(lx + len, ly + a1);
          g.lineTo(lx, ly + 3);
          g.closePath();
          g.fill();
        }
      }
      g.restore();
      if (flare > 0.01) {
        drawGlow(g, lx, ly, PAL.lamp, 220 * v.z, flare * L.beam * 0.9);
        drawGlow(g, lx, ly, '#FFFFFF', 70 * v.z, flare * L.beam);
      }
    });
  }

  draw(g: Ctx, cam: ArtCamera, L: Lighting, b: BeatInfo): LayerView {
    const d = 0.5;
    const chalk = RGBP.chalkBone;
    const aR = clamp01(0.5 - L.lightDir * 0.5);
    const shadow = lit(L, RGBP.chalkShade, 0.1, d);
    const v = this.layer.draw(g, cam, [
      css(lit(L, chalk, 0.92, d)),
      css(shadow, 0.25 + 0.6 * aR),
      css(shadow, 0.25 + 0.6 * (1 - aR)),
      css(lit(L, hex('#27333C'), 0.3, d * 0.75)),
      css(lit(L, RGBP.flint, 0.5, d), 0.45),
      css(lit(L, RGBP.turf, 0.85, d)),
      css(mix(lit(L, chalk, 1.1, d), L.rim, 0.4 * L.rimAmt)),
      css(lit(L, hex('#4F5A44'), 0.5, d)),
      css(atmos(L, L.foam, d * 0.6), 0.9),
    ]);
    pushLayer(g, v);
    this.drawProps(g, v, L, b);
    g.restore();
    return v;
  }

  private drawProps(g: Ctx, v: LayerView, L: Lighting, b: BeatInfo) {
    const d = 0.5;
    const foamCol = css(atmos(L, L.foam, d * 0.5));
    const mist = css(atmos(L, mix(L.foam, L.haze, 0.4), d));
    const kick = b.since.kick;
    const kn = b.count.kick;
    // lighthouse
    this.layer.eachAnchor(v, 'lighthouse', 200, (a, x) => drawLighthouse(g, x, a.y, L, b));
    // blowholes: plume on every other kick (alternating holes)
    let bi = 0;
    this.layer.eachAnchor(v, 'blowhole', 300, (a, x) => {
      const mine = (kn + bi++) % 2 === 0;
      if (!mine || kick > 1.1) return;
      const k = clamp01(kick / 1.1);
      const e = b.energy;
      for (let i = 0; i < 9; i++) {
        const u = easeOut(clamp01((kick - i * 0.02) / 0.5));
        const h = (140 + hash(i + kn) * 90) * e;
        const px = x + (i - 4) * 2.5 * u + Math.sin(i * 3 + kn) * 6 * u;
        const py = a.y - u * h * (0.5 + i / 16) + k * k * 90;
        puff(g, px, py, 5 + u * 9, (1 - k) * 0.9, foamCol);
      }
    });
    // cave mouths exhale mist on the kick
    this.layer.eachAnchor(v, 'cave', 300, (a, x) => {
      if (kick > 1.2) return;
      const k = clamp01(kick / 1.2);
      for (let i = 0; i < 4; i++) {
        const u = easeOut(k);
        puff(g, x + (i - 1.5) * a.s * 0.35 + u * 20, a.y + a.s * 0.5 - u * 24, a.s * (0.2 + 0.35 * u), (1 - k) * 0.18, mist);
      }
    });
    // nesting gulls bob on 8ths, beaks open on the hat
    const hat = hit(b, 'hat', 0.07);
    const e8 = Math.floor(b.beat * 2);
    this.layer.eachAnchor(v, 'nest', 60, (a, x) => {
      const up = (e8 + Math.round(a.s * 10)) % 2 === 0 ? 3 : 0;
      drawNestGull(g, x, a.y - up, L, hat * ((Math.round(a.s * 10) + e8) % 3 === 0 ? 1 : 0), a.s > 0.5 ? 1 : -1);
    });
    // bell buoys tilt on the cowbell
    const cb = b.since.cowbell;
    this.layer.eachAnchor(v, 'buoy', 80, (a, x) => {
      const n = b.count.cowbell;
      const dir = n % 2 ? 1 : -1;
      const tilt = Math.exp(-cb / 0.25) * Math.sin(cb * 18) * 0.22 * dir + Math.sin(b.time * 1.7 + a.x) * 0.06;
      drawBuoy(g, x, a.y + Math.sin(b.time * 1.3 + a.x) * 3 - hit(b, 'bass', 0.12) * 3, tilt, L, Math.exp(-cb / 0.18));
    });
    // surf bursts on 2 & 4
    const sn = b.since.snare;
    if (sn < 0.7) {
      const k = clamp01(sn / 0.7);
      this.layer.eachAnchor(v, 'surf', 200, (a, x) => {
        for (let i = 0; i < 6; i++) {
          const u = easeOut(clamp01((sn - i * 0.03) / 0.45));
          puff(g, x + (i - 2.5) * 16 * (0.6 + u), a.y - u * (40 + hash(i + a.x) * 50), 8 + u * 14, (1 - k) * 0.85, foamCol);
        }
      });
    }
    // chalk calving on the riff accents
    const rs = b.since.riff;
    if (rs < 1.0) {
      const n = b.count.riff;
      let ci = 0;
      this.layer.eachAnchor(v, 'fall', 100, (a, x) => {
        if ((ci++ + n) % 3 !== 0) return;
        const k = clamp01(rs / 1.0);
        const chalk = css(lit(L, RGBP.chalkBone, 0.8, d));
        for (let i = 0; i < 5; i++) {
          const px = x + (hash(i + n) - 0.5) * 20 + (i - 2) * 4 * k;
          const py = a.y + 400 * k * k * (0.8 + hash(i) * 0.4);
          g.fillStyle = chalk;
          g.fillRect(px - 3, py - 3, 6 + (i % 2) * 3, 6);
        }
        puff(g, x, a.y + 10, 10 + 26 * k, (1 - k) * 0.6, chalk);
      });
    }
  }
}

// ---------------------------------------------------------------------------------------------

function massPath(m: Mass, sea: number): { path: Path2D; top: number[] } {
  const r = rng(m.seed * 101);
  const topY = sea - m.h;
  const p = new Path2D();
  // left flank: steep with a slumped apron
  const left = noisyLine(m.x0 - 30, sea + 10, m.x0 + 40, topY + 30, 26, m.seed, 12);
  const top = noisyLine(m.x0 + 40, topY + 30, m.x1 - 30, topY + 20 + (r() - 0.5) * 40, 34, m.seed + 5, 26);
  const dip = 0.3 + r() * 0.4;
  for (let i = 2; i < top.length - 2; i += 2) {
    const u = i / (top.length - 2);
    top[i + 1] -= Math.sin(u * Math.PI) * 30;
    top[i + 1] += Math.exp(-(((u - dip) / 0.08) ** 2)) * 46; // a saddle / slumped notch
  }
  const right = noisyLine(m.x1 - 30, top[top.length - 1], m.x1 + 30, sea + 10, 24, m.seed + 9, 12);
  p.moveTo(left[0], left[1]);
  polyTo(p, left, true);
  polyTo(p, top, true);
  polyTo(p, right, true);
  p.closePath();
  return { path: p, top };
}

function paintCliffs(ch: (i: number) => Ctx, Wt: number, Ht: number, anchors: { kind: string; x: number; y: number; s: number }[]) {
  const body = ch(0);
  const shR = ch(1);
  const shL = ch(2);
  const deep = ch(3);
  const det = ch(4);
  const grass = ch(5);
  const rim = ch(6);
  const wet = ch(7);
  const foam = ch(8);
  const sea = CLIFF_SEA - TOP; // tile coords
  const Y = (tileY: number) => tileY + TOP; // tile -> layer coords
  const r = rng(7);
  const tops: number[][] = [];
  /** tile-y of the turf surface at layer x (from the painted top profiles) */
  const topAt = (x: number): number => {
    let best = sea;
    let bd = 1e9;
    for (const t of tops)
      for (let i = 0; i < t.length; i += 2) {
        const dd = Math.abs(t[i] - x);
        if (dd < bd) {
          bd = dd;
          best = t[i + 1];
        }
      }
    return best;
  };
  for (const m of MASSES) {
    for (const dx of [0, -Wt, Wt]) {
      const mm = { ...m, x0: m.x0 + dx, x1: m.x1 + dx };
      const { path, top } = massPath(mm, sea);
      const topY = sea - m.h;
      body.fill(path);
      // boulder apron
      for (let i = 0; i < 10; i++) {
        const bx = lerp(mm.x0 - 40, mm.x1 + 40, hash(i * 7 + m.seed));
        const br = 10 + hash(i * 3 + m.seed) * 22;
        body.beginPath();
        body.ellipse(bx, sea + 4 - br * 0.4, br * 1.3, br, 0, 0, TAU);
        body.fill();
        shR.globalAlpha = 0.7;
        shR.beginPath();
        shR.ellipse(bx + br * 0.4, sea + 4 - br * 0.3, br * 0.8, br * 0.8, 0, 0, TAU);
        shR.fill();
        shR.globalAlpha = 1;
      }
      // fluted ribs (relit by direction): soft vertical bumps over the whole face
      for (const [g2, right] of [
        [shR, true],
        [shL, false],
      ] as [Ctx, boolean][]) {
        g2.save();
        g2.clip(path);
        let x = mm.x0;
        let i = 0;
        while (x < mm.x1 + 40) {
          const rw = 70 + hash(i * 13 + m.seed) * 120;
          const a0 = right ? x + rw * 0.45 : x;
          const a1 = right ? x + rw : x + rw * 0.55;
          const gr = g2.createLinearGradient(a0, 0, a1, 0);
          const pk = 0.35 + hash(i * 3 + m.seed) * 0.35;
          gr.addColorStop(0, `rgba(255,255,255,${right ? 0 : pk})`);
          gr.addColorStop(0.5, `rgba(255,255,255,${pk * 0.6})`);
          gr.addColorStop(1, `rgba(255,255,255,${right ? pk : 0})`);
          g2.fillStyle = gr;
          g2.fillRect(a0, topY - 60, a1 - a0, sea - topY + 80);
          x += rw;
          i++;
        }
        // flank shading
        const fg = g2.createLinearGradient(right ? mm.x1 - 160 : mm.x0 + 160, 0, right ? mm.x1 + 30 : mm.x0 - 30, 0);
        fg.addColorStop(0, 'rgba(255,255,255,0)');
        fg.addColorStop(1, 'rgba(255,255,255,0.9)');
        g2.fillStyle = fg;
        g2.fillRect(mm.x0 - 40, 0, mm.x1 - mm.x0 + 80, Ht);
        // darker toward the sea
        const vg = g2.createLinearGradient(0, sea - m.h * 0.5, 0, sea);
        vg.addColorStop(0, 'rgba(255,255,255,0)');
        vg.addColorStop(1, 'rgba(255,255,255,0.35)');
        g2.fillStyle = vg;
        g2.fillRect(mm.x0 - 40, sea - m.h, mm.x1 - mm.x0 + 80, m.h + 20);
        g2.restore();
      }
      // details: flint bands, cracks, erosion streaks, overhang shadow
      det.save();
      det.clip(path);
      nodules(det, mm.x0 - 40, mm.x1 + 40, topY + 50, sea - 30, 52, m.seed, 3.2, 0.55);
      det.lineWidth = 1.8;
      det.globalAlpha = 0.7;
      for (let i = 0; i < 9; i++) {
        let x = lerp(mm.x0 + 30, mm.x1 - 30, r());
        let y = topY + 40 + r() * (m.h * 0.5);
        det.beginPath();
        det.moveTo(x, y);
        for (let k = 0; k < 5; k++) {
          x += (r() - 0.5) * 16;
          y += 12 + r() * 16;
          det.lineTo(x, y);
        }
        det.stroke();
      }
      det.globalAlpha = 1;
      det.restore();
      deep.save();
      deep.clip(path);
      const ov = deep.createLinearGradient(0, topY + 10, 0, topY + 70);
      ov.addColorStop(0, 'rgba(255,255,255,0.55)');
      ov.addColorStop(1, 'rgba(255,255,255,0)');
      deep.fillStyle = ov;
      deep.fillRect(mm.x0 - 40, topY - 20, mm.x1 - mm.x0 + 80, 110);
      deep.restore();
      // wet algae base
      wet.save();
      wet.clip(path);
      const wg = wet.createLinearGradient(0, sea - 70, 0, sea + 6);
      wg.addColorStop(0, 'rgba(255,255,255,0)');
      wg.addColorStop(0.6, 'rgba(255,255,255,0.7)');
      wg.addColorStop(1, 'rgba(255,255,255,1)');
      wet.fillStyle = wg;
      wet.fillRect(mm.x0 - 60, sea - 70, mm.x1 - mm.x0 + 120, 80);
      wet.restore();
      // lit top rim + turf
      rim.lineWidth = 3;
      rim.beginPath();
      rim.moveTo(top[0], top[1] + 12);
      for (let i = 2; i < top.length; i += 2) rim.lineTo(top[i], top[i + 1] + 12);
      rim.stroke();
      turf(grass, top, 14, m.seed);
      // foam collar at the base
      for (let x = mm.x0 - 50; x < mm.x1 + 50; x += 14) {
        const fr = 6 + hash(x) * 8;
        foam.beginPath();
        foam.arc(x, sea + 2 - hash(x + 1) * 5, fr, 0, TAU);
        foam.fill();
      }
      if (dx !== 0) continue;
      tops.push(top);
      // anchors (tile x == layer x since tiles start at 0)
      anchors.push({ kind: 'fall', x: mm.x0 + 60, y: Y(top[3]), s: 0 });
      anchors.push({ kind: 'fall', x: mm.x1 - 50, y: Y(top[top.length - 3]), s: 0 });
      anchors.push({ kind: 'surf', x: mm.x0 + 20, y: CLIFF_SEA, s: 0 });
      anchors.push({ kind: 'surf', x: mm.x1 - 10, y: CLIFF_SEA, s: 0 });
    }
  }
  // cave mouths (dark arches at the base) + blowholes above
  const caves: [number, number, number][] = [
    [380, 70, 1],
    [930, 110, 1],
    [2530, 80, 2],
    [3120, 55, 3],
  ];
  for (const [cx, cr] of caves) {
    for (const dx of [0, -Wt, Wt]) {
      const x = cx + dx;
      const p = new Path2D();
      p.moveTo(x - cr, sea + 6);
      p.bezierCurveTo(x - cr, sea - cr * 1.5, x - cr * 0.4, sea - cr * 1.9, x + cr * 0.1, sea - cr * 1.9);
      p.bezierCurveTo(x + cr * 0.7, sea - cr * 1.9, x + cr, sea - cr * 1.3, x + cr, sea + 6);
      p.closePath();
      deep.fill(p);
      deep.fill(p);
      // rim shadow + lit lip
      rim.lineWidth = 3;
      rim.globalAlpha = 0.6;
      rim.beginPath();
      rim.arc(x, sea - cr * 0.2, cr * 1.08, Math.PI * 1.15, Math.PI * 1.55);
      rim.stroke();
      rim.globalAlpha = 1;
      for (const c of [shR, shL, det, wet]) {
        c.save();
        c.globalCompositeOperation = 'destination-out';
        c.fill(p);
        c.restore();
      }
    }
    anchors.push({ kind: 'cave', x: cx, y: CLIFF_SEA - cr * 0.8, s: cr });
    anchors.push({ kind: 'surf', x: cx, y: CLIFF_SEA, s: 0 });
  }
  // blowholes on top of the big caves
  for (const bx of [930, 2530, 3120]) {
    anchors.push({ kind: 'blowhole', x: bx, y: Y(topAt(bx)) + 4, s: 1 });
    // the hole itself: a dark notch in the turf
    deep.beginPath();
    deep.ellipse(bx, topAt(bx) + 6, 16, 6, 0, 0, TAU);
    deep.fill();
  }
  // sea arch through mass B: cut out of every channel (the far layers show through)
  const ax = 2120;
  const aw = 260;
  const ah = 300;
  const arch = new Path2D();
  arch.moveTo(ax - aw / 2, sea + 20);
  arch.bezierCurveTo(ax - aw / 2, sea - ah * 0.8, ax - aw * 0.25, sea - ah, ax, sea - ah);
  arch.bezierCurveTo(ax + aw * 0.25, sea - ah, ax + aw / 2, sea - ah * 0.8, ax + aw / 2, sea + 20);
  arch.closePath();
  for (let i = 0; i < 9; i++) {
    const c = ch(i);
    c.save();
    c.globalCompositeOperation = 'destination-out';
    c.fill(arch);
    c.restore();
  }
  deep.save();
  deep.clip(arch);
  deep.lineWidth = 18;
  deep.globalAlpha = 0.45;
  deep.stroke(arch);
  deep.restore();
  rim.save();
  rim.lineWidth = 3;
  rim.translate(-6, -4);
  rim.stroke(arch);
  rim.restore();
  // foam across the arch mouth
  for (let x = ax - aw / 2; x < ax + aw / 2; x += 16) {
    foam.beginPath();
    foam.arc(x, sea + 2, 6 + hash(x) * 6, 0, TAU);
    foam.fill();
  }
  // nesting ledges on mass B + A
  const ledges: [number, number, number][] = [
    [1760, 230, 90],
    [1900, 300, 70],
    [2380, 250, 110],
    [2560, 330, 80],
    [620, 260, 90],
    [1080, 200, 70],
  ];
  for (const [lx, ly, lw] of ledges) {
    const y = sea - ly;
    rim.lineWidth = 4;
    rim.beginPath();
    rim.moveTo(lx - lw / 2, y);
    rim.lineTo(lx + lw / 2, y + 2);
    rim.stroke();
    deep.globalAlpha = 0.6;
    deep.fillRect(lx - lw / 2, y + 3, lw, 6);
    deep.globalAlpha = 1;
    for (let k = 0; k < 3; k++) anchors.push({ kind: 'nest', x: lx - lw / 3 + k * (lw / 3), y: Y(y) - 1, s: hash(lx + k) });
  }
  // lighthouse sits on mass A
  anchors.push({ kind: 'lighthouse', x: 540, y: Y(topAt(540)) + 6, s: 1 });
  // bell buoys out in the bays
  anchors.push({ kind: 'buoy', x: 1450, y: CLIFF_SEA + 4, s: 1 });
  anchors.push({ kind: 'buoy', x: 2840, y: CLIFF_SEA + 4, s: 1 });
  // foam streaks across the bays
  foam.globalAlpha = 0.45;
  for (let x = 0; x < Wt; x += 40) foam.fillRect(x + hash(x) * 20, sea + 10 + hash(x + 3) * 14, 22 + hash(x + 5) * 30, 2.5);
  foam.globalAlpha = 1;
}

function drawLighthouse(g: Ctx, x: number, y: number, L: Lighting, b: BeatInfo) {
  const d = 0.5;
  const white = css(lit(L, hex('#F4F2EC'), 0.95, d));
  const whiteSh = css(lit(L, hex('#F4F2EC'), 0.15, d));
  const red = css(lit(L, hex(PAL.fadedRed), 0.85, d));
  const dark = css(lit(L, hex('#2C2A30'), 0.5, d));
  g.save();
  g.translate(x, y);
  // tapered tower
  g.fillStyle = white;
  g.beginPath();
  g.moveTo(-22, 0);
  g.lineTo(-14, -104);
  g.lineTo(14, -104);
  g.lineTo(22, 0);
  g.closePath();
  g.fill();
  g.fillStyle = red;
  for (const [a, bb] of [
    [-30, -48],
    [-72, -88],
  ]) {
    const wa = 22 - (-a / 104) * 8;
    const wb = 22 - (-bb / 104) * 8;
    g.beginPath();
    g.moveTo(-wa, a);
    g.lineTo(-wb, bb);
    g.lineTo(wb, bb);
    g.lineTo(wa, a);
    g.closePath();
    g.fill();
  }
  // shade half (by light direction)
  g.fillStyle = whiteSh;
  g.globalAlpha = 0.45;
  g.beginPath();
  if (L.lightDir < 0) {
    g.moveTo(4, 0);
    g.lineTo(2, -104);
    g.lineTo(14, -104);
    g.lineTo(22, 0);
  } else {
    g.moveTo(-4, 0);
    g.lineTo(-2, -104);
    g.lineTo(-14, -104);
    g.lineTo(-22, 0);
  }
  g.fill();
  g.globalAlpha = 1;
  // gallery + lantern room + cap
  g.fillStyle = dark;
  g.fillRect(-20, -110, 40, 7);
  g.fillRect(-12, -134, 24, 3);
  g.beginPath();
  g.moveTo(-14, -134);
  g.lineTo(0, -148);
  g.lineTo(14, -134);
  g.fill();
  const lamp = L.lamps;
  g.fillStyle = css(mix(lit(L, hex('#6E7C80'), 0.6, d), hex(PAL.lamp), lamp));
  g.fillRect(-10, -131, 20, 21);
  g.restore();
  const pulse = Math.pow(Math.max(0, Math.cos(b.barPhase * TAU)), 8);
  drawGlow(g, x, y - 120, PAL.lamp, 60 + 60 * pulse, lamp * (0.6 + 0.4 * pulse));
}

function drawNestGull(g: Ctx, x: number, y: number, L: Lighting, beak: number, f: number) {
  const d = 0.5;
  g.save();
  g.translate(x, y);
  g.scale(f, 1);
  g.fillStyle = css(lit(L, hex('#F4F2EC'), 0.9, d));
  g.beginPath();
  g.ellipse(0, -6, 8, 6, 0, 0, TAU);
  g.arc(5, -12, 4.2, 0, TAU);
  g.fill();
  g.fillStyle = css(lit(L, hex('#3A3D46'), 0.6, d));
  g.beginPath();
  g.ellipse(-3, -7, 6, 3.5, -0.2, 0, TAU);
  g.fill();
  g.fillStyle = css(lit(L, hex(PAL.gullBeak), 0.9, d));
  g.beginPath();
  g.moveTo(8, -13);
  g.lineTo(14, -12 - beak * 3);
  g.lineTo(8, -11);
  g.lineTo(14, -10 + beak * 3);
  g.lineTo(8, -10);
  g.fill();
  g.restore();
}

function drawBuoy(g: Ctx, x: number, y: number, tilt: number, L: Lighting, ring: number) {
  const d = 0.5;
  const red: RGB = hex(PAL.beaconRed);
  g.save();
  g.translate(x, y);
  g.rotate(tilt);
  g.fillStyle = css(lit(L, red, 0.8, d));
  g.beginPath();
  g.moveTo(-18, 0);
  g.quadraticCurveTo(0, 14, 18, 0);
  g.lineTo(12, -16);
  g.lineTo(-12, -16);
  g.closePath();
  g.fill();
  g.strokeStyle = css(lit(L, hex('#2C2A30'), 0.5, d));
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(-9, -16);
  g.lineTo(-5, -48);
  g.lineTo(5, -48);
  g.lineTo(9, -16);
  g.stroke();
  g.fillStyle = css(lit(L, hex('#C9A24A'), 0.9, d));
  g.beginPath();
  g.arc(0, -34, 6, Math.PI, TAU);
  g.lineTo(6, -30);
  g.lineTo(-6, -30);
  g.fill();
  g.restore();
  if (ring > 0.05) {
    g.strokeStyle = css(atmos(L, hex('#FFFFFF'), 0.2), ring * 0.8);
    g.lineWidth = 2;
    for (let i = 0; i < 2; i++) {
      g.beginPath();
      g.arc(x + tilt * 40, y - 34, 14 + (1 - ring) * 30 + i * 10, -Math.PI * 0.8, -Math.PI * 0.2);
      g.stroke();
    }
  }
}
