#!/usr/bin/env node
/**
 * TheThreeRealms local CI: same logical checks as the former GitHub workflow.
 * It saves command output into .local-ci/last-run.log, which is gitignored.
 *
 * Usage:
 *   npm run ci:local    # install dependencies, unit tests, TypeScript + Vite
 *   npm run ci:quick    # skip dependency installation
 *
 * Exits 1 if installation, tests, or build fail. Never reports success early.
 */
import { spawn, spawnSync } from 'node:child_process';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const logPath = resolve(root, '.local-ci', 'last-run.log');
const args = new Set(process.argv.slice(2));
if ([...args].some(arg => arg !== '--skip-install')) {
  process.stderr.write('Usage: node scripts/local-ci.mjs [--skip-install]\n');
  process.exitCode = 2;
} else {
  await run();
}

async function run() {
  mkdirSync(dirname(logPath), { recursive: true });
  const log = createWriteStream(logPath, { flags: 'w' });
  function print(value, stream = process.stdout) {
    stream.write(value);
    log.write(value);
  }
  const major = Number(process.versions.node.split('.')[0]);
  const revision = spawnSync('git', ['rev-parse', '--short', 'HEAD'], {
    cwd: root, encoding: 'utf8',
  }).stdout?.trim() || 'unknown';
  print(`=== TheThreeRealms local CI ===\n`);
  print(`Date: ${new Date().toISOString()}\n`);
  print(`Commit: ${revision}\n`);
  print(`Node: ${process.version} | Platform: ${process.platform}\n`);
  print(`Log file: ${logPath}\n`);

  if (!Number.isFinite(major) || major < 22) {
    print('ERROR: Node 22+ is required by the TypeScript test runner.\n', process.stderr);
    process.exitCode = 1;
    await new Promise(done => log.end(done));
    return;
  }

  const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  const results = [];
  async function step(label, commandArgs) {
    print(`\n=== ${label} ===\n`);
    const status = await new Promise(resolveStatus => {
      const child = spawn(npm, commandArgs, {
        cwd: root, stdio: ['inherit', 'pipe', 'pipe'],
        env: { ...process.env, FORCE_COLOR: '0' },
      });
      child.stdout.on('data', bytes => print(bytes));
      child.stderr.on('data', bytes => print(bytes, process.stderr));
      child.on('error', error => {
        print(`ERROR: ${error.message}\n`, process.stderr);
        resolveStatus(127);
      });
      child.on('close', (code, signal) => resolveStatus(code ?? (signal ? 130 : 1)));
    });
    const passed = status === 0;
    results.push({ label, passed, status });
    print(`[local-ci] ${label}: ${passed ? 'PASS' : `FAIL (exit ${status})`}\n`);
    return passed;
  }

  const skipInstall = args.has('--skip-install');
  const installArgs = existsSync(resolve(root, 'package-lock.json'))
    ? ['ci', '--no-audit', '--no-fund']
    : ['install', '--no-package-lock', '--no-audit', '--no-fund'];

  let installed = true;
  if (!skipInstall) {
    installed = await step('Install dependencies', installArgs);
  } else {
    print('\n[local-ci] Dependency installation skipped; using current node_modules.\n');
  }

  if (installed) {
    // Run both steps even if tests fail, so one log captures all issues.
    await step('Unit tests', ['test']);
    await step('TypeScript + Vite build', ['run', 'build']);
  } else {
    print('[local-ci] Skipping tests and build because dependency install failed.\n');
  }

  const ok = installed && results.every(result => result.passed);
  print(`\n=== FINAL: ${ok ? 'PASS' : 'FAIL'} ===\n`);
  print('Check failures in .local-ci/last-run.log before merging.\n');
  process.exitCode = ok ? 0 : 1;
  await new Promise(done => log.end(done));
}
