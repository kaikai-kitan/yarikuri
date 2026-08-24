// 冷蔵庫の在庫まわりのロジック。すべて純関数で、保存や画面には依存しない。
//
// 期限は 'YYYY-MM-DD' 文字列で持つ。時刻を含めないのは、
// 「今日が期限」を時刻で切り上げ／切り捨てしないため。

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400 * 1000;

// この日数以内に切れる食材は「もうすぐ」として扱う。
export const EXPIRY_SOON_DAYS = 3;

// 品目種別ごとの日持ち。null は「期限を設けない」（米・調味料・乾物など）。
// 判定できなかったものも staple 扱いにする。短すぎる期限を推測で入れて
// まだ使える食材を「切れた」と表示するほうが害が大きいため。
export const DEFAULT_SHELF_LIFE_DAYS = {
  perishable: 3,
  vegetable: 7,
  dairy: 7,
  staple: null,
};

const startOfDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate());

const parseIsoDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

// 期限までの残り日数。今日なら 0、過ぎていれば負。期限が無ければ null。
export function daysUntilExpiry(item, now = new Date()) {
  const iso = item?.expiresAt;
  if (typeof iso !== 'string' || !DATE_PATTERN.test(iso)) return null;
  return Math.round((parseIsoDate(iso) - startOfDay(now)) / DAY_MS);
}

// 'fresh' | 'soon' | 'expired'。期限未設定は fresh 扱い。
export function expiryState(item, now = new Date()) {
  const days = daysUntilExpiry(item, now);
  if (days === null) return 'fresh';
  if (days < 0) return 'expired';
  return days <= EXPIRY_SOON_DAYS ? 'soon' : 'fresh';
}

// 期限が近い順。期限を持たない食材は最後に、元の順序のまま残す。
export function sortByExpiry(items, now = new Date()) {
  return [...(items ?? [])].sort((a, b) => {
    const left = daysUntilExpiry(a, now);
    const right = daysUntilExpiry(b, now);
    if (left === null && right === null) return 0;
    if (left === null) return 1;
    if (right === null) return -1;
    return left - right;
  });
}

const pad2 = (n) => String(n).padStart(2, '0');

// ローカル日付を 'YYYY-MM-DD' に。toISOString は UTC なので使わない
// （日本時間の深夜だと前日になり、期限が1日短くなる）。
const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

// 品目種別から既定の賞味期限を出す。期限を設けない種別は undefined。
export function defaultExpiryFor(kind, now = new Date()) {
  const days = DEFAULT_SHELF_LIFE_DAYS[kind];
  if (days == null) return undefined;

  const expiry = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days);
  return toIsoDate(expiry);
}

// レシピ提案へ送る在庫。期限が近い順に並べ、残り日数を添える。
// 期限切れは送らない。使い切りを勧めるべきではないため。
export function fridgeForSuggestion(items, now = new Date()) {
  return sortByExpiry(items, now)
    .filter((item) => expiryState(item, now) !== 'expired')
    .map((item) => {
      const daysLeft = daysUntilExpiry(item, now);
      return daysLeft === null ? { name: item.name } : { name: item.name, daysLeft };
    });
}

// もうすぐ切れる食材の名前。提案カードで「使い切れます」を出すのに使う。
export function expiringSoonNames(items, now = new Date()) {
  return (items ?? []).filter((item) => expiryState(item, now) === 'soon').map((item) => item.name);
}
