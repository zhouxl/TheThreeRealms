import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATIC_COLLIDERS, CHARACTER_HEIGHT,CHARACTER_RADIUS, isInsideStaticBox,
} from '../src/game/collisionGeometry.ts';
import {resolveCameraOcclusion,segmentEntry} from '../src/game/cameraOcclusion.ts';

test('colliders reflect the actual courtyard, hall, steps and censer geometry',()=>{
  const ids=STATIC_COLLIDERS.map(x=>x.id);
  assert.equal(ids.length,new Set(ids).size,'unique collision IDs');
  for(const id of ['courtyard-floor','hall-floor','step-1','step-2','step-3',
    'incense-burner','main-offering-altar','fortune-stand','blessing-stand']){
    assert.ok(ids.includes(id),id);
  }
  const censer=STATIC_COLLIDERS.find(c=>c.id==='incense-burner');
  assert.equal(censer.shape,'cylinder');
  assert.deepEqual(censer.center,[0,.68,3.20]);
  assert.ok(CHARACTER_RADIUS>0.20 && CHARACTER_HEIGHT===1.55);
});

test('open central gate is not blocked by solid front-wall panels',()=>{
  const sections=STATIC_COLLIDERS.filter(x=>x.id.startsWith('front-'));
  for(const gate of [{x:0,y:1,z:0},{x:1.0,y:1,z:0},{x:-1,y:1,z:0}]){
    assert.ok(sections.every(box=>box.shape==='box'&&!isInsideStaticBox(gate,box)));
  }
  assert.ok(sections.some(box=>box.shape==='box'&&isInsideStaticBox({x:4.4,y:1,z:0},box)));
});

test('camera ray crosses a wall, and returns the obstruction entry fraction',()=>{
  const box={id:'wall',shape:'box',center:[0,2,-4],half:[1,2,0.3],camera:true};
  assert.ok(Math.abs(segmentEntry({x:0,y:2,z:0},{x:0,y:2,z:-8},box)-0.4625)<1e-8);
  assert.equal(segmentEntry({x:4,y:2,z:0},{x:4,y:2,z:-8},box),null);
});

test('camera returns to target when no obstacle and clips before obstacle otherwise',()=>{
  const blocker={id:'test-wall',shape:'box',center:[0,2,-4],half:[1,2,.2],camera:true};
  const origin={x:0,y:2,z:0};
  assert.deepEqual(resolveCameraOcclusion(origin,{x:0,y:2,z:3},[blocker]),{x:0,y:2,z:3});
  const result=resolveCameraOcclusion(origin,{x:0,y:2,z:-8},[blocker]);
  assert.ok(result.z>-3.8 && result.z<-3.4,JSON.stringify(result));
});

test('camera raycasting does not clip to the ground or shrine when starting within its proxy',()=>{
  const altar={id:'altar',shape:'box',center:[0,1.5,-6],half:[1,1,1],camera:true};
  const origin={x:0,y:1.5,z:-6};
  assert.deepEqual(resolveCameraOcclusion(origin,{x:0,y:2,z:-2},[altar]),{x:0,y:2,z:-2});
});
