import test from 'node:test';
import assert from 'node:assert/strict';
import { FORTUNES, getFortune } from '../src/game/fortuneData.ts';
import {
  canOccupy, firstAvailableSlot, floorHeight, getNearestStation,
  isHandheldIncenseLit, moveWithCollision, nextIncenseStep, normalizeWish, pickFortune,
} from '../src/game/rules.ts';

test('hall entrance remains accessible, but walls block passage', () => {
  assert.equal(canOccupy(0, 0), true);
  assert.equal(canOccupy(3, 0), false);
});
test('player cannot walk through the incense burner or off the stage', () => {
  assert.deepEqual(moveWithCollision({ x: 0, z: 4.2 }, 0, -0.7), { x: 0, z: 4.2 });
  assert.equal(canOccupy(7, 1), false);
});
test('floor slope connects courtyard and hall', () => {
  assert.equal(floorHeight(1), 0);
  assert.equal(floorHeight(-1), 0.45);
  assert.ok(floorHeight(0) > 0 && floorHeight(0) < 0.45);
});
test('interaction priority uses nearest standing anchor', () => {
  assert.equal(getNearestStation({ x: 0, z: 4.5 }), 'incense');
  assert.equal(getNearestStation({ x: -3.65, z: -3.35 }), 'fortune');
  assert.equal(getNearestStation({ x: 3.55, z: -3.3 }), 'blessing');
  assert.equal(getNearestStation({ x: 5, z: 6.7 }), null);
});
test('incense flow cannot advance beyond done', () => {
  assert.equal(nextIncenseStep('take'), 'light');
  assert.equal(nextIncenseStep('place'), 'done');
  assert.equal(nextIncenseStep('done'), 'done');
});
test('held incense smoke starts after ignition and stops when placed or cancelled', () => {
  for (const step of ['take','light','done']) {
    assert.equal(isHandheldIncenseLit({kind:'incense',step}), false, step);
  }
  for (const step of ['hold','bow','bowing','place','placing']) {
    assert.equal(isHandheldIncenseLit({kind:'incense',step}), true, step);
  }
  assert.equal(isHandheldIncenseLit({kind:'explore'}), false);
  assert.equal(isHandheldIncenseLit({kind:'fortune',step:'shake'}), false);
  assert.equal(isHandheldIncenseLit({kind:'blessing',step:'edit'}), false);
});

test('fortune is always within the 32-slip collection', () => {
  assert.equal(pickFortune(0), 1);
  assert.equal(pickFortune(0.999999), 32);
  assert.throws(() => pickFortune(1));
});
test('blessing placement avoids occupied slots', () => {
  assert.equal(firstAvailableSlot([1, 2, 3]), 4);
  assert.equal(firstAvailableSlot([1, 2, 3], 3), null);
});
test('wish content is trimmed and bounded by unicode code points', () => {
  assert.equal(normalizeWish('  平安   顺遂 '), '平安 顺遂');
  assert.equal([...normalizeWish('愿'.repeat(65))].length, 60);
});

test('all 32 original fortune slips have coherent nonempty content', () => {
  assert.equal(FORTUNES.length, 32);
  assert.equal(new Set(FORTUNES.map(f => f.number)).size, 32);
  for (let i=1;i<=32;i++) {
    assert.ok(getFortune(i).poem.length > 10);
    assert.ok(getFortune(i).reflection.length > 8);
  }
});
