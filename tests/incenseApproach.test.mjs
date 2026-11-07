import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INCENSE_APPROACH_POINT, isWalkableSegment, planIncenseApproach,
  tickApproach,
} from '../src/game/incenseApproach.ts';
import {canOccupy} from '../src/game/rules.ts';

test('near/far clickable incense does not teleport to the ritual stand',()=>{
  const far={x:0,z:6.1};
  const path=planIncenseApproach(far);
  assert.deepEqual(path,[INCENSE_APPROACH_POINT]);
  const first=tickApproach(far,path[0],1/60);
  assert.ok(first.position.z<far.z);
  assert.ok(first.position.z>far.z-0.1);
  assert.equal(first.reached,false);
});

test('approach routes safely around censer from behind and both sides',()=>{
  for(const start of [
    {x:0,z:0.6},{x:0,z:2.2},{x:-2,z:2.6},{x:2,z:2.6},
    {x:2,z:-1},{x:-2,z:-1},
  ]){
    const path=planIncenseApproach(start);
    assert.ok(path.length>=2,JSON.stringify(start));
    let point=start;
    for(const waypoint of path){
      assert.ok(canOccupy(waypoint.x,waypoint.z),JSON.stringify(waypoint));
      assert.ok(isWalkableSegment(point,waypoint),JSON.stringify({point,waypoint}));
      point=waypoint;
    }
    assert.deepEqual(point,INCENSE_APPROACH_POINT);
  }
});

test('walking advances at fixed speed independent of frame duration',()=>{
  let pos={x:0,z:6.1};
  const target={x:0,z:4.6};
  for(let i=0;i<150;i++){
    const step=tickApproach(pos,target,1/60);
    pos=step.position;
    if(step.reached)break;
  }
  assert.ok(Math.hypot(pos.x-target.x,pos.z-target.z)<0.07);
});

test('cancelled approach is harmless and never moves player after cancellation',()=>{
  const start={x:0,z:5.8};
  const next=tickApproach(start,INCENSE_APPROACH_POINT,0);
  assert.deepEqual(next.position,start);
});
