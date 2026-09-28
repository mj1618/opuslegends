/**
 * Grindhouse ambient-life actor kinds (for LifeLayer): the street and the bar come alive on the beat.
 * All are cheap flat silhouettes lit by the scene lighting and hazed by the layer depth.
 *   street: PEDESTRIAN (steps on the beat, boombox heads bob) · TAXI / SEDAN / VAN (bounce on the
 *   kick, headlights at night, honk lines on HEY) · PIGEONS (peck on 8ths, scatter on crashes) ·
 *   LETTER (a sign letter drops on riff accents) · NEWSPAPER (blows along the gutter)
 *   bar: BRAWLERS (trade punches on the beats) · BOTTLE (thrown on the snare, smashes) ·
 *   POOL_BALL (flies on piano runs) · PATRON (drinks, cheers on HEY)
 */
import { hit } from '../core/beat';
import type { Ctx } from '../core/canvas';
import { type RGB, css, hex, mix } from '../core/color';
import { drawGlow, puff } from '../core/draw';
import { TAU, clamp01, fract } from '../core/math';
import type { Actor, ActorKind, LifeCtx } from '../life/life';
import { CF } from '../palette';
import { atmos, lit } from '../world/lighting';

const H = hex;
const col = (c: LifeCtx, m: RGB | string, light = 0.8, extra = 0) => css(lit(c.L, typeof m === 'string' ? H(m) : m, light, c.depth + extra));

// ------------------------------------------------------------------------------ PEDESTRIAN

const COATS = ['#6B4A34', '#8A7A3A', '#3E5A5E', '#5E2B4E', '#7A3A30', '#4A4A5A'];
const PANTS = ['#2E2A36', '#4A3A2A', '#3A4A6A', '#6A5A48'];

export const PEDESTRIAN: ActorKind = {
  id: 'pedestrian',
  spawn(a, r) {
    a.a = Math.floor(r() * 1000); // look variant
    a.b = r() < 0.12 ? 1 : 0; // boombox
  },
  draw(g, a, c) {
    const v = a.a;
    const beat = c.b.beat + a.seed * 4;
    const ph = beat * Math.PI; // steps on the beat
    const sw = Math.sin(ph) * 0.45;
    const bob = Math.abs(Math.cos(ph)) * 2.5;
    const s = a.s;
    g.save();
    g.translate(a.x, a.y);
    g.scale(s * a.dir, s);
    const coat = col(c, COATS[v % COATS.length], 0.75);
    const pant = col(c, PANTS[(v >> 2) % PANTS.length], 0.6);
    const skin = col(c, ['#C98E68', '#8A5A3E', '#E0B090', '#5E3A28'][(v >> 4) % 4], 0.8);
    const dark = col(c, '#1A1410', 0.4);
    // legs (flares)
    g.fillStyle = pant;
    for (const k of [-1, 1]) {
      g.save();
      g.translate(0, -44);
      g.rotate(sw * k);
      g.beginPath();
      g.moveTo(-5, 0);
      g.lineTo(5, 0);
      g.lineTo(8, 44);
      g.lineTo(-8, 44);
      g.closePath();
      g.fill();
      g.restore();
    }
    // coat
    g.fillStyle = coat;
    g.beginPath();
    g.moveTo(-13, -44 + bob);
    g.lineTo(13, -44 + bob);
    g.lineTo(11, -88 + bob);
    g.quadraticCurveTo(0, -94 + bob, -11, -88 + bob);
    g.closePath();
    g.fill();
    // arm swing
    g.strokeStyle = coat;
    g.lineWidth = 7;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(0, -84 + bob);
    g.lineTo(-Math.sin(sw) * 16, -58 + bob);
    g.stroke();
    // head + hair variant
    const hy = -102 + bob + (a.b ? Math.abs(Math.sin(beat * Math.PI)) * -3 : 0);
    g.fillStyle = skin;
    g.beginPath();
    g.ellipse(0, hy, 8, 10, 0, 0, TAU);
    g.fill();
    g.fillStyle = dark;
    const hair = (v >> 6) % 4;
    if (hair === 0) {
      g.beginPath();
      g.ellipse(0, hy - 4, 13, 12, 0, 0, TAU); // big 70s hair
      g.fill();
      g.fillStyle = skin;
      g.beginPath();
      g.ellipse(3, hy + 1, 6, 7, 0, 0, TAU);
      g.fill();
    } else if (hair === 1) {
      g.fillRect(-11, hy - 10, 22, 4); // hat brim
      g.fillRect(-7, hy - 18, 14, 9);
    } else if (hair === 2) {
      g.beginPath();
      g.ellipse(-1, hy - 6, 9, 5, 0, Math.PI, TAU);
      g.fill();
    }
    if (a.b) {
      // boombox on the shoulder, speakers pulse on the kick
      const k = hit(c.b, 'kick', 0.1);
      g.fillStyle = col(c, '#3A3A42', 0.7);
      g.fillRect(8, -106 + bob, 26, 16);
      g.fillStyle = col(c, '#9AA0A8', 0.9);
      for (const sx of [13, 29]) {
        g.beginPath();
        g.arc(sx, -98 + bob, 4 + k * 1.5, 0, TAU);
        g.fill();
      }
    }
    g.restore();
  },
};

// ------------------------------------------------------------------------------ VEHICLES

function vehicle(g: Ctx, a: Actor, c: LifeCtx, body: string, type: 'cab' | 'sedan' | 'van') {
  const k = hit(c.b, 'kick', 0.1);
  const s = a.s;
  const bounce = -k * 4 + Math.sin(a.t * 17) * 0.6;
  g.save();
  g.translate(a.x, a.y);
  g.scale(s * a.dir, s);
  const len = type === 'van' ? 230 : 250;
  const bodyC = col(c, body, 0.85);
  const dark = col(c, '#141214', 0.4);
  const glass = css(mix(lit(c.L, H('#2A3A44'), 0.5, c.depth), c.L.skyMid, 0.25));
  const chrome = col(c, CF.chrome, 0.9);
  // wheels (spin)
  for (const wx of [-len * 0.32, len * 0.32]) {
    g.fillStyle = dark;
    g.beginPath();
    g.arc(wx, -16, 17, 0, TAU);
    g.fill();
    g.strokeStyle = chrome;
    g.lineWidth = 3;
    g.beginPath();
    const r = a.t * 20 * a.dir;
    g.moveTo(wx + Math.cos(r) * 8, -16 + Math.sin(r) * 8);
    g.lineTo(wx - Math.cos(r) * 8, -16 - Math.sin(r) * 8);
    g.stroke();
  }
  g.translate(0, bounce);
  // body
  g.fillStyle = bodyC;
  g.beginPath();
  if (type === 'van') {
    g.moveTo(-len / 2, -22);
    g.lineTo(-len / 2, -104);
    g.lineTo(len * 0.28, -104);
    g.lineTo(len / 2, -62);
    g.lineTo(len / 2, -22);
  } else {
    g.moveTo(-len / 2, -22);
    g.lineTo(-len / 2 + 6, -56);
    g.lineTo(-len * 0.3, -60);
    g.lineTo(-len * 0.2, -92);
    g.lineTo(len * 0.18, -92);
    g.lineTo(len * 0.3, -60);
    g.lineTo(len / 2, -54);
    g.lineTo(len / 2, -22);
  }
  g.closePath();
  g.fill();
  // windows
  g.fillStyle = glass;
  if (type === 'van') g.fillRect(len * 0.2, -96, len * 0.2, 28);
  else {
    g.beginPath();
    g.moveTo(-len * 0.17, -86);
    g.lineTo(-len * 0.02, -86);
    g.lineTo(-len * 0.02, -62);
    g.lineTo(-len * 0.26, -62);
    g.closePath();
    g.moveTo(len * 0.02, -86);
    g.lineTo(len * 0.15, -86);
    g.lineTo(len * 0.26, -62);
    g.lineTo(len * 0.02, -62);
    g.closePath();
    g.fill();
    // driver silhouette
    g.fillStyle = dark;
    g.beginPath();
    g.ellipse(len * 0.1, -70, 7, 9, 0, 0, TAU);
    g.fill();
  }
  if (type === 'cab') {
    // checker band + roof light
    g.fillStyle = dark;
    g.fillRect(-len / 2 + 4, -46, len - 8, 8);
    g.fillStyle = col(c, '#E8E0CC', 0.95);
    for (let x = -len / 2 + 4; x < len / 2 - 8; x += 16) g.fillRect(x, -46, 8, 4);
    for (let x = -len / 2 + 12; x < len / 2 - 8; x += 16) g.fillRect(x, -42, 8, 4);
    g.fillStyle = col(c, '#E8E0CC', 0.95);
    g.fillRect(-14, -102, 28, 10);
  }
  // bumpers + lights
  g.fillStyle = chrome;
  g.fillRect(-len / 2 - 4, -28, 14, 7);
  g.fillRect(len / 2 - 10, -28, 14, 7);
  const lamp = 0.35 + c.L.lamps * 0.65;
  g.fillStyle = css(atmos(c.L, H(CF.bulb), c.depth * 0.3), lamp);
  g.beginPath();
  g.arc(len / 2 - 6, -40, 5, 0, TAU);
  g.fill();
  if (c.L.lamps > 0.4) {
    drawGlow(g, len / 2 + 10, -40, CF.bulb, 70, (c.L.lamps - 0.3) * 0.5);
    // headlight beam on the road
    g.fillStyle = css(atmos(c.L, H(CF.bulb)), 0.08 * c.L.lamps);
    g.beginPath();
    g.moveTo(len / 2, -44);
    g.lineTo(len / 2 + 260, -70);
    g.lineTo(len / 2 + 260, 0);
    g.closePath();
    g.fill();
  }
  g.fillStyle = col(c, '#8A1A14', 0.9);
  g.fillRect(-len / 2 - 2, -48, 6, 8);
  // honk lines on HEY
  const hey = hit(c.b, 'hey', 0.15);
  if (hey > 0.1 && a.seed > 0.5) {
    g.strokeStyle = col(c, CF.cream, 1);
    g.lineWidth = 3;
    g.globalAlpha *= hey;
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      g.moveTo(len / 2 + 12, -60 + i * 12 - 12);
      g.lineTo(len / 2 + 30, -66 + i * 16 - 16);
      g.stroke();
    }
  }
  g.restore();
}

export const TAXI: ActorKind = { id: 'taxi', draw: (g, a, c) => vehicle(g, a, c, '#B8902E', 'cab') };
export const SEDAN: ActorKind = {
  id: 'sedan',
  draw: (g, a, c) => vehicle(g, a, c, ['#5E2B4E', '#3E5A5E', '#6B3A2E', '#4A4A58'][Math.floor(a.seed * 4)], 'sedan'),
};
export const VAN: ActorKind = { id: 'van', draw: (g, a, c) => vehicle(g, a, c, ['#8A7A5A', '#6A7A6A'][a.seed > 0.5 ? 1 : 0], 'van') };

// ------------------------------------------------------------------------------ PIGEONS (pinned flock)

export const PIGEONS: ActorKind = {
  id: 'pigeons',
  update(a, dt, c) {
    // state 0 pecking; crash -> 1 scatter (a = time since scatter); after 5 s they return
    if (a.state === 0 && c.b.since.crash < 0.1) {
      a.state = 1;
      a.a = 0;
    }
    if (a.state === 1) {
      a.a += dt;
      if (a.a > 5) a.state = 0;
    }
    return true;
  },
  draw(g, a, c) {
    const grey = col(c, '#8A8E98', 0.8);
    const dark = col(c, '#4A4E58', 0.6);
    const eighth = Math.floor(c.b.beat * 2);
    for (let i = 0; i < 5; i++) {
      let x = a.x + i * 18 - 36;
      let y = a.y;
      let fly = 0;
      if (a.state === 1) {
        const t = a.a;
        const vx = (i - 2) * 60 + 40;
        const vy = -220 - i * 30;
        x += vx * t;
        y += vy * t + 20 * t * t;
        fly = 1;
        if (t > 3.5) continue;
      }
      g.save();
      g.translate(x, y);
      g.scale(a.s, a.s);
      g.fillStyle = grey;
      g.beginPath();
      g.ellipse(0, -6, 8, 5, 0, 0, TAU);
      g.fill();
      if (fly) {
        const flap = Math.sin(c.b.beat * Math.PI * 8 + i) * 8;
        g.fillStyle = dark;
        g.beginPath();
        g.moveTo(-2, -8);
        g.lineTo(-12, -8 - flap);
        g.lineTo(4, -8);
        g.moveTo(2, -8);
        g.lineTo(12, -8 - flap);
        g.lineTo(-2, -8);
        g.fill();
      } else {
        const peck = (eighth + i) % 3 === 0 ? 4 : 0;
        g.fillStyle = dark;
        g.beginPath();
        g.arc(7, -10 + peck, 3.5, 0, TAU);
        g.fill();
      }
      g.restore();
    }
  },
};

// ------------------------------------------------------------------------------ falling sign LETTER

export const LETTER: ActorKind = {
  id: 'letter',
  spawn(a, r) {
    a.a = Math.floor(r() * 26);
    a.vx = (r() - 0.5) * 60;
    a.vy = -40;
    a.b = a.y + 440; // floor
  },
  update(a, dt) {
    a.vy += 1400 * dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.y > a.b) {
      a.y = a.b;
      a.vy *= -0.35;
      a.vx *= 0.6;
      a.state++;
      if (a.state > 2) return false;
    }
    return a.t < 3;
  },
  draw(g, a, c) {
    const ch = String.fromCharCode(65 + a.a);
    g.save();
    g.translate(a.x, a.y);
    g.rotate(a.t * 6 * (a.vx >= 0 ? 1 : -1) * (a.state ? 0.3 : 1));
    g.font = '64px "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.lineWidth = 6;
    g.strokeStyle = col(c, '#1A1210', 0.4);
    g.strokeText(ch, 0, 0);
    g.fillStyle = css(atmos(c.L, H(a.seed > 0.5 ? CF.neonRose : CF.neonJade), c.depth * 0.3), 0.4 + 0.6 * c.L.lamps);
    g.fillText(ch, 0, 0);
    g.restore();
    if (a.state === 1 && a.vy < 0) puff(g, a.x, a.b + 10, 16, 0.4, col(c, '#8A8276', 0.9));
  },
};

// ------------------------------------------------------------------------------ NEWSPAPER

export const NEWSPAPER: ActorKind = {
  id: 'newspaper',
  update(a, dt) {
    a.x += a.vx * dt;
    a.y = a.b + Math.abs(Math.sin(a.t * 3.1)) * -40;
    return true;
  },
  spawn(a) {
    a.b = a.y;
  },
  draw(g, a, c) {
    g.save();
    g.translate(a.x, a.y);
    g.rotate(Math.sin(a.t * 5) * 0.8);
    g.scale(1, 0.4 + Math.abs(Math.sin(a.t * 4)) * 0.6);
    g.fillStyle = col(c, '#D9D0BC', 0.9);
    g.fillRect(-18, -12, 36, 24);
    g.fillStyle = col(c, '#5A5048', 0.5);
    for (let i = 0; i < 4; i++) g.fillRect(-14, -8 + i * 5, 28, 1.5);
    g.restore();
  },
};

// ------------------------------------------------------------------------------ BAR actors

export const BRAWLERS: ActorKind = {
  id: 'brawlers',
  draw(g, a, c) {
    // two patrons trade punches: A lands on beats 1 & 3, B on 2 & 4; the loser reels
    const bi = Math.floor(c.b.beat) % 2;
    const k = Math.exp(-c.b.beatPhase * 5);
    const sil = col(c, '#241A1C', 0.4);
    const rim = css(mix(lit(c.L, H('#241A1C'), 0.4, c.depth), c.L.rim, 0.5), 0.8);
    for (let p = 0; p < 2; p++) {
      const side = p === 0 ? -1 : 1;
      const attacking = bi === p;
      const x = a.x + side * 34 + (attacking ? -side * 8 * k : side * 10 * k);
      const lean = attacking ? -side * 0.25 * k : side * 0.35 * k;
      g.save();
      g.translate(x, a.y);
      g.scale(a.s, a.s);
      g.rotate(lean);
      g.fillStyle = sil;
      g.beginPath();
      g.moveTo(-16, 0);
      g.lineTo(16, 0);
      g.lineTo(14, -70);
      g.quadraticCurveTo(0, -80, -14, -70);
      g.closePath();
      g.fill();
      g.beginPath();
      g.arc(0, -92, 13, 0, TAU);
      g.fill();
      // punching arm
      g.strokeStyle = sil;
      g.lineWidth = 11;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(0, -64);
      g.lineTo(-side * (attacking ? 40 * k + 14 : 16), -66 - (attacking ? 4 : -10));
      g.stroke();
      g.strokeStyle = rim;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(0, -92, 13, Math.PI * 1.1, Math.PI * 1.7);
      g.stroke();
      g.restore();
    }
    if (k > 0.6) {
      // impact star
      g.fillStyle = col(c, CF.cream, 1, -0.2);
      const x = a.x + (bi === 0 ? 20 : -20);
      g.save();
      g.translate(x, a.y - 66 * a.s);
      g.rotate(c.b.beat);
      g.beginPath();
      for (let i = 0; i < 10; i++) {
        const r = i % 2 ? 5 : 14 * k;
        g.lineTo(Math.cos((i / 10) * TAU) * r, Math.sin((i / 10) * TAU) * r);
      }
      g.fill();
      g.restore();
    }
  },
};

export const BOTTLE: ActorKind = {
  id: 'bottle',
  spawn(a, r) {
    a.vx = (r() < 0.5 ? -1 : 1) * (200 + r() * 200);
    a.vy = -500 - r() * 200;
    a.b = a.y + 60;
  },
  update(a, dt) {
    a.vy += 1300 * dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.y > a.b && a.state === 0) {
      a.state = 1;
      a.a = a.t;
      a.y = a.b;
      a.vx = 0;
      a.vy = 0;
    }
    return a.state === 0 || a.t - a.a < 0.4;
  },
  draw(g, a, c) {
    const glass = css(atmos(c.L, H(a.seed > 0.5 ? '#3E8A5A' : '#8A5A2A'), c.depth * 0.5), 0.9);
    if (a.state === 0) {
      g.save();
      g.translate(a.x, a.y);
      g.rotate(a.t * 14);
      g.fillStyle = glass;
      g.fillRect(-5, -12, 10, 20);
      g.fillRect(-2, -20, 4, 8);
      g.restore();
    } else {
      const u = (a.t - a.a) / 0.4;
      g.fillStyle = glass;
      for (let i = 0; i < 6; i++) {
        const an = -Math.PI * (0.15 + (i / 5) * 0.7);
        g.fillRect(a.x + Math.cos(an) * u * 40, a.y + Math.sin(an) * u * 30 + u * u * 20, 4, 4);
      }
    }
  },
};

const BALLS = ['#E0B64A', '#2E4A9A', '#B3201B', '#5E2B4E', '#C8601A', '#1F6B45', '#7A2A20', '#1A1410'];

export const POOL_BALL: ActorKind = {
  id: 'poolball',
  spawn(a, r) {
    a.a = Math.floor(r() * BALLS.length);
    a.vx = (r() - 0.5) * 500;
    a.vy = -600 - r() * 300;
    a.b = a.y + 80;
  },
  update(a, dt) {
    a.vy += 1400 * dt;
    a.x += a.vx * dt;
    a.y += a.vy * dt;
    if (a.y > a.b) {
      a.y = a.b;
      a.vy *= -0.45;
      a.state++;
    }
    return a.state < 3;
  },
  draw(g, a, c) {
    // desaturated so balls never read as gold reward / red danger
    const base = mix(H(BALLS[a.a]), H('#8A8078'), 0.45);
    g.fillStyle = css(lit(c.L, base, 0.9, c.depth));
    g.beginPath();
    g.arc(a.x, a.y, 11, 0, TAU);
    g.fill();
    g.fillStyle = col(c, '#F0E8D8', 1);
    g.beginPath();
    g.arc(a.x + 2, a.y - 2, 4.5, 0, TAU);
    g.fill();
  },
};

export const PATRON: ActorKind = {
  id: 'patron',
  spawn(a, r) {
    a.a = Math.floor(r() * 1000);
  },
  draw(g, a, c) {
    // seated patron: sips on the offbeat, raises the glass on HEY
    const hey = hit(c.b, 'hey', 0.3);
    const sip = Math.max(0, Math.sin((c.b.beat + a.seed * 4) * Math.PI * 0.5)) ** 8;
    const sil = col(c, COATS[a.a % COATS.length], 0.45);
    const skin = col(c, '#8A6A58', 0.6);
    g.save();
    g.translate(a.x, a.y);
    g.scale(a.s * a.dir, a.s);
    g.fillStyle = sil;
    g.beginPath();
    g.moveTo(-18, 0);
    g.lineTo(18, 0);
    g.lineTo(14, -56);
    g.quadraticCurveTo(0, -64, -14, -56);
    g.closePath();
    g.fill();
    g.fillStyle = skin;
    g.beginPath();
    g.arc(0, -74 - hey * 4, 12, 0, TAU);
    g.fill();
    // arm + glass
    const up = hey > 0.2 ? 1 : sip;
    const hx = 18;
    const hy = -40 - up * 40;
    g.strokeStyle = sil;
    g.lineWidth = 9;
    g.lineCap = 'round';
    g.beginPath();
    g.moveTo(4, -50);
    g.lineTo(hx, hy);
    g.stroke();
    g.fillStyle = css(atmos(c.L, H('#E8C86A'), c.depth * 0.5), 0.85);
    g.fillRect(hx - 5, hy - 14, 10, 14);
    g.restore();
    void clamp01;
    void fract;
  },
};
