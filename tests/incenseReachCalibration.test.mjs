import test from 'node:test';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {getIncenseInsertionTarget,INCENSE_STAND} from '../src/game/incensePlacement.ts';
import {positionIncenseHand,sampleOverhandInsertion} from '../src/game/incenseTransforms.ts';
import {armCenserClearance,getArmSkeletonPoints} from '../src/game/incenseCollision.ts';

test('diagnostic sweep: find elbow-clear physical insertion configurations',async()=>{
  const data=readFileSync(new URL('../public/models/traveler-tech-demo.glb',import.meta.url));
  const bytes=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  const loaded=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
  const player=new THREE.Group();
  player.position.z=INCENSE_STAND.z;
  player.add(loaded.scene);
  const {scene}=loaded;
  const shoulder=scene.getObjectByName('Shoulder_R'),elbow=scene.getObjectByName('Elbow_R'),
        wrist=scene.getObjectByName('Wrist_R'),hand=scene.getObjectByName('Hand_R'),
        grip=scene.getObjectByName('IncenseGrip');
  const mixer=new THREE.AnimationMixer(scene);
  const clip=loaded.animations.find(c=>c.name==='PlaceIncense');
  mixer.clipAction(clip).play();
  const candidates=[];
  for(const lift of [0.18,0.24,0.30,0.36]){
    for(const elbowBias of [0,-0.5,-1,-1.5,-2.0]){
      for(const forearmExtra of [0,0.06,0.12]){
        for(const lateral of [0,-0.14,-0.24]){
          let minClear=Infinity,maxErr=0;
          const breakdown=[];
          for(const slotIndex of [0,1,3,5]){
            const slot=getIncenseInsertionTarget(slotIndex);
            for(const p of [0.43,0.65,0.76]){
              mixer.setTime(clip.duration*p);
              scene.position.set(slot.x+lateral,0,-0.62);
              shoulder.position.y=0.21+lift;
              elbow.rotation.x+=elbowBias;
              hand.position.y=-0.20-forearmExtra;
              wrist.quaternion.identity();
              player.updateMatrixWorld(true);
              const start=grip.getWorldPosition(new THREE.Vector3());
              const desired=sampleOverhandInsertion(start,slot,p);
              const err=positionIncenseHand(shoulder,elbow,wrist,grip,'placing',p,start,slot);
              const clearance=armCenserClearance(getArmSkeletonPoints(shoulder,elbow,wrist));
              minClear=Math.min(minClear,clearance);
              maxErr=Math.max(maxErr,err);
              if(clearance<0.006)breakdown.push({slot:slotIndex,p,c:Number(clearance.toFixed(3)),err:Number(err.toFixed(3))});
            }
          }
          candidates.push({lift,elbowBias,forearmExtra,lateral,minClear:Number(minClear.toFixed(4)),maxErr:Number(maxErr.toFixed(4)),fail:breakdown});
        }
      }
    }
  }
  candidates.sort((a,b)=>{
    const aScore=a.minClear-0.7*Math.max(0,a.maxErr-0.14);
    const bScore=b.minClear-0.7*Math.max(0,b.maxErr-0.14);
    return bScore-aScore;
  });
  console.log('ARM_REACH_SWEEP',JSON.stringify(candidates.slice(0,18).map(x=>({
    lift:x.lift,elbowBias:x.elbowBias,forearmExtra:x.forearmExtra,lateral:x.lateral,
    clearance:x.minClear,error:x.maxErr,
    collisions:x.fail.length,
  }))));
});

test('diagnostic sweep: can twisting the elbow around the reach axis clear the rim?',async()=>{
  const data=readFileSync(new URL('../public/models/traveler-tech-demo.glb',import.meta.url));
  const bytes=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  const loaded=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
  const player=new THREE.Group();player.position.z=INCENSE_STAND.z;player.add(loaded.scene);
  const {scene}=loaded;
  const shoulder=scene.getObjectByName('Shoulder_R'),elbow=scene.getObjectByName('Elbow_R'),
    wrist=scene.getObjectByName('Wrist_R'),grip=scene.getObjectByName('IncenseGrip');
  const mixer=new THREE.AnimationMixer(scene);
  const clip=loaded.animations.find(c=>c.name==='PlaceIncense');
  mixer.clipAction(clip).play();
  const candidates=[];
  for(const lift of [0.18,0.26,0.34]){
    for(const p of [0.43,0.65,0.76]){
      const slot=getIncenseInsertionTarget(0);
      mixer.setTime(clip.duration*p);
      scene.position.set(-0.16,0,-0.62);
      shoulder.position.y=0.21+lift;wrist.quaternion.identity();
      player.updateMatrixWorld(true);
      const start=grip.getWorldPosition(new THREE.Vector3());
      const wanted=sampleOverhandInsertion(start,slot,p);
      positionIncenseHand(shoulder,elbow,wrist,grip,'placing',p,start,slot);
      const q0=shoulder.quaternion.clone();
      const pt=shoulder.parent.getWorldQuaternion(new THREE.Quaternion());
      const sp=shoulder.getWorldPosition(new THREE.Vector3());
      const axis=new THREE.Vector3(wanted.x-sp.x,wanted.y-sp.y,wanted.z-sp.z).normalize();
      for(const deg of [-180,-150,-120,-90,-60,-30,0,30,60,90,120,150,180]){
        shoulder.quaternion.copy(q0);
        const worldDelta=new THREE.Quaternion().setFromAxisAngle(axis,deg*Math.PI/180);
        const localDelta=pt.clone().invert().multiply(worldDelta).multiply(pt);
        shoulder.quaternion.premultiply(localDelta);
        shoulder.updateWorldMatrix(true,true);
        const clearance=armCenserClearance(getArmSkeletonPoints(shoulder,elbow,wrist));
        const error=grip.getWorldPosition(new THREE.Vector3()).distanceTo(
          new THREE.Vector3(wanted.x,wanted.y,wanted.z));
        candidates.push({lift,p,deg,c:Number(clearance.toFixed(4)),err:Number(error.toFixed(4)),
          elbowY:Number(elbow.getWorldPosition(new THREE.Vector3()).y.toFixed(3))});
      }
    }
  }
  candidates.sort((a,b)=>b.c-a.c);
  console.log('ARM_SWIVEL_SWEEP',JSON.stringify(candidates.filter(x=>x.err<0.14).slice(0,20)));
  console.log('ARM_SWIVEL_RELEASE',JSON.stringify(candidates.filter(x=>x.p===0.76 && x.err<0.14).slice(0,30)));
});

test('diagnostic sweep: side, grip reach and near-slot offsets at release',async()=>{
  const data=readFileSync(new URL('../public/models/traveler-tech-demo.glb',import.meta.url));
  const bytes=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
  const gltf=await new Promise((resolve,reject)=>new GLTFLoader().parse(bytes,'',resolve,reject));
  const player=new THREE.Group();player.position.z=INCENSE_STAND.z;player.add(gltf.scene);
  const scene=gltf.scene;
  const shoulder=scene.getObjectByName('Shoulder_R'),elbow=scene.getObjectByName('Elbow_R'),
      hand=scene.getObjectByName('Hand_R'),wrist=scene.getObjectByName('Wrist_R'),
      grip=scene.getObjectByName('IncenseGrip');
  const mixer=new THREE.AnimationMixer(scene);
  const clip=gltf.animations.find(x=>x.name==='PlaceIncense');
  mixer.clipAction(clip).play();
  const scores=[];
  for(const lift of [0.16,0.22,0.28,0.34]){
    for(const extra of [0,0.06,0.12,0.18]){
      for(const lateral of [-0.28,-0.18,-0.08]){
        for(const slotZ of [3.50,3.56,3.62,3.68]){
          const target={x:0,y:1.0,z:slotZ};
          const p=0.76;
          mixer.setTime(clip.duration*p);
          shoulder.position.y=0.21+lift;hand.position.y=-0.20-extra;
          wrist.quaternion.identity();scene.position.set(lateral,0,-0.62);
          player.updateMatrixWorld(true);
          const start=grip.getWorldPosition(new THREE.Vector3());
          const desired=sampleOverhandInsertion(start,target,p);
          const error=positionIncenseHand(shoulder,elbow,wrist,grip,'placing',p,start,target);
          const baseQ=shoulder.quaternion.clone();
          const parentQ=shoulder.parent.getWorldQuaternion(new THREE.Quaternion());
          const origin=shoulder.getWorldPosition(new THREE.Vector3());
          const axis=new THREE.Vector3(target.x-origin.x,target.y-origin.y,target.z-origin.z).normalize();
          for(const deg of [-120,-90,-60,-30,0,30,60,90,120]){
            shoulder.quaternion.copy(baseQ);
            const worldTwist=new THREE.Quaternion().setFromAxisAngle(axis,deg*Math.PI/180);
            shoulder.quaternion.premultiply(parentQ.clone().invert().multiply(worldTwist).multiply(parentQ));
            shoulder.updateWorldMatrix(true,true);
            const clearance=armCenserClearance(getArmSkeletonPoints(shoulder,elbow,wrist));
            const finalError=grip.getWorldPosition(new THREE.Vector3()).distanceTo(
              new THREE.Vector3(desired.x,desired.y,desired.z));
            if(finalError<0.14)scores.push({lift,extra,lateral,slotZ,deg,c:Number(clearance.toFixed(4)),err:Number(finalError.toFixed(4))});
          }
        }
      }
    }
  }
  scores.sort((a,b)=>b.c-a.c);
  console.log('PHYSICAL_CENSER_SWEEP',JSON.stringify(scores.slice(0,20)));
  console.log('MODEST_LIFT_SWEEP',JSON.stringify(scores.filter(v=>v.lift<=0.22).slice(0,20)));
});
