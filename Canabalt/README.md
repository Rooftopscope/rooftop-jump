# Rooftop

A standalone, one-button endless runner inspired by Canabalt. Vanilla JavaScript and Canvas 2D, with no runtime dependencies or build step. All game UI is English.

The game uses a layered nighttime city with locally bundled Kenney artwork and OcO's animated Ronin character. Running follows movement speed; ascent, descent, landing and death use their own sprite frames. The original vector cat remains available as an optional renderer.

## Publish on itch.io

Run `npm run build:itch` and upload **`dist/rooftop-itch.zip`** as an HTML game.
Both the local home page and the ZIP open directly into the full-window game.
The ZIP includes a full-window game entry point and all runtime assets, with no
external downloads. Suggested embed size: **960 × 600** with fullscreen enabled.
See [the publishing guide](docs/ITCH_IO.md) for settings and ready-to-paste page copy.
Preview the embed layout at `http://localhost:5173/itch.html` after `npm run dev`.
Packaging does not run tests.

The demo uses a 24 × 40 collision body for Ronin. The reusable engine retains
its 28 × 28 default; pass `playerSize` to choose another size.

## Run

Requires Node.js 20+:

```sh
npm run dev
```

Open http://localhost:5173. No `npm install` needed. To change ports: `PORT=5174 npm run dev`. Any static HTTP server works. ES modules require HTTP; do not open through `file://`.

```sh
npm test
```

## Controls

- **Space / ↑ / W:** jump. Tap for a short jump; hold to go further.
- **F / Fullscreen button:** enter or leave fullscreen when the browser permits it.
- **P / Esc:** pause. P or Space resumes.
- **Touch:** press the game area or Jump button; hold for a longer jump.
- **R / Space:** restart after a run ends.
- The game pauses when its tab is hidden, its window loses focus, or focus leaves the game.

Running accelerates up to a cap. As distance grows, the route gradually tightens: gaps stretch, platforms narrow, rooftops vary more in height, and later sections can place two separated obstacles on a rooftop. The speed and obstacle pressure reach their maximum around 7200 world pixels, while every generated gap stays within a full jump. Boxes and barrels are solid: jump over them or land on top and jump again. Side/underside impacts, rooftop edges and missed gaps end the run. Impacts stop at the contact surface and show a short recoil/particle effect before retry; reduced motion uses a static marker. Background buildings and faded railings are decorative. Best distance persists in `localStorage`; blocked storage falls back to memory.

The game includes a small procedural night soundtrack and sound effects generated with the Web Audio API. Music begins after the first Start input to satisfy browser autoplay rules. The speaker button in the HUD mutes both music and effects, shows distinct on/off icons, and remembers the setting when browser storage is available. If Web Audio is unavailable, the game continues silently. Jump, landing, box/barrel impact, and rooftop fall each have their own sound cue. There are no downloaded audio files.

VFX are Canvas particles in world coordinates: running dust, jump dust, landing bursts, impact sparks, recoil, and screen shake. The particle pool is capped at 48 and automatically clears old particles. `prefers-reduced-motion` disables animated particles and shake while retaining a static impact marker.

## Integrate

Copy **the entire `src/game/` directory, including `assets/`**. Demo HTML/CSS is optional. Styles are isolated in Shadow DOM and keyboard input is scoped to the game. Give the container a width, such as `width:100%; max-width:1200px`.

```js
import { createRunner, loadCityEnvironment } from './game/index.js';

const city = await loadCityEnvironment();
const game = createRunner(document.querySelector('#runner'), {
  renderers: city,
  storageKey: 'my-project-runner-best',
  onScore(score) { /* update your score UI */ },
  onCollision({ kind, x, y, normal }) { /* fatal impact; world coordinates */ },
  onGameOver({ score, best, reason }) { console.log({ score, best, reason }); },
  onStateChange(status) { /* running | paused | over */ },
});

// game.start();     // start, resume, or restart after game over
// game.pause();
// game.resume();
// game.restart();
// game.getState();  // { status, score, best, speed, difficulty, difficultyTier }
// game.destroy();   // call when unmounting
```

For the original geometric environment, omit the city loader and `renderers` option. The loader rejects if an image fails; provide loading/error UI in your host application. The demo displays a notice and uses the geometric fallback so it remains playable.

Asset URLs are relative to their module. Preserve the directory structure when serving directly; include/copy assets in your main application's build output when using a bundler. No external asset host is contacted at runtime.

Callbacks run synchronously: keep expensive work outside the game loop. `onScore` fires initially and when integer distance changes. Use distinct `storageKey` values for independent records.

`onCollision` fires once for a fatal contact (`box`, `barrel`, `rooftop`, or `fall`). Landing safely on an obstacle does not fire it. `onGameOver` also includes the `collision` object, after the 320 ms impact effect (immediately for falls/reduced motion). Player render hooks receive `info.collision` for custom cat hit poses. Call `destroy()` when removing the game, including during an impact animation.

Audio and particles can be configured without changing the physics API:

```js
const game = createRunner(container, {
  audio: false, // disable Web Audio entirely
  muted: true,  // start muted, still allow the HUD toggle
  vfx: { maxParticles: 32 },
});

game.getAudioState(); // { supported, muted, playing }
```

### Animated Ronin (default demo character)

```js
import { createRunner, loadCityEnvironment, loadRoninAssets, createRoninRenderers } from './game/index.js';

const [city, ronin] = await Promise.all([loadCityEnvironment(), loadRoninAssets()]);
const game = createRunner(container, {
  renderers: { ...city, ...createRoninRenderers(ronin) },
  playerSize: { width: 24, height: 40 },
  impactDuration: 0.64,
  embedded: true, // Container must have an explicit height.
});
```

The original 64 × 64 sprite cells have a consistent ground anchor. Character
animation freezes on pause and resets on retry. The source and artist's usage
terms are recorded in [Ronin sources](src/game/assets/ronin/SOURCES.md).

### Bundled vector cat (optional)

The source folder contains sixteen static SVG poses copied into `src/game/assets/cat/` with stable ASCII filenames. The loader removes the presentation background and clips the outlined pose label before creating browser images, so the artwork stays transparent on the night scene. These optional legacy assets are not included in the itch.io release package.

```js
import { createCatRenderers, createRunner, loadCatAssets, loadCityEnvironment } from './game/index.js';

const [city, cat] = await Promise.all([
  loadCityEnvironment(),
  loadCatAssets({ states: ['sit', 'walk', 'run', 'leap', 'land', 'roll'] }),
]);
const game = createRunner(document.querySelector('#runner'), {
  renderers: { ...city, ...createCatRenderers(cat) },
});
```

The full pose map is available through `CAT_ASSET_PATHS`: `sit`, `stretch`, `walk`, `peek`, `leap`, `head`, `wave`, `loaf`, `sleep`, `reach`, `crouch`, `land`, `groom`, `lookback`, `roll`, and `run`. `createCatRenderer()` keeps the current state selection separate from physics, making frame timing or sprite animation easy to add later.

### React / Next.js

```jsx
'use client';
import { useEffect, useRef } from 'react';
import { createRunner, loadCityEnvironment } from './game/index.js';

export default function Runner() {
  const container = useRef(null);
  useEffect(() => {
    let disposed = false;
    let game;
    async function mount() {
      let renderers;
      try { renderers = await loadCityEnvironment(); }
      catch (error) { console.warn('Using geometric environment', error); }
      if (!disposed) game = createRunner(container.current, { renderers });
    }
    mount();
    return () => { disposed = true; game?.destroy(); };
  }, []);
  return <div ref={container} style={{ width: '100%', maxWidth: 1200 }} />;
}
```

Cleanup cancels animation, disconnects the resize observer, removes event listeners and removes the mounted element. This example also guards against asset loading completing after unmount, including React StrictMode remounts.

To embed the whole demo instead:

```html
<iframe src="/rooftop/index.html" title="Rooftop runner"
  style="width:100%; height:850px; border:0"></iframe>
```

## Add your vector cat

Only override the player hook. The city skin never replaces the player.

```js
import { createRunner, loadCityEnvironment, loadImage } from './game/index.js';

const [city, cat] = await Promise.all([
  loadCityEnvironment(),
  loadImage('/assets/my-cat.svg'),
]);
const game = createRunner(document.querySelector('#runner'), {
  renderers: {
    ...city,
    player(ctx, player, { time, running, reducedMotion }) {
      ctx.drawImage(cat, player.x, player.y, player.width, player.height);
    },
  },
});
```

Use a self-contained SVG with a `viewBox`. Images load once and draw onto Canvas; no SVG markup is injected into the DOM. For animation, select sprite frames based on time and player state.

Player, shadow, platform and obstacle hooks receive `(ctx, object, info)` with **screen-coordinate** positions. Background receives `(ctx, info)`. Info includes `{ time, running, reducedMotion, distance, width, height, impactAge }`. The default shadow follows the nearest roof or obstacle, softens and shrinks while the cat is airborne, and disappears over a gap. Every hook runs inside Canvas save/restore. Omitted hooks retain default art.

Artwork does not change physics: the player body is currently 28×28 world pixels. Adapt its dimensions and collision tolerances in `core.js` to match your cat when its artwork is ready.

## Artwork

Artwork by **Kenney**, released under **CC0**. 24 locally bundled PNGs, approximately 36 KB including original license notices. These are flat 2D asset exports, not bundled SVGs.

- [Platformer Art Buildings](https://kenney.nl/assets/platformer-art-buildings)
- [Platformer Pack Industrial](https://kenney.nl/assets/platformer-pack-industrial)
- [Background Elements](https://kenney.nl/assets/background-elements)

[Source and license record](src/game/assets/kenney/SOURCES.md) includes original download URLs and usage notes. Ronin is by OcO; see [credits](CREDITS.md). The optional vector cat is separate and excluded from the itch.io package.

## Structure

| File | Purpose |
| --- | --- |
| `src/game/index.js` | Mount API, input, lifecycle, score and state UI |
| `src/game/core.js` | Physics, collisions and route generation |
| `src/game/renderer.js` | Canvas drawing, default shapes and image loader |
| `src/game/cat.js` | Vector cat loader, pose selection and player hook |
| `src/game/environment.js` | City skin, asset loading and cached artwork |
| `src/game/assets/kenney/` | PNGs and source/license records |
| `src/game/assets/cat/` | Supplied vector cat poses |
| `src/game/styles.js` | Isolated game styles |
| `src/demo.js`, `src/demo.css`, `index.html` | Standalone English demo |
| `scripts/serve.mjs` | Local development server |
| `tests/core.test.js` | Gameplay regression tests |
| `tests/cat.test.js` | Cat asset preparation tests |
| `tests/renderer.test.js` | Player shadow metrics tests |

Physics settings live in `WORLD`, the distance-based difficulty profile lives in `difficultyProfile`, and route generation uses it in `generate()`. Substeps reduce collision tunneling. Offscreen platforms are discarded, pixel ratio is capped at 2, and city lighting variants are cached once. Reduced motion disables decorative parallax and particles while essential gameplay movement continues.

This is a prototype: no accounts, leaderboard, server score validation or connection to your main application.
