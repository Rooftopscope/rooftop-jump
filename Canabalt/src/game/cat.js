import { defaultRenderers } from './renderer.js';

/**
 * Static vector poses supplied for the player cat. The files stay as SVG so
 * downstream projects can replace or animate them without changing physics.
 */
export const CAT_ASSET_PATHS = Object.freeze({
  sit: '01-sit.svg',
  stretch: '02-stretch.svg',
  walk: '03-walk.svg',
  peek: '04-peek.svg',
  leap: '05-leap.svg',
  head: '06-head.svg',
  wave: '07-wave.svg',
  loaf: '08-loaf.svg',
  sleep: '09-sleep.svg',
  reach: '10-reach.svg',
  crouch: '11-crouch.svg',
  land: '12-land.svg',
  groom: '13-groom.svg',
  lookback: '14-lookback.svg',
  roll: '15-roll.svg',
  run: '16-run.svg',
});

const CAT_ROOT = new URL('./assets/cat/', import.meta.url);

/** Remove the presentation background and the outlined pose label at the bottom. */
export function prepareCatSvg(markup) {
  return markup
    .replace(/<rect\b(?=[^>]*\bwidth=["']412["'])(?=[^>]*\bheight=["']447["'])(?=[^>]*\bfill=["']#F2F5EC["'])[^>]*\/?>\s*/i, '')
    .replace('width="412" height="447"', 'width="412" height="390"')
    .replace('viewBox="0 0 412 447"', 'viewBox="0 0 412 390"');
}

function loadImageSource(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load cat vector: ${url}`));
    image.src = url;
  });
}

/**
 * Load the provided pose set and keep it ready for a renderer. `states` can
 * limit the request to a subset when the host only needs the first pose pass.
 */
export async function loadCatAssets({ baseUrl = CAT_ROOT, states = Object.keys(CAT_ASSET_PATHS) } = {}) {
  const root = baseUrl instanceof URL ? baseUrl : new URL(baseUrl, import.meta.url);
  const entries = await Promise.all(states.map(async state => {
    if (!CAT_ASSET_PATHS[state]) throw new Error(`Unknown cat pose: ${state}`);
    const sourceUrl = new URL(CAT_ASSET_PATHS[state], root);
    const response = await fetch(sourceUrl);
    if (!response.ok) throw new Error(`Could not load cat vector: ${sourceUrl}`);
    const svg = prepareCatSvg(await response.text());
    const blobUrl = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
    try {
      return [state, await loadImageSource(blobUrl)];
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  }));
  return Object.fromEntries(entries);
}

function poseFor(player, info, images, landing = false) {
  if (info.collision) return ['roll', images.roll || images.land || images.run];
  if (!info.running) return ['sit', images.sit || images.loaf || images.run];
  if (landing) return ['land', images.land || images.run || images.walk];
  if (!player.grounded) return player.vy < 0
    ? ['leap', images.leap || images.crouch || images.run]
    : ['run', images.run || images.walk || images.sit];
  // Alternate the two forward-facing poses until the full animation pass.
  const key = !info.reducedMotion && Math.floor(info.time * 8) % 2 === 0 ? 'run' : 'walk';
  return [key, images[key] || images.run || images.walk || images.sit];
}

/** Create a player hook that uses the supplied vector pose images. */
export function createCatRenderer(images = {}) {
  let previousGrounded = true;
  let previousTime = 0;
  let landingUntil = 0;

  return function player(ctx, player, info) {
    if (info.time < previousTime) {
      previousGrounded = player.grounded;
      landingUntil = 0;
    }
    if (previousTime !== info.time && !previousGrounded && player.grounded) landingUntil = info.time + 0.16;
    previousGrounded = player.grounded;
    previousTime = info.time;
    const [pose, image] = poseFor(player, info, images, info.time < landingUntil);
    if (!image) {
      defaultRenderers.player(ctx, player, info);
      return;
    }
    const drawScale = { run: 1.72, walk: 1.72, land: 1.68, roll: 1.78, leap: 1.55, sit: 1.62 }[pose] || 1.62;
    const drawHeight = player.height * drawScale;
    const drawWidth = drawHeight * (412 / 390);
    const bob = player.grounded && info.running && !info.reducedMotion ? Math.sin(info.time * 18) * 0.7 : 0;
    const x = player.x + (player.width - drawWidth) / 2;
    const y = player.y + player.height - drawHeight * (pose === 'roll' ? 0.77 : 0.80) + bob;
    ctx.imageSmoothingEnabled = true;
    if (pose === 'roll' && info.collision && !info.reducedMotion) {
      const progress = Math.min(1, Math.max(0, (info.impactAge || 0) / 0.32));
      ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
      ctx.rotate(-progress * 1.05);
      ctx.translate(-(player.x + player.width / 2), -(player.y + player.height / 2));
    }
    ctx.drawImage(image, x, y, drawWidth, drawHeight);
  };
}

/** Ready-to-pass hook object for `createRunner({ renderers })`. */
export function createCatRenderers(images = {}) {
  return { player: createCatRenderer(images) };
}
