import * as THREE from 'three';
import {easeInOut, INCENSE_RELEASE_PROGRESS} from './incenseMotion.ts';
import {INCENSE_TARGET} from './incensePlacement.ts';

/**
 * A GLB hand attachment is a moving origin, not the direction of the incense.
 * In the ceremony the incense stays parallel to world Y regardless of wrist,
 * shoulder, body bow or the player's heading.
 */
export function alignHeldIncense(
  grip:THREE.Object3D,
  propRoot:THREE.Object3D,
  step:string|null,
  progress:number,
  target:Readonly<{x:number;y:number;z:number}>=INCENSE_TARGET,
):void {
  grip.updateWorldMatrix(true,false);
  const worldOrientation=grip.getWorldQuaternion(new THREE.Quaternion());
  propRoot.quaternion.copy(worldOrientation).invert();

  if(step==='placing'){
    // Eased last-mile reach to the ash, from the moving hand to the actual slot.
    // The prop disappears at the same release event that shows the censer stick.
    const start=0.18;
    const t=Math.max(0,Math.min(1,(progress-start)/(INCENSE_RELEASE_PROGRESS-start)));
    const weight=easeInOut(t);
    const hand=grip.getWorldPosition(new THREE.Vector3());
    const goal=new THREE.Vector3(target.x,target.y,target.z);
    const desiredWorld=hand.lerp(goal,weight);
    propRoot.position.copy(grip.worldToLocal(desiredWorld));
  }else{
    propRoot.position.set(0,0,0);
  }
}
