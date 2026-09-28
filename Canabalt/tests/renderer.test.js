import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerCore } from '../src/game/core.js';
import { getPlayerShadow } from '../src/game/renderer.js';

test('player shadow stays tight on the supporting rooftop', () => {
  const game = new RunnerCore({ random: () => 0.5 });
  const shadow = getPlayerShadow(game);
  assert.equal(shadow.y, 351);
  assert.ok(shadow.rx > 20 && shadow.rx < 24);
  assert.ok(shadow.ry > 3 && shadow.ry < 4);
  assert.ok(shadow.alpha > 0.25);
});

test('player shadow lifts and fades during a jump', () => {
  const game = new RunnerCore({ random: () => 0.5 });
  game.player.y = 200;
  game.player.grounded = false;
  const shadow = getPlayerShadow(game);
  assert.equal(shadow.y, 351);
  assert.ok(shadow.lift > 0.6);
  assert.ok(shadow.rx < 21);
  assert.ok(shadow.alpha < 0.2);
});
