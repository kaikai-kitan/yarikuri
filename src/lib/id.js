// crypto.randomUUID は secure context (https / localhost) 限定で、
// LAN経由の dev サーバー(http://192.168.x.x:3000)や古い端末では未定義になる。
// 利用できない環境では時刻＋乱数のIDにフォールバックする。
const randomChunk = () => Math.random().toString(36).slice(2, 10);

export function newId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${randomChunk()}${randomChunk()}`;
}
