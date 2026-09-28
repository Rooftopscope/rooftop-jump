import { RunnerCore } from './core.js';
import { Renderer } from './renderer.js';
import { RooftopAudio } from './audio.js';
import { styles } from './styles.js';
export { defaultRenderers, loadImage } from './renderer.js';
export { loadCityEnvironment } from './environment.js';
export { RooftopAudio } from './audio.js';
export { VfxSystem } from './vfx.js';
export { CAT_ASSET_PATHS, createCatRenderer, createCatRenderers, loadCatAssets, prepareCatSvg } from './cat.js';
export { RONIN_ANIMATIONS, createRoninRenderer, createRoninRenderers, loadRoninAssets } from './ronin.js';

/** Mount an isolated runner. Call destroy() when removing it (e.g. React effect cleanup). */
export function createRunner(container, options = {}) {
  if (!(container instanceof HTMLElement)) throw new TypeError('createRunner expects an HTML element.');
  const host = document.createElement('div');
  if (options.embedded) host.dataset.embedded = '';
  container.append(host);
  const root = host.attachShadow({ mode: 'open' });
  root.innerHTML = `<style>${styles}</style>
    <section class="runner" lang="en" aria-label="Rooftop runner game">
      <div class="stage" tabindex="0" role="group" aria-label="Game area" aria-describedby="instructions">
        <canvas aria-label="A runner crossing rooftops and jumping over obstacles">This game requires a browser with Canvas support.</canvas>
        <div class="hud"><div><span class="distance-label">DISTANCE</span><span class="distance">0000</span><span class="unit">m</span></div><div class="hud-right"><div class="best"><span class="best-label">PERSONAL BEST</span><span class="best-value">0 m</span></div><button class="sound-toggle" type="button" aria-pressed="true" aria-label="Mute music and sound effects" title="Mute music and sound effects"><svg class="sound-on" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M155.51,24.81a8,8,0,0,0-8.42.88L77.25,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V32A8,8,0,0,0,155.51,24.81ZM32,96H72v64H32ZM144,207.64,88,164.09V91.91l56-43.55Zm54-106.08a40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.58,24,24,0,0,0,0-31.72,8,8,0,0,1,12-10.58ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z"/></svg><svg class="sound-off" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" fill="currentColor"><path d="M53.92,34.62A8,8,0,1,0,42.08,45.38L73.55,80H32A16,16,0,0,0,16,96v64a16,16,0,0,0,16,16H77.25l69.84,54.31A8,8,0,0,0,160,224V175.09l42.08,46.29a8,8,0,1,0,11.84-10.76ZM32,96H72v64H32ZM144,207.64,88,164.09V95.89l56,61.6Zm42-63.77a24,24,0,0,0,0-31.72,8,8,0,1,1,12-10.57,40,40,0,0,1,0,52.88,8,8,0,0,1-12-10.59Zm-80.16-76a8,8,0,0,1,1.4-11.23l39.85-31A8,8,0,0,1,160,32v74.83a8,8,0,0,1-16,0V48.36l-26.94,21A8,8,0,0,1,105.84,67.91ZM248,128a79.9,79.9,0,0,1-20.37,53.34,8,8,0,0,1-11.92-10.67,64,64,0,0,0,0-85.33,8,8,0,1,1,11.92-10.67A79.83,79.83,0,0,1,248,128Z"/></svg></button><button class="pause" type="button" aria-label="Pause game" title="Pause (P / Esc)" disabled><span class="pause-lines" aria-hidden="true"></span></button></div></div>
        <div class="overlay"><p class="eyebrow">THE ROOFTOPS ARE CALLING</p><h2 class="game-title">rooftop.</h2><p class="message">The city never stops. Neither do you.<br>Leap across the rooftops. Chase your best.</p><button class="primary" type="button"><span class="button-label">Start running</span><span aria-hidden="true">→</span></button><p class="start-hint"><span class="keyboard-hint">or press Space to start</span><span class="touch-hint">Tap to start. Hold your jumps to go further.</span></p></div>
        <span class="game-caption">THE NIGHT SHIFT</span>
      </div>
      <div class="controls" id="instructions"><div class="keys"><kbd>SPACE</kbd><span>/</span><kbd>↑</kbd><span>Jump</span><span style="margin-left:14px"><kbd>P</kbd> Pause</span></div><span class="controls-hint">Tap for a short jump. Hold to go further.</span><button class="jump-button" type="button">Jump ↑</button><button class="fullscreen" type="button" aria-label="Enter fullscreen" title="Fullscreen (F)" hidden>Fullscreen</button></div>
      <p class="sr-only" role="status" aria-live="polite"></p>
    </section>`;

  const find = selector => root.querySelector(selector);
  const stage = find('.stage');
  const canvas = find('canvas');
  const overlay = find('.overlay');
  const primary = find('.primary');
  const pauseButton = find('.pause');
  const soundButton = find('.sound-toggle');
  const jumpButton = find('.jump-button');
  const fullscreenButton = find('.fullscreen');
  const fullscreenTarget = options.embedded ? container : host;
  const soundStorageKey = `${options.storageKey ?? 'rooftop-best'}-muted`;
  let savedMuted = options.muted;
  if (savedMuted === undefined) {
    try { savedMuted = localStorage.getItem(soundStorageKey) === 'true'; } catch { /* Optional preference. */ }
  }
  const core = new RunnerCore({ random: options.random, playerSize: options.playerSize });
  const impactDuration = options.impactDuration ?? 0.32;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const renderer = new Renderer(canvas, options.renderers, motion.matches, options.vfx);
  const audio = new RooftopAudio({ muted: savedMuted, disabled: options.audio === false });
  const events = new AbortController();
  const signal = events.signal;
  const storageKey = options.storageKey ?? 'rooftop-best';
  let best = 0;
  try { best = Math.max(0, Number(localStorage.getItem(storageKey)) || 0); } catch { /* Storage may be unavailable in embeds. */ }
  let held = false;
  let frame = 0;
  let lastTime = 0;
  let lastScore = -1;
  let destroyed = false;
  let wasRecord = false;
  let crashing = false;
  let impactAge = 0;
  let lastJumps = core.jumps;
  let lastGrounded = core.player.grounded;

  function announce(text) { find('[role="status"]').textContent = text; }
  function updateSoundButton() {
    const state = audio.getState();
    soundButton.disabled = !state.supported;
    soundButton.setAttribute('aria-pressed', String(!state.muted));
    soundButton.setAttribute('aria-label', state.muted ? 'Turn sound on' : 'Mute music and sound effects');
    soundButton.title = state.muted ? 'Turn sound on' : 'Mute music and sound effects';
  }
  function updateHud() {
    find('.distance').textContent = String(core.score).padStart(4, '0');
    find('.best-value').textContent = `${best} m`;
    if (lastScore !== core.score) { lastScore = core.score; options.onScore?.(core.score); }
  }
  function stopLoop() { cancelAnimationFrame(frame); frame = 0; lastTime = 0; }
  function showState() {
    overlay.hidden = core.status === 'running';
    find('h2').classList.toggle('game-title', core.status === 'ready');
    pauseButton.disabled = core.status !== 'running';
    if (core.status === 'paused') {
      find('.eyebrow').textContent = 'TAKE A BREATHER';
      find('h2').textContent = 'The city can wait.';
      find('.message').textContent = 'Pick up where you left off when you’re ready.';
      find('.button-label').textContent = 'Keep running';
      find('.start-hint').textContent = 'or press P / space to continue';
    } else if (core.status === 'over') {
      find('.eyebrow').textContent = wasRecord ? 'A NEW PERSONAL BEST' : 'ONE MORE RUN?';
      find('h2').textContent = `${core.score} metres.`;
      find('.message').textContent = core.reason + ' The next rooftop is waiting.';
      find('.button-label').textContent = 'Run again';
      find('.start-hint').textContent = 'or press space to start';
    }
    if (core.status === 'over' || core.status === 'paused') primary.focus({ preventScroll: true });
    options.onStateChange?.(core.status);
  }
  function finish() {
    crashing = false;
    held = false;
    audio.pause();
    wasRecord = core.score > best;
    best = Math.max(best, core.score);
    try { localStorage.setItem(storageKey, String(best)); } catch { /* Best score remains in memory. */ }
    updateHud();
    stopLoop();
    showState();
    announce(`Run finished. ${core.score} metres. ${core.reason}`);
    options.onGameOver?.({ score: core.score, best, reason: core.reason, collision: core.collision });
  }
  function tick(time) {
    if (destroyed || (core.status !== 'running' && !crashing)) return;
    const dt = lastTime ? (time - lastTime) / 1000 : 0;
    lastTime = time;
    if (crashing) {
      impactAge += Math.min(dt, 0.05);
      renderer.update(core, dt);
      renderer.draw(core, impactAge);
      if (impactAge >= impactDuration) { finish(); return; }
      frame = requestAnimationFrame(tick);
      return;
    }
    core.update(dt, held);
    if (core.jumps > lastJumps) audio.jump();
    if (!lastGrounded && core.player.grounded) audio.land();
    lastJumps = core.jumps;
    lastGrounded = core.player.grounded;
    renderer.update(core, dt);
    renderer.draw(core);
    updateHud();
    if (core.status === 'over') {
      held = false;
      const collision = core.collision;
      find('.game-caption').textContent = collision.kind === 'fall' ? 'MISSED THE ROOFTOP' : `${collision.kind.toUpperCase()} IMPACT`;
      crashing = !motion.matches && collision.kind !== 'fall';
      impactAge = 0;
      pauseButton.disabled = true;
      audio.impact();
      options.onCollision?.(collision);
      if (destroyed || core.status !== 'over') return;
      if (!crashing) { finish(); return; }
    }
    frame = requestAnimationFrame(tick);
  }
  function start() {
    if (destroyed || core.status === 'running' || crashing) return;
    if (core.status === 'over') core.reset();
    renderer.resetEffects();
    core.status = 'running';
    held = false;
    lastJumps = core.jumps;
    lastGrounded = core.player.grounded;
    impactAge = 0;
    find('.game-caption').textContent = 'THE NIGHT SHIFT';
    stopLoop();
    showState();
    stage.focus({ preventScroll: true });
    audio.start();
    announce('Run started. Press space or up arrow to jump.');
    frame = requestAnimationFrame(tick);
  }
  function pause() {
    if (destroyed) return;
    if (crashing) { renderer.draw(core, impactDuration); finish(); return; }
    if (destroyed || core.status !== 'running') return;
    core.status = 'paused'; held = false; core.releaseJump();
    audio.pause();
    stopLoop(); showState(); announce('Game paused.');
  }
  function press() {
    if (destroyed) return;
    if (core.status !== 'running') { start(); return; }
    held = true; core.jump();
  }
  function release() { held = false; core.releaseJump(); }
  function on(target, name, handler, extra = {}) { target.addEventListener(name, handler, { signal, ...extra }); }
  on(primary, 'click', start);
  on(pauseButton, 'click', pause);
  on(soundButton, 'click', () => {
    const muted = audio.toggleMuted();
    if (core.status !== 'running') audio.pause();
    try { localStorage.setItem(soundStorageKey, String(muted)); } catch { /* Keep session preference. */ }
    updateSoundButton();
    announce(muted ? 'Sound muted.' : 'Sound on.');
  });
  fullscreenButton.hidden = !document.fullscreenEnabled || !fullscreenTarget.requestFullscreen;
  async function toggleFullscreen() {
    if (fullscreenButton.hidden) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await fullscreenTarget.requestFullscreen();
    } catch {
      announce('Fullscreen is unavailable. Use the fullscreen control on the itch.io player.');
    }
  }
  on(fullscreenButton, 'click', toggleFullscreen);
  on(document, 'fullscreenchange', () => {
    const active = document.fullscreenElement === fullscreenTarget;
    fullscreenButton.textContent = active ? 'Exit fullscreen' : 'Fullscreen';
    fullscreenButton.setAttribute('aria-label', active ? 'Exit fullscreen' : 'Enter fullscreen');
    if (core.status === 'running') stage.focus({ preventScroll: true });
  });
  on(root, 'keydown', event => {
    if (event.altKey || event.metaKey || event.ctrlKey) return;
    if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) {
      // Keep native Space activation for the pause button.
      if ([pauseButton, soundButton, primary, fullscreenButton].includes(event.target)) return;
      event.preventDefault(); if (!event.repeat) press();
    } else if (event.code === 'KeyF') {
      event.preventDefault(); if (!event.repeat) toggleFullscreen();
    } else if (['KeyP', 'Escape'].includes(event.code)) {
      event.preventDefault();
      if (!event.repeat) core.status === 'paused' ? start() : pause();
    } else if (event.code === 'KeyR' && core.status === 'over') { event.preventDefault(); start(); }
  });
  on(root, 'keyup', event => { if (['Space', 'ArrowUp', 'KeyW'].includes(event.code)) { event.preventDefault(); release(); } });
  for (const target of [canvas, jumpButton]) {
    on(target, 'pointerdown', event => {
      if (event.button !== 0) return;
      event.preventDefault(); target.setPointerCapture(event.pointerId); stage.focus({ preventScroll: true }); press();
    });
    on(target, 'pointerup', release);
    on(target, 'pointercancel', release);
    on(target, 'lostpointercapture', release);
  }
  // Keyboard activation of the touch button still works via the scoped key handler.
  on(jumpButton, 'click', event => { if (event.detail === 0 && core.status === 'running') { core.jump(); } });
  on(window, 'blur', pause);
  on(document, 'visibilitychange', () => { if (document.hidden) pause(); });
  on(root, 'focusout', () => { queueMicrotask(() => { if (!root.activeElement) pause(); }); });
  on(motion, 'change', event => {
    renderer.reducedMotion = event.matches;
    renderer.vfx.reducedMotion = event.matches;
    if (event.matches) renderer.vfx.reset();
    renderer.draw(core);
  });
  updateSoundButton();
  updateHud();
  renderer.draw(core);
  if (options.embedded) stage.focus({ preventScroll: true });

  return {
    start,
    pause,
    resume: start,
    restart() { if (destroyed) return; stopLoop(); crashing = false; core.reset(); start(); },
    getState() {
      return {
        status: core.status,
        score: core.score,
        best,
        speed: core.speed,
        difficulty: core.difficulty,
        difficultyTier: core.difficultyTier,
      };
    },
    getAudioState() { return audio.getState(); },
    destroy() {
      if (destroyed) return;
      destroyed = true; stopLoop(); events.abort(); renderer.destroy(); audio.destroy(); host.remove();
    },
  };
}
