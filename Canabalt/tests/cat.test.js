import test from 'node:test';
import assert from 'node:assert/strict';
import { CAT_ASSET_PATHS, prepareCatSvg } from '../src/game/cat.js';

test('bundled cat poses expose the supplied sixteen-state set', () => {
  assert.equal(Object.keys(CAT_ASSET_PATHS).length, 16);
  assert.equal(CAT_ASSET_PATHS.run, '16-run.svg');
  assert.equal(CAT_ASSET_PATHS.leap, '05-leap.svg');
  assert.equal(CAT_ASSET_PATHS.land, '12-land.svg');
});

test('cat SVG preparation removes the artboard and pose label area', () => {
  const source = '<svg width="412" height="447" viewBox="0 0 412 447"><rect width="412" height="447" fill="#F2F5EC"/><path d="M1 1"/></svg>';
  const prepared = prepareCatSvg(source);
  assert.doesNotMatch(prepared, /F2F5EC/);
  assert.match(prepared, /width="412" height="390"/);
  assert.match(prepared, /viewBox="0 0 412 390"/);
});
