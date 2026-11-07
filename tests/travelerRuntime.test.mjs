import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';

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
