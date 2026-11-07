import test from 'node:test';
import assert from 'node:assert/strict';
import { createLocalId } from '../src/game/id.ts';
import { describeStorageError } from '../src/game/db.ts';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('prefers native randomUUID when available', () => {
  const native = '123e4567-e89b-42d3-a456-426614174000';
  assert.equal(createLocalId({randomUUID: () => native}), native);
});

test('supports HTTP LAN browser contexts without randomUUID', () => {
  let n = 0;
  const source = {getRandomValues: (bytes) => {
    for(let i = 0; i < bytes.length; i++) bytes[i] = (n++ * 7 + 5) & 0xff;
    return bytes;
  }};
  const first = createLocalId(source);
  const second = createLocalId(source);
  assert.match(first, UUID_V4);
  assert.match(second, UUID_V4);
  assert.notEqual(first, second);
});

test('falls back when browser randomUUID is exposed but throws', () => {
  const id = createLocalId({
    randomUUID: () => { throw new Error('insecure context'); },
    getRandomValues: bytes => { bytes.fill(10); return bytes; },
  });
  assert.match(id, UUID_V4);
});

test('does not silently issue non-random IDs when Web Crypto is unavailable', () => {
  assert.throws(() => createLocalId({}), /Web Crypto API/);
});

test('storage errors distinguish permission, quota and database states', () => {
  assert.match(describeStorageError({name:'QuotaExceededError'}), /空间已满/);
  assert.match(describeStorageError({name:'SecurityError'}), /禁止本站/);
  assert.match(describeStorageError({name:'InvalidStateError'}), /数据库状态异常/);
  assert.match(describeStorageError(new TypeError('randomUUID is not a function')), /写入失败/);
});
