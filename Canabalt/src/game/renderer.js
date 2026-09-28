import { WORLD } from './core.js';
import { VfxSystem } from './vfx.js';

function polygon(ctx, points, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
  ctx.closePath();
  ctx.fill();
}

function box(ctx, x, y, w, h, front, top, side, depth = 8) {
  ctx.fillStyle = front;
  ctx.fillRect(x, y, w, h);
  polygon(ctx, [[x, y], [x + depth, y - depth], [x + w + depth, y - depth], [x + w, y]], top);
  polygon(ctx, [[x + w, y], [x + w + depth, y - depth], [x + w + depth, y + h - depth], [x + w, y + h]], side);
}

/** Override any draw hook to use your own SVG/image assets without changing physics. */
export const defaultRenderers = {
  player(ctx, player, info) {
    const bob = player.grounded && info.running && !info.reducedMotion ? Math.sin(info.time * 28) * 1.4 : 0;
    ctx.save();
    ctx.translate(player.x + 14, player.y + 14 + bob);
    if (!player.grounded && !info.reducedMotion) ctx.rotate(Math.min(0.18, Math.max(-0.18, player.vy / 2400)));
    box(ctx, -14, -14, 28, 28, '#a9e3c4', '#d6f4e2', '#65a98d', 7);
    ctx.fillStyle = '#294e42';
    ctx.fillRect(4, -7, 3, 4);
    ctx.restore();
  },
  shadow(ctx, shadow) {
    const gradient = ctx.createRadialGradient(shadow.x, shadow.y, 0, shadow.x, shadow.y, shadow.rx);
    gradient.addColorStop(0, `rgba(12, 27, 31, ${shadow.alpha})`);
    gradient.addColorStop(0.62, `rgba(12, 27, 31, ${shadow.alpha * 0.5})`);
    gradient.addColorStop(1, 'rgba(12, 27, 31, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.ellipse(shadow.x, shadow.y, shadow.rx, shadow.ry, 0, 0, Math.PI * 2);
    ctx.fill();
  },
  obstacle(ctx, obstacle) {
    const { x, y, width: w, height: h } = obstacle;
    if (obstacle.kind === 'cylinder') {
      ctx.fillStyle = '#7a8586';
      ctx.fillRect(x, y + 4, w, h - 8);
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 4, w / 2, 5, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#a1acad';
      ctx.beginPath(); ctx.ellipse(x + w / 2, y + 4, w / 2, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#5f6d70'; ctx.fillRect(x + w - 7, y + 9, 4, h - 15);
    } else {
      box(ctx, x, y, w, h, '#778585', '#a0aeab', '#546565', 7);
      ctx.strokeStyle = '#9ca9a6'; ctx.lineWidth = 1;
      ctx.strokeRect(x + 5, y + 6, w - 10, h - 12);
      ctx.beginPath(); ctx.moveTo(x + 5, y + 6); ctx.lineTo(x + w - 5, y + h - 6); ctx.stroke();
    }
  },
  platform(ctx, platform) {
    const { x, y, width: w, id } = platform;
    box(ctx, x, y, w, WORLD.height - y + 40, '#28373e', '#556867', '#1d2b33', 12);
    ctx.fillStyle = '#9cafaa'; ctx.fillRect(x, y, w, 3);
    ctx.fillStyle = '#35474e'; ctx.fillRect(x, y + 9, w, 5);
    ctx.fillStyle = '#35454c';
    for (let wx = 25; wx < w - 20; wx += 49) {
      for (let wy = 40; wy < WORLD.height - y; wy += 43) {
        ctx.fillStyle = (wx + wy + id * 5) % 7 < 2 ? '#53635f' : '#33464d';
        ctx.fillRect(x + wx, y + wy, 16, 23);
      }
    }
    ctx.fillStyle = '#71847f'; ctx.fillRect(x + 22, y + 21, 24, 2);
  },
};

/** Return a soft, screen-space shadow that follows the nearest surface below the player. */
export function getPlayerShadow(core) {
  const p = core.player;
  const bottom = p.y + p.height;
  const left = p.x;
  const right = p.x + p.width;
  let surfaceY = Infinity;
  const consider = surface => {
    if (surface >= bottom - 1 && surface < surfaceY) surfaceY = surface;
  };
  for (const platform of core.platforms) {
    if (right > platform.x && left < platform.x + platform.width) consider(platform.y);
  }
  for (const obstacle of core.obstacles) {
    if (right > obstacle.x && left < obstacle.x + obstacle.width) consider(obstacle.y);
  }
  if (!Number.isFinite(surfaceY)) {
    if (!p.grounded) return null;
    surfaceY = bottom;
  }
  const height = Math.max(0, surfaceY - bottom);
  const lift = Math.min(1, height / 170);
  return {
    x: WORLD.playerX + p.width / 2,
    y: surfaceY + 1,
    rx: p.width * (0.68 + (1 - lift) * 0.14),
    ry: 2.2 + (1 - lift) * 1.6,
    alpha: 0.12 + (1 - lift) * 0.18,
    lift,
  };
}

export class Renderer {
  constructor(canvas, hooks = {}, reducedMotion = false, vfxOptions = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    if (!this.ctx) throw new Error('This browser does not support Canvas 2D.');
    this.hooks = { ...defaultRenderers, ...hooks };
    this.reducedMotion = reducedMotion;
    this.vfx = new VfxSystem({ ...vfxOptions, reducedMotion });
    this.width = WORLD.width;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }

  update(core, dt) {
    this.vfx.update(core, dt);
  }

  resetEffects() {
    this.vfx.reset();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.max(1, Math.round(bounds.width * dpr));
    this.canvas.height = Math.max(1, Math.round(bounds.height * dpr));
    this.width = Math.max(540, Math.min(1100, bounds.width / Math.max(1, bounds.height) * WORLD.height));
    if (this.lastCore) this.draw(this.lastCore, this.lastImpactAge);
  }

  skyline(ctx, distance) {
    ctx.fillStyle = '#1c2b34'; ctx.fillRect(0, 0, this.width, WORLD.height);
    // A quiet moon and three geometric layers give the city depth without external art.
    ctx.fillStyle = '#bbc7bb'; ctx.beginPath(); ctx.arc(this.width * 0.79, 109, 27, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1c2b34'; ctx.beginPath(); ctx.arc(this.width * 0.79 - 13, 98, 25, 0, Math.PI * 2); ctx.fill();
    for (let layer = 0; layer < 3; layer++) {
      const factor = this.reducedMotion ? 0 : 0.08 + layer * 0.085;
      const offset = distance * factor;
      const first = Math.floor(offset / 100) - 1;
      const colors = ['#26363e', '#2b3d44', '#33474c'];
      for (let i = first; i < first + Math.ceil(this.width / 100) + 3; i++) {
        const seed = Math.abs(Math.sin(i * 17.43 + layer * 52.7));
        const w = 42 + seed * 43;
        const h = 45 + Math.abs(Math.sin(i * 5.73 + layer)) * 140;
        const x = i * 100 - offset;
        const y = 327 - h + layer * 32;
        ctx.fillStyle = colors[layer]; ctx.fillRect(x, y, w, 350);
        if (seed > 0.65) { ctx.fillRect(x + w * 0.4, y - 17, w * 0.3, 17); ctx.fillRect(x + w * 0.55, y - 37, 2, 22); }
        ctx.fillStyle = layer === 2 ? '#4b5d5e' : '#34464b';
        for (let row = 15; row < h; row += 21) {
          for (let col = 9; col < w - 7; col += 13) {
            if (Math.sin(i * row + col) > 0.1) ctx.fillRect(x + col, y + row, 3, 6);
          }
        }
      }
    }
    ctx.strokeStyle = '#485b5e'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(this.width * 0.55, 197); ctx.lineTo(this.width * 0.55, 295); ctx.moveTo(this.width * 0.48, 208); ctx.lineTo(this.width * 0.7, 208); ctx.lineTo(this.width * 0.55, 189); ctx.lineTo(this.width * 0.48, 208); ctx.moveTo(this.width * 0.66, 208); ctx.lineTo(this.width * 0.66, 245); ctx.stroke();
  }

  draw(core, impactAge = 0) {
    this.lastCore = core;
    this.lastImpactAge = impactAge;
    const ctx = this.ctx;
    const scale = Math.min(this.canvas.width / this.width, this.canvas.height / WORLD.height);
    const offsetX = (this.canvas.width - this.width * scale) / 2;
    const offsetY = (this.canvas.height - WORLD.height * scale) / 2;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#1c2b34';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, this.width, WORLD.height);
    ctx.clip();
    const hit = core.collision;
    const impact = hit && hit.kind !== 'fall';
    const progress = Math.min(1, impactAge / 0.32);
    if (impact && !this.reducedMotion && progress < 1) {
      const shake = Math.sin(progress * Math.PI * 6) * 3 * (1 - progress);
      ctx.translate(shake, 0);
    }
    const info = { time: core.time, status: core.status, jumps: core.jumps, running: core.status === 'running', reducedMotion: this.reducedMotion, distance: core.distance, width: this.width, height: WORLD.height, impactAge };
    if (this.hooks.background) {
      ctx.save(); this.hooks.background(ctx, info); ctx.restore();
    } else this.skyline(ctx, core.distance);
    for (const platform of core.platforms) {
      if (platform.x - core.distance > this.width + 20) continue;
      ctx.save(); this.hooks.platform(ctx, { ...platform, x: platform.x - core.distance }, info); ctx.restore();
    }
    for (const obstacle of core.obstacles) {
      if (obstacle.x - core.distance > this.width + 20) continue;
      ctx.save(); this.hooks.obstacle(ctx, { ...obstacle, x: obstacle.x - core.distance }, info); ctx.restore();
    }
    const p = core.player;
    const shadow = getPlayerShadow(core);
    if (shadow) { ctx.save(); this.hooks.shadow(ctx, shadow, info); ctx.restore(); }
    this.vfx.draw(ctx, core);
    if (core.status === 'running' && !this.reducedMotion) {
      for (let i = 0; i < 5; i++) {
        ctx.globalAlpha = (1 - i / 5) * 0.3; ctx.fillStyle = '#b7daca';
        ctx.fillRect(WORLD.playerX - i * 12 - 6, p.y + p.height - 3 + Math.sin(core.time * 9 + i) * 3, 4 - i * 0.4, 2);
      }
      ctx.globalAlpha = 1;
    }
    ctx.save();
    if (impact && !this.reducedMotion) ctx.translate(-Math.sin(progress * Math.PI / 2) * 9, -Math.sin(progress * Math.PI) * 7);
    this.hooks.player(ctx, { ...p, x: WORLD.playerX }, { ...info, collision: hit }); ctx.restore();
    if (impact) {
      const x = hit.x - core.distance; const y = hit.y;
      ctx.save(); ctx.strokeStyle = '#f5dfb2'; ctx.lineWidth = 2;
      if (this.reducedMotion) {
        ctx.beginPath(); ctx.arc(x, y, 10, 0, Math.PI * 2); ctx.stroke();
      } else {
        for (let i = 0; i < 10; i++) {
          const angle = i * 2.399;
          const radius = 5 + progress * (17 + i * 2);
          ctx.globalAlpha = 1 - progress * 0.8;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius + progress * progress * 14);
          ctx.lineTo(x + Math.cos(angle) * (radius + 4), y + Math.sin(angle) * (radius + 4) + progress * progress * 14);
          ctx.stroke();
        }
      }
      ctx.restore();
    }
    ctx.restore();
  }

  destroy() { this.observer.disconnect(); this.vfx.reset(); }
}

/** Load an SVG/PNG once, then reuse the image from a draw hook. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${url}`));
    image.src = url;
  });
}
