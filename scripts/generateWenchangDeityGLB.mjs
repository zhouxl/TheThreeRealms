/** Reproducible glTF 2.0 static Wenchang technical sculpture.
 * Faces +Z. Anatomical RIGHT = -X and carries brush; LEFT = +X scroll.
 * 1 glTF unit = 1 m; includes 2.85m pedestal/crown height.
 * This is a style/asset pipeline demo, not final culturally reviewed art.
 */
export function generateWenchangDeityGLB() {
  const swatches=[
    ['darkTimber',[.27,.20,.15,1]],['cinnabar',[.51,.25,.22,1]],
    ['slateJade',[.26,.41,.38,1]],['oldGold',[.75,.55,.27,1]],
    ['warmCarvedFace',[.77,.58,.43,1]],['inkHair',[.15,.14,.13,1]],
    ['linenParchment',[.86,.76,.59,1]],['brushWood',[.39,.26,.17,1]],
    ['grayStone',[.50,.54,.50,1]],
  ];
  const materials=swatches.map(([name,color])=>({name,pbrMetallicRoughness:{
    baseColorFactor:color,metallicFactor:0.08,roughnessFactor:0.88}}));
  const models=Array.from({length:3},()=>new Map());
  const group=(model,mat)=>{
    let b=models[model].get(mat);
    if(!b){b={p:[],n:[],i:[]};models[model].set(mat,b);}
    return b;
  };
  function tri(model,mat,a,b,c){
    const ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);
    const n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]];
    const mag=Math.hypot(...n)||1,unit=n.map(v=>v/mag);
    const obj=group(model,mat);
    for(const p of [a,b,c]){obj.p.push(...p);obj.n.push(...unit);obj.i.push(obj.i.length);}
  }
  function quad(model,mat,a,b,c,d){tri(model,mat,a,b,c);tri(model,mat,a,c,d);}
  function box(model,mat,[cx,cy,cz],[sx,sy,sz]){
    const x=cx-sx/2,y=cy-sy/2,z=cz-sz/2,X=cx+sx/2,Y=cy+sy/2,Z=cz+sz/2;
    quad(model,mat,[x,y,z],[x,Y,z],[X,Y,z],[X,y,z]);
    quad(model,mat,[X,y,Z],[X,Y,Z],[x,Y,Z],[x,y,Z]);
    quad(model,mat,[x,y,Z],[x,Y,Z],[x,Y,z],[x,y,z]);
    quad(model,mat,[X,y,z],[X,Y,z],[X,Y,Z],[X,y,Z]);
    quad(model,mat,[x,Y,z],[x,Y,Z],[X,Y,Z],[X,Y,z]);
    quad(model,mat,[x,y,Z],[x,y,z],[X,y,z],[X,y,Z]);
  }
  function ellipsoid(model,mat,[cx,cy,cz],[rx,ry,rz],rings=7,steps=12){
    const p=(a,b)=>[cx+rx*Math.sin(a)*Math.cos(b),cy+ry*Math.cos(a),cz+rz*Math.sin(a)*Math.sin(b)];
    for(let i=0;i<rings;i++)for(let j=0;j<steps;j++){
      const a=i*Math.PI/rings,A=(i+1)*Math.PI/rings,b=j*2*Math.PI/steps,B=(j+1)*2*Math.PI/steps;
      quad(model,mat,p(a,b),p(A,b),p(A,B),p(a,B));
    }
  }
  function cylinder(model,mat,[cx,cz],bottom,top,r0,r1,steps=12){
    const p=(r,y,t)=>[cx+r*Math.cos(t),y,cz+r*Math.sin(t)];
    for(let i=0;i<steps;i++){
      const a=i*2*Math.PI/steps,b=(i+1)*2*Math.PI/steps;
      quad(model,mat,p(r0,bottom,a),p(r0,bottom,b),p(r1,top,b),p(r1,top,a));
      tri(model,mat,[cx,bottom,cz],p(r0,bottom,b),p(r0,bottom,a));
      tri(model,mat,[cx,top,cz],p(r1,top,a),p(r1,top,b));
    }
  }
  // Stone pedestal + timber throne.
  box(0,8,[0,.12,0],[2.25,.24,1.65]);
  box(0,0,[0,.33,0],[2.16,.17,1.57]);
  box(0,3,[0,.415,0],[2.26,.036,1.69]);
  box(0,0,[0,.55,-.28],[1.55,.28,1.04]);
  box(0,0,[0,1.17,-.51],[1.70,1.47,.19]);
  box(0,3,[0,1.94,-.49],[1.73,.08,.23]);
  for(const x of [-.80,.80]){
    box(0,0,[x,1.15,-.51],[.12,1.45,.15]);
    box(0,3,[x,1.91,-.51],[.14,.16,.20]);
  }
  // Robes and embroidered trim.
  cylinder(0,2,[0,.11],.49,1.46,.61,.42,14);
  ellipsoid(0,1,[0,1.52,.08],[.52,.47,.38],8,16);
  box(0,3,[0,.61,.68],[.94,.06,.04]);
  box(0,3,[0,1.07,.575],[.08,.69,.05]);
  for(const x of [-.19,.19])box(0,3,[x,1.69,.42],[.11,.46,.035]);
  // Sleeves, two hands, front facing +Z.
  for(const x of [-.68,.68]){
    ellipsoid(0,2,[x,1.59,.26],[.24,.32,.23]);
    ellipsoid(0,2,[x*1.10,1.37,.44],[.18,.23,.21]);
    ellipsoid(0,4,[x*1.10,1.30,.59],[.115,.10,.09]);
  }
  // Face, eyebrows and scholar beard.
  cylinder(0,4,[0,.10],1.91,2.11,.13,.13,10);
  ellipsoid(0,4,[0,2.26,.12],[.30,.32,.26],9,16);
  ellipsoid(0,5,[0,2.46,-.015],[.30,.13,.19]);
  for(const x of [-.12,.12]){
    box(0,5,[x,2.30,.37],[.105,.027,.023]);
    ellipsoid(0,5,[x,2.245,.384],[.018,.021,.013],4,8);
    ellipsoid(0,5,[x*1.3,2.03,.32],[.062,.11,.055],5,10);
  }
  cylinder(0,5,[0,.345],1.73,2.09,.02,.13,12);
  // Ceremonial scholar crown: crown apex exactly 2.85m.
  box(0,5,[0,2.62,.05],[.76,.17,.50]);
  box(0,5,[0,2.74,.05],[.51,.17,.43]);
  box(0,5,[0,2.825,.05],[.64,.05,.48]);
  box(0,3,[0,2.625,.307],[.43,.04,.024]);
  box(0,1,[0,2.74,.281],[.22,.12,.023]);
  for(const x of [-.51,.51])box(0,5,[x,2.59,.045],[.34,.07,.12]);
  // A writing brush held in anatomical RIGHT hand (-X).
  cylinder(1,7,[0,0],-.25,.61,.020,.018,12);
  cylinder(1,3,[0,0],.53,.61,.027,.027,12);
  cylinder(1,5,[0,0],-.42,-.25,.004,.041,12);
  // Horizontal book-scroll and gilded rollers in anatomical LEFT (+X).
  box(2,6,[0,0,0],[.65,.30,.052]);
  for(const x of [-.34,.34]){
    box(2,3,[x,0,0],[.055,.39,.09]);
    ellipsoid(2,3,[x,.22,0],[.04,.035,.04],5,8);
  }
  for(const y of [-.06,.015,.09])box(2,7,[0,y,.035],[.38,.011,.008]);

  const nodes=[
    {name:'WenchangRoot',children:[1,2,3]},
    {name:'DeitySculpture',mesh:0},
    {name:'RightHand',translation:[-.75,1.30,.59],children:[4]},
    {name:'LeftHand',translation:[.75,1.30,.59],children:[5]},
    {name:'WritingBrush',mesh:1,translation:[0,0,.12]},
    {name:'Scroll',mesh:2,translation:[0,0,.14]},
  ];
  const json={
    asset:{version:'2.0',generator:'TheThreeRealms Wenchang technical sculpt v1.5'},
    scene:0,scenes:[{nodes:[0]}],nodes,materials,meshes:[],bufferViews:[],accessors:[],buffers:[],
  };
  const data=[];
  const align=()=>{while(data.length%4)data.push(0);};
  function accessor(values,componentType,type,target,bounds=false){
    align();
    const size=componentType===5126?4:2;
    const raw=new Uint8Array(values.length*size),view=new DataView(raw.buffer);
    values.forEach((v,i)=>componentType===5126?view.setFloat32(i*size,v,true):view.setUint16(i*size,v,true));
    const bufferView=json.bufferViews.length;
    json.bufferViews.push({buffer:0,byteOffset:data.length,byteLength:raw.length,target});
    for(const b of raw)data.push(b);
    const width=type==='VEC3'?3:1,id=json.accessors.length;
    const a={bufferView,componentType,count:values.length/width,type};
    if(bounds){
      a.min=Array(width).fill(Infinity);a.max=Array(width).fill(-Infinity);
      values.forEach((v,i)=>{const k=i%width;a.min[k]=Math.min(a.min[k],v);a.max[k]=Math.max(a.max[k],v);});
    }
    json.accessors.push(a);return id;
  }
  for(const model of models){
    const primitives=[];
    for(const [mat,v] of model){
      const p=accessor(v.p,5126,'VEC3',34962,true);
      const n=accessor(v.n,5126,'VEC3',34962);
      const i=accessor(v.i,5123,'SCALAR',34963);
      primitives.push({attributes:{POSITION:p,NORMAL:n},indices:i,material:mat});
    }
    json.meshes.push({primitives});
  }
  json.buffers=[{byteLength:data.length}];
  const str=JSON.stringify(json);
  if([...str].some(x=>x.charCodeAt(0)>127))throw new Error('Non-ASCII GLB metadata');
  const jl=(str.length+3)&~3,bl=(data.length+3)&~3;
  const length=12+8+jl+8+bl,bin=new Uint8Array(length),dv=new DataView(bin.buffer);
  dv.setUint32(0,0x46546c67,true);dv.setUint32(4,2,true);dv.setUint32(8,length,true);
  dv.setUint32(12,jl,true);dv.setUint32(16,0x4e4f534a,true);
  for(let i=0;i<jl;i++)bin[20+i]=i<str.length?str.charCodeAt(i):32;
  const offset=20+jl;dv.setUint32(offset,bl,true);dv.setUint32(offset+4,0x004e4942,true);
  for(let i=0;i<data.length;i++)bin[offset+8+i]=data[i];
  return bin;
}
