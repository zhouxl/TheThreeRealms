import test from 'node:test';
import assert from 'node:assert/strict';
import {createPhysicsDriver} from '../src/game/physicsDriver.ts';
import {STATIC_COLLIDERS} from '../src/game/collisionGeometry.ts';

test('Rapier physically blocks the censer rather than jumping through it',async()=>{
  const p=await createPhysicsDriver({x:0,z:4.75});
  try{
    let moved=p.position();
    for(let i=0;i<100;i++)moved=p.move(0,-.028,1/60);
    assert.ok(moved.z>3.75,'censer should prevent moving to the other side of z=3.2');
    assert.ok(moved.z<4.75,'player should approach the censer before colliding');
  }finally{p.dispose();}
});

test('Rapier capsule slides along corner instead of tunneling through wall',async()=>{
  const p=await createPhysicsDriver({x:2.20,z:.8});
  try{
    let moved=p.position();
    for(let i=0;i<100;i++)moved=p.move(.025,-.025,1/60);
    assert.ok(moved.x>3.0,'character should slide sideways along the front wall');
    assert.ok(moved.z>0.15,'front wall prevents walking straight through its side');
  }finally{p.dispose();}
});

test('Rapier allows walking through the gate and climbing entrance stairs',async()=>{
  const p=await createPhysicsDriver({x:0,z:1.3});
  try{
    let moved=p.position();
    for(let i=0;i<145;i++)moved=p.move(0,-.027,1/60);
    assert.ok(moved.z<-.3,`character should pass the entrance; z=${moved.z}`);
    assert.ok(moved.y>.33,`character should gain hall floor height; y=${moved.y}`);
  }finally{p.dispose();}
});

test('physics movement has no frame-size teleport and can be disposed',async()=>{
  const p=await createPhysicsDriver({x:0,z:6.1});
  const original=p.position();
  const first=p.move(0,-999,1/60);
  assert.ok(Math.hypot(first.x-original.x,first.z-original.z)<.05);
  p.dispose();
  assert.throws(()=>p.move(0,0,1/60),/disposed/);
});
