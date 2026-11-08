import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {generateWenchangDeityGLB} from '../scripts/generateWenchangDeityGLB.mjs';

const committed=readFileSync(new URL('../public/models/wenchang-deity-tech-demo.glb',import.meta.url));
const generated=Buffer.from(generateWenchangDeityGLB());

function parseGLB(bytes) {
  assert.equal(bytes.readUInt32LE(0),0x46546c67);
  assert.equal(bytes.readUInt32LE(4),2);
  assert.equal(bytes.readUInt32LE(8),bytes.length);
  const jl=bytes.readUInt32LE(12),jsonType=bytes.readUInt32LE(16);
  assert.equal(jsonType,0x4e4f534a);
  assert.equal(jl%4,0);
  const json=JSON.parse(bytes.subarray(20,20+jl).toString('utf8'));
  const off=20+jl,len=bytes.readUInt32LE(off);
  assert.equal(bytes.readUInt32LE(off+4),0x004e4942);
  assert.equal(off+8+len,bytes.length);
  return {json,bin:bytes.subarray(off+8)};
}
const {json,bin}=parseGLB(committed);

test('Wenchang static GLB is reproducible, structurally valid and has no external textures',()=>{
  assert.deepEqual(committed,generated);
  assert.equal(json.scene,0);
  assert.equal(json.meshes.length,3);
  assert.equal(json.materials.length,9);
  assert.equal(json.animations?.length??0,0);
  assert.equal(json.images?.length??0,0);
  assert.ok(json.buffers[0].byteLength<=bin.length);
  const num={SCALAR:1,VEC3:3,VEC4:4,MAT4:16};
  for(const view of json.bufferViews){
    assert.equal(view.byteOffset%4,0);
    assert.ok(view.byteOffset+view.byteLength<=json.buffers[0].byteLength);
  }
  for(const a of json.accessors){
    const width=num[a.type],element=a.componentType===5126?4:a.componentType===5123?2:0;
    assert.ok(width&&element);
    const view=json.bufferViews[a.bufferView];
    assert.ok((a.byteOffset||0)+a.count*width*element<=view.byteLength);
    if(a.type==='VEC3' && a.min) {
      assert.ok(a.max.every((v,i)=>v>=a.min[i]));
      assert.ok([...a.min,...a.max].every(Number.isFinite));
    }
  }
});

test('V1.5 sculpt has no zero-area triangles or unstable pole normals',()=>{
  // Degenerate ellipsoid polar caps can produce different normals across
  // runtime/CPU architectures despite a visually similar GLB.
  for(const [meshIndex,mesh] of json.meshes.entries()) {
    for(const [primitiveIndex,primitive] of mesh.primitives.entries()) {
      const positions=json.accessors[primitive.attributes.POSITION];
      const pv=json.bufferViews[positions.bufferView];
      assert.equal(positions.componentType,5126);
      assert.equal(positions.type,'VEC3');
      assert.equal(positions.count%3,0,'Every vertex triplet forms a triangle');
      function p(i){
        const offset=pv.byteOffset+(positions.byteOffset||0)+i*3*4;
        return [
          bin.readFloatLE(offset),bin.readFloatLE(offset+4),bin.readFloatLE(offset+8),
        ];
      }
      for(let v=0;v<positions.count;v+=3) {
        const [a,b,c]=[p(v),p(v+1),p(v+2)];
        const ab=b.map((x,j)=>x-a[j]),ac=c.map((x,j)=>x-a[j]);
        const cross=[
          ab[1]*ac[2]-ab[2]*ac[1],
          ab[2]*ac[0]-ab[0]*ac[2],
          ab[0]*ac[1]-ab[1]*ac[0],
        ];
        const length=Math.hypot(...cross);
        assert.ok(length>1e-12,
          `Degenerate triangle in mesh ${meshIndex}, primitive ${primitiveIndex}, triangle ${v/3}: cross=${length}`);
      }
      const normals=json.accessors[primitive.attributes.NORMAL];
      const nv=json.bufferViews[normals.bufferView];
      for(let v=0;v<normals.count;v++){
        const off=nv.byteOffset+(normals.byteOffset||0)+v*12;
        const xyz=[bin.readFloatLE(off),bin.readFloatLE(off+4),bin.readFloatLE(off+8)];
        assert.ok(xyz.every(Number.isFinite));
        assert.ok(Math.abs(Math.hypot(...xyz)-1)<1e-4,
          `Unstable/unnormalized normal in mesh ${meshIndex}, vertex ${v}`);
      }
    }
  }
});

test('deity sculpture contract contains root, both hands and correct props',()=>{
  const byName=new Map(json.nodes.map((node,i)=>[node.name,{...node,index:i}]));
  for(const name of ['WenchangRoot','RightHand','LeftHand','WritingBrush','Scroll','DeitySculpture']){
    assert.ok(byName.has(name),name);
  }
  assert.ok(byName.get('RightHand').translation[0]<0,'anatomical right for +Z facing is -X');
  assert.ok(byName.get('LeftHand').translation[0]>0,'anatomical left for +Z facing is +X');
  assert.ok(byName.get('RightHand').children.includes(byName.get('WritingBrush').index));
  assert.ok(byName.get('LeftHand').children.includes(byName.get('Scroll').index));
});

test('committed deity GLB stays at precisely 2.85m from the pedestal floor',()=>{
  // The brush and scroll are built in hand-local coordinates and can have
  // negative local Y values even when they are above the world ground.
  // Read the root sculpture here; world-space bounds are tested with GLTFLoader.
  const accessors=json.meshes[0].primitives.map(p=>json.accessors[p.attributes.POSITION]);
  const bottom=Math.min(...accessors.map(a=>a.min[1]));
  const top=Math.max(...accessors.map(a=>a.max[1]));
  assert.ok(Math.abs(bottom)<0.0001,`unexpected ground origin ${bottom}`);
  assert.ok(Math.abs(top-2.85)<0.0001,`unexpected crown height ${top}`);
});

function parseInThree(){
  const loader=new GLTFLoader();
  const data=committed.buffer.slice(committed.byteOffset,committed.byteOffset+committed.byteLength);
  return new Promise((resolve,reject)=>loader.parse(data,'',resolve,reject));
}

test('Three.js GLTFLoader parses the actual static deity with visible geometry',async()=>{
  const loaded=await parseInThree();
  assert.equal(loaded.animations.length,0);
  let triangles=0;
  loaded.scene.traverse(node=>{
    if(node.isMesh){
      assert.ok(node.geometry.attributes.position.count>0);
      triangles+=node.geometry.index?node.geometry.index.count/3:node.geometry.attributes.position.count/3;
    }
  });
  assert.ok(triangles>100,'static model must contain actual sculpt geometry');
  const box=new THREE.Box3().setFromObject(loaded.scene);
  const size=box.getSize(new THREE.Vector3());
  assert.ok(Math.abs(box.min.y)<0.001);
  assert.ok(Math.abs(size.y-2.85)<0.001);
  assert.ok(size.x>1.9 && size.z>1.2);
});

test('Three.js world positions confirm brush on right, scroll on left, facing +Z',async()=>{
  const loaded=await parseInThree();
  loaded.scene.updateMatrixWorld(true);
  const right=loaded.scene.getObjectByName('RightHand');
  const left=loaded.scene.getObjectByName('LeftHand');
  const brush=loaded.scene.getObjectByName('WritingBrush');
  const scroll=loaded.scene.getObjectByName('Scroll');
  for(const node of [right,left,brush,scroll])assert.ok(node);
  assert.equal(brush.parent,right);
  assert.equal(scroll.parent,left);
  const brushPos=brush.getWorldPosition(new THREE.Vector3());
  const scrollPos=scroll.getWorldPosition(new THREE.Vector3());
  assert.ok(brushPos.x<-.5 && scrollPos.x>.5,'right/left must not be mirror-swapped');
  assert.ok(brushPos.z>0.5 && scrollPos.z>0.5,'both ritual objects face the courtyard');
});
