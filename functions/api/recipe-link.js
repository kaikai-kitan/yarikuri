import { checkRateLimit } from './_ratelimit.js';
import { json } from './_ai.js';
import { flattenCategories, matchCategory, normalizeRecipeLink } from './_rakuten.js';

const CATEGORY_LIST_URL = 'https://app.rakuten.co.jp/services/api/Recipe/CategoryList/20170426';
const RANKING_URL = 'https://app.rakuten.co.jp/services/api/Recipe/CategoryRanking/20170426';

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

async function loadCategories(appId) {
  const cache = g.__rakutenCategories;
  if (cache.list && Date.now() - cache.fetchedAt < CATEGORY_TTL_MS) {
    return { list: cache.list, fromCache: true };
  }

  const res = await fetch(`${CATEGORY_LIST_URL}?applicationId=${encodeURIComponent(appId)}&format=json`);
  if (!res.ok) {
    throw new Error(`カテゴリ一覧の取得に失敗しました (${res.status})`);
  }

  const data = await res.json();
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

  // 未設定なら機能ごと使えないことを伝える。エラーにはしない。
  const appId = env.RAKUTEN_APPLICATION_ID;
  if (!appId) {
    return json({ configured: false, link: null });
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
    const { list, fromCache } = await loadCategories(appId);

    const category = matchCategory(name, list);
    if (!category) {
      return json({ configured: true, link: null });
    }

    // 続けて叩く場合だけ間隔をあける
    if (!fromCache) await sleep(RAKUTEN_INTERVAL_MS);

    const res = await fetch(
      `${RANKING_URL}?applicationId=${encodeURIComponent(appId)}&categoryId=${encodeURIComponent(category.id)}&format=json`
    );
    if (!res.ok) {
      console.error('Rakuten ranking error:', res.status, await res.text());
      return json({ configured: true, link: null });
    }

    return json({ configured: true, link: normalizeRecipeLink(await res.json()) });
  } catch (e) {
    console.error('Recipe link handler error:', e);
    return json({ configured: true, link: null });
  }
}
