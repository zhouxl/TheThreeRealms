import {canOccupy, moveWithCollision, type PlayerPosition} from './rules.ts';
import {INCENSE_STAND} from './incensePlacement.ts';

export const INCENSE_APPROACH_SPEED=1.7; // world units / s
export const INCENSE_APPROACH_TOLERANCE=0.065;
export const INCENSE_APPROACH_POINT:PlayerPosition={
  x:INCENSE_STAND.x,z:INCENSE_STAND.z,
};

export function isWalkableSegment(a:PlayerPosition,b:PlayerPosition):boolean{
  const length=Math.hypot(b.x-a.x,b.z-a.z);
  const samples=Math.max(1,Math.ceil(length/0.07));
  for(let i=0;i<=samples;i++){
    const t=i/samples;
    if(!canOccupy(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t))return false;
  }
  return true;
}

/**
 * Route around the stationary censer; never teleport through its collider.
 * Short visits use a direct line. When approaching from behind the censer,
 * the actor goes around the east/west side before standing at its front.
 */
export function planIncenseApproach(
  start:PlayerPosition,
  destination:PlayerPosition=INCENSE_APPROACH_POINT,
):PlayerPosition[]{
  if(isWalkableSegment(start,destination))return [destination];
  const side=start.x<0?-1.18:1.18;
  const before:PlayerPosition={x:side,z:Math.min(2.25,start.z)};
  const around:PlayerPosition={x:side,z:4.5};
  const route=[before,around,destination];
  let previous=start;
  for(const waypoint of route){
    if(!isWalkableSegment(previous,waypoint)){
      // If already abreast of the censer, keep to this side until its front,
      // then cross at z=4.5 (outside the collision box).
      const via={x:side,z:Math.min(previous.z,2.25)};
      if(!isWalkableSegment(previous,via))return [];
    }
    previous=waypoint;
  }
  return route.filter((v,i)=>i===0 || Math.hypot(v.x-route[i-1].x,v.z-route[i-1].z)>0.001);
}

export type ApproachTick=Readonly<{position:PlayerPosition;reached:boolean;moving:boolean}>;

export function tickApproach(
  from:PlayerPosition,to:PlayerPosition,deltaSeconds:number,
  speed=INCENSE_APPROACH_SPEED,
):ApproachTick {
  const dx=to.x-from.x,dz=to.z-from.z,distance=Math.hypot(dx,dz);
  if(distance<=INCENSE_APPROACH_TOLERANCE)return {position:to,reached:true,moving:false};
  const step=Math.min(distance,Math.max(0,deltaSeconds)*speed);
  const next=moveWithCollision(from,dx/distance*step,dz/distance*step);
  const remaining=Math.hypot(to.x-next.x,to.z-next.z);
  return {position:next,reached:remaining<=INCENSE_APPROACH_TOLERANCE,moving:Math.hypot(next.x-from.x,next.z-from.z)>0.00001};
}
