export const WORLD = { width: 960, height: 480, playerX: 170, gravity: 1900, jumpSpeed: 660 };
const DIFFICULTY_DISTANCE = 7200;

/** Browser-independent simulation. All distances use world pixels; dt is seconds. */
export class RunnerCore {
  constructor({ random = Math.random, playerSize = { width: 28, height: 28 } } = {}) {
    this.random = random;
    this.playerSize = { width: playerSize.width, height: playerSize.height };
    this.reset();
  }

  reset() {
    this.status = 'ready';
    this.distance = 0;
    this.speed = 300;
    this.time = 0;
    this.jumps = 0;
    this.buffer = 0;
    this.coyote = 0;
    this.player = { x: WORLD.playerX, y: 350 - this.playerSize.height, ...this.playerSize, vy: 0, grounded: true };
    this.platforms = [{ x: -300, y: 350, width: 1400, id: 0 }];
    this.obstacles = [{ x: 670, y: 310, width: 35, height: 40, kind: 'box' }];
    this.nextId = 1;
    this.reason = '';
    this.collision = null;
    this.generate();
  }

  start() { if (this.status === 'ready') this.status = 'running'; }
  jump() { if (this.status === 'running') this.buffer = 0.12; }
  releaseJump() { if (this.player.vy < -280) this.player.vy = -280; }
  get score() { return Math.floor(this.distance / 10); }
  get difficulty() { return Math.min(1, Math.max(0, this.distance / DIFFICULTY_DISTANCE)); }
  get difficultyTier() { return Math.min(5, 1 + Math.floor(this.difficulty * 5)); }
  get difficultyProfile() {
    const d = this.difficulty;
    return {
      // The curve stays gentle at the start, then asks for cleaner timing later.
      speed: Math.min(580, 300 + 280 * (0.18 * d + 0.82 * d * d)),
      gapFactorMin: 0.30 + d * 0.04,
      gapFactorMax: 0.40 + d * 0.09,
      platformWidthMin: 650 - d * 100,
      platformWidthMax: 920 - d * 200,
      verticalDelta: 54 + d * 18,
      obstacleChance: 0.62 + d * 0.28,
      secondObstacleChance: d > 0.62 ? (d - 0.62) * 0.58 : 0,
    };
  }

  generate() {
    let last = this.platforms.at(-1);
    const profile = this.difficultyProfile;
    while (last.x + last.width < this.distance + WORLD.width * 2) {
      const gapFactor = profile.gapFactorMin + this.random() * (profile.gapFactorMax - profile.gapFactorMin);
      const gap = profile.speed * gapFactor;
      const y = Math.max(305, Math.min(375, last.y + (this.random() - 0.5) * profile.verticalDelta));
      const width = profile.platformWidthMin + this.random() * (profile.platformWidthMax - profile.platformWidthMin);
      const platform = { x: last.x + last.width + gap, y, width, id: this.nextId++ };
      this.platforms.push(platform);
      // One obstacle in the middle leaves space to recover before the next gap.
      if (this.random() < profile.obstacleChance) {
        const firstPosition = 0.40 + this.random() * (0.16 + this.difficulty * 0.12);
        this.addObstacle(platform, y, firstPosition);
        // Late runs can add a second, separated obstacle to a wide rooftop.
        if (this.random() < profile.secondObstacleChance && platform.width > 610) {
          this.addObstacle(platform, y, 0.78 + this.random() * 0.06);
        }
      }
      last = platform;
    }
  }

  addObstacle(platform, y, position) {
    const d = this.difficulty;
    const height = 32 + this.random() * (17 + d * 8);
    this.obstacles.push({
      x: platform.x + platform.width * Math.min(0.88, position),
      y: y - height,
      width: 30 + this.random() * (12 + d * 6),
      height,
      kind: this.random() > 0.5 ? 'cylinder' : 'box',
    });
  }

  die(reason, collision) {
    if (this.status === 'over') return;
    this.status = 'over';
    this.reason = reason;
    this.collision = collision;
    this.player.vy = 0;
  }

  update(dt, held = false) {
    if (this.status !== 'running') return;
    // Substeps avoid tunneling across a thin obstacle on slow frames.
    let remaining = Math.min(Math.max(dt, 0), 0.1);
    while (remaining > 0 && this.status === 'running') {
      const step = Math.min(remaining, 1 / 120);
      this.step(step, held);
      remaining -= step;
    }
  }

  step(dt, held) {
    const p = this.player;
    const oldRight = p.x + p.width;
    this.time += dt;
    this.speed = this.difficultyProfile.speed;
    this.distance += this.speed * dt;
    p.x = this.distance + WORLD.playerX;
    this.buffer = Math.max(0, this.buffer - dt);
    this.coyote = p.grounded ? 0.09 : Math.max(0, this.coyote - dt);
    if (this.buffer > 0 && this.coyote > 0) {
      p.vy = -WORLD.jumpSpeed;
      p.grounded = false;
      this.coyote = 0;
      this.buffer = 0;
      this.jumps++;
    }
    const oldBottom = p.y + p.height;
    p.vy += WORLD.gravity * (p.vy < 0 && !held ? 1.75 : 1) * dt;
    p.y += p.vy * dt;
    p.grounded = false;
    for (const platform of this.platforms) {
      if (p.x + p.width <= platform.x || p.x >= platform.x + platform.width) continue;
      if (p.vy >= 0 && oldBottom <= platform.y + 1 && p.y + p.height >= platform.y) {
        p.y = platform.y - p.height;
        p.vy = 0;
        p.grounded = true;
      } else if (p.y + p.height > platform.y && p.y < WORLD.height + 40) {
        if (oldRight <= platform.x) {
          p.x = platform.x - p.width;
          this.distance = p.x - WORLD.playerX;
        }
        this.die('You hit the edge of a rooftop.', { kind: 'rooftop', x: platform.x, y: Math.max(platform.y, p.y + p.height / 2), normal: { x: -1, y: 0 } });
        return;
      }
    }
    for (const obstacle of this.obstacles) {
      if (p.x + p.width <= obstacle.x || p.x >= obstacle.x + obstacle.width) continue;
      // Descending onto the top is a landing, not a side impact.
      if (p.vy >= 0 && oldBottom <= obstacle.y + 1 && p.y + p.height >= obstacle.y) {
        p.y = obstacle.y - p.height;
        p.vy = 0;
        p.grounded = true;
        continue;
      }
      if (p.y + p.height <= obstacle.y || p.y >= obstacle.y + obstacle.height) continue;
      const side = oldRight <= obstacle.x;
      if (side) {
        p.x = obstacle.x - p.width;
        this.distance = p.x - WORLD.playerX;
      }
      const kind = obstacle.kind === 'cylinder' ? 'barrel' : 'box';
      this.die(`You hit a ${kind}. Jump over it or land on top.`, {
        kind, x: side ? obstacle.x : p.x + p.width / 2,
        y: side ? Math.max(obstacle.y, p.y + p.height / 2) : obstacle.y + obstacle.height,
        normal: side ? { x: -1, y: 0 } : { x: 0, y: 1 },
      });
      return;
    }
    if (p.y > WORLD.height + 50) {
      this.die('You missed the next rooftop.', { kind: 'fall', x: p.x, y: WORLD.height, normal: { x: 0, y: -1 } });
      return;
    }
    this.platforms = this.platforms.filter(item => item.x + item.width > this.distance - 100);
    this.obstacles = this.obstacles.filter(item => item.x + item.width > this.distance - 100);
    this.generate();
  }
}
