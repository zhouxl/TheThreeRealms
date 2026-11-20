import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const workflow=readFileSync(new URL('../.github/workflows/ci.yml',import.meta.url),'utf8');

test('TheThreeRealms CI is assigned to a macOS self-hosted runner, not GitHub-hosted minutes',()=>{
  assert.match(workflow,/runs-on: \[self-hosted, macOS\]/);
  assert.doesNotMatch(workflow,/runs-on: (ubuntu-latest|macos-latest|windows-latest)/i);
  assert.match(workflow,/npm run ci:local/);
  assert.match(workflow,/node-version-file: \.nvmrc/);
});

test('public-repository safety: no external pull request trigger on the Mac mini',()=>{
  assert.match(workflow,/^  push:\s*$/m);
  assert.match(workflow,/^  workflow_dispatch:\s*$/m);
  assert.doesNotMatch(workflow,/^  pull_request(?:_target)?:\s*$/m);
  assert.match(workflow,/^permissions:\s*\n  contents: read/m);
  assert.match(workflow,/persist-credentials: false/);
});

test('builds only trusted branch families and keeps Mac jobs bounded',()=>{
  for(const pattern of ["main","feat/**","fix/**","chore/**"]){
    assert.ok(workflow.includes(pattern),pattern);
  }
  assert.match(workflow,/timeout-minutes: 30/);
  assert.match(workflow,/cancel-in-progress: true/);
  assert.match(workflow,/retention-days: 7/);
});
