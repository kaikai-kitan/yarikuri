// プロンプトの断片を組み立てる共通処理。
// suggest-recipes と plan-week で共有する。純関数なのでテストから直接呼べる。

export const yen = (n) => `${Math.round(n).toLocaleString('ja-JP')}円`;

// この日数以内に切れる食材は最優先で使い切らせる。
export const URGENT_DAYS = 3;

// 在庫1件の表示。期限を持たない食材や、旧クライアントが送る文字列にも耐える。
export function fridgeLine(entry) {
  if (typeof entry === 'string') return `・${entry}`;
  if (!entry || typeof entry.name !== 'string') return null;

  const { name, daysLeft } = entry;
  if (typeof daysLeft !== 'number') return `・${name}`;
  if (daysLeft === 0) return `・${name}（今日が期限）`;
  return `・${name}（あと${daysLeft}日）`;
}

export function fridgeText(fridge) {
  const lines = (fridge ?? []).map(fridgeLine).filter(Boolean);
  return lines.length ? lines.join('\n') : '（登録なし）';
}

export function flyerText(flyerItems) {
  const lines = (flyerItems ?? []).map((d) => `・${d.name} ${d.price}円${d.store ? `（${d.store}）` : ''}`);
  return lines.length ? lines.join('\n') : '（なし）';
}

// 期限が迫っている食材を使い切らせる指示。無ければ空文字。
export function urgentBlock(fridge) {
  const urgent = (fridge ?? [])
    .filter((f) => f && typeof f === 'object' && typeof f.daysLeft === 'number' && f.daysLeft <= URGENT_DAYS)
    .map((f) => f.name);
  if (!urgent.length) return '';

  return `

【まもなく期限切れ】
${urgent.map((n) => `・${n}`).join('\n')}

これらを最優先で使い切るレシピにしてください。
使い切れる食材が多いレシピほど上位に並べてください。`;
}

// 家計の状況。予算未設定なら空文字。
export function budgetBlock(budget) {
  if (!budget || typeof budget !== 'object') return '';

  const remaining = Number(budget.remaining);
  const daysLeft = Number(budget.daysLeft);
  const daily = Number(budget.dailyAllowance);
  if (!Number.isFinite(remaining) || !Number.isFinite(daysLeft) || daysLeft <= 0) return '';

  const label = budget.scope === 'food' ? '今月の食費' : '今月の予算';

  if (remaining <= 0) {
    return `

【今月の家計】
・${label}はすでに超過しています（${yen(remaining)}）。
・今月の残り日数: ${daysLeft}日

買い足しをできる限り避け、冷蔵庫にあるものと特売品だけで作れるレシピを優先してください。
不足食材はゼロ、または最小限にしてください。`;
  }

  return `

【今月の家計】
・${label}の残り: ${yen(remaining)}
・今月の残り日数: ${daysLeft}日
・1日あたりの目安: ${yen(daily)}

1食分の材料費（totalCost）がこの1日あたりの目安に収まるレシピを優先してください。
不足食材を買い足す場合も、その概算費用の合計が目安を超えないようにしてください。`;
}
