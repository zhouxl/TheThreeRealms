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
  // Try either side of the censer and only return a path when every segment
  // is actually unobstructed (including the entrance and main hall).
  const sides=start.x<0?[-1.18,1.18]:[1.18,-1.18];
  for(const side of sides){
    const simple=[
      {x:side,z:Math.min(start.z,2.25)},
      {x:side,z:4.5},
      destination,
    ];
    // An actor approaching from a far rear corner must first step out from
    // behind the shrine/altar before turning into the center aisle.
    const hallExitZ=Math.max(start.z,-5.35);
    const viaHall=[
      {x:start.x,z:hallExitZ},
      {x:side,z:hallExitZ},
      {x:side,z:4.5},
      destination,
    ];
    for(const candidate of [simple,viaHall]){
      const route=candidate.filter((point,i)=>i===0 ||
        Math.hypot(point.x-candidate[i-1].x,point.z-candidate[i-1].z)>0.001);
      let prev=start;
      let reachable=true;
      for(const point of route){
        if(!isWalkableSegment(prev,point)){reachable=false;break;}
        prev=point;
      }
      if(reachable)return route;
    }
  }
  return []; // Refuse to teleport when no collision-safe route exists.
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
