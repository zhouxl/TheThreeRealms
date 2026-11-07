import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePublicGlbPath, validateTravelerContract, evaluateModelHeight,
  selectTravelerClip,
} from '../src/game/assets.ts';

test('GLB assets default to procedural fallback unless explicitly configured', () => {
  assert.equal(normalizePublicGlbPath(undefined),null);
  assert.equal(normalizePublicGlbPath('  '),null);
  assert.equal(normalizePublicGlbPath('/models/traveler.glb'),'/models/traveler.glb');
  assert.equal(normalizePublicGlbPath('/models/traveler.glb?v=2'),'/models/traveler.glb?v=2');
});

test('GLB URLs must be safe same-origin public paths', () => {
  for (const url of [
    'https://cdn.example.com/traveler.glb','//example.com/x.glb','models/traveler.glb',
    '/models/../secret.glb','/models/./test.glb','/models/mesh.gltf',
    '/models\\asset.glb','/models/hero.glb?bad=1&x=%2f',
  ]) assert.equal(normalizePublicGlbPath(url),null,url);
});

test('traveler contract lists all missing clips and grip anchors', () => {
  assert.deepEqual(validateTravelerContract(
    ['Root','Spine','Hand_R','IncenseGrip'],
    ['Idle','Walk','Bow','PlaceIncense','TakeIncense'],
  ),{valid:true,missingClips:[],missingNodes:[]});
  assert.deepEqual(validateTravelerContract(['Hand_R'],['Idle','Walk']),{
    valid:false,missingClips:['Bow','PlaceIncense'],missingNodes:['IncenseGrip'],
  });
});

test('GLB expected height is validated without auto-rescaling assets', () => {
  assert.equal(evaluateModelHeight(1.55,1.55),true);
  assert.equal(evaluateModelHeight(1.75,1.55),true);
  assert.equal(evaluateModelHeight(0.7,1.55),false);
  assert.equal(evaluateModelHeight(0,1.55),false);
});

test('animation clip switching respects ritual action precedence', () => {
  assert.equal(selectTravelerClip('incense','bowing',true),'Bow');
  assert.equal(selectTravelerClip('incense','placing',true),'PlaceIncense');
  assert.equal(selectTravelerClip('incense','take',false),'Idle');
  assert.equal(selectTravelerClip('incense','hold',false),'HoldIncense');
  assert.equal(selectTravelerClip('incense','bow',false),'HoldIncense');
  assert.equal(selectTravelerClip('explore',null,true),'Walk');
  assert.equal(selectTravelerClip('fortune',null,false),'Idle');
});
