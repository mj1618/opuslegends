/**
 * Renderer: draws the whole frame from game state (read-only). Placeholder art, but every
 * element is built on the beat-reactive hooks (Groove) so real art can slot in later.
 *
 * Draw order: background parallax -> world (floors, platforms, hazards, lums, enemies,
 * checkpoints, finish, player, particles) -> debug world overlay -> HUD -> screens -> flash/fade.
 */
import { VIEW_H, VIEW_W } from '../engine/display';
import { clamp, lerp } from '../engine/math';
import type { Game } from '../game/game';
import { Tun } from '../game/tunables';
import { applyBeatReact } from './groove';
import { type SpriteSet, blit } from './sprites';

const FONT = '"Trebuchet MS", "Segoe UI", system-ui, sans-serif';

export class Renderer {
  private game: Game;
  private spr: SpriteSet;
  private groundPattern: CanvasPattern | null = null;
  private scarf: { x: number; y: number }[] = [];
  private blinkT = 0;

  constructor(game: Game, sprites: SpriteSet) {
    this.game = game;
    this.spr = sprites;
  }

  render(px: number, py: number): void {
    const g = this.game;
    const ctx = g.display.beginFrame();
    if (!this.groundPattern) this.groundPattern = ctx.createPattern(this.spr.groundTile, 'repeat');

    if (g.scene === 'loading' || g.scene === 'title') {
      this.drawTitle(ctx);
      return;
    }

    const cam = g.camera;
    g.background.draw(ctx, cam.rx, cam.ry, g.groove);

    ctx.save();
    cam.apply(ctx);
    const v = cam.viewBounds();
    this.drawLevel(ctx, v.x0, v.x1, v.y1);
    this.drawPlayer(ctx, px, py);
    g.particles.draw(ctx, v.x0, v.x1);
    g.debug.drawWorld(ctx, v);
    ctx.restore();

    this.drawHud(ctx);
    if (g.scene === 'end') this.drawEnd(ctx);
    if (g.paused) this.drawCenterText(ctx, 'PAUSED', 'press Enter / Space to resume');

    if (g.flash > 0.001) {
      ctx.globalAlpha = Math.min(1, g.flash);
      ctx.fillStyle = g.flashColor;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    if (g.fade > 0.001) {
      ctx.globalAlpha = Math.min(1, g.fade);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.globalAlpha = 1;
    }
    g.debug.drawScreen(ctx);
  }

  // ------------------------------------------------------------------ world

  private drawLevel(ctx: CanvasRenderingContext2D, x0: number, x1: number, y1: number): void {
    const g = this.game;
    const L = g.level;
    const gr = g.groove;
    const beatP = gr.pulse(1, 0.22);

    // floors
    for (const f of L.floors) {
      if (f.x1 < x0 || f.x0 > x1) continue;
      const a = Math.max(f.x0, x0 - 10);
      const b = Math.min(f.x1, x1 + 10);
      ctx.fillStyle = this.groundPattern ?? '#5b3a2e';
      const depth = Math.max(0, Math.min(1400, y1 - f.y));
      ctx.fillRect(a, f.y, b - a, depth);
      // grass lip, bouncing slightly on the beat
      const lip = 20 + beatP * 5;
      ctx.fillStyle = '#6fd86a';
      ctx.fillRect(a, f.y - 4, b - a, lip);
      ctx.fillStyle = '#48b04c';
      ctx.fillRect(a, f.y + lip - 6, b - a, 6);
      // edge caps
      ctx.fillStyle = '#3d2419';
      if (f.x0 >= x0 - 10) ctx.fillRect(f.x0 - 3, f.y, 6, depth);
      if (f.x1 <= x1 + 10) ctx.fillRect(f.x1 - 3, f.y, 6, depth);
    }

    // platforms / blocks
    for (const s of L.platforms) {
      if (s.x + s.w < x0 || s.x > x1) continue;
      ctx.fillStyle = '#c98e52';
      roundRect(ctx, s.x, s.y, s.w, s.h, 8);
      ctx.fill();
      ctx.fillStyle = '#e8b574';
      ctx.fillRect(s.x + 6, s.y + 4, s.w - 12, 6);
      ctx.strokeStyle = '#4a2a14';
      ctx.lineWidth = 4;
      roundRect(ctx, s.x, s.y, s.w, s.h, 8);
      ctx.stroke();
    }
    for (const s of L.blocks) {
      if (s.x + s.w < x0 || s.x > x1) continue;
      ctx.fillStyle = this.groundPattern ?? '#5b3a2e';
      ctx.fillRect(s.x, s.y, s.w, s.h);
      ctx.strokeStyle = '#2d1a10';
      ctx.lineWidth = 4;
      ctx.strokeRect(s.x, s.y, s.w, s.h);
    }

    // hazards
    for (const h of L.hazards) {
      const r = h.vis;
      if (r.x + r.w < x0 || r.x > x1) continue;
      if (h.kind === 'spikes') {
        for (let x = r.x; x < r.x + r.w - 4; x += 32) blit(ctx, this.spr.spike, x, r.y + r.h, 1, 1 + 0.08 * beatP);
      } else {
        // crusher beam: hazard-striped column with a glowing, spiked underside
        ctx.fillStyle = '#2c2440';
        ctx.fillRect(r.x, r.y, r.w, r.h);
        ctx.save();
        ctx.beginPath();
        ctx.rect(r.x, r.y + r.h - 60, r.w, 44);
        ctx.clip();
        ctx.fillStyle = '#ffcf33';
        ctx.fillRect(r.x, r.y + r.h - 60, r.w, 44);
        ctx.fillStyle = '#1c1628';
        for (let x = r.x - 60; x < r.x + r.w + 60; x += 40) {
          ctx.beginPath();
          ctx.moveTo(x, r.y + r.h - 16);
          ctx.lineTo(x + 20, r.y + r.h - 16);
          ctx.lineTo(x + 44, r.y + r.h - 60);
          ctx.lineTo(x + 24, r.y + r.h - 60);
          ctx.closePath();
          ctx.fill();
        }
        ctx.restore();
        const glow = 0.5 + 0.5 * beatP;
        ctx.fillStyle = `rgba(255,70,90,${glow})`;
        for (let x = r.x + 4; x < r.x + r.w - 10; x += 26) {
          ctx.beginPath();
          ctx.moveTo(x, r.y + r.h - 16);
          ctx.lineTo(x + 11, r.y + r.h + 4);
          ctx.lineTo(x + 22, r.y + r.h - 16);
          ctx.closePath();
          ctx.fill();
        }
        ctx.strokeStyle = '#120d1c';
        ctx.lineWidth = 5;
        ctx.strokeRect(r.x, r.y, r.w, r.h - 16);
      }
    }

    // checkpoints
    for (const cp of L.checkpoints) {
      if (cp.x < x0 - 100 || cp.x > x1 + 100) continue;
      const wave = cp.reached ? 1 + 0.1 * gr.pulse(1, 0.3) : 1;
      blit(ctx, this.spr.flag, cp.x, cp.y, wave, 1);
      if (cp.flash > 0) {
        ctx.globalAlpha = cp.flash;
        blit(ctx, this.spr.lumGlow, cp.x + 40, cp.y - 170, 3, 3);
        ctx.globalAlpha = 1;
      }
    }

    // finish gate
    if (L.finishX > x0 - 200 && L.finishX < x1 + 200) {
      const fy = L.floorYAt(L.finishX - 1);
      const y = Number.isNaN(fy) ? 0 : fy;
      const pulse = 1 + 0.06 * gr.pulse(1, 0.3);
      ctx.save();
      ctx.translate(L.finishX, y);
      ctx.scale(pulse, pulse);
      for (let i = 0; i < 14; i++) {
        ctx.fillStyle = i % 2 ? '#ffffff' : '#1a1a1a';
        ctx.fillRect(-14, -420 + i * 30, 28, 30);
      }
      ctx.fillStyle = '#ffd23f';
      ctx.font = `bold 44px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('FINISH', 0, -440);
      ctx.restore();
    }

    // lums
    for (const l of L.lums) {
      if (l.x < x0 - 60 || l.x > x1 + 60 || l.skipped) continue;
      if (l.collected) {
        const t = l.collectT;
        if (t > 0.4) continue;
        const k = t / 0.4;
        ctx.globalAlpha = 1 - k;
        blit(ctx, this.spr.lum, l.x, l.y - 80 * k, 1 + k, 1 + k);
        ctx.strokeStyle = '#fff2a8';
        ctx.lineWidth = 4 * (1 - k);
        ctx.beginPath();
        ctx.arc(l.x, l.y, 20 + 60 * k, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = 1;
        continue;
      }
      // bounce: each lum pops on its own beat (so rows ripple in time)
      const own = gr.pulse(1, 0.18, l.beat % 1);
      const s = 1 + 0.25 * own;
      const bob = -6 * (1 - gr.bounce(1, l.beat % 1));
      blit(ctx, this.spr.lumGlow, l.x, l.y + bob, 0.9 + 0.4 * own, 0.9 + 0.4 * own);
      blit(ctx, this.spr.lum, l.x, l.y + bob, s, s);
    }

    // enemies
    for (const e of L.enemies) {
      if (e.x < x0 - 150 || e.x > x1 + 150) continue;
      if (!e.alive && e.deadTime > 1.5) continue;
      const r = e.alive ? applyBeatReact(e.react, gr) : { sx: 1, sy: 1, dy: 0, flash: 0 };
      if (e.kind === 'grunt') {
        blit(ctx, this.spr.grunt, e.x, e.y + r.dy, r.sx * (e.alive ? 1 : 0.9), r.sy, e.rot);
      } else {
        const flap = Math.sin(gr.beat * Math.PI * 4);
        const bob = e.alive ? 14 * gr.wave(2) : 0;
        const cy = e.y - e.h / 2 + bob;
        ctx.save();
        ctx.translate(e.x, cy);
        ctx.rotate(e.rot);
        blit(ctx, this.spr.wing, 6, -4, 1, 0.4 + 0.6 * Math.abs(flap));
        blit(ctx, this.spr.wing, -6, -4, -1, 0.4 + 0.6 * Math.abs(flap));
        blit(ctx, this.spr.flyerBody, 0, 0, r.sx, r.sy);
        ctx.restore();
      }
      if (e.hitFlash > 0) {
        ctx.globalAlpha = e.hitFlash;
        blit(ctx, this.spr.lumGlow, e.x, e.y - e.h / 2, 2.2, 2.2);
        ctx.globalAlpha = 1;
      }
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number): void {
    const g = this.game;
    const p = g.player;
    const dead = p.mode === 'dead';
    if (dead && g.fade > 0.5) return;
    const f = p.facing;
    const h = p.h;
    const w = p.w;
    const sx = p.sx;
    const sy = p.sy;
    const sliding = p.sliding;
    const bodyW = (sliding ? w * 1.5 : w) * sx;
    const bodyH = h * sy;

    // scarf trail (world-space history of the neck point)
    const neckX = x - f * bodyW * 0.15;
    const neckY = y - bodyH * 0.72;
    this.scarf.unshift({ x: neckX, y: neckY });
    if (this.scarf.length > 14) this.scarf.length = 14;
    if (!dead && this.scarf.length > 2) {
      const t = g.groove.beat;
      ctx.fillStyle = '#e8374f';
      ctx.beginPath();
      for (let i = 0; i < this.scarf.length; i++) {
        const s = this.scarf[i];
        const wv = Math.sin(t * Math.PI * 2 + i * 0.7) * i * 0.8;
        const wd = lerp(11, 2, i / this.scarf.length);
        if (i === 0) ctx.moveTo(s.x, s.y - wd + wv);
        else ctx.lineTo(s.x - f * i * 5, s.y - wd + wv + i * 1.5);
      }
      for (let i = this.scarf.length - 1; i >= 0; i--) {
        const s = this.scarf[i];
        const wv = Math.sin(t * Math.PI * 2 + i * 0.7) * i * 0.8;
        const wd = lerp(11, 2, i / this.scarf.length);
        ctx.lineTo(s.x - f * i * 5, s.y + wd + wv + i * 1.5);
      }
      ctx.closePath();
      ctx.fill();
    }

    ctx.save();
    ctx.translate(x, y);
    if (dead) {
      ctx.rotate(g.groove.time * 12);
      ctx.globalAlpha = 0.9;
    }

    // feet (run cycle locked to distance -> footfalls on the beat grid)
    const run = p.grounded && !sliding && Math.abs(p.vx) > 50;
    const ph = p.runPhase * Math.PI;
    for (const side of [-1, 1]) {
      let fx = side * 12;
      let fy = 0;
      if (run) {
        const s = Math.sin(ph + (side > 0 ? 0 : Math.PI));
        fx = f * s * 22;
        fy = -Math.max(0, Math.cos(ph + (side > 0 ? 0 : Math.PI))) * 14;
      } else if (!p.grounded) {
        fx = side * 10 + f * 6;
        fy = -8 + side * 4;
      }
      if (sliding) {
        fx = f * (side * 16 + 30);
        fy = -4;
      }
      ctx.fillStyle = '#2b2140';
      ctx.beginPath();
      ctx.ellipse(fx, fy - 7, 15, 9, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // body
    const bx = -bodyW / 2;
    const by = -bodyH - 6;
    ctx.fillStyle = '#fff4e2';
    ctx.strokeStyle = '#2b2140';
    ctx.lineWidth = 5;
    roundRect(ctx, bx, by, bodyW, bodyH, Math.min(bodyW, bodyH) * 0.45);
    ctx.fill();
    ctx.stroke();
    // shirt
    ctx.fillStyle = '#3f7cff';
    roundRect(ctx, bx + 3, by + bodyH * 0.55, bodyW - 6, bodyH * 0.38, 10);
    ctx.fill();

    // eyes
    this.blinkT += 1 / 60;
    const blink = this.blinkT % 3.2 < 0.1;
    const ex = f * bodyW * 0.18;
    const ey = by + bodyH * 0.3;
    for (const o of [-9, 11]) {
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.ellipse(ex + o, ey, 8, blink ? 1.5 : 11, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#2b2140';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      if (!blink) {
        ctx.fillStyle = '#1b1530';
        ctx.beginPath();
        ctx.arc(ex + o + f * 3.5, ey + 1, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // fists
    const punchT = p.punchTime;
    let reach = 0;
    if (punchT >= 0) {
      const k = punchT / Tun.punch.duration;
      reach = k < 0.25 ? k / 0.25 : 1 - (k - 0.25) / 0.75;
      reach = clamp(reach, 0, 1);
    }
    const fistY = by + bodyH * 0.55;
    const backX = -f * (bodyW * 0.45);
    const frontX = f * (bodyW * 0.5 + reach * (Tun.punch.reach * 0.8));
    const armSwing = run ? Math.sin(p.runPhase * Math.PI) * 10 : 0;
    ctx.fillStyle = '#fff4e2';
    ctx.strokeStyle = '#2b2140';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(backX, fistY - armSwing, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    const fr = 13 + reach * 9;
    ctx.beginPath();
    ctx.arc(frontX, fistY + armSwing * (1 - reach), fr, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    if (reach > 0.3) {
      // speed lines behind the fist
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = 3;
      for (const o of [-8, 0, 8]) {
        ctx.beginPath();
        ctx.moveTo(frontX - f * (fr + 8), fistY + o);
        ctx.lineTo(frontX - f * (fr + 40 * reach), fistY + o);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  // ------------------------------------------------------------------ HUD & screens

  private drawHud(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    const gr = g.groove;
    // lum counter
    const pop = 1 + 0.12 * gr.pulse(1, 0.2);
    blit(ctx, this.spr.lumGlow, 70, 70, 1.1, 1.1);
    blit(ctx, this.spr.lum, 70, 70, 1.3 * pop, 1.3 * pop);
    ctx.font = `bold 50px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const wN = ctx.measureText(`${g.stats.lums}`).width;
    outlineText(ctx, `${g.stats.lums}`, 110, 72, '#fff7d6');
    ctx.font = `bold 28px ${FONT}`;
    outlineText(ctx, `/ ${g.stats.lumsTotal}`, 110 + wN + 12, 80, '#d8c9a8');
    // deaths
    if (g.stats.deaths > 0) {
      ctx.font = `bold 30px ${FONT}`;
      outlineText(ctx, `☠ ${g.stats.deaths}`, 46, 140, '#ffb3c1');
    }
    // beat metronome dots (top right): 4 dots, current beat lit
    if (g.scene === 'play') {
      const bib = Math.floor(gr.beatInBar);
      for (let i = 0; i < 4; i++) {
        const on = i === bib && g.conductor.playing;
        const r = on ? 12 + 8 * gr.pulse(1, 0.2) : 9;
        ctx.fillStyle = on ? (i === 0 ? '#ffd23f' : '#ffffff') : 'rgba(255,255,255,0.25)';
        ctx.beginPath();
        ctx.arc(VIEW_W - 170 + i * 40, 60, r, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // count-in
    if (g.phase === 'countIn' && g.scene === 'play' && g.conductor.playing) {
      const beatsLeft = g.spawnBeat - g.conductor.beat;
      if (beatsLeft > 0 && beatsLeft <= Tun.flow.countInBeats) {
        const n = Math.ceil(beatsLeft);
        const k = g.groove.pulse(1, 0.3);
        ctx.font = `bold ${120 + 40 * k}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.globalAlpha = 0.9;
        outlineText(ctx, n <= 3 ? String(n) : 'READY', VIEW_W / 2, VIEW_H * 0.3, '#ffffff');
        ctx.globalAlpha = 1;
      }
    }
    if (g.toast.t > 0) {
      ctx.globalAlpha = Math.min(1, g.toast.t * 2);
      ctx.font = `bold 36px ${FONT}`;
      ctx.textAlign = 'center';
      outlineText(ctx, g.toast.text, VIEW_W / 2, VIEW_H - 80, '#ffffff');
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawTitle(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    g.background.draw(ctx, g.groove.time * 200, -240, g.groove);
    ctx.fillStyle = 'rgba(10,6,30,0.35)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    const k = g.groove.pulse(1, 0.25);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${150 + 10 * k}px ${FONT}`;
    outlineText(ctx, 'OPUS LEGENDS', VIEW_W / 2, VIEW_H * 0.36, '#ffe066', 12);
    ctx.font = `bold 34px ${FONT}`;
    outlineText(ctx, g.song.title + (g.song.artist ? ` — ${g.song.artist}` : ''), VIEW_W / 2, VIEW_H * 0.48, '#ffffff');
    ctx.font = `bold 46px ${FONT}`;
    if (g.loadError) outlineText(ctx, 'Failed to load audio: ' + g.loadError, VIEW_W / 2, VIEW_H * 0.66, '#ff8080');
    else if (g.scene === 'loading') outlineText(ctx, 'tuning the band…', VIEW_W / 2, VIEW_H * 0.66, '#ffffff');
    else {
      ctx.globalAlpha = 0.6 + 0.4 * k;
      outlineText(ctx, 'PRESS ANY KEY TO START', VIEW_W / 2, VIEW_H * 0.66, '#ffffff');
      ctx.globalAlpha = 1;
    }
    ctx.font = `26px ${FONT}`;
    outlineText(ctx, 'Arrows / WASD move · Space / Z / W jump (hold = higher) · X / J punch · Down / S slide · Gamepad supported', VIEW_W / 2, VIEW_H * 0.8, '#e8e0ff', 5);
    outlineText(ctx, '[ / ] adjust audio latency · Esc pause · ` debug overlay', VIEW_W / 2, VIEW_H * 0.85, '#bfb4e0', 5);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    g.debug.drawScreen(ctx);
  }

  private drawEnd(ctx: CanvasRenderingContext2D): void {
    const g = this.game;
    ctx.fillStyle = 'rgba(10,6,30,0.72)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 110px ${FONT}`;
    outlineText(ctx, 'LEVEL COMPLETE!', VIEW_W / 2, VIEW_H * 0.24, '#ffe066', 10);
    const r = g.report();
    const secs = (g.stats.finishedAt - g.stats.startedAt) / 1000;
    const acc = r.timing.press.n > 0 ? r.timing.press.meanAbsMs : r.timing.exec.meanAbsMs;
    const grade = !Number.isFinite(acc) ? '-' : acc < 25 ? 'PERFECT GROOVE' : acc < 50 ? 'GREAT GROOVE' : acc < 90 ? 'GOOD GROOVE' : 'LOOSE GROOVE';
    const lines: [string, string][] = [
      ['Lums', `${g.stats.lums} / ${g.stats.lumsTotal}`],
      ['Deaths', `${g.stats.deaths}`],
      ['Time', `${secs.toFixed(1)} s`],
      ['Rhythm', Number.isFinite(acc) ? `±${acc.toFixed(0)} ms  (${r.matchedActions}/${r.intendedActions} on beat)` : '-'],
    ];
    ctx.font = `bold 48px ${FONT}`;
    lines.forEach(([k, v], i) => {
      ctx.textAlign = 'right';
      outlineText(ctx, k, VIEW_W / 2 - 30, VIEW_H * 0.4 + i * 72, '#cfc3ff');
      ctx.textAlign = 'left';
      outlineText(ctx, v, VIEW_W / 2 + 30, VIEW_H * 0.4 + i * 72, '#ffffff');
    });
    ctx.textAlign = 'center';
    ctx.font = `bold 56px ${FONT}`;
    outlineText(ctx, grade, VIEW_W / 2, VIEW_H * 0.74, '#7dffb0', 8);
    ctx.font = `bold 34px ${FONT}`;
    ctx.globalAlpha = 0.6 + 0.4 * g.groove.pulse(1, 0.3);
    outlineText(ctx, 'press Space / Enter to play again', VIEW_W / 2, VIEW_H * 0.86, '#ffffff');
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }

  private drawCenterText(ctx: CanvasRenderingContext2D, title: string, sub: string): void {
    ctx.fillStyle = 'rgba(10,6,30,0.6)';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold 100px ${FONT}`;
    outlineText(ctx, title, VIEW_W / 2, VIEW_H * 0.45, '#ffffff', 10);
    ctx.font = `bold 36px ${FONT}`;
    outlineText(ctx, sub, VIEW_W / 2, VIEW_H * 0.56, '#cfc3ff');
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
  }
}

export function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function outlineText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, outline = 6): void {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#1a1030';
  ctx.lineWidth = outline;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
}
