import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_RITUAL_ORBIT, dragRitualOrbit, getRitualCameraPosition, zoomRitualOrbit,
} from '../src/game/ritualCamera.ts';

test('dragging during incense changes camera orbit without altering player position',()=>{
  const first=DEFAULT_RITUAL_ORBIT;
  const next=dragRitualOrbit(first,90,30);
  assert.notEqual(next.yaw,first.yaw);
  assert.notEqual(next.pitch,first.pitch);
  assert.equal(first.yaw,0.67); // input is immutable
  const from=getRitualCameraPosition({x:0,y:1.2,z:3.9},first);
  const to=getRitualCameraPosition({x:0,y:1.2,z:3.9},next);
  assert.notDeepEqual(from,to);
});

test('ritual camera pitch and wheel zoom remain usable within bounds',()=>{
  assert.equal(dragRitualOrbit(DEFAULT_RITUAL_ORBIT,0,9999).pitch,1.05);
  assert.equal(dragRitualOrbit(DEFAULT_RITUAL_ORBIT,0,-9999).pitch,-0.28);
  assert.equal(zoomRitualOrbit(DEFAULT_RITUAL_ORBIT,9999).radius,5.5);
  assert.equal(zoomRitualOrbit(DEFAULT_RITUAL_ORBIT,-9999).radius,2.6);
});

test('camera revolves around focus at a stable radius',()=>{
  const focus={x:0,y:1.2,z:3.9};
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.7]){
    const orbit={...DEFAULT_RITUAL_ORBIT,yaw};
    const pos=getRitualCameraPosition(focus,orbit);
    assert.ok(Math.abs(Math.hypot(pos.x-focus.x,pos.y-focus.y,pos.z-focus.z)-orbit.radius)<1e-8);
  }
});
