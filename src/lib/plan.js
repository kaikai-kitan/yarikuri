// 一週間の献立。すべて純関数で、保存や画面には依存しない。
//
// 献立は「初日にまとめ買いし、以降は前日の残りを繋いでいく」前提で組む。
// carryOver は翌日へ残す食材、addOns はその日だけ買い足す少量のもの。

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const PLAN_DAYS = 7;

const pad2 = (n) => String(n).padStart(2, '0');

const toIsoDate = (date) =>
  `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;

const parseIsoDate = (iso) => {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
};

const isIsoDate = (value) => typeof value === 'string' && DATE_PATTERN.test(value);

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

const asList = (value) => (Array.isArray(value) ? value : []);

// n 日目（0 始まり）の日付。
export function planDayDate(startDate, index) {
  const start = parseIsoDate(startDate);
  return toIsoDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + index));
}

// 今日が献立の何日目か。開始前・終了後は null。
export function currentDayIndex(plan, now = new Date()) {
  if (!plan?.startDate || !isIsoDate(plan.startDate)) return null;

  const start = parseIsoDate(plan.startDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const index = Math.round((today - start) / (86400 * 1000));

  return index >= 0 && index < plan.days.length ? index : null;
}

export function isPlanFinished(plan, now = new Date()) {
  return currentDayIndex(plan, now) === null;
}

export function cookedCount(plan) {
  return asList(plan?.days).filter((d) => d?.cookedAt).length;
}

// 保存済みの献立を画面に渡せる形に整える。作り直せる情報なので、
// 壊れていれば null を返して「献立なし」として扱う。
export function sanitizePlan(raw) {
  if (!raw || typeof raw !== 'object') return null;
  if (!isIsoDate(raw.startDate)) return null;

  const days = asList(raw.days)
    .filter((d) => isFilledString(d?.name))
    .slice(0, PLAN_DAYS)
    .map((d, i) => ({
      ...d,
      day: i + 1,
      usedFromFridge: asList(d.usedFromFridge),
      usedFromShopping: asList(d.usedFromShopping),
      carryOver: asList(d.carryOver),
      addOns: asList(d.addOns),
    }));

  if (!days.length) return null;

  return {
    v: 1,
    startDate: raw.startDate,
    createdAt: Number(raw.createdAt) || 0,
    shoppingList: asList(raw.shoppingList).filter((s) => isFilledString(s?.name)),
    days,
  };
}

// その日を「作った／作っていない」で切り替える。非破壊。
// 冷蔵庫を減らすのは画面側の責務。ここは献立だけを扱う。
export function toggleCooked(plan, index, now = Date.now()) {
  if (!plan?.days?.[index]) return plan;

  return {
    ...plan,
    days: plan.days.map((d, i) => {
      if (i !== index) return d;
      const { cookedAt, ...rest } = d;
      return cookedAt ? rest : { ...rest, cookedAt: now };
    }),
  };
}
