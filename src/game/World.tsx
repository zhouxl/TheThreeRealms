import { Suspense, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import {
  floorHeight, getNearestStation, isHandheldIncenseLit, moveWithCollision, STATIONS, WORLD,
  type PlayerPosition, type Ritual, type Station,
} from './rules.ts';
import type { BlessingMemory } from './db.ts';
import {
  getTravelerPose, hasReleasedIncense, incenseActionProgress, isIncenseActionStep,
  type IncenseAction,
} from './incenseMotion.ts';
import {CENSER_POSITION, INCENSE_STAND, getVisibleIncenseSlots} from './incensePlacement.ts';
import {
  DEFAULT_RITUAL_ORBIT, dragRitualOrbit, getRitualCameraPosition, zoomRitualOrbit,
} from './ritualCamera.ts';
import {normalizePublicGlbPath, resolveTravelerAssetUrl} from './assets.ts';
import AssetBoundary from './AssetBoundary.tsx';
import GLBDeity from './GLBDeity.tsx';
import GLBTraveler from './GLBTraveler.tsx';

const travelerGlbPath=resolveTravelerAssetUrl(import.meta.env.VITE_TRAVELER_GLB_URL);
const deityGlbPath=normalizePublicGlbPath(import.meta.env.VITE_DEITY_GLB_URL);
if(import.meta.env.VITE_TRAVELER_GLB_URL && !travelerGlbPath) {
  console.warn('[TheThreeRealms] Ignoring invalid VITE_TRAVELER_GLB_URL; expected /models/name.glb.');
}
if(import.meta.env.VITE_DEITY_GLB_URL && !deityGlbPath) {
  console.warn('[TheThreeRealms] Ignoring invalid VITE_DEITY_GLB_URL; expected /models/name.glb.');
}

const C = {
  timber: '#76513d', darkTimber: '#49382d', red: '#975346',
  stone: '#858d83', tile: '#54605d', roof: '#464f50',
  linen: '#e6dac2', gold: '#bf9d64', bamboo: '#c6a575',
  bronze: '#80684b', green: '#617b60',
};

type BoxProps = { position: [number, number, number]; size: [number, number, number]; color: string; roughness?: number; rotation?: [number, number, number] };
function Block({ position, size, color, roughness = 0.84, rotation }: BoxProps) {
  return <mesh position={position} rotation={rotation} receiveShadow castShadow>
    <boxGeometry args={size} />
    <meshStandardMaterial color={color} roughness={roughness} />
  </mesh>;
}
function Pillar({ x, z, height = 4.6 }: { x: number; z: number; height?: number }) {
  return <group position={[x, 0.45, z]}>
    <mesh position={[0, 0.2, 0]} receiveShadow><cylinderGeometry args={[0.39, 0.46, 0.38, 8]}/><meshStandardMaterial color="#918979" roughness={0.92}/></mesh>
    <mesh position={[0, height/2 + 0.2, 0]} castShadow><cylinderGeometry args={[0.23,0.25,height,12]}/><meshStandardMaterial color={C.red} roughness={0.84}/></mesh>
    <Block position={[0,height + 0.28,0]} size={[0.85,0.28,0.84]} color={C.darkTimber}/>
  </group>;
}
function Hall() {
  return <group>
    <Block position={[0,0.2,-4.8]} size={[12.6,0.5,9.6]} color="#96948a" />
    {Array.from({length:12},(_,i)=>{
      const x=-5.5+(i%6)*2.2; const z= -1.05 - Math.floor(i/6)*3.7;
      return <Block key={`floor-${i}`} position={[x,0.454,z]} size={[2.13,0.012,3.56]} color={i%2===0?'#a7a398':'#99988f'} />;
    })}
    <Block position={[-6.25,2.6,-4.8]} size={[0.22,4.3,9.6]} color={C.timber}/>
    <Block position={[6.25,2.6,-4.8]} size={[0.22,4.3,9.6]} color={C.timber}/>
    <Block position={[0,2.65,-9.52]} size={[12.6,4.3,0.18]} color={C.timber}/>
    <Block position={[-4.4,2.4,0]} size={[3.8,4.0,0.18]} color={C.timber}/>
    <Block position={[4.4,2.4,0]} size={[3.8,4.0,0.18]} color={C.timber}/>
    <Block position={[0,4.37,0]} size={[12.6,0.36,0.35]} color={C.darkTimber}/>
    <Block position={[0,4.5,-9.5]} size={[12.6,0.36,0.35]} color={C.darkTimber}/>
    {([-5.65, -1.75, 1.75, 5.65] as const).flatMap(x => [0, -9.3].map(z=><Pillar key={`${x}-${z}`} x={x} z={z}/>))}
    {[-3.2,0,3.2].map(zShift => <Block key={`beam-${zShift}`} position={[0,5.0,-4.8+zShift]} size={[12.7,0.3,0.4]} color={C.darkTimber}/>)}
    {/* Simple double-pitched roof; replaceable with authored GLB. */}
    <Block position={[-3.05,6.08,-4.8]} size={[7.0,0.22,10.8]} color={C.roof} rotation={[0,0,0.25]}/>
    <Block position={[3.05,6.08,-4.8]} size={[7.0,0.22,10.8]} color={C.roof} rotation={[0,0,-0.25]}/>
    <Block position={[0,6.86,-4.8]} size={[0.36,0.3,11]} color={C.gold}/>
    <Block position={[0,4.1,-0.05]} size={[2.8,0.56,0.15]} color={C.darkTimber}/>
    <Html center position={[0,4.12,0.1]} distanceFactor={12}>
      <div className="world-sign">文昌殿</div>
    </Html>
    {/* Windows to filter morning light. */}
    {[-7.9,-4.8,-1.7].map(z => <group key={`window-${z}`}>
      {[-6.12,6.12].map(x => <group key={`${x}-${z}`}>
        <Block position={[x,2.95,z]} size={[0.04,1.85,1.65]} color="#c0a982"/>
        {[-0.45,0.05,0.55].map(v => <Block key={v} position={[x+Math.sign(x)*0.04,2.95+v,z]} size={[0.05,0.055,1.65]} color={C.darkTimber}/>)}
      </group>)}
    </group>)}
    {/* Steps */}
    {[0,1,2].map(i => <Block key={i} position={[0,0.07+i*0.15,0.78-i*0.25]} size={[3.8+i*0.1,0.15,0.58]} color={C.stone}/>)}
    {/* Courtyard slabs */}
    <Block position={[0,-0.12,3.6]} size={[12.6,0.24,7.2]} color="#8d9487"/>
    {Array.from({length:18},(_,i)=>{
      const x=-4.95+(i%6)*1.98; const z=1.0+Math.floor(i/6)*2.05;
      return <Block key={`stone-${i}`} position={[x,0.011,z]} size={[1.91,0.016,1.95]} color={i%3===0?'#9fa397':'#969b90'}/>;
    })}
    <Block position={[0,0.12,6.95]} size={[2.8,0.12,1.2]} color="#a29a83"/>
  </group>;
}

function Tree({x,z,scale=1}: {x:number;z:number;scale?:number}) {
  return <group position={[x,0,z]} scale={scale}>
    <mesh position={[0,1.8,0]} castShadow><cylinderGeometry args={[0.17,0.3,3.6,7]}/><meshStandardMaterial color="#62503d"/></mesh>
    {([[-0.5,3.5,0],[0.6,3.9,0.2], [0,4.5,0], [-0.1,3.5,0.8]] as const).map((p,i)=><mesh key={i} position={[...p] as [number,number,number]} castShadow>
      <icosahedronGeometry args={[1.1,1]}/><meshStandardMaterial color={i%2?'#9a9155':'#7c8756'} roughness={1}/>
    </mesh>)}
  </group>;
}
function Surroundings() {
  return <group>
    <Block position={[0,-0.5,0]} size={[120,0.6,120]} color="#687864" />
    <Tree x={-8.6} z={1.6} scale={1.45}/>
    <Tree x={8.2} z={5.1} scale={1.7}/>
    <Tree x={-9.2} z={-7.5} scale={1.25}/>
    <Tree x={8.8} z={-7.5} scale={1.3}/>
    {([-8,-7.4,7.7,8.8] as const).map((x,i)=><mesh key={i} position={[x,0.16,5-(i%2)*2]} castShadow>
      <dodecahedronGeometry args={[0.65,0]}/><meshStandardMaterial color="#7c8477" roughness={0.98}/>
    </mesh>)}
  </group>;
}
function Deity() {
  return <group position={[0,0.45,-8.3]}>
    <Block position={[0,0.2,0]} size={[2.25,0.4,1.6]} color={C.darkTimber}/>
    <Block position={[0,1.15,-0.18]} size={[1.45,1.45,0.7]} color="#39565a"/>
    <mesh position={[0,1.72,0.25]} castShadow><sphereGeometry args={[0.36,16,12]}/><meshStandardMaterial color="#c49f7c" roughness={0.96}/></mesh>
    <Block position={[0,2.25,0.18]} size={[0.82,0.37,0.65]} color="#2f4447"/>
    <Block position={[0,2.18,0.16]} size={[1.2,0.1,0.32]} color="#2f4447"/>
    <mesh position={[0,1.38,0.54]} rotation={[0,0,Math.PI]}><coneGeometry args={[0.18,0.63,8]}/><meshStandardMaterial color="#37302c"/></mesh>
    <Block position={[0,0.7,0.27]} size={[1.35,0.3,1.04]} color="#3f595c"/>
    <Block position={[-0.6,1.24,0.51]} size={[0.23,0.72,0.28]} rotation={[0,0,-0.35]} color="#405c61"/>
    <Block position={[0.6,1.25,0.48]} size={[0.23,0.72,0.28]} rotation={[0,0,0.35]} color="#405c61"/>
    <Block position={[-0.4,1.23,0.78]} size={[0.55,0.07,0.45]} color="#d0b88e"/>
    <mesh position={[0.51,1.3,0.73]} rotation={[0,0,0.2]}><cylinderGeometry args={[0.025,0.025,0.8,8]}/><meshStandardMaterial color={C.gold}/></mesh>
    <Html center position={[0,2.8,0]} distanceFactor={9}><span className="statue-label">文昌帝君</span></Html>
  </group>;
}
function OfferingAltar() {
  return <group position={[0,0.45,-6.25]}>
    <Block position={[0,0.82,0]} size={[2.6,0.16,0.95]} color={C.timber}/>
    {[-1.05,1.05].map(x=><Block key={x} position={[x,0.42,0]} size={[0.16,0.75,0.7]} color={C.darkTimber}/>)}
    {[-0.65,0,0.65].map((x,i)=><mesh key={i} position={[x,1.0,0]} castShadow>
      <sphereGeometry args={[0.15,10,10]}/><meshStandardMaterial color={i===1?'#c58a52':'#b0a05a'}/>
    </mesh>)}
    {[-1.2,1.2].map(x=><mesh key={x} position={[x,1.16,0]}>
      <cylinderGeometry args={[0.055,0.07,0.48,8]}/><meshStandardMaterial emissive="#ffd398" emissiveIntensity={0.48} color="#f5cd8a"/>
    </mesh>)}
  </group>;
}
type SmokeProps = {
  position: [number, number, number];
  particleRadius?: number;
  riseHeight?: number;
  drift?: number;
  color?: string;
};

function Smoke({position, particleRadius = 0.17, riseHeight = 1.65, drift = 0.12, color = '#e8e3d9'}: SmokeProps) {
  const blobs = useRef<THREE.Group>(null);
  useFrame(({clock})=>{
    if (!blobs.current) return;
    blobs.current.children.forEach((item,i)=>{
      const phase = (clock.elapsedTime * 0.24 + i / 4) % 1;
      item.position.set(Math.sin(phase * 5 + i) * drift, phase * riseHeight, 0);
      item.scale.setScalar(0.65 + phase * 0.85);
      const mat = (item as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = 0.22 * (1 - phase);
    });
  });
  return <group position={position} ref={blobs}>
    {[0,1,2,3].map(i=><mesh key={i}>
      <sphereGeometry args={[particleRadius,8,6]}/>
      <meshBasicMaterial color={color} transparent depthWrite={false} opacity={0.1}/>
    </mesh>)}
  </group>;
}
function IncenseBurner({incenseCount,previewPlaced}:{incenseCount:number;previewPlaced:boolean}) {
  const visibleSticks=getVisibleIncenseSlots(incenseCount,previewPlaced);
  const smokeStick=visibleSticks[visibleSticks.length-1];
  return <group position={[CENSER_POSITION.x,0,CENSER_POSITION.z]}>
    <mesh position={[0,0.61,0]} castShadow>
      <cylinderGeometry args={[0.57,0.39,0.85,16]}/>
      <meshStandardMaterial color={C.bronze} metalness={0.46} roughness={0.55}/>
    </mesh>
    <mesh position={[0,1.08,0]} rotation={[Math.PI/2,0,0]}>
      <torusGeometry args={[0.57,0.065,8,20]}/>
      <meshStandardMaterial color={C.gold} metalness={0.5} roughness={0.45}/>
    </mesh>
    {[-0.3,0.3].map(x=><mesh key={x} position={[x,0.21,0]}>
      <cylinderGeometry args={[0.14,0.18,0.4,8]}/>
      <meshStandardMaterial color={C.bronze} metalness={0.4}/>
    </mesh>)}
    {[-0.38,0.38].map(x=><mesh key={x} position={[x,0.9,0]} rotation={[0,0,x<0?-0.45:0.45]}>
      <torusGeometry args={[0.2,0.047,8,12]}/>
      <meshStandardMaterial color={C.gold} metalness={0.6}/>
    </mesh>)}
    {/* Only committed sticks, plus a released-but-not-yet-committed preview,
        occupy slots. Do not permanently render fake sticks in an empty censer. */}
    {visibleSticks.map(([x,z],i)=><group key={i} position={[x,0,z]}>
      <mesh position={[0,1.20,0]} castShadow>
        <cylinderGeometry args={[0.014,0.014,0.40,6]}/>
        <meshStandardMaterial color="#af8457" roughness={0.95}/>
      </mesh>
      <mesh position={[0,1.405,0]}>
        <sphereGeometry args={[0.022,8,8]}/>
        <meshStandardMaterial color="#da6948" emissive="#ef5a32" emissiveIntensity={0.88}/>
      </mesh>
    </group>)}
    {smokeStick && <Smoke position={[smokeStick[0],1.43,smokeStick[1]]}
      particleRadius={0.07} riseHeight={0.80} drift={0.08} color="#c8c4b9"/>}
  </group>;
}
function FortuneTable() {
  return <group position={[-4.25,0.45,-4]}>
    <Block position={[0,0.62,0]} size={[1.35,0.12,0.78]} color={C.timber}/>
    {[-0.51,0.51].map(x=><Block key={x} position={[x,0.28,0]} size={[0.15,0.55,0.6]} color={C.timber}/>)}
    <mesh position={[0,0.92,0]} castShadow><cylinderGeometry args={[0.16,0.15,0.53,14]}/><meshStandardMaterial color={C.bamboo} roughness={0.82}/></mesh>
    {Array.from({length:9},(_,i)=>{
      const a=i*2.399; return <mesh key={i} position={[Math.cos(a)*0.093,1.25+(i%3)*0.025,Math.sin(a)*0.093]}><cylinderGeometry args={[0.012,0.012,0.42,6]}/><meshStandardMaterial color="#d6b884"/></mesh>;
    })}
    <Html position={[0,1.45,0]} center distanceFactor={11}><div className="world-object-label">签筒</div></Html>
  </group>;
}
function BlessingRack({blessings}: {blessings: BlessingMemory[]}) {
  const occupied = new Map(blessings.map(b=>[b.slot,b]));
  return <group position={[4.25,0.45,-4]}>
    <Block position={[-1.18,0.98,0]} size={[0.13,1.96,0.18]} color={C.darkTimber}/>
    <Block position={[1.18,0.98,0]} size={[0.13,1.96,0.18]} color={C.darkTimber}/>
    <Block position={[0,1.91,0]} size={[2.56,0.15,0.18]} color={C.darkTimber}/>
    <Block position={[0,0.23,0]} size={[2.52,0.16,0.48]} color={C.timber}/>
    {Array.from({length:30},(_,i)=>{
      const slot=i+1;
      const local=occupied.get(slot);
      const x=-0.97+(i%6)*0.385;
      const y=1.55-Math.floor(i/6)*0.28;
      return <group key={i} position={[x,y,0.16]}>
        <mesh position={[0,0.13,0]}><cylinderGeometry args={[0.009,0.009,0.26,5]}/><meshStandardMaterial color="#a34338"/></mesh>
        <Block position={[0,0,0]} size={[0.24,0.27,0.035]} color={local?['#e3cda8','#a75e53','#56697b','#d9b176','#95a58e','#84758a'][local.template]:'#c9ab80'}/>
      </group>;
    })}
    <Html position={[0,2.13,0]} center distanceFactor={11}><div className="world-object-label">留福</div></Html>
  </group>;
}
/**
 * Procedural articulated fallback rig for V1.2.
 * Real skeletal GLB clips will reuse this animation timing and release contract.
 */
function Traveler({
  ritual, walkingRef, actionProgress, incenseReleased,
}: {
  ritual: Ritual;
  walkingRef: MutableRefObject<boolean>;
  actionProgress: MutableRefObject<number>;
  incenseReleased: boolean;
}) {
  const upper = useRef<THREE.Group>(null);
  const leftArm = useRef<THREE.Group>(null);
  const rightArm = useRef<THREE.Group>(null);
  const incenseGrip = useRef<THREE.Group>(null);
  const smokeUpright = useRef<THREE.Group>(null);
  const walkRing = useRef<THREE.Mesh>(null);
  const step = ritual.kind === 'incense' ? ritual.step : null;
  const equipped = step !== null && step !== 'done' && !incenseReleased;
  const lit = isHandheldIncenseLit(ritual) && !incenseReleased;

  useFrame((_, dt) => {
    const pose = getTravelerPose(step, actionProgress.current);
    const alpha = 1 - Math.exp(-12 * Math.min(dt, 0.05));
    if (upper.current) upper.current.rotation.x = THREE.MathUtils.lerp(upper.current.rotation.x, pose.torsoPitch, alpha);
    const armsTarget = ritual.kind === 'fortune' ? 0.38 : pose.armsForward;
    for (const arm of [leftArm.current, rightArm.current]) {
      if (arm) arm.rotation.x = THREE.MathUtils.lerp(arm.rotation.x, armsTarget, alpha);
    }
    if (incenseGrip.current) {
      incenseGrip.current.position.y = THREE.MathUtils.lerp(incenseGrip.current.position.y, pose.handY, alpha);
      incenseGrip.current.position.z = THREE.MathUtils.lerp(incenseGrip.current.position.z, pose.handZ, alpha);
      incenseGrip.current.rotation.x = THREE.MathUtils.lerp(incenseGrip.current.rotation.x, pose.incenseTilt, alpha);
    }
    if (smokeUpright.current && upper.current && incenseGrip.current) {
      // Cancel parent tilt so smoke still rises upward during the bow.
      smokeUpright.current.rotation.x = -(upper.current.rotation.x + incenseGrip.current.rotation.x);
    }
    if (walkRing.current) walkRing.current.visible = walkingRef.current;
  });

  return <group>
    {[-0.14,0.14].map(x=><mesh key={`leg-${x}`} position={[x,0.27,0.01]} castShadow>
      <cylinderGeometry args={[0.11,0.12,0.55,8]}/><meshStandardMaterial color="#7b8478"/>
    </mesh>)}
    {[-0.14,0.14].map(x=><mesh key={`shoe-${x}`} position={[x,0.08,-0.1]} castShadow>
      <boxGeometry args={[0.22,0.15,0.34]}/><meshStandardMaterial color="#7c6756"/>
    </mesh>)}
    {/* The torso pivots around the waist: bend and reach remain independent of the legs. */}
    <group ref={upper} position={[0,0.7,0]}>
      <mesh position={[0,0.07,0]} castShadow>
        <cylinderGeometry args={[0.23,0.29,0.65,10]}/><meshStandardMaterial color="#e8d8bc" roughness={0.95}/>
      </mesh>
      <mesh position={[0,0.52,0]} castShadow>
        <sphereGeometry args={[0.28,16,14]}/><meshStandardMaterial color="#e9bf9c" roughness={0.96}/>
      </mesh>
      <mesh position={[0,0.69,0.02]} castShadow>
        <sphereGeometry args={[0.285,12,10,0,Math.PI*2,0,1.35]}/><meshStandardMaterial color="#41302a"/>
      </mesh>
      <mesh position={[0,0.87,0.12]} castShadow>
        <sphereGeometry args={[0.115,8,8]}/><meshStandardMaterial color="#45332b"/>
      </mesh>
      {[-0.1,0.1].map(x=><mesh key={`eye-${x}`} position={[x,0.55,-0.248]}>
        <sphereGeometry args={[0.02,6,6]}/><meshBasicMaterial color="#342c26"/>
      </mesh>)}
      <group ref={leftArm} position={[-0.34,0.29,-0.08]}>
        <mesh position={[0,-0.25,0]} castShadow><cylinderGeometry args={[0.09,0.11,0.5,8]}/><meshStandardMaterial color="#e3d1b4"/></mesh>
        <mesh position={[0,-0.50,0]}><sphereGeometry args={[0.10,8,8]}/><meshStandardMaterial color="#e9bf9c"/></mesh>
      </group>
      <group ref={rightArm} position={[0.34,0.29,-0.08]}>
        <mesh position={[0,-0.25,0]} castShadow><cylinderGeometry args={[0.09,0.11,0.5,8]}/><meshStandardMaterial color="#e3d1b4"/></mesh>
        <mesh position={[0,-0.50,0]}><sphereGeometry args={[0.10,8,8]}/><meshStandardMaterial color="#e9bf9c"/></mesh>
      </group>
      <Block position={[0,-0.11,-0.015]} size={[0.56,0.07,0.37]} color="#936d52"/>
      <Block position={[0.28,-0.1,0.19]} size={[0.29,0.34,0.18]} color="#a7825f"/>
      <group ref={incenseGrip} position={[0,0.28,-0.43]}>
        {equipped && <mesh position={[0,0.24,0]}>
          <cylinderGeometry args={[0.012,0.012,0.48,6]}/><meshStandardMaterial color="#ad8d54"/>
        </mesh>}
        {lit && <>
          <mesh position={[0,0.48,0]}>
            <sphereGeometry args={[0.027,8,8]}/>
            <meshStandardMaterial color="#d87549" emissive="#fa6e38" emissiveIntensity={1.25}/>
          </mesh>
          <group ref={smokeUpright} position={[0,0.49,0]}>
            <Smoke position={[0,0,0]} particleRadius={0.055} riseHeight={0.55} drift={0.042} color="#b5b2aa"/>
          </group>
        </>}
      </group>
    </group>
    <mesh ref={walkRing} position={[0,0.04,0]} rotation={[-Math.PI/2,0,0]}>
      <ringGeometry args={[0.35,0.41,24]}/>
      <meshBasicMaterial color="#d8b475" transparent opacity={0.27} side={THREE.DoubleSide}/>
    </mesh>
  </group>;
}

export type Direction = 'up'|'down'|'left'|'right';
export type InputRef = MutableRefObject<Record<Direction, boolean>>;
export type WorldProps = {
  input: InputRef;
  ritual: Ritual;
  blessings: BlessingMemory[];
  incenseCount: number;
  onIncenseActionComplete: (action:IncenseAction)=>void;
  onNearby: (station:Station|null)=>void;
  onInteract: (station:Station)=>void;
  ready: boolean;
};

function GameWorld({input,ritual,blessings,incenseCount,onIncenseActionComplete,onNearby,onInteract,ready}:WorldProps){
  const player=useRef<THREE.Group>(null);
  const position=useRef<PlayerPosition>({x:0,z:6.1});
  const yaw=useRef(0);
  const ritualOrbit=useRef(DEFAULT_RITUAL_ORBIT);
  const lastNearby=useRef<Station|null>(null);
  const isWalking=useRef(false);
  const actionProgress=useRef(0);
  const actionElapsed=useRef(0);
  const actionStep=useRef<IncenseAction|null>(null);
  const actionFinished=useRef(false);
  const incenseReleaseRef=useRef(false);
  const [incenseReleased,setIncenseReleased]=useState(false);
  const actionCallbackRef=useRef(onIncenseActionComplete);
  actionCallbackRef.current=onIncenseActionComplete;
  const {camera,gl}=useThree();
  const onNearbyRef=useRef(onNearby);
  onNearbyRef.current=onNearby;

  useEffect(()=>{
    if(ritual.kind==='incense') {
      // Temporary cinematically aligned position close enough for the hand to reach the censer.
      // Replace the short snap with a walk-up clip once authored assets are available.
      position.current={x:INCENSE_STAND.x,z:INCENSE_STAND.z};
      if(player.current) player.current.rotation.y=0;
    }
  },[ritual.kind]);

  useEffect(()=>{
    if(ritual.kind!=='incense' || ritual.step!=='placing'){
      incenseReleaseRef.current=false;
      setIncenseReleased(false);
    }
  },[ritual]);

  useEffect(()=>{
    let active=false,lastX=0,lastY=0,pointerId:number|null=null;
    const dom=gl.domElement;
    const down=(e:PointerEvent)=>{
      if(e.pointerType==='mouse' && e.button!==0)return;
      active=true;
      pointerId=e.pointerId;
      lastX=e.clientX;lastY=e.clientY;
    };
    const move=(e:PointerEvent)=>{
      if(!active || pointerId!==e.pointerId)return;
      const dx=e.clientX-lastX,dy=e.clientY-lastY;
      lastX=e.clientX;lastY=e.clientY;
      if(ritual.kind==='explore'){
        yaw.current-=dx*0.005;
      }else{
        // Rituals keep the actor stationary; dragging only orbits the camera.
        ritualOrbit.current=dragRitualOrbit(ritualOrbit.current,dx,dy);
      }
    };
    const up=(e:PointerEvent)=>{if(pointerId===e.pointerId){active=false;pointerId=null;}};
    const wheel=(e:WheelEvent)=>{
      if(ritual.kind==='explore')return;
      e.preventDefault();
      ritualOrbit.current=zoomRitualOrbit(ritualOrbit.current,e.deltaY);
    };
    dom.addEventListener('pointerdown',down);
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
    dom.addEventListener('wheel',wheel,{passive:false});
    return ()=>{
      dom.removeEventListener('pointerdown',down);
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
      dom.removeEventListener('wheel',wheel);
    };
  },[gl,ritual.kind]);
  useFrame((state,dt)=>{
    const currentAction=ritual.kind==='incense' && isIncenseActionStep(ritual.step) ? ritual.step : null;
    if(currentAction!==actionStep.current){
      actionStep.current=currentAction;
      actionElapsed.current=0;
      actionProgress.current=0;
      actionFinished.current=false;
    }
    if(currentAction && !actionFinished.current){
      actionElapsed.current+=Math.min(dt,0.05);
      actionProgress.current=incenseActionProgress(currentAction,actionElapsed.current);
      if(!incenseReleaseRef.current && hasReleasedIncense(currentAction,actionProgress.current)){
        incenseReleaseRef.current=true;
        setIncenseReleased(true);
      }
      if(actionProgress.current>=1){
        actionFinished.current=true;
        actionCallbackRef.current(currentAction);
      }
    }
    const pos=position.current;
    if (ritual.kind==='explore' && ready){
      const keys=input.current;
      const f=(keys.up?1:0)-(keys.down?1:0);
      const side=(keys.right?1:0)-(keys.left?1:0);
      const len=Math.hypot(f,side);
      isWalking.current=len>0;
      if(len){
        const theta=yaw.current;
        const dx=((Math.cos(theta)*side-Math.sin(theta)*f)/len)*WORLD.speed*Math.min(dt,0.045);
        const dz=((-Math.sin(theta)*side-Math.cos(theta)*f)/len)*WORLD.speed*Math.min(dt,0.045);
        position.current=moveWithCollision(pos,dx,dz);
        if(player.current && (dx || dz)) player.current.rotation.y=THREE.MathUtils.damp(player.current.rotation.y,Math.atan2(dx,-dz),10,dt);
      }
    }else{isWalking.current=false;}
    const current=position.current;
    if(player.current){
      player.current.position.set(current.x,floorHeight(current.z)+(isWalking.current?Math.abs(Math.sin(state.clock.elapsedTime*10))*0.025:0),current.z);
    }
    const nearby=getNearestStation(current);
    if(nearby!==lastNearby.current){lastNearby.current=nearby;onNearbyRef.current(nearby);}
    let goal:THREE.Vector3,look:THREE.Vector3;
    if(ritual.kind==='explore'){
      const distance=4.6,theta=yaw.current;
      goal=new THREE.Vector3(current.x+Math.sin(theta)*distance, floorHeight(current.z)+2.65,current.z+Math.cos(theta)*distance);
      look=new THREE.Vector3(current.x,floorHeight(current.z)+1.23,current.z-0.55);
    }else{
      const p=STATIONS[ritual.kind].position;
      const focus=ritual.kind==='incense'
        ? {x:CENSER_POSITION.x,y:1.17,z:CENSER_POSITION.z+(INCENSE_STAND.z-CENSER_POSITION.z)*0.48}
        : {x:p[0],y:p[1]+1.2,z:p[2]};
      const orbitGoal=getRitualCameraPosition(focus,ritualOrbit.current);
      goal=new THREE.Vector3(orbitGoal.x,orbitGoal.y,orbitGoal.z);
      look=new THREE.Vector3(focus.x,focus.y,focus.z);
    }
    camera.position.lerp(goal,1-Math.exp(-4.5*dt));
    const target=new THREE.Vector3();
    camera.getWorldDirection(target);
    const currentLook=camera.position.clone().add(target.multiplyScalar(4));
    const smoothed=currentLook.lerp(look,1-Math.exp(-6*dt));
    camera.lookAt(smoothed);
  });
  const handleClick=(type:Station)=>{
    const pos=position.current;
    if(ritual.kind!=='explore')return;
    const st=STATIONS[type];
    if(Math.hypot(pos.x-st.stand[0],pos.z-st.stand[2])<=st.radius)onInteract(type);
  };
  return <>
    <color attach="background" args={['#c9d8ce']}/>
    <fog attach="fog" args={['#c9d8ce',18,56]}/>
    <hemisphereLight args={['#f7ead0','#6c6d60',1.9]}/>
    <directionalLight position={[-8,14,9]} intensity={2.6} color="#ffdfad" castShadow shadow-mapSize={[1024,1024]} shadow-camera-left={-20} shadow-camera-right={20} shadow-camera-top={22} shadow-camera-bottom={-20}/>
    <ambientLight intensity={0.38}/>
    <Surroundings/>
    <Hall/>
    {deityGlbPath ? <AssetBoundary label="Wenchang deity" fallback={<Deity/>}>
      <Suspense fallback={<Deity/>}>
        <GLBDeity url={deityGlbPath}/>
      </Suspense>
    </AssetBoundary> : <Deity/>}
    <OfferingAltar/>
    <group onClick={()=>handleClick('incense')}><IncenseBurner incenseCount={incenseCount} previewPlaced={incenseReleased && ritual.kind==='incense' && ritual.step==='placing'}/></group>
    <group onClick={()=>handleClick('fortune')}><FortuneTable/></group>
    <group onClick={()=>handleClick('blessing')}><BlessingRack blessings={blessings}/></group>
    <group ref={player}>
      {travelerGlbPath ? <AssetBoundary label="traveler" fallback={
        <Traveler ritual={ritual} walkingRef={isWalking} actionProgress={actionProgress} incenseReleased={incenseReleased}/>
      }>
        <Suspense fallback={
          <Traveler ritual={ritual} walkingRef={isWalking} actionProgress={actionProgress} incenseReleased={incenseReleased}/>
        }>
          <GLBTraveler url={travelerGlbPath} ritual={ritual} walkingRef={isWalking}
            actionProgress={actionProgress} incenseReleased={incenseReleased}/>
        </Suspense>
      </AssetBoundary> : <Traveler ritual={ritual} walkingRef={isWalking}
        actionProgress={actionProgress} incenseReleased={incenseReleased}/>}
    </group>
  </>;
}

export default function World(props:WorldProps){
  const dpr=useMemo<[number,number]>(()=>[1,Math.min(window.devicePixelRatio||1,1.75)],[]);
  return <Canvas shadows dpr={dpr} camera={{position:[0,3,11],fov:55,near:0.1,far:100}} gl={{antialias:true,powerPreference:'high-performance'}} onCreated={({gl})=>{gl.setClearColor('#c9d8ce');}}>
    <GameWorld {...props}/>
  </Canvas>;
}
