import test from 'node:test';
import assert from 'node:assert/strict';
import { VfxSystem } from '../src/game/vfx.js';
import { RooftopAudio } from '../src/game/audio.js';

function scene() {
  return {
    status: 'running',
    distance: 0,
    collision: null,
    player: { x: 170, y: 322, width: 28, height: 28, grounded: true },
  };
}

test('VFX emits bounded particles for jump, landing, and impact', () => {
  const core = scene();
  const vfx = new VfxSystem({ random: () => 0.5, maxParticles: 18 });
  vfx.update(core, 0.01);
  core.player.grounded = false;
  vfx.update(core, 0.01);
  assert.ok(vfx.particles.length > 0);
  core.player.grounded = true;
  vfx.update(core, 0.01);
  core.status = 'over';
  core.collision = { kind: 'box', x: 220, y: 320 };
  vfx.update(core, 0.01);
  assert.ok(vfx.particles.length <= 18);
  assert.equal(vfx.lastCollision, core.collision);
  vfx.reset();
  assert.equal(vfx.particles.length, 0);
  assert.equal(vfx.lastCollision, null);
});

test('reduced motion suppresses animated particles', () => {
  const core = scene();
  const vfx = new VfxSystem({ reducedMotion: true });
  vfx.update(core, 0.01);
  core.player.grounded = false;
  vfx.update(core, 0.01);
  assert.equal(vfx.particles.length, 0);
});

test('audio remains a safe no-op where Web Audio is unavailable', () => {
  const audio = new RooftopAudio();
  if (!audio.supported) {
    assert.doesNotThrow(() => {
      audio.start(); audio.jump(); audio.land(); audio.impact(); audio.pause(); audio.destroy();
    });
    assert.equal(audio.getState().playing, false);
  }
});
