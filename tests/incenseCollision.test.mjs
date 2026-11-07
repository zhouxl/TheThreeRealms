import test from 'node:test';
import assert from 'node:assert/strict';
import {armCenserClearance,distanceToCenserSurface} from '../src/game/incenseCollision.ts';

test('collision proxy detects sleeve passing through the copper rim',()=>{
  const bad={
    shoulder:{x:0.45,y:1.05,z:4.0},
    elbow:{x:0.30,y:1.08,z:3.70},
    wrist:{x:0.10,y:1.07,z:3.45},
  };
  assert.ok(armCenserClearance(bad)<0);
});

test('over-the-rim elbow and forearm clear the metal',()=>{
  const good={
    shoulder:{x:0.50,y:1.35,z:4.1},
    elbow:{x:0.35,y:1.40,z:3.75},
    wrist:{x:0.08,y:1.32,z:3.48},
  };
  assert.ok(armCenserClearance(good)>0);
});

test('censer collision geometry respects center and copper band',()=>{
  assert.ok(distanceToCenserSurface({x:0,y:1.08,z:3.20})>0,'empty ash opening');
  assert.ok(distanceToCenserSurface({x:0,y:1.08,z:3.77})<0,'copper rim');
  assert.ok(distanceToCenserSurface({x:0,y:0.70,z:3.20})<0,'copper body');
});
