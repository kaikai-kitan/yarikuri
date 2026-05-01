// シンプルなIPベースのレート制限。
//
// 注意: Vercel Serverless Functionsはコールドスタートで
// メモリがリセットされる。そのため厳密な制限ではなく、
// 「同一コンテナで連打されるBot」を弾くベストエフォート。
//
// 本格運用ではUpstash Redis (無料枠あり) との連携を推奨:
// https://upstash.com/docs/redis/sdks/ratelimit-ts/overview

const WINDOW_MS = 60 * 1000; // 1分
const MAX_PER_WINDOW = 10; // 1分あたり最大10リクエスト
const HOUR_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 60; // 1時間あたり最大60リクエスト

// グローバル状態 (warmコンテナで保持)
const g = globalThis;
if (!g.__rateLimitStore) {
  g.__rateLimitStore = new Map();
}
const store = g.__rateLimitStore;

function getIp(req) {
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.length > 0) {
    return xff.split(',')[0].trim();
  }
  return req.headers['x-real-ip'] || 'unknown';
}

/**
 * @returns {null | { error: string, retryAfter: number }}
 */
export function checkRateLimit(req) {
  const ip = getIp(req);
  const now = Date.now();

  let history = store.get(ip) || [];
  // 古いエントリを掃除
  history = history.filter((ts) => now - ts < HOUR_WINDOW_MS);

  // 1分間制限
  const lastMinute = history.filter((ts) => now - ts < WINDOW_MS);
  if (lastMinute.length >= MAX_PER_WINDOW) {
    return {
      error: 'リクエストが多すぎます。少し待ってから再度お試しください。',
      retryAfter: Math.ceil(
        (WINDOW_MS - (now - lastMinute[0])) / 1000
      ),
    };
  }

  // 1時間制限
  if (history.length >= MAX_PER_HOUR) {
    return {
      error: '1時間あたりの利用上限を超えました。時間を置いてお試しください。',
      retryAfter: Math.ceil(
        (HOUR_WINDOW_MS - (now - history[0])) / 1000
      ),
    };
  }

  history.push(now);
  store.set(ip, history);

  // メモリ肥大化対策: 古いIPを定期的に削除
  if (store.size > 10000) {
    for (const [k, v] of store.entries()) {
      const cleaned = v.filter((ts) => now - ts < HOUR_WINDOW_MS);
      if (cleaned.length === 0) store.delete(k);
      else store.set(k, cleaned);
    }
  }

  return null;
}
