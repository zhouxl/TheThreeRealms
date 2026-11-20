/** V1.6: single source of truth for static navigation and camera blockers.
 * Coordinates match the existing Hall / IncenseBurner / OfferingAltar meshes.
 * The ground and stair surfaces are distinct; the character capsule has radius 0.23m.
 */
export type BoxCollider = Readonly<{
  id: string;
  shape: 'box';
  center: readonly [number,number,number];
  half: readonly [number,number,number];
  camera: boolean;
}>;
export type CylinderCollider = Readonly<{
  id: string;
  shape: 'cylinder';
  center: readonly [number,number,number];
  radius: number;
  halfHeight: number;
  camera: boolean;
}>;
export type ColliderSpec=BoxCollider|CylinderCollider;
export const CHARACTER_RADIUS=0.23;
export const CHARACTER_HEIGHT=1.55;
export const CHARACTER_CENTER_Y=CHARACTER_HEIGHT/2;
export const CAMERA_SKIN=0.25;

function box(
  id:string,center:BoxCollider['center'],half:BoxCollider['half'],camera=false,
):BoxCollider {return {id,shape:'box',center,half,camera};}
function cylinder(
  id:string,center:CylinderCollider['center'],radius:number,halfHeight:number,camera=false,
):CylinderCollider {return {id,shape:'cylinder',center,radius,halfHeight,camera};}

/** Curated collision stand-ins for the render geometry, not automatic mesh colliders. */
export const STATIC_COLLIDERS:readonly ColliderSpec[]=[
  // Walkable ground and three 15-cm entrance stairs.
  box('courtyard-floor',[0,-.12,3.55],[6.30,.12,3.70]),
  box('hall-floor',[0,.20,-4.80],[6.30,.25,4.80]),
  box('step-1',[0,.0725,.78],[1.90,.0725,.29]),
  box('step-2',[0,.2225,.53],[1.95,.0725,.29]),
  box('step-3',[0,.3725,.28],[2.00,.0725,.29]),

  // The open hall has a center entrance: don't place a full-width front wall.
  box('hall-left-wall',[-6.25,2.60,-4.80],[.11,2.15,4.80],true),
  box('hall-right-wall',[6.25,2.60,-4.80],[.11,2.15,4.80],true),
  box('hall-back-wall',[0,2.60,-9.52],[6.30,2.15,.09],true),
  box('front-left-wall',[-4.40,2.40,0],[1.90,2.00,.09],true),
  box('front-right-wall',[4.40,2.40,0],[1.90,2.00,.09],true),
  ...([-5.65,-1.75,1.75,5.65] as const).flatMap(x=>
    ([0,-9.30] as const).map(z=>cylinder(`pillar-${x}-${z}`,[x,2.95,z],.29,2.50,true))
  ),
  // Static obstacles have slightly larger colliders than their visible geometry.
  cylinder('incense-burner',[0,.68,3.20],.64,.58),
  box('main-offering-altar',[0,1.15,-6.25],[1.39,.72,.55],true),
  box('deity-plinth',[0,1.13,-8.30],[1.18,1.10,.82],true),
  box('fortune-stand',[-4.25,.99,-4.00],[.76,.60,.47],true),
  box('blessing-stand',[4.25,1.43,-4.00],[1.38,1.10,.35],true),
  // Invisible world boundary: physical confinement, never a camera blocker.
  box('limit-left',[-6.40,1.50,-1.25],[.12,2.5,9.30]),
  box('limit-right',[6.40,1.50,-1.25],[.12,2.5,9.30]),
  box('limit-back',[0,1.50,-9.75],[6.40,2.5,.12]),
  box('limit-front',[0,1.50,7.10],[6.40,2.5,.12]),
];

/** Exact center-of-hall gap remains open, even though the side sections collide. */
export function isInsideStaticBox(
  point:Readonly<{x:number;y:number;z:number}>,box:BoxCollider,
):boolean {
  return Math.abs(point.x-box.center[0])<box.half[0]
    &&Math.abs(point.y-box.center[1])<box.half[1]
    &&Math.abs(point.z-box.center[2])<box.half[2];
}
