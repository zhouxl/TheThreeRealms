import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {generateTravelerGLB} from '../scripts/generateTravelerGLB.mjs';

const committed=readFileSync(new URL('../public/models/traveler-tech-demo.glb',import.meta.url));
const generated=Buffer.from(generateTravelerGLB());

function parseGLB(data) {
  assert.equal(data.readUInt32LE(0),0x46546c67,'glTF magic');
  assert.equal(data.readUInt32LE(4),2,'glTF version 2');
  assert.equal(data.readUInt32LE(8),data.length,'total GLB file length');
  const jsonLen=data.readUInt32LE(12);
  assert.equal(data.readUInt32LE(16),0x4e4f534a,'JSON chunk');
  assert.equal(jsonLen%4,0);
  const json=JSON.parse(data.subarray(20,20+jsonLen).toString('utf8'));
  const offset=20+jsonLen;
  const binaryLen=data.readUInt32LE(offset);
  assert.equal(binaryLen%4,0);
  assert.equal(data.readUInt32LE(offset+4),0x004e4942,'BIN chunk');
  assert.equal(offset+8+binaryLen,data.length);
  return {json,bin:data.subarray(offset+8)};
}
const {json,bin}=parseGLB(committed);

test('committed GLB bytes exactly match the reproducible generator',()=>{
  assert.deepEqual(committed,generated);
});

test('GLB contains one valid skinned mesh and 11 rig joints',()=>{
  assert.equal(json.skins.length,1);
  assert.equal(json.skins[0].joints.length,11);
  const skinned=json.nodes.find(n=>n.skin===0);
  assert.equal(skinned.mesh,0);
  const required=['Hips','Spine','Head','Hand_L','Hand_R','Leg_L','Leg_R','IncenseGrip'];
  for(const name of required) assert.ok(json.nodes.some(n=>n.name===name),name);
  for(const primitive of json.meshes[0].primitives){
    assert.ok(primitive.attributes.POSITION!==undefined);
    assert.ok(primitive.attributes.NORMAL!==undefined);
    assert.ok(primitive.attributes.JOINTS_0!==undefined);
    assert.ok(primitive.attributes.WEIGHTS_0!==undefined);
  }
});

test('all buffer views and accessors are in bounds and use valid layouts',()=>{
  const types={SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};
  const size={5121:1,5123:2,5126:4};
  for(const view of json.bufferViews){
    assert.equal(view.byteOffset%4,0);
    assert.ok(view.byteOffset+view.byteLength<=json.buffers[0].byteLength);
  }
  for(const accessor of json.accessors){
    const component=types[accessor.type],bytes=size[accessor.componentType];
    assert.ok(component && bytes,`unexpected accessor ${JSON.stringify(accessor)}`);
    const view=json.bufferViews[accessor.bufferView];
    const offset=accessor.byteOffset||0;
    assert.ok(offset+accessor.count*component*bytes<=view.byteLength);
  }
  assert.ok(json.buffers[0].byteLength<=bin.length);
});

test('GLB has playable idle, walk, hold, bow and place animations',()=>{
  const required=['Idle','Walk','HoldIncense','Bow','PlaceIncense'];
  assert.deepEqual(json.animations.map(a=>a.name),required);
  for(const animation of json.animations){
    assert.ok(animation.channels.length>0,animation.name);
    for(const channel of animation.channels){
      assert.equal(channel.target.path,'rotation');
      const sampler=animation.samplers[channel.sampler];
      const input=json.accessors[sampler.input],output=json.accessors[sampler.output];
      assert.equal(input.count,output.count);
      assert.ok(input.count>=2);
      assert.equal(output.type,'VEC4');
    }
  }
});

test('hand-held incense attachment is under right hand, not world root',()=>{
  const handIndex=json.nodes.findIndex(n=>n.name==='Hand_R');
  const gripIndex=json.nodes.findIndex(n=>n.name==='IncenseGrip');
  assert.ok(json.nodes[handIndex].children.includes(gripIndex));
  assert.ok(json.nodes[gripIndex].translation[2]<0);
});

test('body asset height matches the 1.55m meter-scale contract',()=>{
  const mins=[],maxs=[];
  for(const primitive of json.meshes[0].primitives){
    const acc=json.accessors[primitive.attributes.POSITION];
    mins.push(acc.min[1]);maxs.push(acc.max[1]);
  }
  const lowest=Math.min(...mins),highest=Math.max(...maxs);
  assert.ok(lowest>=-0.01);
  assert.ok(highest>1.45 && highest<1.63,`height top=${highest}`);
});
