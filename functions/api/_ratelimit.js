// Cloudflare Workers 向けレート制限ユーティリティ。
// Workers はリクエストごとに分離されるため、globalThis はウォームインスタンス内でのみ有効。
// 厳密な制限が必要な場合は Upstash Redis (無料枠あり) との連携を推奨。

const WINDOW_MS = 60 * 1000;
const MAX_PER_WINDOW = 10;
const HOUR_WINDOW_MS = 60 * 60 * 1000;
const MAX_PER_HOUR = 60;

const g = globalThis;
if (!g.__rateLimitStore) {
  g.__rateLimitStore = new Map();
}
const store = g.__rateLimitStore;

function getIp(request) {
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('cf-connecting-ip') || 'unknown';
}

/**
 * @returns {null | { error: string, retryAfter: number }}
 */
export function checkRateLimit(request) {
  const ip = getIp(request);
  const now = Date.now();

  let history = store.get(ip) || [];
  history = history.filter((ts) => now - ts < HOUR_WINDOW_MS);

  const lastMinute = history.filter((ts) => now - ts < WINDOW_MS);
  if (lastMinute.length >= MAX_PER_WINDOW) {
    return {
      error: 'リクエストが多すぎます。少し待ってから再度お試しください。',
      retryAfter: Math.ceil((WINDOW_MS - (now - lastMinute[0])) / 1000),
    };
  }

  if (history.length >= MAX_PER_HOUR) {
    return {
      error: '1時間あたりの利用上限を超えました。時間を置いてお試しください。',
      retryAfter: Math.ceil((HOUR_WINDOW_MS - (now - history[0])) / 1000),
    };
  }

  history.push(now);
  store.set(ip, history);

  if (store.size > 10000) {
    for (const [k, v] of store.entries()) {
      const cleaned = v.filter((ts) => now - ts < HOUR_WINDOW_MS);
      if (cleaned.length === 0) store.delete(k);
      else store.set(k, cleaned);
    }
  }

  return null;
}
