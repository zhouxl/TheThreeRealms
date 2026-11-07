import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {alignHeldIncense} from '../src/game/incenseTransforms.ts';
import {INCENSE_TARGET, INCENSE_STAND} from '../src/game/incensePlacement.ts';
import {INCENSE_RELEASE_PROGRESS} from '../src/game/incenseMotion.ts';

const binary=readFileSync(new URL('../public/models/traveler-tech-demo.glb',import.meta.url));
const bytes=binary.buffer.slice(binary.byteOffset,binary.byteOffset+binary.byteLength);

function loadTraveler() {
  const loader=new GLTFLoader();
  return new Promise((resolve,reject)=>loader.parse(bytes,'',resolve,reject));
}

test('Three.js GLTFLoader loads the committed traveler as a real skinned mesh',async()=>{
  const loaded=await loadTraveler();
  let skinned=null;
  loaded.scene.traverse(item=>{if(item.isSkinnedMesh)skinned=item;});
  assert.ok(skinned,'Expected actual THREE.SkinnedMesh, not raw primitive mesh');
  assert.equal(skinned.skeleton.bones.length,11);
  assert.ok(loaded.scene.getObjectByName('IncenseGrip'));
  assert.ok(loaded.scene.getObjectByName('Hand_R'));
  assert.deepEqual(loaded.animations.map(c=>c.name),
    ['Idle','Walk','HoldIncense','Bow','PlaceIncense']);
});

test('Three.js AnimationMixer can sample the GLB bow and insertion clips',async()=>{
  const loaded=await loadTraveler();
  const spine=loaded.scene.getObjectByName('Spine');
  const rightArm=loaded.scene.getObjectByName('Shoulder_R');
  assert.ok(spine&&rightArm);
  const mixer=new THREE.AnimationMixer(loaded.scene);

  const bow=loaded.animations.find(c=>c.name==='Bow');
  const bowAction=mixer.clipAction(bow);
  bowAction.setLoop(THREE.LoopOnce,1).play();
  mixer.update(0.9);
  assert.ok(spine.rotation.x < -0.20,'Bow should bend the skeletal spine forward');

  mixer.stopAllAction();
  const place=loaded.animations.find(c=>c.name==='PlaceIncense');
  const action=mixer.clipAction(place);
  action.setLoop(THREE.LoopOnce,1).play();
  mixer.setTime(place.duration*0.76);
  assert.ok(rightArm.rotation.x>0.7,'PlaceIncense should move the joint toward the censer');
});

test('actual skinned rig keeps incense world-up and releases at near-side ash marker',async()=>{
  const loaded=await loadTraveler();
  const player=new THREE.Group();
  player.position.set(INCENSE_STAND.x,0,INCENSE_STAND.z);
  player.rotation.y=0.35;
  player.add(loaded.scene);
  const grip=loaded.scene.getObjectByName('IncenseGrip');
  assert.ok(grip);
  const prop=new THREE.Group();grip.add(prop);

  const mixer=new THREE.AnimationMixer(loaded.scene);
  const clip=loaded.animations.find(c=>c.name==='PlaceIncense');
  const action=mixer.clipAction(clip);
  action.setLoop(THREE.LoopOnce,1).play();
  mixer.setTime(clip.duration*INCENSE_RELEASE_PROGRESS);

  alignHeldIncense(grip,prop,'placing',INCENSE_RELEASE_PROGRESS);
  player.updateMatrixWorld(true);
  const stickUp=new THREE.Vector3(0,1,0).applyQuaternion(prop.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(stickUp.distanceTo(new THREE.Vector3(0,1,0))<1e-5);
  const base=prop.getWorldPosition(new THREE.Vector3());
  const ash=new THREE.Vector3(INCENSE_TARGET.x,INCENSE_TARGET.y,INCENSE_TARGET.z);
  assert.ok(base.distanceTo(ash)<1e-5,'actual GLB reaches the persisted incense slot at release');
});
