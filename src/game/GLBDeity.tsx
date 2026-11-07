import {useEffect, useMemo} from 'react';
import {Html,useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {
  DEITY_EXPECTED_HEIGHT, evaluateModelHeight, isDeityHandednessCorrect,
  validateDeityContract,
} from './assets.ts';

/** The asset author positions the deity at its own pedestal-foot origin. */
export default function GLBDeity({url}:{url:string}) {
  const gltf = useGLTF(url);
  const model = useMemo(()=>cloneSkeleton(gltf.scene),[gltf.scene]);
  const contract=useMemo(()=>{
    const names:string[]=[];
    model.traverse(node=>names.push(node.name));
    return validateDeityContract(names);
  },[model]);

  useEffect(()=>{
    model.traverse(node=>{
      if (node instanceof THREE.Mesh) {
        node.castShadow=true;
        node.receiveShadow=true;
      }
    });
    const bounds=new THREE.Box3().setFromObject(model);
    const height=bounds.getSize(new THREE.Vector3()).y;
    if (!evaluateModelHeight(height,DEITY_EXPECTED_HEIGHT)) {
      console.warn(`[TheThreeRealms] Deity GLB height is ${height.toFixed(2)}m; expected around ${DEITY_EXPECTED_HEIGHT}m. Please fix in Blender rather than auto-scaling at runtime.`);
    }
  },[model]);

  if(!contract.valid) {
    throw new Error(`Deity GLB missing authoring nodes: ${contract.missingNodes.join(', ')}`);
  }
  model.updateWorldMatrix(true,true);
  const right=model.getObjectByName('RightHand');
  const left=model.getObjectByName('LeftHand');
  if(!right||!left||!isDeityHandednessCorrect(
    right.getWorldPosition(new THREE.Vector3()).x,
    left.getWorldPosition(new THREE.Vector3()).x
  )) {
    throw new Error('Deity GLB hand orientation invalid: +Z facing model must hold brush in anatomical right (-X), scroll in left (+X).');
  }

  return <group position={[0,0.45,-8.3]}>
    <primitive object={model}/>
    <Html center position={[0,2.82,0]} distanceFactor={9}>
      <span className="statue-label">文昌帝君</span>
    </Html>
  </group>;
}
