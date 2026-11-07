import * as THREE from 'three';
import {CENSER_POSITION} from './incensePlacement.ts';

/** Matches the THREE TorusGeometry and tapered cylinder in IncenseBurner. */
export const CENSER_GEOMETRY={
  centerX:CENSER_POSITION.x,
  centerZ:CENSER_POSITION.z,
  rimCenterY:1.08,
  rimMajorRadius:0.57,
  rimTubeRadius:0.065,
  bodyTopY:1.035,
  bodyBottomY:0.185,
  bodyTopRadius:0.57,
  bodyBottomRadius:0.39,
} as const;

export type WorldPoint=Readonly<{x:number;y:number;z:number}>;
export type ArmSkeleton=Readonly<{
  shoulder:WorldPoint;
  elbow:WorldPoint;
  wrist:WorldPoint;
}>;

/** Signed clearance from a sphere at p to the visible copper solid, meters. */
export function distanceToCenserSurface(p:WorldPoint):number {
  const g=CENSER_GEOMETRY;
  const radial=Math.hypot(p.x-g.centerX,p.z-g.centerZ);
  const torus=Math.hypot(radial-g.rimMajorRadius,p.y-g.rimCenterY)-g.rimTubeRadius;
  // A conservative signed distance to the copper body. Above its top, only
  // the torus and its thin upper border should be treated as solid.
  let body=Infinity;
  if(p.y>=g.bodyBottomY && p.y<=g.bodyTopY){
    const t=(p.y-g.bodyBottomY)/(g.bodyTopY-g.bodyBottomY);
    const r=g.bodyBottomRadius+(g.bodyTopRadius-g.bodyBottomRadius)*t;
    body=radial-r;
  }
  return Math.min(torus,body);
}

/**
 * Treat the two skinned sleeve segments as capsules, not infinitesimal lines.
 * Clearance < 0 means fabric/arm collides with the censer's rim or metal body.
 */
export function armCenserClearance(arm:ArmSkeleton):number {
  const segments=[
    {a:arm.shoulder,b:arm.elbow,radius:0.105},
    {a:arm.elbow,b:arm.wrist,radius:0.082},
  ];
  let smallest=Infinity;
  for(const {a,b,radius} of segments){
    for(let i=0;i<=20;i++){
      const t=i/20;
      const point={
        x:a.x+(b.x-a.x)*t,
        y:a.y+(b.y-a.y)*t,
        z:a.z+(b.z-a.z)*t,
      };
      smallest=Math.min(smallest,distanceToCenserSurface(point)-radius);
    }
  }
  return smallest;
}

export function getArmSkeletonPoints(
  shoulder:THREE.Object3D,elbow:THREE.Object3D,wrist:THREE.Object3D
):ArmSkeleton {
  const point=(node:THREE.Object3D)=>{
    const p=node.getWorldPosition(new THREE.Vector3());
    return {x:p.x,y:p.y,z:p.z};
  };
  shoulder.updateWorldMatrix(true,true);
  return {shoulder:point(shoulder),elbow:point(elbow),wrist:point(wrist)};
}
