import { checkRateLimit } from './_ratelimit.js';
import { json } from './_ai.js';
import { flattenCategories, matchCategory, normalizeRecipeLink } from './_rakuten.js';
import {
  categoryListUrl,
  categoryRankingUrl,
  authHeaders,
  failureReason,
} from './_rakutenClient.js';

// 楽天ウェブサービスは 1リクエスト/秒。カテゴリ一覧とランキングを続けて
// 呼ぶ場合はこの間隔をあける。
const RAKUTEN_INTERVAL_MS = 1100;

// カテゴリ一覧は 2000 件超あり、めったに変わらない。
// ウォームなインスタンスの間だけ持ち回す。
const CATEGORY_TTL_MS = 24 * 60 * 60 * 1000;

const g = globalThis;
if (!g.__rakutenCategories) {
  g.__rakutenCategories = { fetchedAt: 0, list: null };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 呼び出し側が原因を切り分けられるよう、理由コードを載せて運ぶ。
class RakutenError extends Error {
  constructor(reason, message) {
    super(message);
    this.name = 'RakutenError';
    this.reason = reason;
  }
}

// 失敗の理由は楽天が返す本文にしか書かれていない。必ずログに残す。
async function fetchRakuten(url, accessKey, label) {
  const res = await fetch(url, { headers: authHeaders(accessKey) });
  if (!res.ok) {
    const body = await res.text().catch(() => '(本文を読めませんでした)');
    console.error(`Rakuten ${label} failed:`, res.status, body);
    throw new RakutenError(failureReason(res.status), `${label} (${res.status})`);
  }
  return res.json();
}

async function loadCategories(appId, accessKey) {
  const cache = g.__rakutenCategories;
  if (cache.list && Date.now() - cache.fetchedAt < CATEGORY_TTL_MS) {
    return { list: cache.list, fromCache: true };
  }

  const data = await fetchRakuten(categoryListUrl(appId), accessKey, 'category list');
  const list = flattenCategories(data?.result);
  if (list.length) {
    cache.list = list;
    cache.fetchedAt = Date.now();
  }
  return { list, fromCache: false };
}

export async function onRequestPost(context) {
  const { request, env } = context;

  const limited = checkRateLimit(request);
  if (limited) {
    return json({ error: limited.error }, 429, { 'Retry-After': String(limited.retryAfter) });
  }

  // 新ゲートウェイは applicationId と accessKey の両方を要求する。
  // 片方でも欠けていれば叩かずに、理由を添えて機能を止める。
  const appId = env.RAKUTEN_APPLICATION_ID;
  const accessKey = env.RAKUTEN_ACCESS_KEY;
  if (!appId || !accessKey) {
    console.error('Rakuten credentials missing:', {
      hasApplicationId: Boolean(appId),
      hasAccessKey: Boolean(accessKey),
    });
    return json({ configured: false, link: null, reason: 'not_configured' });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'リクエスト形式が不正です' }, 400);
  }

  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) {
    return json({ error: '料理名がありません' }, 400);
  }

  try {
    const { list, fromCache } = await loadCategories(appId, accessKey);

    const category = matchCategory(name, list);
    if (!category) {
      return json({ configured: true, link: null, reason: 'no_match' });
    }

    // 続けて叩く場合だけ間隔をあける
    if (!fromCache) await sleep(RAKUTEN_INTERVAL_MS);

    const data = await fetchRakuten(
      categoryRankingUrl(appId, category.id),
      accessKey,
      'category ranking'
    );

    const link = normalizeRecipeLink(data);
    return json({ configured: true, link, reason: link ? null : 'no_recipe' });
  } catch (e) {
    // RakutenError は fetchRakuten で本文ごとログ済み。それ以外はここで出す。
    if (!(e instanceof RakutenError)) {
      console.error('Recipe link handler error:', e);
    }
    return json({ configured: true, link: null, reason: e?.reason ?? 'upstream_error' });
  }
}
