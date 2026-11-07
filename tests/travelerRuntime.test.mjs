import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {aimWristUpright,positionIncenseHand,sampleOverhandInsertion} from '../src/game/incenseTransforms.ts';
import {INCENSE_TARGET, INCENSE_STAND, getIncenseInsertionTarget} from '../src/game/incensePlacement.ts';
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
  assert.equal(skinned.skeleton.bones.length,13);
  assert.ok(loaded.scene.getObjectByName('IncenseGrip'));
  assert.ok(loaded.scene.getObjectByName('Hand_R'));
  assert.ok(loaded.scene.getObjectByName('Elbow_R'));
  assert.ok(loaded.scene.getObjectByName('Wrist_R'));
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

test('actual GLB uses wrist joint to orient hand-held incense, without correcting the prop',async()=>{
  const loaded=await loadTraveler();
  const traveler=new THREE.Group();traveler.position.z=INCENSE_STAND.z;
  traveler.rotation.y=0.45;traveler.add(loaded.scene);
  const grip=loaded.scene.getObjectByName('IncenseGrip');
  const wrist=loaded.scene.getObjectByName('Wrist_R');
  const stick=new THREE.Group();grip.add(stick);
  const mixer=new THREE.AnimationMixer(loaded.scene);
  const clip=loaded.animations.find(c=>c.name==='Bow');
  mixer.clipAction(clip).play();mixer.setTime(clip.duration*0.5);
  aimWristUpright(wrist,grip);
  traveler.updateMatrixWorld(true);
  const up=new THREE.Vector3(0,1,0).applyQuaternion(grip.getWorldQuaternion(new THREE.Quaternion()));
  assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-6);
  assert.ok(stick.quaternion.equals(new THREE.Quaternion()),'incense mesh has no independent counter-rotation');
  assert.ok(wrist.quaternion.angleTo(new THREE.Quaternion())>0.1,'wrist actually changes orientation');
});

for(const count of [0,1,2]){
  test(`skinned arm carries incense base above slot then DOWN into ash, slot ${count}`,async()=>{
    const loaded=await loadTraveler();
    const player=new THREE.Group();player.position.z=INCENSE_STAND.z;
    player.add(loaded.scene);
    const shoulder=loaded.scene.getObjectByName('Shoulder_R');
    const elbow=loaded.scene.getObjectByName('Elbow_R');
    const wrist=loaded.scene.getObjectByName('Wrist_R');
    const grip=loaded.scene.getObjectByName('IncenseGrip');
    const stick=new THREE.Group();grip.add(stick);
    const mixer=new THREE.AnimationMixer(loaded.scene);
    const clip=loaded.animations.find(c=>c.name==='PlaceIncense');
    mixer.clipAction(clip).play();
    const slot=getIncenseInsertionTarget(count);
    mixer.setTime(clip.duration*0.05);
    player.updateMatrixWorld(true);
    const start=grip.getWorldPosition(new THREE.Vector3());
    let points=[];
    for(const progress of [0.43,0.55,0.65,INCENSE_RELEASE_PROGRESS]){
      mixer.setTime(clip.duration*progress);
      // Actual actor takes one short step toward the censer during insertion.
      loaded.scene.position.z=-0.62;
      loaded.scene.position.x=slot.x;
      const desired=sampleOverhandInsertion(start,slot,progress);
      const error=positionIncenseHand(shoulder,elbow,wrist,grip,'placing',progress,start,slot);
      player.updateMatrixWorld(true);
      if(error>0.14)console.log('IK_DEBUG',JSON.stringify({
        slot:count,progress,error,expected:desired,
        shoulder:shoulder.getWorldPosition(new THREE.Vector3()).toArray(),
        elbow:elbow.getWorldPosition(new THREE.Vector3()).toArray(),
        wrist:wrist.getWorldPosition(new THREE.Vector3()).toArray(),
        grip:grip.getWorldPosition(new THREE.Vector3()).toArray(),
      }));
      const actual=grip.getWorldPosition(new THREE.Vector3());
      assert.ok(error<0.14,`hand must reach ash neighborhood: error=${error} at p=${progress}`);
      assert.ok(actual.distanceTo(new THREE.Vector3(desired.x,desired.y,desired.z))<0.14);
      const up=new THREE.Vector3(0,1,0).applyQuaternion(grip.getWorldQuaternion(new THREE.Quaternion()));
      assert.ok(up.distanceTo(new THREE.Vector3(0,1,0))<1e-5);
      assert.ok(stick.quaternion.equals(new THREE.Quaternion()));
      points.push(actual.clone());
    }
    assert.ok(Math.abs(points[0].z-points[3].z)<0.14,'final section should go down, not across');
    assert.ok(points[0].y>points[3].y+0.12,'the base of the stick moves down into ash');
  });
}
