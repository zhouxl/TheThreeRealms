import {
  CHARACTER_CENTER_Y,CHARACTER_HEIGHT,CHARACTER_RADIUS,STATIC_COLLIDERS,
  type ColliderSpec,
} from './collisionGeometry.ts';
import {floorHeight,type PlayerPosition} from './rules.ts';

export type PhysicsPosition=Readonly<{x:number;y:number;z:number}>;
export type MovementResult=PhysicsPosition & Readonly<{grounded:boolean}>;
export type PhysicsDriver=Readonly<{
  move:(dx:number,dz:number,dt:number)=>MovementResult;
  position:()=>MovementResult;
  dispose:()=>void;
}>;
async function initializeRapier(){
  const {default:lib}=await import('@dimforge/rapier3d-compat');
  await lib.init();
  return lib;
}
let rapierOnce:ReturnType<typeof initializeRapier>|null=null;

/** WASM initialization is async and happens once; errors propagate to caller. */
function loadRapier():ReturnType<typeof initializeRapier>{
  if(!rapierOnce)rapierOnce=initializeRapier().catch(error=>{
    rapierOnce=null;throw error;
  });
  return rapierOnce;
}

function colliderDesc(rapier:Awaited<ReturnType<typeof loadRapier>>,spec:ColliderSpec){
  const desc=spec.shape==='box'
    ?rapier.ColliderDesc.cuboid(...spec.half)
    :rapier.ColliderDesc.cylinder(spec.halfHeight,spec.radius);
  return desc.setTranslation(...spec.center);
}

/**
 * Kinematic capsule, Rapier KCC slide/autostep/snap and static colliders.
 * ONE PhysicsDriver owns all physics resources; never create one per frame.
 * Does not create or mutate React/Three objects.
 */
export async function createPhysicsDriver(
  start:PlayerPosition,
  shapes:readonly ColliderSpec[]=STATIC_COLLIDERS,
):Promise<PhysicsDriver>{
  const rapier=await loadRapier();
  const world=new rapier.World({x:0,y:-9.81,z:0});
  try{
    for(const shape of shapes)world.createCollider(colliderDesc(rapier,shape));
    const body=world.createRigidBody(
      rapier.RigidBodyDesc.kinematicPositionBased().setTranslation(
        start.x,floorHeight(start.z)+CHARACTER_CENTER_Y,start.z,
      ),
    );
    const capsuleHalfHeight=Math.max(.001,(CHARACTER_HEIGHT-2*CHARACTER_RADIUS)/2);
    const collider=world.createCollider(
      rapier.ColliderDesc.capsule(capsuleHalfHeight,CHARACTER_RADIUS),body,
    );
    // Populate the query pipeline after registering all static colliders.
    world.step();
    const controller=world.createCharacterController(0.015);
    controller.setUp({x:0,y:1,z:0});
    controller.enableAutostep(0.22,0.10,false);
    controller.enableSnapToGround(0.25);
    controller.setMaxSlopeClimbAngle(Math.PI/3);
    let disposed=false;
    function read():MovementResult{
      const point=body.translation();
      return {x:point.x,y:point.y-CHARACTER_CENTER_Y,z:point.z,
        grounded:controller.computedGrounded()};
    }
    return {
      move(dx,dz,dt){
        if(disposed)throw new Error('PhysicsDriver disposed');
        if(![dx,dz,dt].every(Number.isFinite))throw new Error('Invalid movement');
        const delta=Math.max(0,Math.min(dt,.05));
        const horizontal=Math.hypot(dx,dz);
        // Reject unreasonable movements, including accidental scene teleports.
        const limit=2.4*delta;
        const ratio=horizontal>limit&&horizontal>0?limit/horizontal:1;
        controller.computeColliderMovement(collider,{
          x:dx*ratio,y:-3.0*delta,z:dz*ratio,
        });
        const d=controller.computedMovement();
        const prev=body.translation();
        body.setNextKinematicTranslation({
          x:prev.x+d.x,y:prev.y+d.y,z:prev.z+d.z,
        });
        world.step();
        return read();
      },
      position(){
        if(disposed)throw new Error('PhysicsDriver disposed');
        return read();
      },
      dispose(){
        if(disposed)return;
        disposed=true;
        world.free();
      },
    };
  }catch(error){
    world.free();
    throw error;
  }
}
