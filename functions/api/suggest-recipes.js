import { checkRateLimit } from './_ratelimit.js';
import { json, callAnthropic, textOf, parseJsonArray } from './_ai.js';

const yen = (n) => `${Math.round(n).toLocaleString('ja-JP')}円`;

// 在庫1件の表示。期限を持たない食材や、旧クライアントが送る文字列にも耐える。
const URGENT_DAYS = 3;

export function fridgeLine(entry) {
  if (typeof entry === 'string') return `・${entry}`;
  if (!entry || typeof entry.name !== 'string') return null;

  const { name, daysLeft } = entry;
  if (typeof daysLeft !== 'number') return `・${name}`;
  if (daysLeft === 0) return `・${name}（今日が期限）`;
  return `・${name}（あと${daysLeft}日）`;
}

// 期限が迫っている食材を使い切らせる指示。無ければ空文字。
export function urgentBlock(fridge) {
  const urgent = fridge
    .filter((f) => f && typeof f === 'object' && typeof f.daysLeft === 'number' && f.daysLeft <= URGENT_DAYS)
    .map((f) => f.name);
  if (!urgent.length) return '';

  return `

【まもなく期限切れ】
${urgent.map((n) => `・${n}`).join('\n')}

これらを最優先で使い切るレシピにしてください。
使い切れる食材が多いレシピほど上位に並べてください。`;
}

// 家計サマリーをプロンプト用のテキストにする。未設定なら空文字。
function budgetBlock(budget) {
  if (!budget || typeof budget !== 'object') return '';
  const remaining = Number(budget.remaining);
  const daysLeft = Number(budget.daysLeft);
  const daily = Number(budget.dailyAllowance);
  if (!Number.isFinite(remaining) || !Number.isFinite(daysLeft) || daysLeft <= 0) return '';

  // 食費の配分がある場合は「食費」、無い場合は家計全体を指す
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

export async function onRequestPost(context) {
  const { request, env } = context;

  const limited = checkRateLimit(request);
  if (limited) {
    return json({ error: limited.error }, 429, { 'Retry-After': String(limited.retryAfter) });
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ error: 'サーバー設定エラー (APIキー未設定)' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'リクエスト形式が不正です' }, 400);
  }

  const { fridge = [], flyerItems = [], budget = null } = body || {};
  if (!Array.isArray(fridge) || !Array.isArray(flyerItems)) {
    return json({ error: 'リクエスト形式が不正です' }, 400);
  }

  const fridgeLines = fridge.map(fridgeLine).filter(Boolean);
  const fridgeText = fridgeLines.length ? fridgeLines.join('\n') : '（登録なし）';
  const flyerText = flyerItems.length
    ? flyerItems
        .map((d) => `・${d.name} ${d.price}円${d.store ? `（${d.store}）` : ''}`)
        .join('\n')
    : '（なし）';

  try {
    const upstream = await callAnthropic(apiKey, {
      max_tokens: 2000,
      system:
        'あなたは節約レシピのプロです。家庭にある食材と特売品を最大限活用した、安くて作りやすい家庭料理を提案してください。出力は必ず指定されたJSON形式のみで、余計な説明や前置きを含めないでください。',
      messages: [
        {
          role: 'user',
          content: `以下の食材を使って、なるべく安く作れる家庭料理を3つ提案してください。
特売品を最大限活用し、不足食材が少ない順に並べてください。

【冷蔵庫の食材・調味料】
${fridgeText}
${urgentBlock(fridge)}

【今日の特売品】
${flyerText}
${budgetBlock(budget)}

以下のJSON配列形式のみで回答してください:
[
  {
    "name": "料理名",
    "emoji": "代表する絵文字1つ",
    "description": "ひとこと説明（30字以内）",
    "usedFromFridge": ["使う冷蔵庫の食材名"],
    "usedFromDeals": ["使う特売品名"],
    "missingIngredients": [{ "name": "不足食材名", "estimatedPrice": 概算円 }],
    "totalCost": 1人前の推定コスト円,
    "cookingTime": "約20分"
  }
]

冷蔵庫が空でも特売品中心で作れるレシピを提案してください。
両方とも空なら空配列 [] を返してください。`,
        },
      ],
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Anthropic API error:', upstream.status, errText);
      return json({ error: 'AI提案サービスからエラーが返されました' }, 502);
    }

    const recipes = parseJsonArray(textOf(await upstream.json()));
    if (recipes === null) {
      return json({ error: '提案結果のフォーマットが不正です' }, 500);
    }

    return json({ recipes });
  } catch (e) {
    console.error('Recipe handler error:', e);
    return json({ error: e?.message || 'サーバーエラーが発生しました' }, 500);
  }
}

