/**
 * Debug overlay (?debug=1, toggle with ` or F1).
 * World layer: beat grid (bars thick, beat numbers), the MUSIC LINE (where the song is, in world
 * x — the hero should ride it), intended-action markers, hitboxes, labels.
 * Screen layer: fps/frame time, song time/beat/bar/BPM, clock diagnostics, player state,
 * recent action timing errors, jump airtimes.
 */
import { VIEW_W } from '../engine/display';
import type { Game } from '../game/game';
import { enemyRect } from '../game/game';
import { jumpProfile } from '../game/jumpProfile';
import type { Rect } from '../engine/math';

const COLORS = { jump: '#44e0ff', strike: '#ff9a3d', slide: '#ffc53d' } as const;

export class DebugOverlay {
  enabled: boolean;
  private game: Game;
  private airtimes = '';

  constructor(game: Game, enabled: boolean) {
    this.game = game;
    this.enabled = enabled;
  }

  drawWorld(ctx: CanvasRenderingContext2D, v: { x0: number; y0: number; x1: number; y1: number }): void {
    if (!this.enabled) return;
    const g = this.game;
    const L = g.level;
    const ppb = L.ppb;
    ctx.save();
    // beat grid
    const b0 = Math.floor(v.x0 / ppb);
    const b1 = Math.ceil(v.x1 / ppb);
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    for (let b = b0; b <= b1; b++) {
      const x = b * ppb;
      const bar = b % 4 === 0;
      ctx.strokeStyle = bar ? 'rgba(255,255,255,0.45)' : 'rgba(255,255,255,0.16)';
      ctx.lineWidth = bar ? 3 : 1.5;
      ctx.beginPath();
      ctx.moveTo(x, v.y0);
      ctx.lineTo(x, v.y1);
      ctx.stroke();
      ctx.fillStyle = bar ? '#fff' : 'rgba(255,255,255,0.6)';
      ctx.fillText(String(b), x, v.y0 + 130);
      // half-beat ticks
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(x + ppb / 2, v.y0 + 140);
      ctx.lineTo(x + ppb / 2, v.y0 + 160);
      ctx.stroke();
    }
    // music line: where the song is right now in world space
    if (g.conductor.playing) {
      const mx = g.conductor.beat * ppb;
      ctx.strokeStyle = 'rgba(120,255,140,0.9)';
      ctx.lineWidth = 3;
      ctx.setLineDash([12, 8]);
      ctx.beginPath();
      ctx.moveTo(mx, v.y0);
      ctx.lineTo(mx, v.y1);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    // intended actions
    for (const a of L.actions) {
      if (a.x < v.x0 - 50 || a.x > v.x1 + 50) continue;
      const fy = L.floorYAt(a.x);
      const y = (Number.isNaN(fy) ? 0 : fy) - 230;
      const c = COLORS[a.type];
      ctx.strokeStyle = c;
      ctx.lineWidth = 3;
      ctx.setLineDash([6, 6]);
      ctx.beginPath();
      ctx.moveTo(a.x, y);
      ctx.lineTo(a.x, y + 230);
      ctx.stroke();
      ctx.setLineDash([]);
      // hold duration bar
      if (a.hold) {
        ctx.fillStyle = c + '55';
        ctx.fillRect(a.x, y - 6, a.hold * ppb, 12);
      }
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.moveTo(a.x, y - 22);
      ctx.lineTo(a.x + 22, y);
      ctx.lineTo(a.x, y + 22);
      ctx.lineTo(a.x - 22, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#000';
      ctx.font = 'bold 22px monospace';
      ctx.fillText(a.type[0].toUpperCase(), a.x, y + 8);
      ctx.fillStyle = c;
      ctx.font = 'bold 18px monospace';
      ctx.fillText(String(a.beat), a.x, y - 30);
    }
    // labels
    ctx.textAlign = 'left';
    ctx.font = 'bold 28px monospace';
    for (const lb of L.labels) {
      if (lb.x < v.x0 - 600 || lb.x > v.x1) continue;
      ctx.fillStyle = '#fff';
      ctx.fillText(lb.text, lb.x + 8, v.y0 + 190);
    }
    // hitboxes
    ctx.lineWidth = 2;
    for (const s of L.world.all()) {
      if (s.x + s.w < v.x0 || s.x > v.x1) continue;
      ctx.strokeStyle = s.active === false ? 'rgba(255,255,255,0.25)' : s.kind === 'oneway' ? 'rgba(80,200,255,0.9)' : 'rgba(120,255,120,0.7)';
      strokeRect(ctx, { x: s.x, y: s.y, w: s.w, h: Math.min(s.h, 200) });
    }
    ctx.strokeStyle = 'rgba(255,60,60,0.95)';
    for (const h of L.hazards) if (h.rect.x + h.rect.w > v.x0 && h.rect.x < v.x1) strokeRect(ctx, h.rect);
    for (const e of L.enemies) {
      if (!e.alive || e.x < v.x0 || e.x > v.x1) continue;
      ctx.strokeStyle = 'rgba(255,120,0,0.95)';
      strokeRect(ctx, enemyRect(e, 0.72));
      ctx.strokeStyle = 'rgba(255,200,0,0.6)';
      strokeRect(ctx, enemyRect(e, 1));
    }
    ctx.strokeStyle = 'rgba(255,240,120,0.7)';
    for (const l of L.lums) {
      if (l.collected || l.skipped || l.x < v.x0 || l.x > v.x1) continue;
      ctx.beginPath();
      ctx.arc(l.x, l.y, 40, 0, Math.PI * 2);
      ctx.stroke();
    }
    const p = g.player;
    ctx.strokeStyle = '#00ffcc';
    strokeRect(ctx, p.hitbox());
    strokeRect(ctx, p.hurtbox({ x: 0, y: 0, w: 0, h: 0 }));
    if (p.strikeActive) {
      ctx.strokeStyle = '#ff00ff';
      strokeRect(ctx, p.strikeBox({ x: 0, y: 0, w: 0, h: 0 }));
    }
    // pendulums (strike targets) and the Chaser front
    ctx.strokeStyle = 'rgba(127,227,176,0.9)';
    for (const f of L.pendulums) {
      if (f.struck || f.x < v.x0 || f.x > v.x1) continue;
      ctx.beginPath();
      ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (g.chaser.active) {
      ctx.strokeStyle = 'rgba(0,200,255,0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.moveTo(g.chaser.x, v.y0);
      ctx.lineTo(g.chaser.x, v.y1);
      ctx.stroke();
    }
    ctx.restore();
  }

  drawScreen(ctx: CanvasRenderingContext2D): void {
    if (!this.enabled) return;
    const g = this.game;
    const c = g.conductor;
    const p = g.player;
    if (!this.airtimes) {
      const spb = g.tempo.secondsPerBeatAt(g.level.def.startBeat);
      this.airtimes = [0.15, 0.5, 1]
        .map((h) => `${h}b:${(jumpProfile(h * spb, g.level.runSpeed, g.level.ppb).airtime / spb).toFixed(2)}`)
        .join(' ');
    }
    const lines = [
      `fps ${g.frameStats.fps.toFixed(0)}  particles ${g.particles.count}`,
      `scene ${g.scene}/${g.phase}${g.paused ? ' PAUSED' : ''}  audio ${g.audio.ctx.state}`,
      `song ${c.time.toFixed(3)}s  beat ${c.beat.toFixed(2)}  bar ${Math.floor(c.beat / 4)}:${(Math.floor(((c.beat % 4) + 4) % 4) + 1).toString()}  bpm ${c.bpm.toFixed(1)}`,
      `clock ${c.clockSource} jitter ${c.clockJitterMs.toFixed(2)}ms  latency ${(c.latency * 1000).toFixed(0)}ms ([ ])`,
      `sim ${g.simTime.toFixed(3)}  drift ${((c.time - g.simTime) * 1000).toFixed(1)}ms  hitstop ${(g.hitstop * 1000).toFixed(0)}`,
      `hero x ${p.x.toFixed(0)} (beat ${(p.x / g.level.ppb).toFixed(2)}, music ${(c.beat - p.x / g.level.ppb).toFixed(2)} ahead)`,
      `v ${p.vx.toFixed(0)},${p.vy.toFixed(0)} ${p.grounded ? 'G' : 'air'}${p.sliding ? ' SLIDE' : ''}${p.striking ? ' STRIKE' : ''}${p.invulnerable ? ' IFRAMES' : ''}${p.surging ? ' SURGE' : ''}`,
      `deaths ${g.stats.deaths}  stumbles ${g.stats.stumbles}  lums ${g.stats.lums}/${g.stats.lumsTotal}  pendulums ${g.stats.pendulums}/${g.stats.pendulumsTotal}  cp ${g.checkpointIndex}`,
      `crowd ${g.crowd.count} (peak ${g.crowd.peak})  grades P${g.judge.counts.perfect} G${g.judge.counts.great} g${g.judge.counts.good} x${g.judge.counts.miss}  heaves ${g.stats.heaves}`,
      `jump airtime (beats) ${this.airtimes}`,
    ];
    // recent action timing
    const ex = g.stats.executed.slice(-4);
    for (const e of ex) {
      const beat = g.tempo.timeToBeat(e.simTime);
      // compare against the nearest INTENDED action of the same type (else nearest half beat)
      let target = Math.round(beat * 2) / 2;
      let best = Infinity;
      for (const a of g.level.actions) {
        if (a.type === e.type && Math.abs(a.beat - beat) < Math.min(best, 0.5)) {
          best = Math.abs(a.beat - beat);
          target = a.beat;
        }
      }
      const err = (e.simTime - g.tempo.beatToTime(target)) * 1000;
      const tag = best < Infinity ? 'intended' : 'grid';
      lines.push(`${e.type.padEnd(5)} @${beat.toFixed(2)} vs ${tag} ${target}: ${err >= 0 ? '+' : ''}${err.toFixed(1)}ms`);
    }
    ctx.save();
    ctx.font = '20px monospace';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    const w = 760;
    const x = VIEW_W - w - 20;
    const y = 100;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(x, y, w, lines.length * 25 + 16);
    ctx.fillStyle = '#b8ffcf';
    lines.forEach((l, i) => ctx.fillText(l, x + 10, y + 8 + i * 25));
    ctx.restore();
  }
}

function strokeRect(ctx: CanvasRenderingContext2D, r: Rect): void {
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}
