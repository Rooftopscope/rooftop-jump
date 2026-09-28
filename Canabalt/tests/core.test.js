import test from 'node:test';
import assert from 'node:assert/strict';
import { RunnerCore } from '../src/game/core.js';

const make = () => new RunnerCore({ random: () => 0.5 });
function advance(game, seconds, held = false) {
  for (let i = 0; i < Math.round(seconds * 120); i++) game.update(1 / 120, held);
}
function clearTrack(game) {
  game.platforms = [{ x: -300, y: 350, width: 100000, id: 0 }];
  game.obstacles = [];
}

test('ready and paused simulations do not advance', () => {
  const game = make(); advance(game, 1); assert.equal(game.score, 0);
  game.start(); advance(game, 0.5); const distance = game.distance;
  game.status = 'paused'; advance(game, 1); assert.equal(game.distance, distance);
});

test('automatic running collides with the first box', () => {
  const game = make(); game.start(); advance(game, 3);
  assert.equal(game.status, 'over'); assert.match(game.reason, /box/);
  assert.equal(game.collision.kind, 'box');
  assert.equal(game.player.x + game.player.width, 670);
  assert.ok(game.score > 40);
});

test('holding jump goes higher, release shortens it, and a jump cannot repeat in air', () => {
  const full = make(); const tap = make();
  for (const game of [full, tap]) { clearTrack(game); game.start(); game.jump(); }
  advance(full, 0.2, true); advance(tap, 0.04, true); tap.releaseJump(); advance(tap, 0.16);
  assert.ok(full.player.y < tap.player.y - 35);
  full.jump(); advance(full, 0.05, true); assert.equal(full.jumps, 1);
  advance(full, 0.6, true); assert.equal(full.player.grounded, true); assert.equal(full.player.y, 322);
});

test('a timed jump clears the first obstacle and lands', () => {
  const game = make(); game.start();
  while (game.player.x < 530) game.update(1 / 120);
  game.jump(); advance(game, 0.8, true);
  assert.equal(game.status, 'running'); assert.equal(game.player.grounded, true);
  assert.ok(game.player.x > 705);
});

test('missing a roof gap ends the run and reset restores a playable scene', () => {
  const game = make(); game.obstacles = []; game.start();
  // Remove future obstacles each frame so this specifically exercises falling.
  for (let i = 0; i < 700; i++) { game.obstacles = []; game.update(1 / 120); }
  assert.equal(game.status, 'over'); assert.ok(/rooftop/.test(game.reason));
  game.reset(); assert.equal(game.status, 'ready'); assert.equal(game.score, 0);
  assert.equal(game.player.grounded, true); assert.equal(game.jumps, 0);
});

test('large time steps cannot tunnel through a narrow obstacle', () => {
  const game = make(); clearTrack(game); game.start();
  game.obstacles = [{ x: 204, y: 310, width: 2, height: 40, kind: 'box' }];
  game.update(0.1); assert.equal(game.status, 'over');
});

for (const kind of ['box', 'cylinder']) {
  test(`${kind}: side collision stops exactly at the surface`, () => {
    const game = make(); clearTrack(game); game.start(); game.time = 130;
    game.obstacles = [{ x: 220, y: 300, width: 40, height: 50, kind }];
    game.update(0.1);
    assert.equal(game.status, 'over');
    assert.equal(game.player.x + game.player.width, 220);
    assert.equal(game.collision.kind, kind === 'box' ? 'box' : 'barrel');
    assert.deepEqual(game.collision.normal, { x: -1, y: 0 });
    const distance = game.distance;
    advance(game, 1);
    assert.equal(game.distance, distance);
  });

  test(`${kind}: land on top, stay supported and jump again`, () => {
    const game = make(); clearTrack(game); game.start();
    game.obstacles = [{ x: 150, y: 300, width: 200, height: 50, kind }];
    game.player.y = 270; game.player.vy = 120; game.player.grounded = false;
    advance(game, 0.1);
    assert.equal(game.status, 'running');
    assert.equal(game.player.y + game.player.height, 300);
    assert.equal(game.player.grounded, true);
    assert.equal(game.collision, null);
    game.jump(); advance(game, 0.05, true);
    assert.equal(game.player.grounded, false);
    assert.ok(game.player.vy < 0);
  });
}

test('walking off a crate returns to the rooftop without a false collision', () => {
  const game = make(); clearTrack(game); game.start();
  game.obstacles = [{ x: 150, y: 300, width: 80, height: 50, kind: 'box' }];
  game.player.y = 272;
  advance(game, 0.7);
  assert.equal(game.status, 'running');
  assert.equal(game.player.y, 322);
  assert.equal(game.player.grounded, true);
});

test('a rooftop side impact resolves the contact and reset clears collision state', () => {
  const game = make(); game.start(); game.obstacles = [];
  game.platforms = [{ x: 215, y: 290, width: 2000, id: 1 }];
  game.update(0.1);
  assert.equal(game.status, 'over');
  assert.equal(game.collision.kind, 'rooftop');
  assert.equal(game.player.x + game.player.width, 215);
  game.reset();
  assert.equal(game.collision, null);
  assert.equal(game.reason, '');
});

test('difficulty ramps through readable tiers as distance increases', () => {
  const game = make(); clearTrack(game); game.start();
  const samples = [];
  for (const distance of [0, 900, 2700, 5400, 7200, 12000]) {
    game.distance = distance;
    game.player.x = distance + 170;
    game.player.y = 322;
    game.player.vy = 0;
    game.player.grounded = true;
    game.step(0, false);
    samples.push({ difficulty: game.difficulty, speed: game.speed, tier: game.difficultyTier });
  }
  assert.deepEqual(samples.map(sample => sample.tier), [1, 1, 2, 4, 5, 5]);
  for (let i = 1; i < samples.length; i++) {
    assert.ok(samples[i].difficulty >= samples[i - 1].difficulty);
    assert.ok(samples[i].speed >= samples[i - 1].speed);
  }
  assert.equal(samples.at(-1).speed, 580);
  assert.equal(samples.at(-1).difficulty, 1);
});

test('late generation adds pressure while keeping gaps within a full jump', () => {
  const early = make();
  early.platforms = [{ x: -300, y: 350, width: 1000, id: 0 }];
  early.obstacles = [];
  early.generate();
  const earlyNext = early.platforms[1];
  const earlyGap = earlyNext.x - (early.platforms[0].x + early.platforms[0].width);

  const late = make();
  late.distance = 7200;
  late.platforms = [{ x: 6800, y: 350, width: 260, id: 0 }];
  late.obstacles = [];
  late.generate();
  const lateNext = late.platforms[1];
  const lateGap = lateNext.x - (late.platforms[0].x + late.platforms[0].width);

  assert.ok(lateGap > earlyGap);
  assert.ok(lateNext.width < earlyNext.width);
  assert.ok(lateGap <= late.difficultyProfile.speed * 0.5);
  assert.ok(late.obstacles.length >= 1);
});

test('long-running generation stays bounded and speed has a cap', () => {
  const game = make(); game.start();
  // Bypass collisions here to validate generation/resource bounds for a long run.
  game.die = () => {};
  for (let i = 0; i < 120 * 180; i++) {
    game.player.y = 100; game.player.vy = 0;
    game.update(1 / 120);
  }
  assert.equal(game.speed, 580); assert.ok(game.platforms.length < 8); assert.ok(game.obstacles.length < 8);
  for (let i = 1; i < game.platforms.length; i++) {
    const prev = game.platforms[i - 1]; const next = game.platforms[i];
    assert.ok(next.x > prev.x + prev.width); assert.ok(Math.abs(next.y - prev.y) <= 72);
  }
});
