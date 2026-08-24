// 楽天ウェブサービスへのリクエストの組み立て。
//
// 旧ドメイン (app.rakuten.co.jp/services/api/...) は 19桁数字の applicationId しか
// 受け付けない。現在のコンソールが発行するのは UUID 形式の applicationId と
// pk_ で始まる accessKey の組なので、新ゲートウェイを使う必要がある。
//
// 純関数だけを置き、fetch は呼ばない。テストから直接呼べる。

const BASE = 'https://openapi.rakuten.co.jp/recipems/api/Recipe';

export const CATEGORY_LIST_URL = `${BASE}/CategoryList/20170426`;
export const CATEGORY_RANKING_URL = `${BASE}/CategoryRanking/20170426`;

function withParams(base, params) {
  const url = new URL(base);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
  return url.toString();
}

// accessKey は URL に載せない。クエリでも通るが、アクセスログに残る。
export function categoryListUrl(appId) {
  return withParams(CATEGORY_LIST_URL, { applicationId: appId, format: 'json' });
}

export function categoryRankingUrl(appId, categoryId) {
  return withParams(CATEGORY_RANKING_URL, {
    applicationId: appId,
    categoryId,
    format: 'json',
  });
}

// ゲートウェイが見るヘッダ名は `accessKey`。`X-Access-Key` では 400 になる。
export function authHeaders(accessKey) {
  return { accessKey };
}

// 呼び出し側が原因を切り分けられるよう、HTTPステータスを理由コードに畳む。
export function failureReason(status) {
  if (status === 401 || status === 403) return 'auth_failed';
  if (status === 429) return 'rate_limited';
  if (status === 400) return 'bad_request';
  return 'upstream_error';
}
