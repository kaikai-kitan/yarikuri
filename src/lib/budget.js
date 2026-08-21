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

    const receiptTotal = Number(e?.total);
    if (Number.isFinite(receiptTotal)) {
      totals.other += Math.max(0, receiptTotal - itemsTotal);
    }
  }

  return totals;
}

// 画面とAIプロンプトの両方が参照する、今月の家計サマリー。
export function budgetSummary({ monthlyLimit, expenses, now = new Date() }) {
  const limit = Number(monthlyLimit) || 0;
  const spent = totalOf(expensesInMonth(expenses, monthKey(now)));
  const daysLeft = daysLeftInMonth(now);
  const hasLimit = limit > 0;
  const remaining = hasLimit ? limit - spent : 0;

  return {
    monthlyLimit: limit,
    hasLimit,
    spent,
    remaining,
    daysLeft,
    dailyAllowance: remaining > 0 ? Math.floor(remaining / daysLeft) : 0,
    isOver: hasLimit && remaining < 0,
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
