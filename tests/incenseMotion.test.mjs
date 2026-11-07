import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INCENSE_ACTION_SECONDS, INCENSE_RELEASE_PROGRESS, advanceIncenseButton, incenseActionProgress,
  getTravelerPose, hasReleasedIncense, isIncenseActionStep,
} from '../src/game/incenseMotion.ts';

test('only transient incense action steps trigger timed animation', () => {
  assert.equal(isIncenseActionStep('bow'), false);
  assert.equal(isIncenseActionStep('bowing'), true);
  assert.equal(isIncenseActionStep('place'), false);
  assert.equal(isIncenseActionStep('placing'), true);
});

test('animation progress is clamped and reaches completion once', () => {
  for (const action of ['bowing','placing']) {
    const seconds = INCENSE_ACTION_SECONDS[action];
    assert.ok(seconds > 0);
    assert.equal(incenseActionProgress(action, -1), 0);
    assert.equal(incenseActionProgress(action, seconds / 2), 0.5);
    assert.equal(incenseActionProgress(action, seconds), 1);
    assert.equal(incenseActionProgress(action, seconds + 50), 1);
  }
});

test('bow leans forward and returns to its held-incense posture', () => {
  const start = getTravelerPose('bowing', 0);
  const middle = getTravelerPose('bowing', 0.5);
  const end = getTravelerPose('bowing', 1);
  assert.ok(Math.abs(start.torsoPitch) < 1e-9);
  assert.ok(middle.torsoPitch < -0.35);
  assert.ok(Math.abs(end.torsoPitch) < 1e-9);
  assert.equal(start.handZ, end.handZ);
});

test('insertion reaches the censer and then retracts', () => {
  const start = getTravelerPose('placing', 0);
  const reach = getTravelerPose('placing', INCENSE_RELEASE_PROGRESS);
  const end = getTravelerPose('placing', 1);
  assert.ok(reach.handZ < start.handZ - 0.5);
  assert.ok(reach.handY < start.handY - 0.1);
  assert.equal(end.handZ, start.handZ);
  assert.ok(Math.abs(end.torsoPitch) < 1e-9);
});

test('incense is detached once at the placing release marker', () => {
  assert.equal(hasReleasedIncense('bowing', 1), false);
  assert.equal(hasReleasedIncense('placing', INCENSE_RELEASE_PROGRESS - 0.01), false);
  assert.equal(hasReleasedIncense('placing', INCENSE_RELEASE_PROGRESS), true);
  assert.equal(hasReleasedIncense('placing', 1), true);
  assert.equal(hasReleasedIncense('place', 1), false);
});

test('free exploration and completed ritual return an idle pose', () => {
  assert.deepEqual(getTravelerPose(null, 0), getTravelerPose('done', 0));
  assert.equal(getTravelerPose(null, 0).armsForward, 0);
});

test('button presses cannot skip the visible bow or place animations', () => {
  assert.equal(advanceIncenseButton('take'), 'light');
  assert.equal(advanceIncenseButton('light'), 'hold');
  assert.equal(advanceIncenseButton('hold'), 'bow');
  assert.equal(advanceIncenseButton('bow'), 'bowing');
  assert.equal(advanceIncenseButton('bowing'), 'bowing');
  assert.equal(advanceIncenseButton('place'), 'placing');
  assert.equal(advanceIncenseButton('placing'), 'placing');
  assert.equal(advanceIncenseButton('done'), 'done');
});
