import {useEffect, useMemo} from 'react';
import {useGLTF} from '@react-three/drei';
import * as THREE from 'three';
import {clone as cloneSkeleton} from 'three/examples/jsm/utils/SkeletonUtils.js';
import {DEITY_EXPECTED_HEIGHT, evaluateModelHeight} from './assets.ts';

/** The asset author positions the deity at its own pedestal-foot origin. */
export default function GLBDeity({url}:{url:string}) {
  const gltf = useGLTF(url);
  const model = useMemo(()=>cloneSkeleton(gltf.scene),[gltf.scene]);

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

  return <group position={[0,0.45,-8.3]}>
    <primitive object={model}/>
  </group>;
}
