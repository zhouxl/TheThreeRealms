import * as THREE from 'three';
import {easeInOut, INCENSE_RELEASE_PROGRESS} from './incenseMotion.ts';
import {armCenserClearance,getArmSkeletonPoints} from './incenseCollision.ts';

export type IncensePoint=Readonly<{x:number;y:number;z:number}>;
/** Keep the whole forearm above the metal lip. The held stick is released here
 * and then settles into the ash by itself; the hand never enters the bowl. */
export const HAND_RELEASE_CLEARANCE=0.22;
export const INCENSE_SETTLING_SECONDS=0.35;

/** After the hand releases above the lip, the incense settles into ash. */
export function incenseSettlementOffset(elapsedSeconds:number):number {
  const progress=Math.max(0,Math.min(1,elapsedSeconds/INCENSE_SETTLING_SECONDS));
  return HAND_RELEASE_CLEARANCE*(1-easeInOut(progress));
}
export function getSafeHandReleaseTarget(ash:IncensePoint):IncensePoint {
  return {x:ash.x,y:ash.y+HAND_RELEASE_CLEARANCE,z:ash.z};
}
const HOVER_OFFSET=0.30;
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
  const p=Math.max(0,Math.min(1,progress));
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
  if(p<=INCENSE_RELEASE_PROGRESS){
    const lower=easeInOut((p-lowerStart)/(INCENSE_RELEASE_PROGRESS-lowerStart));
    return {x:target.x,y:hover.y-HOVER_OFFSET*lower,z:target.z};
  }
  // Once released, the empty hand travels straight back UP through the
  // opening before it retreats; otherwise the forearm clips the front rim.
  const exit=0.87;
  if(p<=exit){
    const lift=easeInOut((p-INCENSE_RELEASE_PROGRESS)/(exit-INCENSE_RELEASE_PROGRESS));
    return {x:target.x,y:target.y+HOVER_OFFSET*lift,z:target.z};
  }
  const withdraw=easeInOut((p-exit)/(1-exit));
  return {
    x:hover.x+(start.x-hover.x)*withdraw,
    y:hover.y+(start.y-hover.y)*withdraw,
    z:hover.z+(start.z-hover.z)*withdraw,
  };
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

/**
 * Swivel the *arm* around the shoulder-to-hand axis, keeping the hand on
 * target while moving the elbow up and away from the censer's copper rim.
 * Unlike counter-rotating the incense mesh, this changes actual skinned bones.
 * The over-the-rim elbow pole is stable across frames, avoiding IK branch flips.
 */
export function poleElbowAwayFromCenser(
  shoulder:THREE.Object3D,elbow:THREE.Object3D,wrist:THREE.Object3D,
  grip:THREE.Object3D,target:IncensePoint,
):number {
  const parent=shoulder.parent;
  if(!parent)throw new Error('Shoulder_R must have a parent');
  shoulder.updateWorldMatrix(true,true);
  const origin=shoulder.getWorldPosition(new THREE.Vector3());
  const axis=new THREE.Vector3(target.x-origin.x,target.y-origin.y,target.z-origin.z);
  if(axis.lengthSq()<1e-8)return 0;
  axis.normalize();

  const base=shoulder.quaternion.clone();
  const parentWorld=parent.getWorldQuaternion(new THREE.Quaternion());
  const parentInv=parentWorld.clone().invert();
  const wanted=new THREE.Vector3(target.x,target.y,target.z);
  // Keeping a consistent set of anatomically reachable elbow-pole candidates
  // avoids letting the unconstrained CCD cross the metal side wall.
  const degrees=[60,90,120,30,0,-30,-60,-90,-120,150,-150,180];
  let bestQ=base.clone();
  let bestScore=-Infinity,bestClearance=-Infinity;
  for(const degree of degrees){
    shoulder.quaternion.copy(base);
    const worldDelta=new THREE.Quaternion().setFromAxisAngle(axis,degree*Math.PI/180);
    const localDelta=parentInv.clone().multiply(worldDelta).multiply(parentWorld);
    shoulder.quaternion.premultiply(localDelta);
    shoulder.updateWorldMatrix(true,true);
    aimWristUpright(wrist,grip);

    const clearance=armCenserClearance(getArmSkeletonPoints(shoulder,elbow,wrist));
    const error=grip.getWorldPosition(new THREE.Vector3()).distanceTo(wanted);
    if(error>0.12)continue; // The hand must still visibly hold the incense at its slot.
    // Penalize near-intersections heavily, then favour clear, natural elbow arcs.
    const safe=clearance>=0.006;
    const score=(safe?100:0)+clearance*5-error*0.5-Math.abs(degree)*0.0007;
    if(score>bestScore){
      bestScore=score;
      bestClearance=clearance;
      bestQ.copy(shoulder.quaternion);
    }
  }
  shoulder.quaternion.copy(bestQ);
  shoulder.updateWorldMatrix(true,true);
  aimWristUpright(wrist,grip);
  return bestClearance;
}
/** Convenience for the actual runtime performer; always leave the prop rooted to the wrist. */
export function positionIncenseHand(
  shoulder:THREE.Object3D,elbow:THREE.Object3D,wrist:THREE.Object3D,
  grip:THREE.Object3D,step:string|null,progress:number,
  start:IncensePoint,target:IncensePoint,
):number {
  if(step==='placing'){
    const point=sampleOverhandInsertion(start,target,progress);
    reachWithArm(shoulder,elbow,wrist,grip,point);
    poleElbowAwayFromCenser(shoulder,elbow,wrist,grip,point);
    return grip.getWorldPosition(new THREE.Vector3()).distanceTo(
      new THREE.Vector3(point.x,point.y,point.z));
  }
  aimWristUpright(wrist,grip);
  return 0;
}
