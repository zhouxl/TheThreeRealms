import * as THREE from 'three';
import {easeInOut, INCENSE_RELEASE_PROGRESS} from './incenseMotion.ts';

export type IncensePoint=Readonly<{x:number;y:number;z:number}>;
const HOVER_OFFSET=0.28;
const approachEnd=0.43;
const lowerStart=0.55;

/**
 * Wrist/arm must carry the actual base of the incense. The hand first reaches
 * a point ABOVE the ash and then descends vertically. The incense mesh itself
 * stays an untransformed child of IncenseGrip.
 */
export function sampleOverhandInsertion(
  start:IncensePoint,target:IncensePoint,progress:number
):IncensePoint {
  const p=Math.max(0,Math.min(INCENSE_RELEASE_PROGRESS,progress));
  const hover={x:target.x,y:target.y+HOVER_OFFSET,z:target.z};
  if(p<approachEnd){
    const t=easeInOut(p/approachEnd);
    return {
      x:start.x+(hover.x-start.x)*t,
      y:start.y+(hover.y-start.y)*t,
      z:start.z+(hover.z-start.z)*t,
    };
  }
  if(p<=lowerStart)return hover;
  const lower=easeInOut((p-lowerStart)/(INCENSE_RELEASE_PROGRESS-lowerStart));
  return {x:target.x,y:hover.y-HOVER_OFFSET*lower,z:target.z};
}

/**
 * Resolve the wrist bone against world vertical, rather than counter-rotating
 * the incense object. The named IncenseGrip inherits this anatomical wrist
 * orientation, so the hand, incense and smoke move as a single attached object.
 */
export function aimWristUpright(wrist:THREE.Object3D,grip:THREE.Object3D):void {
  if(!wrist.parent)throw new Error('Wrist_R must be parented to the arm rig');
  wrist.parent.updateWorldMatrix(true,true);
  const parentRotation=wrist.parent.getWorldQuaternion(new THREE.Quaternion());
  wrist.quaternion.copy(parentRotation.invert()).multiply(grip.quaternion.clone().invert());
  wrist.updateWorldMatrix(true,true);
}

/**
 * CCD over anatomical shoulder and elbow. The moving target is the INCENSE BASE
 * at IncenseGrip, never the incense mesh or the smoke. Each turn updates the
 * actual articulated skeleton. Solver uses only joint rotations.
 */
export function reachWithArm(
  shoulder:THREE.Object3D, elbow:THREE.Object3D,
  wrist:THREE.Object3D, grip:THREE.Object3D,
  target:IncensePoint, iterations=14,
):number {
  if(!shoulder.parent||!elbow.parent)throw new Error('Arm joints require parents');
  const wanted=new THREE.Vector3(target.x,target.y,target.z);
  const jointPosition=new THREE.Vector3(),current=new THREE.Vector3();
  const from=new THREE.Vector3(),to=new THREE.Vector3();
  for(let i=0;i<iterations;i++){
    aimWristUpright(wrist,grip);
    for(const joint of [elbow,shoulder]){
      joint.updateWorldMatrix(true,true);
      joint.getWorldPosition(jointPosition);
      grip.getWorldPosition(current);
      from.copy(current).sub(jointPosition);
      to.copy(wanted).sub(jointPosition);
      if(from.lengthSq()<1e-12||to.lengthSq()<1e-12)continue;
      from.normalize();to.normalize();
      const delta=new THREE.Quaternion().setFromUnitVectors(from,to);
      const parentQ=joint.parent!.getWorldQuaternion(new THREE.Quaternion());
      const localDelta=parentQ.clone().invert().multiply(delta).multiply(parentQ);
      joint.quaternion.premultiply(localDelta);
      joint.updateWorldMatrix(true,true);
    }
  }
  aimWristUpright(wrist,grip);
  return grip.getWorldPosition(new THREE.Vector3()).distanceTo(wanted);
}

/** Convenience for the actual runtime performer; always leave the prop rooted to the wrist. */
export function positionIncenseHand(
  shoulder:THREE.Object3D,elbow:THREE.Object3D,wrist:THREE.Object3D,
  grip:THREE.Object3D,step:string|null,progress:number,
  start:IncensePoint,target:IncensePoint,
):number {
  if(step==='placing'&&progress<=INCENSE_RELEASE_PROGRESS){
    const point=sampleOverhandInsertion(start,target,progress);
    return reachWithArm(shoulder,elbow,wrist,grip,point);
  }
  aimWristUpright(wrist,grip);
  return 0;
}
