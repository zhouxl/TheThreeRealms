import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INCENSE_ACTION_SECONDS, INCENSE_RELEASE_PROGRESS, advanceIncenseButton, incenseActionProgress,
  getTravelerPose, hasReleasedIncense, isIncenseActionStep,
} from '../src/game/incenseMotion.ts';
import {
  INCENSE_TARGET, INCENSE_MAX_VISIBLE, getHeldIncenseBaseWorld, getVisibleIncenseSlots,
} from '../src/game/incensePlacement.ts';

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
  assert.ok(reach.handZ < start.handZ - 0.4);
  const contact=getHeldIncenseBaseWorld(reach);
  assert.ok(Math.abs(contact.y-INCENSE_TARGET.y)<0.12, 'stick foot should touch ash height');
  assert.ok(Math.abs(contact.z-INCENSE_TARGET.z)<0.15, 'stick foot should be over censer');
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

test('a released incense stick becomes visible in the censer', () => {
  assert.equal(getVisibleIncenseSlots(0,false).length,0);
  assert.deepEqual(getVisibleIncenseSlots(0,true),[[0,0.30]]);
  // Once committed the same position remains occupied, not an empty burner.
  assert.deepEqual(getVisibleIncenseSlots(1,false),[[0,0.30]]);
  assert.equal(getVisibleIncenseSlots(1,true).length,2);
  assert.equal(getVisibleIncenseSlots(1000,false).length,INCENSE_MAX_VISIBLE);
  assert.equal(getVisibleIncenseSlots(-2,true).length,1);
  assert.ok(INCENSE_TARGET.z > 3.2 && INCENSE_TARGET.z < 3.75,'slot remains inside ash');
});

test('the incense base is aligned with the ash at the insertion release marker', () => {
  const hold=getHeldIncenseBaseWorld(getTravelerPose('hold',0));
  const release=getHeldIncenseBaseWorld(getTravelerPose('placing',INCENSE_RELEASE_PROGRESS));
  assert.ok(hold.y>INCENSE_TARGET.y+0.1,'the initial stick should be above ash');
  assert.ok(Math.abs(4.6-3.2)>1.3,'traveler stands clear of the censer');
  assert.ok(Math.abs(release.x-INCENSE_TARGET.x)<0.01);
  assert.ok(Math.abs(release.y-INCENSE_TARGET.y)<0.12);
  assert.ok(Math.abs(release.z-INCENSE_TARGET.z)<0.15);
});
