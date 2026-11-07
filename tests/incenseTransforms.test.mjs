import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {alignHeldIncense} from '../src/game/incenseTransforms.ts';
import {INCENSE_TARGET} from '../src/game/incensePlacement.ts';
import {INCENSE_RELEASE_PROGRESS} from '../src/game/incenseMotion.ts';

test('incense stays vertical even when root, arm and grip rotate',()=>{
  const root=new THREE.Group();
  root.rotation.set(0.2,1.18,-0.04);
  root.position.set(0,0,4.6);
  const arm=new THREE.Group();arm.position.set(.30,1.2,-.4);
  arm.rotation.set(0.99,0.15,-0.2);
  root.add(arm);
  const grip=new THREE.Group();grip.rotation.set(-.1,.33,.21);grip.position.set(0,-.2,-.12);
  arm.add(grip);
  const held=new THREE.Group();grip.add(held);

  for(const step of ['hold','bowing','placing']){
    alignHeldIncense(grip,held,step,step==='placing'?0.3:0);
    root.updateMatrixWorld(true);
    const q=held.getWorldQuaternion(new THREE.Quaternion());
    const up=new THREE.Vector3(0,1,0).applyQuaternion(q);
    assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-6,step);
  }
});

test('placing reaches exact world-space ash slot at the release marker',()=>{
  const root=new THREE.Group();root.position.set(0,0,4.6);
  const grip=new THREE.Group();grip.position.set(.2,1.3,-.6);root.add(grip);
  const held=new THREE.Group();grip.add(held);
  alignHeldIncense(grip,held,'placing',0.10);
  root.updateMatrixWorld(true);
  const start=held.getWorldPosition(new THREE.Vector3());
  assert.ok(start.distanceTo(new THREE.Vector3(INCENSE_TARGET.x,INCENSE_TARGET.y,INCENSE_TARGET.z))>.25);
  alignHeldIncense(grip,held,'placing',INCENSE_RELEASE_PROGRESS);
  root.updateMatrixWorld(true);
  const end=held.getWorldPosition(new THREE.Vector3());
  assert.ok(end.distanceTo(new THREE.Vector3(INCENSE_TARGET.x,INCENSE_TARGET.y,INCENSE_TARGET.z))<1e-6);
});

test('leaving place animation resets the prop to hand grip',()=>{
  const grip=new THREE.Group();grip.position.set(.3,1.2,.6);
  const held=new THREE.Group();grip.add(held);
  alignHeldIncense(grip,held,'placing',INCENSE_RELEASE_PROGRESS);
  alignHeldIncense(grip,held,'bowing',0.5);
  assert.ok(held.position.length()<1e-8);
});
