// レシピ提案の応答を、画面に流せる形に整える。
// AIの出力をそのまま信用しないための境界。純関数なのでテストから直接呼べる。

const MAX_RECIPES = 6;
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

const missingList = (value) =>
  asList(value)
    .filter((i) => isFilledString(i?.name))
    .slice(0, MAX_LIST)
    .map((i) => ({
      name: String(i.name).slice(0, MAX_NAME).trim(),
      estimatedPrice: yenValue(i.estimatedPrice),
      buyAt: text(i.buyAt, MAX_NAME),
    }));

export function normalizeRecipes(parsed) {
  return asList(parsed)
    .filter((r) => isFilledString(r?.name))
    .slice(0, MAX_RECIPES)
    .map((r) => ({
      name: text(r.name, MAX_NAME),
      emoji: text(r.emoji, 4) || '🍽',
      description: text(r.description, MAX_TEXT),
      usedFromFridge: nameList(r.usedFromFridge),
      usedFromDeals: nameList(r.usedFromDeals),
      missingIngredients: missingList(r.missingIngredients),
      totalCost: yenValue(r.totalCost),
      // 1人前のカロリー。読めなければ null。
      calories: kcalValue(r.calories),
      cookingTime: text(r.cookingTime, 20),
    }));
}

// 「約30分」から分を取り出す。読めなければ末尾に送るため Infinity。
const minutesOf = (recipe) => {
  const match = String(recipe?.cookingTime ?? '').match(/\d+/);
  return match ? Number(match[0]) : Infinity;
};

const KEYS = {
  cost: (r) => (Number.isFinite(r?.totalCost) ? r.totalCost : Infinity),
  // 不明なものを先頭に置くと「いちばん低カロリー」に見えるため末尾へ送る
  calorie: (r) => (Number.isFinite(r?.calories) ? r.calories : Infinity),
  time: minutesOf,
};

// AIの並び順を当てにせず、選ばれた軸でこちらでも並べ直す。
export function sortByPriority(recipes, priority) {
  const key = KEYS[priority];
  if (!key) return recipes;

  return [...asList(recipes)].sort((a, b) => key(a) - key(b));
}
