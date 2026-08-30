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

// 何人分で作るか。分量は人数分、金額とカロリーは1人前で書かせる。
// ここを混ぜるとカードの「1人前 ¥320」がずれるため、明示して固定する。
export function servingsBlock(servings) {
  if (typeof servings !== 'number' || !Number.isFinite(servings) || servings < 1) return '';

  const count = Math.round(servings);
  return `

【作る人数】
・${count}人分

材料の分量は${count}人分で書いてください。
ただし totalCost と calories は1人前あたりの数値にしてください。`;
}

// 提案の軸。安さ以外も選べるようにするための指示。
const PRIORITY_INSTRUCTIONS = {
  cost: `1食あたりの材料費が安い順に並べてください。
不足食材の買い足しが少ないものほど上位にしてください。`,
  calorie: `1人前のカロリーが低い順に並べてください。
1人前600kcal以下を目安にし、calories には推定kcalを必ず数値で入れてください。
揚げ物や砂糖・油を多く使うレシピは避けてください。`,
  time: `調理時間が短い順に並べてください。
20分以内で作れるものを優先し、工程数の少ないレシピにしてください。`,
};

export function priorityBlock(priority) {
  const instruction = PRIORITY_INSTRUCTIONS[priority];
  if (!instruction) return '';

  return `

【優先すること】
${instruction}`;
}
