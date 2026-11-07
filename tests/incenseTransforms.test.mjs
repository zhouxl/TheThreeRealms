import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  aimWristUpright,sampleOverhandInsertion,
} from '../src/game/incenseTransforms.ts';
import {INCENSE_RELEASE_PROGRESS} from '../src/game/incenseMotion.ts';

test('overhand path raises incense over ash before lowering vertically',()=>{
  const start={x:0.28,y:0.92,z:4.10};
  const ash={x:0,y:1,z:3.5};
  const upper=sampleOverhandInsertion(start,ash,0.43);
  const pause=sampleOverhandInsertion(start,ash,0.55);
  const middle=sampleOverhandInsertion(start,ash,0.65);
  const release=sampleOverhandInsertion(start,ash,INCENSE_RELEASE_PROGRESS);
  assert.deepEqual(upper,{x:0,y:1.28,z:3.5});
  assert.deepEqual(pause,upper);
  assert.equal(middle.x,release.x);
  assert.equal(middle.z,release.z);
  assert.ok(pause.y>middle.y&&middle.y>release.y);
  assert.deepEqual(release,ash);
});

test('the wrist, not the stick, corrects grip orientation in world space',()=>{
  const scene=new THREE.Group();scene.rotation.set(.3,.4,-.2);
  const arm=new THREE.Group();arm.rotation.x=1.0;scene.add(arm);
  const wrist=new THREE.Group();arm.add(wrist);
  const grip=new THREE.Group();grip.position.z=-0.1;wrist.add(grip);
  const incense=new THREE.Group();grip.add(incense);
  aimWristUpright(wrist,grip);
  scene.updateMatrixWorld(true);
  const up=new THREE.Vector3(0,1,0).applyQuaternion(grip.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-7);
  assert.ok(wrist.quaternion.angleTo(new THREE.Quaternion())>0.2);
  assert.ok(incense.quaternion.equals(new THREE.Quaternion()));
});
