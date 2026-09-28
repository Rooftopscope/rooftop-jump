import { loadImage } from './renderer.js';

const ROOT = new URL('./assets/ronin/', import.meta.url);
export const RONIN_ANIMATIONS = Object.freeze({
  idle: { file: 'spr_RoninIdle_strip.png', frames: 8 },
  run: { file: 'spr_RoninRun_strip.png', frames: 10 },
  jump: { file: 'spr_RoninJump_strip.png', frames: 15 },
  death: { file: 'spr_RoninDeath_strip.png', frames: 16 },
});

export async function loadRoninAssets() {
  return Object.fromEntries(await Promise.all(Object.entries(RONIN_ANIMATIONS).map(async ([key, animation]) => {
    const image = await loadImage(new URL(animation.file, ROOT).href);
    if (image.naturalWidth !== animation.frames * 64 || image.naturalHeight !== 64) {
      throw new Error(`Unexpected Ronin sprite dimensions: ${animation.file}`);
    }
    return [key, image];
  })));
}

/** Original 64px cells share a fixed origin: body centre x=32, ground y=45. */
export function createRoninRenderer(images) {
  let lastTime = -1;
  let lastJumps = 0;
  let wasGrounded = true;
  let airborneAt = 0;
  let landingAt = -Infinity;

  return (ctx, player, info) => {
    const { time, distance, collision, impactAge = 0, reducedMotion } = info;
    if (time < lastTime || time === 0) {
      wasGrounded = player.grounded;
      lastJumps = info.jumps;
      airborneAt = time;
      landingAt = -Infinity;
    }
    if (info.jumps !== lastJumps || (wasGrounded && !player.grounded)) {
      airborneAt = time;
      landingAt = -Infinity;
    }
    if (!wasGrounded && player.grounded) landingAt = time;
    lastTime = time;
    lastJumps = info.jumps;
    wasGrounded = player.grounded;

    let animation = 'run';
    // Distance-driven cadence follows acceleration and freezes during pause.
    let frame = Math.floor(distance / 15) % 10;
    if (collision) {
      animation = 'death';
      frame = reducedMotion ? 15 : Math.min(15, Math.floor(impactAge * 25));
    } else if (info.status === 'ready') {
      animation = 'idle';
      frame = 0;
    } else if (!player.grounded) {
      animation = 'jump';
      if (player.vy < -100) frame = Math.min(3, 1 + Math.floor((time - airborneAt) * 18));
      else if (player.vy <= 100) frame = 6;
      else frame = player.vy < 320 ? 7 : 8;
    } else if (time - landingAt < 0.18) {
      animation = 'jump';
      frame = Math.min(14, 9 + Math.floor((time - landingAt) * 34));
    }

    const scale = player.height / 34;
    const size = 64 * scale;
    const x = player.x + player.width / 2 - 32 * scale;
    const y = player.y + player.height - 45 * scale;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(images[animation], frame * 64, 0, 64, 64, x, y, size, size);
  };
}

export function createRoninRenderers(images) {
  return { player: createRoninRenderer(images) };
}
