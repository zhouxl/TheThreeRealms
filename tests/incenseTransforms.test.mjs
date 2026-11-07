import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  aimWristUpright,sampleOverhandInsertion,getSafeHandReleaseTarget,HAND_RELEASE_CLEARANCE,
} from '../src/game/incenseTransforms.ts';
import {INCENSE_RELEASE_PROGRESS} from '../src/game/incenseMotion.ts';

test('overhand path raises incense over ash before lowering vertically',()=>{
  const start={x:0.28,y:0.92,z:4.10};
  const ash={x:0,y:1,z:3.5};
  const upper=sampleOverhandInsertion(start,ash,0.43);
  const pause=sampleOverhandInsertion(start,ash,0.55);
  const middle=sampleOverhandInsertion(start,ash,0.65);
  const release=sampleOverhandInsertion(start,ash,INCENSE_RELEASE_PROGRESS);
  assert.deepEqual(upper,{x:0,y:1.3,z:3.5});
  assert.deepEqual(pause,upper);
  assert.equal(middle.x,release.x);
  assert.equal(middle.z,release.z);
  assert.ok(pause.y>middle.y&&middle.y>release.y);
  assert.deepEqual(release,ash);
  const lifted=sampleOverhandInsertion(start,ash,0.87);
  const back=sampleOverhandInsertion(start,ash,1);
  assert.deepEqual(lifted,upper,'empty hand first exits vertically above the rim');
  assert.deepEqual(back,start,'then hand retracts behind the lip');
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

test('hand releases the incense ABOVE the ash; only the stick settles down',()=>{
  const ash={x:0,y:1,z:3.5};
  const handTarget=getSafeHandReleaseTarget(ash);
  assert.equal(handTarget.y,ash.y+HAND_RELEASE_CLEARANCE);
  const start={x:0.25,y:1.1,z:4.1};
  const reached=sampleOverhandInsertion(start,handTarget,INCENSE_RELEASE_PROGRESS);
  assert.deepEqual(reached,handTarget);
  const hovered=sampleOverhandInsertion(start,handTarget,0.48);
  assert.ok(hovered.y>reached.y);
  const withdrawn=sampleOverhandInsertion(start,handTarget,0.81);
  assert.ok(withdrawn.y>reached.y);
});
