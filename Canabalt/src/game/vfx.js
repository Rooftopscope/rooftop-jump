const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

/** Bounded world-space particles for dust, landings, and impacts. */
export class VfxSystem {
  constructor({ random = Math.random, maxParticles = 48, reducedMotion = false } = {}) {
    this.random = random;
    this.maxParticles = Math.max(12, maxParticles);
    this.reducedMotion = reducedMotion;
    this.particles = [];
    this.lastGrounded = null;
    this.lastCollision = null;
    this.dustClock = 0;
  }

  reset() {
    this.particles.length = 0;
    this.lastGrounded = null;
    this.lastCollision = null;
    this.dustClock = 0;
  }

  emit(particle) {
    if (this.reducedMotion) return;
    this.particles.push(particle);
    if (this.particles.length > this.maxParticles) {
      this.particles.splice(0, this.particles.length - this.maxParticles);
    }
  }

  particle(x, y, options = {}) {
    const life = options.life ?? 0.34;
    return {
      x, y,
      vx: options.vx ?? 0,
      vy: options.vy ?? 0,
      gravity: options.gravity ?? 240,
      size: options.size ?? 2,
      life,
      maxLife: life,
      color: options.color ?? '#b7daca',
      line: options.line ?? false,
    };
  }

  burst(x, y, type = 'dust') {
    if (this.reducedMotion) return;
    const count = type === 'impact' ? 16 : type === 'land' ? 9 : 6;
    for (let i = 0; i < count; i++) {
      const angle = type === 'impact'
        ? (i / count) * Math.PI * 2 + this.random() * 0.28
        : Math.PI + (this.random() - 0.5) * 1.35;
      const speed = type === 'impact' ? 55 + this.random() * 145 : 20 + this.random() * 75;
      const life = type === 'impact' ? 0.26 + this.random() * 0.2 : 0.27 + this.random() * 0.18;
      this.emit(this.particle(x, y, {
        vx: Math.cos(angle) * speed,
        vy: type === 'impact' ? Math.sin(angle) * speed - 20 : -35 - this.random() * 65,
        gravity: type === 'impact' ? 220 : 330,
        size: type === 'impact' ? 1 + this.random() * 2 : 1.5 + this.random() * 2,
        life,
        color: type === 'impact' ? '#f5dfb2' : '#b7daca',
        line: type === 'impact',
      }));
    }
  }

  update(core, dt) {
    const elapsed = clamp(dt || 0, 0, 0.05);
    const player = core.player;
    if (this.lastGrounded === null) this.lastGrounded = player.grounded;
    if (!this.reducedMotion) {
      if (this.lastGrounded && !player.grounded && core.status === 'running') {
        this.burst(player.x + player.width / 2, player.y + player.height, 'jump');
      }
      if (!this.lastGrounded && player.grounded) {
        this.burst(player.x + player.width / 2, player.y + player.height, 'land');
      }
      if (core.status === 'running' && player.grounded) {
        this.dustClock -= elapsed;
        if (this.dustClock <= 0) {
          this.burst(player.x + 3, player.y + player.height, 'dust');
          this.dustClock = 0.11;
        }
      }
      if (core.status === 'over' && core.collision && this.lastCollision !== core.collision) {
        if (core.collision.kind !== 'fall') this.burst(core.collision.x, core.collision.y, 'impact');
        this.lastCollision = core.collision;
      }
    } else {
      this.particles.length = 0;
    }
    for (const particle of this.particles) {
      particle.x += particle.vx * elapsed;
      particle.y += particle.vy * elapsed;
      particle.vy += particle.gravity * elapsed;
      particle.life -= elapsed;
    }
    this.particles = this.particles.filter(particle => particle.life > 0);
    this.lastGrounded = player.grounded;
  }

  draw(ctx, core) {
    if (this.reducedMotion || !this.particles.length) return;
    ctx.save();
    for (const particle of this.particles) {
      const screenX = particle.x - core.distance;
      const alpha = clamp(particle.life / particle.maxLife, 0, 1);
      ctx.globalAlpha = alpha * 0.78;
      ctx.fillStyle = particle.color;
      ctx.strokeStyle = particle.color;
      if (particle.line) {
        const tail = Math.min(8, Math.hypot(particle.vx, particle.vy) * 0.018);
        const angle = Math.atan2(particle.vy, particle.vx);
        ctx.lineWidth = particle.size;
        ctx.beginPath();
        ctx.moveTo(screenX, particle.y);
        ctx.lineTo(screenX - Math.cos(angle) * tail, particle.y - Math.sin(angle) * tail);
        ctx.stroke();
      } else {
        ctx.beginPath(); ctx.arc(screenX, particle.y, particle.size * (0.65 + alpha * 0.35), 0, Math.PI * 2); ctx.fill();
      }
    }
    ctx.restore();
  }
}
