import {CAMERA_SKIN, STATIC_COLLIDERS, type BoxCollider} from './collisionGeometry.ts';
export type Position3=Readonly<{x:number;y:number;z:number}>;

/** Liang–Barsky segment/slab intersection; null when line misses the AABB.
 * Ignore a box if the ray starts inside it (focus is already behind that wall).
 */
export function segmentEntry(
  origin:Position3, target:Position3,box:BoxCollider,
):number|null {
  const diff={x:target.x-origin.x,y:target.y-origin.y,z:target.z-origin.z};
  let near=0,far=1;
  for(const [axis,i] of [['x',0],['y',1],['z',2]] as const){
    const min=box.center[i]-box.half[i],max=box.center[i]+box.half[i];
    const start=origin[axis],velocity=diff[axis];
    if(start>min && start<max)return null; // handled below, origin-inside independently
    if(Math.abs(velocity)<1e-9){if(start<min||start>max)return null;continue;}
    const t1=(min-start)/velocity,t2=(max-start)/velocity;
    near=Math.max(near,Math.min(t1,t2));far=Math.min(far,Math.max(t1,t2));
    if(near>far)return null;
  }
  return near>=0&&near<=1?near:null;
}

/** Camera stays in front of temple walls / pillars / furniture while orbiting. */
export function resolveCameraOcclusion(
  focus:Position3,desired:Position3,
  blockers:readonly BoxCollider[]=STATIC_COLLIDERS.filter(
    (c):c is BoxCollider=>c.camera&&c.shape==='box',
  ),
):Position3 {
  const ray={x:desired.x-focus.x,y:desired.y-focus.y,z:desired.z-focus.z};
  const distance=Math.hypot(ray.x,ray.y,ray.z);
  if(distance<0.01)return desired;
  let maxLength=distance;
  for(const box of blockers){
    if(
      Math.abs(focus.x-box.center[0])<=box.half[0]&&
      Math.abs(focus.y-box.center[1])<=box.half[1]&&
      Math.abs(focus.z-box.center[2])<=box.half[2]
    )continue;
    const t=segmentEntry(focus,desired,box);
    if(t!==null)maxLength=Math.min(maxLength,Math.max(0,distance*t-CAMERA_SKIN));
  }
  const scale=maxLength/distance;
  return {x:focus.x+ray.x*scale,y:focus.y+ray.y*scale,z:focus.z+ray.z*scale};
}
