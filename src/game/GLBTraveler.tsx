import {useEffect, useMemo, useRef, type MutableRefObject} from 'react';
import {useGLTF} from '@react-three/drei';
import {createPortal, useFrame} from '@react-three/fiber';
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  TRAVELER_EXPECTED_HEIGHT, evaluateModelHeight, selectTravelerClip, validateTravelerContract,
} from './assets.ts';
import {clamp01, getIncenseReachWeight, sampleIncenseClipProgress} from './incenseMotion.ts';
import {aimWristUpright,positionIncenseHand} from './incenseTransforms.ts';
import {getIncenseInsertionTarget} from './incensePlacement.ts';
import {isHandheldIncenseLit, type Ritual} from './rules.ts';

type Props = {
  url: string;
  ritual: Ritual;
  walkingRef: MutableRefObject<boolean>;
  actionProgress: MutableRefObject<number>;
  incenseReleased: boolean;
  incenseCount: number;
};

type ActionState = {name: string | null};

/**
 * GLB performer with a stable named-clip contract.
 * Ritual timing remains owned by GameWorld; this component only samples
 * a GLB animation at that timeline's normalized position.
 */
export default function GLBTraveler({
  url,ritual,walkingRef,actionProgress,incenseReleased,incenseCount,
}:Props) {
  const gltf=useGLTF(url);
  const model=useMemo(()=>cloneSkeleton(gltf.scene),[gltf.scene]);
  const validation=useMemo(()=>{
    const nodeNames:string[]=[];
    model.traverse(node=>nodeNames.push(node.name));
    return validateTravelerContract(nodeNames,gltf.animations.map(clip=>clip.name));
  },[model,gltf.animations]);
  const grip=useMemo(()=>model.getObjectByName('IncenseGrip'),[model]);
  const wrist=useMemo(()=>model.getObjectByName('Wrist_R'),[model]);
  const elbow=useMemo(()=>model.getObjectByName('Elbow_R'),[model]);
  const shoulder=useMemo(()=>model.getObjectByName('Shoulder_R'),[model]);
  const shoulderRestY=useMemo(()=>shoulder?.position.y??0,[shoulder]);
  const incenseTarget=useMemo(()=>getIncenseInsertionTarget(incenseCount),[incenseCount]);
  const mixer=useMemo(()=>new THREE.AnimationMixer(model),[model]);
  const actions=useMemo(()=>{
    const result=new Map<string,THREE.AnimationAction>();
    gltf.animations.forEach(clip=>result.set(clip.name,mixer.clipAction(clip)));
    return result;
  },[gltf.animations,mixer]);
  const active=useRef<ActionState>({name:null});
  const insertionStart=useRef<THREE.Vector3|null>(null);

  useEffect(()=>{
    model.traverse(node=>{
      if(node instanceof THREE.Mesh){
        node.castShadow=true;
        node.receiveShadow=true;
      }
    });
    const bbox=new THREE.Box3().setFromObject(model);
    const height=bbox.getSize(new THREE.Vector3()).y;
    if(!evaluateModelHeight(height,TRAVELER_EXPECTED_HEIGHT)){
      console.warn(`[TheThreeRealms] Traveler GLB height is ${height.toFixed(2)}m; expected around ${TRAVELER_EXPECTED_HEIGHT}m. Correct model scale at source.`);
    }
    return ()=>{
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
    };
  },[model,mixer]);

  const incenseStep=ritual.kind==='incense'?ritual.step:null;
  const equipped=incenseStep!==null && incenseStep!=='done' && incenseStep!=='approach' && !incenseReleased;
  const lit=isHandheldIncenseLit(ritual) && !incenseReleased;
  useFrame((_,delta)=>{
    let name=selectTravelerClip(ritual.kind,incenseStep,walkingRef.current);
    if(!actions.has(name))name='Idle'; // Optional take/light clips.
    if(active.current.name!==name){
      if(active.current.name)actions.get(active.current.name)?.fadeOut(0.15);
      const next=actions.get(name);
      if(next){
        next.reset();
        const oneShot=name==='Bow' || name==='PlaceIncense';
        next.setLoop(oneShot?THREE.LoopOnce:THREE.LoopRepeat,oneShot?1:Infinity);
        next.clampWhenFinished=oneShot;
        next.fadeIn(0.15).play();
      }
      active.current.name=name;
    }
    const action=actions.get(name);
    // Advance fade weights even for timeline-sampled one-shot clips.
    // If this stays at mixer.update(0), the new clip can remain weight=0.
    mixer.update(Math.min(delta,0.05));
    if(action && (name==='Bow' || name==='PlaceIncense')){
      // Clip duration can differ from procedural prototype duration.
      // Re-evaluate at the same normalized timestamp as the game event marker.
      const duration=action.getClip().duration;
      action.time=Math.min(
        Math.max(0,duration-0.00001),
        sampleIncenseClipProgress(name==='Bow'?'bowing':'placing',clamp01(actionProgress.current))*duration,
      );
      mixer.update(0);
    }

    // The body takes one short physical step in before the hand descends from
    // above; the feet remain in front of the censer's collision boundary.
    const placing=incenseStep==='placing';
    if(placing && !insertionStart.current && grip){
      model.position.z=0;
      model.updateWorldMatrix(true,true);
      insertionStart.current=grip.getWorldPosition(new THREE.Vector3()).clone();
    }
    if(!placing)insertionStart.current=null;
    const footstep=placing?getIncenseReachWeight(actionProgress.current):0;
    // Raise the shoulder along with the elbow rather than asking a low sleeve
    // to pass straight through the censer's metal rim.
    if(shoulder)shoulder.position.y=shoulderRestY+0.34*footstep;
    model.position.z=-0.62*footstep;
    // Tiny lateral adjustment for the second/third slot: the shoulder stays
    // aligned with the slot instead of the hand reaching across the entire urn.
    model.position.x=(incenseTarget.x-0.28)*footstep;

    if(grip && wrist && equipped){
      if(placing && shoulder && elbow && insertionStart.current){
        positionIncenseHand(
          shoulder,elbow,wrist,grip,'placing',actionProgress.current,
          insertionStart.current,incenseTarget,
        );
      }else{
        aimWristUpright(wrist,grip);
      }
    }else if(wrist){
      wrist.quaternion.identity();
    }
  });

  if(!validation.valid || !grip || !wrist || !elbow || !shoulder){
    throw new Error(
      `Traveler GLB contract invalid; missing clips: ${validation.missingClips.join(', ')||'none'}; missing nodes: ${validation.missingNodes.join(', ')||'none'}.`,
    );
  }

  return <>
    <primitive object={model}/>
    {equipped && createPortal(
      <group>
        {/* Base of the stick is exactly IncenseGrip, beneath the visible fingers.
            The attached prop is not independently moved or counter-rotated. */}
        <mesh position={[0,0.24,0]} castShadow>
          <cylinderGeometry args={[0.012,0.012,0.48,6]}/>
          <meshStandardMaterial color="#ad8d54"/>
        </mesh>
        {lit && <>
          <mesh position={[0,0.48,0]}>
            <sphereGeometry args={[0.027,8,8]}/>
            <meshStandardMaterial color="#d87549" emissive="#fa6e38" emissiveIntensity={1.25}/>
          </mesh>
          <group position={[0,0.49,0]}>
            <TravelerSmoke/>
          </group>
        </>}
      </group>,
      grip,
    )}
  </>;
}

/** Four very light smoke wisps for the GLB hand attachment. */
function TravelerSmoke() {
  const group=useRef<THREE.Group>(null);
  useFrame(({clock})=>{
    if(!group.current)return;
    group.current.children.forEach((part,index)=>{
      const phase=(clock.elapsedTime*0.24+index/4)%1;
      part.position.set(Math.sin(phase*5+index)*0.04,phase*0.55,0);
      part.scale.setScalar(0.65+phase*0.85);
      const material=(part as THREE.Mesh).material as THREE.MeshBasicMaterial;
      material.opacity=0.22*(1-phase);
    });
  });
  return <group ref={group}>
    {[0,1,2,3].map(i=><mesh key={i}>
      <sphereGeometry args={[0.055,8,6]}/>
      <meshBasicMaterial color="#b5b2aa" transparent depthWrite={false} opacity={0.1}/>
    </mesh>)}
  </group>;
}
