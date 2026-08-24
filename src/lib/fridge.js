// 冷蔵庫の在庫まわりのロジック。すべて純関数で、保存や画面には依存しない。
//
// 期限は 'YYYY-MM-DD' 文字列で持つ。時刻を含めないのは、
// 「今日が期限」を時刻で切り上げ／切り捨てしないため。

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const DAY_MS = 86400 * 1000;

// この日数以内に切れる食材は「もうすぐ」として扱う。
export const EXPIRY_SOON_DAYS = 3;

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
