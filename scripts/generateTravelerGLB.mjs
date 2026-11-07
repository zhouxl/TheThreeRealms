/**
 * TheThreeRealms V1.4: a reproducible technical-asset generator.
 * This is a REAL glTF 2.0 skinned GLB (13 joints, five action clips, elbow and wrist).
 * but only a low-poly model for pipeline validation, not the final art asset.
 */
export function generateTravelerGLB() {
  const nodes = [
    {name:"Root", children:[1,13]},
    {name:"Hips", translation:[0,0.72,0], children:[2,9,11]},
    {name:"Spine", translation:[0,0.14,0], children:[3,4,6]},
    {name:"Head", translation:[0,0.34,0]},
    {name:"Shoulder_L",translation:[-0.29,0.21,-0.015],children:[5]},
    {name:"Hand_L",translation:[0,-0.34,-0.02]},
    {name:"Shoulder_R",translation:[0.29,0.21,-0.015],children:[14]},
    {name:"Hand_R",translation:[0,-0.32,-0.02],children:[15]},
    {name:"IncenseGrip",translation:[0,-0.015,-0.08]},
    {name:"Leg_L",translation:[-0.14,-0.11,0],children:[10]},
    {name:"Foot_L",translation:[0,-0.46,-0.07]},
    {name:"Leg_R",translation:[0.14,-0.11,0],children:[12]},
    {name:"Foot_R",translation:[0,-0.46,-0.07]},
    {name:"TravelerSkinnedMesh",mesh:0,skin:0},
    {name:"Elbow_R",translation:[0,-0.22,0],children:[7]},
    {name:"Wrist_R",translation:[0,-0.02,-0.01],children:[8]}
  ];
  const joints=[1,2,3,4,5,6,14,7,15,9,10,11,12];
  const worldPos = [];
  function accumulate(index,parent){
    const n=nodes[index],t=n.translation||[0,0,0],w=t.map((v,i)=>v+parent[i]);worldPos[index]=w;
    for(const child of n.children||[])accumulate(child,w);
  }
  accumulate(0,[0,0,0]);
  const jointLookup={};
  joints.forEach((node,i)=>{jointLookup[nodes[node].name]=i});
  const materialColors=[
    ["jadeRobes",[0.39,0.51,0.46,1]],
    ["robeLinen",[0.83,0.76,0.62,1]],
    ["warmSkin",[0.78,0.58,0.45,1]],
    ["darkHair",[0.20,0.17,0.15,1]],
    ["boots",[0.30,0.25,0.20,1]],
    ["cinnabar",[0.62,0.29,0.24,1]],
    ["oldGold",[0.70,0.52,0.29,1]]
  ];
  const mats=materialColors.map(([name,color])=>({name,pbrMetallicRoughness:{baseColorFactor:color,metallicFactor:0,roughnessFactor:0.87},doubleSided:false}));
  const buckets=mats.map(()=>({positions:[],normals:[],joints:[],weights:[],indices:[]}));
  function triangle(p0,p1,p2,normal,joint,material){
    const b=buckets[material];
    const v1=p1.map((v,i)=>v-p0[i]),v2=p2.map((v,i)=>v-p0[i]);
    const cross=[v1[1]*v2[2]-v1[2]*v2[1],v1[2]*v2[0]-v1[0]*v2[2],v1[0]*v2[1]-v1[1]*v2[0]];
    if(cross.reduce((acc,v,i)=>acc+v*normal[i],0)<0){const tmp=p1;p1=p2;p2=tmp;}
    for(const p of [p0,p1,p2]){
      b.positions.push(...p);
      b.normals.push(...normal);
      b.joints.push(joint,0,0,0);
      b.weights.push(1,0,0,0);
      b.indices.push(b.indices.length);
    }
  }
  function quad(a,b,c,d,normal,joint,material){
    triangle(a,b,c,normal,joint,material);
    triangle(a,c,d,normal,joint,material);
  }
  function box(cx,cy,cz,sx,sy,sz,joint,material){
    const x0=cx-sx/2,x1=cx+sx/2,y0=cy-sy/2,y1=cy+sy/2,z0=cz-sz/2,z1=cz+sz/2;
    quad([x0,y0,z0],[x1,y0,z0],[x1,y1,z0],[x0,y1,z0],[0,0,-1],joint,material);
    quad([x1,y0,z1],[x0,y0,z1],[x0,y1,z1],[x1,y1,z1],[0,0,1],joint,material);
    quad([x0,y0,z1],[x0,y0,z0],[x0,y1,z0],[x0,y1,z1],[-1,0,0],joint,material);
    quad([x1,y0,z0],[x1,y0,z1],[x1,y1,z1],[x1,y1,z0],[1,0,0],joint,material);
    quad([x0,y1,z0],[x1,y1,z0],[x1,y1,z1],[x0,y1,z1],[0,1,0],joint,material);
    quad([x0,y0,z1],[x1,y0,z1],[x1,y0,z0],[x0,y0,z0],[0,-1,0],joint,material);
  }
  function taperedCylinder(cx,cy0,cy1,cz,r0,r1,joint,material,segments=12){
    for(let i=0;i<segments;i++){
      const a=i*2*Math.PI/segments,b=(i+1)*2*Math.PI/segments;
      const ca=Math.cos(a),sa=Math.sin(a),cb=Math.cos(b),sb=Math.sin(b);
      const p0=[cx+r0*ca,cy0,cz+r0*sa],p1=[cx+r0*cb,cy0,cz+r0*sb],
        p2=[cx+r1*cb,cy1,cz+r1*sb],p3=[cx+r1*ca,cy1,cz+r1*sa];
      const mid=(a+b)/2,normal=[Math.cos(mid),0,Math.sin(mid)];
      quad(p0,p1,p2,p3,normal,joint,material);
      triangle([cx,cy0,cz],p0,p1,[0,-1,0],joint,material);
      triangle([cx,cy1,cz],p3,p2,[0,1,0],joint,material);
    }
  }
  function sphere(cx,cy,cz,rx,ry,rz,joint,material,rings=7,segments=12){
    function point(lat,lon) {return [
      cx+rx*Math.sin(lat)*Math.cos(lon),
      cy+ry*Math.cos(lat),
      cz+rz*Math.sin(lat)*Math.sin(lon),
    ];}
    for(let i=0;i<rings;i++)for(let j=0;j<segments;j++){
      const a=i*Math.PI/rings,b=(i+1)*Math.PI/rings,
        u=j*2*Math.PI/segments,v=(j+1)*2*Math.PI/segments;
      const p0=point(a,u),p1=point(a,v),p2=point(b,v),p3=point(b,u);
      const midLat=(a+b)/2,midLon=(u+v)/2;
      const normal=[Math.sin(midLat)*Math.cos(midLon),Math.cos(midLat),Math.sin(midLat)*Math.sin(midLon)];
      triangle(p0,p1,p2,normal,joint,material);triangle(p0,p2,p3,normal,joint,material);
    }
  }
  const J=(name)=>jointLookup[name];
  // Two-part robe gives natural bow articulation without deforming lower hems.
  taperedCylinder(0,0.60,0.85,0,0.34,0.29,J("Hips"),0,12);
  taperedCylinder(0,0.85,1.16,0,0.29,0.20,J("Spine"),0,12);
  taperedCylinder(0,0.78,0.83,0,0.31,0.31,J("Hips"),5,12);
  box(0,1.03,-0.183,0.22,0.22,0.018,J("Spine"),1); // robe collar
  box(0,0.89,-0.30,0.10,0.19,0.012,J("Spine"),6); // decorative embroidered pendant
  // Left/right sleeves, hands and legs are attached to actual named joints.
  for(const sign of [-1,1]){
    const left=sign<0,arm=J(left?"Shoulder_L":"Shoulder_R"),
      hand=J(left?"Hand_L":"Wrist_R"),leg=J(left?"Leg_L":"Leg_R"),
      foot=J(left?"Foot_L":"Foot_R"),x=0.29*sign;
    if(left) {
      taperedCylinder(x,0.75,1.10,-0.025,0.12,0.14,arm,1,10);
    }else {
      taperedCylinder(x,0.88,1.10,-0.025,0.118,0.136,arm,1,10);
      taperedCylinder(x,0.54,0.90,-0.025,0.09,0.118,J("Elbow_R"),1,10);
    }
    sphere(x,left?0.67:0.55,-0.03,0.09,0.105,0.08,hand,2,6,10);
    if(!left){
      // A visible thumb and curved finger cluster holding the BOTTOM of the stick.
      box(x-0.036,0.54,-0.132,0.050,0.09,0.060,hand,2);
      box(x+0.033,0.535,-0.135,0.050,0.08,0.060,hand,2);
    }
    taperedCylinder(sign*0.14,0.15,0.61,0,0.105,0.13,leg,0,10);
    box(sign*0.14,0.075,-0.11,0.25,0.13,0.35,foot,4);
  }
  // Rounded face and tied hair bun. Front is local -Z.
  sphere(0,1.32,0,0.205,0.215,0.19,J("Head"),2);
  sphere(0,1.445,0.04,0.21,0.13,0.175,J("Head"),3,6,14);
  sphere(0,1.496,0.095,0.075,0.055,0.07,J("Head"),3,6,10);
  for(const x of [-0.070,0.070])sphere(x,1.33,-0.182,0.018,0.021,0.015,J("Head"),3,4,8);
  sphere(0,1.275,-0.195,0.018,0.013,0.012,J("Head"),5,4,8);

  const gltf={
    asset:{version:"2.0",generator:"TheThreeRealms traveler technical demo, V1.4"},
    scene:0,scenes:[{nodes:[0]}],nodes,
    materials:mats,meshes:[],skins:[],animations:[],
    buffers:[],bufferViews:[],accessors:[],
  };
  const buffer=[];
  function align(){while(buffer.length%4)buffer.push(0)}
  function append(data,elementSize,componentType,target){
    align();
    const offset=buffer.length,view=new DataView(new ArrayBuffer(data.length*elementSize));
    for(let i=0;i<data.length;i++){
      const p=i*elementSize;
      if(componentType===5126)view.setFloat32(p,data[i],true);
      else if(componentType===5123)view.setUint16(p,data[i],true);
      else if(componentType===5121)view.setUint8(p,data[i]);
      else throw Error("componentType invalid "+componentType);
    }
    const arr=new Uint8Array(view.buffer);
    for(let i=0;i<arr.length;i++)buffer.push(arr[i]);
    const index=gltf.bufferViews.length;
    const b={buffer:0,byteOffset:offset,byteLength:arr.length};
    if(target)b.target=target;
    gltf.bufferViews.push(b);
    return index;
  }
  function accessor(data,componentType,type,componentCount,target,includeMinMax=false){
    const bpe=componentType===5126?4:componentType===5123?2:1;
    const bufferView=append(data,bpe,componentType,target);
    const acc={bufferView,componentType,count:data.length/componentCount,type};
    if(includeMinMax){
      acc.min=Array(componentCount).fill(Infinity);
      acc.max=Array(componentCount).fill(-Infinity);
      for(let j=0;j<data.length;j++) {const k=j%componentCount;acc.min[k]=Math.min(acc.min[k],data[j]);acc.max[k]=Math.max(acc.max[k],data[j]);}
    }
    const index=gltf.accessors.length;gltf.accessors.push(acc);return index;
  }
  const primitives=[];
  for(let matIndex=0;matIndex<buckets.length;matIndex++){
    const bk=buckets[matIndex];if(bk.indices.length===0)continue;
    const positions=accessor(bk.positions,5126,"VEC3",3,34962,true);
    const normals=accessor(bk.normals,5126,"VEC3",3,34962);
    const jointsAccessor=accessor(bk.joints,5121,"VEC4",4,34962);
    const weightsAccessor=accessor(bk.weights,5126,"VEC4",4,34962);
    const indices=accessor(bk.indices,5123,"SCALAR",1,34963);
    primitives.push({attributes:{POSITION:positions,NORMAL:normals,JOINTS_0:jointsAccessor,WEIGHTS_0:weightsAccessor},indices,material:matIndex,mode:4});
  }
  gltf.meshes.push({name:"TravelerClothAndBody",primitives});
  const matrices=[];
  for(const node of joints){
    const p=worldPos[node];matrices.push(
      1,0,0,0, 0,1,0,0, 0,0,1,0, -p[0],-p[1],-p[2],1
    );
  }
  const inverses=accessor(matrices,5126,"MAT4",16);
  gltf.skins.push({name:"TravelerRig",joints,skeleton:1,inverseBindMatrices:inverses});
  function rotationX(angle){return [Math.sin(angle/2),0,0,Math.cos(angle/2)];}
  function clip(name,duration,tracks){
    const samplers=[],channels=[];
    for(const track of tracks){
      if(track.times.length!==track.angles.length)throw Error("mismatched track");
      const input=accessor(track.times.map(t=>t*duration),5126,"SCALAR",1,undefined,true);
      const quats=track.angles.flatMap(rotationX);
      const output=accessor(quats,5126,"VEC4",4);
      const sampler=samplers.length;
      samplers.push({input,output,interpolation:"LINEAR"});
      channels.push({sampler,target:{node:track.node,path:"rotation"}});
    }
    gltf.animations.push({name,samplers,channels});
  }
  const track=(node,times,angles)=>({node,times,angles});
  clip("Idle",2.6,[
    track(2,[0,.25,.5,.75,1],[0,.024,0,-.024,0]),
    track(3,[0,.5,1],[0,-.018,0]),
  ]);
  clip("Walk",1.0,[
    track(9,[0,.25,.5,.75,1],[0,.36,0,-.36,0]),
    track(11,[0,.25,.5,.75,1],[0,-.36,0,.36,0]),
    track(4,[0,.25,.5,.75,1],[0,-.29,0,.29,0]),
    track(6,[0,.25,.5,.75,1],[0,.29,0,-.29,0]),
    track(2,[0,.5,1],[0,.045,0])
  ]);
  clip("HoldIncense",2,[
    track(4,[0,.5,1],[.72,.70,.72]),
    track(6,[0,.5,1],[1.04,1.07,1.04]),
    track(14,[0,.5,1],[.72,.75,.72])
  ]);
  clip("Bow",1.8,[
    track(2,[0,.22,.52,.72,1],[0,-.22,-.48,-.43,0]),
    track(4,[0,.30,.70,1],[.72,.87,.84,.72]),
    track(6,[0,.30,.70,1],[1.04,1.14,1.10,1.04]),
    track(14,[0,.30,.70,1],[.72,.85,.83,.72]),
    track(3,[0,.52,1],[0,.14,0])
  ]);
  clip("PlaceIncense",2.4,[
    track(2,[0,.35,.76,.83,1],[0,-.11,-.19,-.18,0]),
    track(4,[0,.35,.76,.83,1],[.72,.88,1.08,1.08,.72]),
    track(6,[0,.35,.76,.83,1],[1.04,1.90,2.04,1.95,1.04]),
    track(14,[0,.35,.76,.83,1],[.72,.90,1.05,1.05,.72]),
    track(7,[0,.76,1],[0,.08,0])
  ]);
  gltf.buffers=[{byteLength:buffer.length}];

  const json=JSON.stringify(gltf);
  for(let i=0;i<json.length;i++)if(json.charCodeAt(i)>127)throw Error("generator JSON must be ASCII");
  const jlen=(json.length+3)&~3,blen=(buffer.length+3)&~3;
  const total=12+8+jlen+8+blen;
  const bytes=new Uint8Array(total),dv=new DataView(bytes.buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,total,true);
  dv.setUint32(12,jlen,true);dv.setUint32(16,0x4e4f534a,true);
  for(let i=0;i<jlen;i++)bytes[20+i]=i<json.length?json.charCodeAt(i):32;
  const offset=20+jlen;dv.setUint32(offset,blen,true);dv.setUint32(offset+4,0x004e4942,true);
  for(let i=0;i<buffer.length;i++)bytes[offset+8+i]=buffer[i];
  return bytes;
}
