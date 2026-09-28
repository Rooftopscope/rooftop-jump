import { createRoninRenderers, createRunner, loadRoninAssets, loadCityEnvironment } from './game/index.js';

const mount = document.querySelector('#game');
mount.setAttribute('aria-busy', 'true');
let renderers = {};
const addNotice = text => {
  const notice = document.createElement('p');
  notice.className = 'asset-notice';
  notice.setAttribute('role', 'status');
  notice.textContent = text;
  mount.after(notice);
};
const [cityResult, roninResult] = await Promise.allSettled([
  loadCityEnvironment(),
  loadRoninAssets(),
]);
if (cityResult.status === 'fulfilled') {
  renderers = cityResult.value;
} else {
  console.warn('City artwork could not load; using the geometric environment.', cityResult.reason);
  addNotice('City artwork could not load. The game is ready with simple shapes; refresh to try again.');
}
if (roninResult.status === 'fulfilled') {
  renderers = { ...renderers, ...createRoninRenderers(roninResult.value) };
} else {
  console.warn('Ronin artwork could not load; using the geometric player.', roninResult.reason);
  addNotice('Character artwork could not load. Refresh to try again.');
}
const game = createRunner(mount, {
  renderers,
  playerSize: roninResult.status === 'fulfilled' ? { width: 24, height: 40 } : undefined,
  impactDuration: 0.64,
  embedded: document.documentElement.dataset.embed === 'true',
});
mount.removeAttribute('aria-busy');
window.addEventListener('pagehide', event => {
  if (event.persisted) game.pause();
  else game.destroy();
});
