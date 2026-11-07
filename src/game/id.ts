/**
 * Local record identifiers are not authentication tokens. Crypto.randomUUID()
 * is HTTPS/localhost-only in browsers, whereas getRandomValues() is supported
 * on HTTP LAN development URLs as well.
 */
type LocalRandomSource = {
  randomUUID?: () => string;
  getRandomValues?: (bytes: Uint8Array) => Uint8Array;
};

export function createLocalId(source?: LocalRandomSource): string {
  const random = source ?? globalThis.crypto;
  if (typeof random?.randomUUID === 'function') {
    try {
      return random.randomUUID();
    } catch {
      // Some browser contexts expose the method but refuse to execute it.
    }
  }

  if (typeof random?.getRandomValues !== 'function') {
    throw new Error('浏览器无法生成本地记录 ID（缺少 Web Crypto API）');
  }
  const bytes = new Uint8Array(16);
  random.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
