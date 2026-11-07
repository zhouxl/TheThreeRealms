import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanForwardedNpmAllowScripts } from '../scripts/npm-env.mjs';

test('nested npm install omits only forwarded allow-scripts env copies', () => {
  const inherited = {
    npm_config_allow_scripts: 'esbuild,sharp',
    NPM_CONFIG_ALLOW_SCRIPTS: 'esbuild',
    'npm_config_allow-scripts': 'sharp',
    npm_config_registry: 'https://registry.npmjs.org/',
    HOME: '/Users/example',
    npm_config_strict_ssl: 'true',
  };
  const {env,removed} = cleanForwardedNpmAllowScripts(inherited);
  assert.deepEqual(removed.sort(), [
    'NPM_CONFIG_ALLOW_SCRIPTS','npm_config_allow-scripts','npm_config_allow_scripts',
  ].sort());
  assert.equal(env.npm_config_allow_scripts, undefined);
  assert.equal(env.NPM_CONFIG_ALLOW_SCRIPTS, undefined);
  assert.equal(env['npm_config_allow-scripts'], undefined);
  assert.equal(env.npm_config_registry, inherited.npm_config_registry);
  assert.equal(env.HOME, inherited.HOME);
  assert.equal(env.npm_config_strict_ssl, 'true');
  assert.equal(inherited.npm_config_allow_scripts, 'esbuild,sharp', 'original environment must remain intact');
});

test('no-op when no forwarded policy is present', () => {
  const original = { HOME: '/Users/example', npm_config_registry: 'https://npm.example.org' };
  const result = cleanForwardedNpmAllowScripts(original);
  assert.deepEqual(result, {env: original,removed: []});
  assert.notStrictEqual(result.env, original);
});

test('never removes dependency script approval settings other than the blocked forwarded key', () => {
  const original = {
    npm_config_ignore_scripts: 'true',
    npm_config_strict_allow_scripts: 'true',
    npm_config_dangerously_allow_all_scripts: 'false',
    npm_config_allow_scripts: 'esbuild',
  };
  const {env}=cleanForwardedNpmAllowScripts(original);
  assert.equal(env.npm_config_ignore_scripts,'true');
  assert.equal(env.npm_config_strict_allow_scripts,'true');
  assert.equal(env.npm_config_dangerously_allow_all_scripts,'false');
  assert.ok(!Object.hasOwn(env,'npm_config_allow_scripts'));
});
