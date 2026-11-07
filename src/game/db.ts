import { createLocalId } from './id.ts';

/** All user-written wishes remain in this browser's IndexedDB. No network writes. */
export type IncenseMemory = { id: string; createdAt: string };
export type FortuneMemory = { id: string; number: number; createdAt: string };
export type BlessingMemory = { id: string; content: string; template: number; slot: number; createdAt: string };
export type Memories = { incense: IncenseMemory[]; fortunes: FortuneMemory[]; blessings: BlessingMemory[] };

type Store = 'incense' | 'fortunes' | 'blessings';
const DB_NAME = 'the-three-realms-v1';
const EMPTY: Memories = { incense: [], fortunes: [], blessings: [] };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') return reject(new Error('浏览器不支持本地数据库'));
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      for (const name of ['incense', 'fortunes', 'blessings'] as const) {
        if (!database.objectStoreNames.contains(name)) database.createObjectStore(name, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('数据库无法打开'));
  });
}

async function runStore<T>(name: Store, mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    try {
      const transaction = db.transaction(name, mode);
      const request = action(transaction.objectStore(name));
      let result: T;
      request.onsuccess = () => { result = request.result; };
      transaction.oncomplete = () => { db.close(); resolve(result); };
      transaction.onabort = () => { db.close(); reject(transaction.error ?? new Error('本地保存失败')); };
      transaction.onerror = () => { /* onabort owns the rejection */ };
    } catch (error) {
      // Opening a transaction or object store can throw synchronously.
      db.close();
      reject(error);
    }
  });
}

export async function loadMemories(): Promise<Memories> {
  const [incense, fortunes, blessings] = await Promise.all([
    runStore<IncenseMemory[]>('incense', 'readonly', store => store.getAll()),
    runStore<FortuneMemory[]>('fortunes', 'readonly', store => store.getAll()),
    runStore<BlessingMemory[]>('blessings', 'readonly', store => store.getAll()),
  ]);
  return { incense, fortunes, blessings };
}

export async function addIncenseMemory(): Promise<IncenseMemory> {
  const memory: IncenseMemory = { id: createLocalId(), createdAt: new Date().toISOString() };
  await runStore('incense', 'readwrite', store => store.add(memory));
  return memory;
}

export async function addFortuneMemory(number: number): Promise<FortuneMemory> {
  const memory: FortuneMemory = { id: createLocalId(), number, createdAt: new Date().toISOString() };
  await runStore('fortunes', 'readwrite', store => store.add(memory));
  return memory;
}

export async function addBlessingMemory(content: string, template: number, slot: number): Promise<BlessingMemory> {
  const memory: BlessingMemory = { id: createLocalId(), content, template, slot, createdAt: new Date().toISOString() };
  await runStore('blessings', 'readwrite', store => store.add(memory));
  return memory;
}

export async function deleteBlessingMemory(id: string): Promise<void> {
  await runStore('blessings', 'readwrite', store => store.delete(id));
}

export async function clearMemories(): Promise<Memories> {
  const db = await openDatabase();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['incense', 'fortunes', 'blessings'], 'readwrite');
    for (const name of ['incense', 'fortunes', 'blessings'] as const) tx.objectStore(name).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onabort = () => { db.close(); reject(tx.error ?? new Error('清除失败')); };
  });
  return { ...EMPTY, incense: [], fortunes: [], blessings: [] };
}

/** User-safe storage error message; don't misreport every error as permissions. */
export function describeStorageError(error: unknown): string {
  const name = error && typeof error === 'object' && 'name' in error ? String(error.name) : '';
  switch (name) {
    case 'QuotaExceededError':
      return '浏览器分配给本站的存储空间已满，请清理空间后重试。';
    case 'SecurityError':
    case 'NotAllowedError':
      return '浏览器禁止本站使用本地存储，请检查隐私设置或尝试普通浏览窗口。';
    case 'InvalidStateError':
    case 'VersionError':
      return '本地数据库状态异常，请刷新页面后重试。';
    default:
      return '本地数据库写入失败；请重试，并在开发者控制台查看具体错误。';
  }
}
