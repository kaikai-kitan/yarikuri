// 週次献立の応答を、保存できる形に整える。
// AIの出力をそのまま信用しないための境界。純関数なのでテストから直接呼べる。

const MAX_DAYS = 7;
const MAX_NAME = 40;
const MAX_TEXT = 120;
const MAX_LIST = 12;

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

const asList = (value) => (Array.isArray(value) ? value : []);

const text = (value, max) => (isFilledString(value) ? String(value).slice(0, max).trim() : '');

const yenValue = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : 0;
};

// 「分からない」と 0kcal は別物なので、読めなければ null にする。
const kcalValue = (value) => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : null;
};

const nameList = (value) =>
  asList(value).filter(isFilledString).slice(0, MAX_LIST).map((n) => n.slice(0, MAX_NAME).trim());

const priced = (value) =>
  asList(value)
    .filter((i) => isFilledString(i?.name))
    .slice(0, MAX_LIST)
    .map((i) => ({ name: String(i.name).slice(0, MAX_NAME).trim(), estimatedPrice: yenValue(i.estimatedPrice) }));

export function normalizePlan(parsed, startDate) {
  const days = asList(parsed?.days)
    .filter((d) => isFilledString(d?.name))
    .slice(0, MAX_DAYS)
    .map((d, i) => ({
      day: i + 1,
      name: text(d.name, MAX_NAME),
      emoji: text(d.emoji, 4) || '🍽',
      description: text(d.description, MAX_TEXT),
      // その日に選んだ理由。無作為な提案と区別がつくよう必ず持たせる。
      reason: text(d.reason, MAX_TEXT),
      usedFromFridge: nameList(d.usedFromFridge),
      usedFromShopping: nameList(d.usedFromShopping),
      // 翌日へ残す食材
      carryOver: nameList(d.carryOver),
      // その日だけ買い足す少量のもの
      addOns: priced(d.addOns),
      totalCost: yenValue(d.totalCost),
      // 1人前のカロリー。読めなければ null。
      calories: kcalValue(d.calories),
      cookingTime: text(d.cookingTime, 20),
    }));

  if (!days.length) return null;

  return {
    startDate,
    shoppingList: priced(parsed?.shoppingList),
    days,
  };
}
