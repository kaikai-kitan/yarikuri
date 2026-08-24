// 家計簿の集計ロジック。すべて純関数で、保存や画面には依存しない。

// 支出カテゴリ。冷蔵庫に登録するのは food のみ。
export const CATEGORIES = ['food', 'daily', 'other'];

export const CATEGORY_LABELS = {
  food: '食費',
  daily: '日用品',
  other: 'その他',
};

// カテゴリ導入前の保存データは isFood しか持たないため、そこから移行する。
export function categoryOf(item) {
  if (CATEGORIES.includes(item?.category)) return item.category;
  return item?.isFood === true ? 'food' : 'other';
}

const UNSET_LIMIT = { total: 0, food: 0, daily: 0 };

const nonNegative = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : 0;
};

// 月予算。配分導入前は単なる数値で保存されていたため、そこから移行する。
// 配分の合計が総額を超える保存データは、総額を正として配分を捨てる。
export function normalizeLimit(value) {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value >= 0 ? { ...UNSET_LIMIT, total: value } : UNSET_LIMIT;
  }
  if (!value || typeof value !== 'object') return UNSET_LIMIT;

  const total = nonNegative(value.total);
  const food = nonNegative(value.food);
  const daily = nonNegative(value.daily);
  return food + daily > total ? { ...UNSET_LIMIT, total } : { total, food, daily };
}

const pad2 = (n) => String(n).padStart(2, '0');

// 'YYYY-MM'。支出の月次集計キーとして使う。
export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}`;
}

// 当日を含む、その月の残り日数。1日あたりの目安を出すのに使う。
export function daysLeftInMonth(date = new Date()) {
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  return lastDay - date.getDate() + 1;
}

export function expensesInMonth(expenses, key) {
  return (expenses ?? []).filter((e) => typeof e?.date === 'string' && e.date.startsWith(key));
}

// レシート総額の合計。数値でない total は集計から外す。
export function totalOf(expenses) {
  return (expenses ?? []).reduce((sum, e) => {
    const value = Number(e?.total);
    return Number.isFinite(value) ? sum + value : sum;
  }, 0);
}

// 冷蔵庫に登録できる品目（食材・調味料）だけを取り出す。
export function foodItemsOf(expense) {
  return (expense?.items ?? []).filter((i) => categoryOf(i) === 'food');
}

// カテゴリ別の支出合計。
// 品目の合計がレシート合計に満たない差額（袋代・税の端数・読み取り漏れ）は
// 「その他」に寄せて、カテゴリ合計とレシート合計を一致させる。
export function totalByCategory(expenses) {
  const totals = { food: 0, daily: 0, other: 0 };

  for (const e of expenses ?? []) {
    let itemsTotal = 0;
    for (const item of e?.items ?? []) {
      const price = Number(item?.price);
      if (!Number.isFinite(price)) continue;
      totals[categoryOf(item)] += price;
      itemsTotal += price;
    }

    // 差額（袋代・税の端数・読み取り漏れ）と、品目を持たない手入力の記録は、
    // 記録自体のカテゴリに寄せる。指定が無ければ「その他」。
    const receiptTotal = Number(e?.total);
    if (Number.isFinite(receiptTotal)) {
      totals[categoryOf({ category: e?.category })] += Math.max(0, receiptTotal - itemsTotal);
    }
  }

  return totals;
}

// 画面とAIプロンプトの両方が参照する、今月の家計サマリー。
export function budgetSummary({ monthlyLimit, expenses, now = new Date() }) {
  const limits = normalizeLimit(monthlyLimit);
  const thisMonth = expensesInMonth(expenses, monthKey(now));
  const spent = totalOf(thisMonth);
  const byCategory = totalByCategory(thisMonth);
  const daysLeft = daysLeftInMonth(now);
  const hasLimit = limits.total > 0;
  const remaining = hasLimit ? limits.total - spent : 0;

  // 配分が 0 のカテゴリは「上限なし」。支出額だけは常に出す。
  const breakdown = (name) => {
    const limit = limits[name];
    const categoryHasLimit = limit > 0;
    const categoryRemaining = categoryHasLimit ? limit - byCategory[name] : 0;
    return {
      limit,
      spent: byCategory[name],
      remaining: categoryRemaining,
      hasLimit: categoryHasLimit,
      isOver: categoryHasLimit && categoryRemaining < 0,
    };
  };

  return {
    monthlyLimit: limits.total,
    limits,
    hasLimit,
    spent,
    remaining,
    daysLeft,
    dailyAllowance: remaining > 0 ? Math.floor(remaining / daysLeft) : 0,
    isOver: hasLimit && remaining < 0,
    categories: { food: breakdown('food'), daily: breakdown('daily') },
  };
}

// 記録する前に「記録したらどうなるか」を出す。
// 予算未設定、または当月以外のレシートは今月の残額に影響しない。
export function projectExpense({ summary, amount, date, now = new Date() }) {
  const value = Number(amount) || 0;
  const applies =
    summary.hasLimit && typeof date === 'string' && date.startsWith(monthKey(now));

  if (!applies) {
    return {
      applies: false,
      remaining: summary.remaining,
      dailyAllowance: summary.dailyAllowance,
      isOver: false,
    };
  }

  const remaining = summary.remaining - value;
  return {
    applies: true,
    remaining,
    dailyAllowance: remaining > 0 ? Math.floor(remaining / summary.daysLeft) : 0,
    isOver: remaining < 0,
  };
}
