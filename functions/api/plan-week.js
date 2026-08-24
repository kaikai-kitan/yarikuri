import { checkRateLimit } from './_ratelimit.js';
import { json, callAnthropic, textOf, parseJsonObject } from './_ai.js';
import { fridgeText, flyerText, urgentBlock, budgetBlock } from './_prompt.js';
import { normalizePlan } from './_plan.js';

const PLAN_DAYS = 7;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const todayIso = () => new Date().toISOString().slice(0, 10);

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

  const { fridge = [], flyerItems = [], budget = null, startDate } = body || {};
  if (!Array.isArray(fridge) || !Array.isArray(flyerItems)) {
    return json({ error: 'リクエスト形式が不正です' }, 400);
  }

  const start = DATE_PATTERN.test(startDate) ? startDate : todayIso();

  try {
    const upstream = await callAnthropic(apiKey, {
      max_tokens: 4000,
      system:
        'あなたは節約と食材の使い切りに長けた献立プランナーです。前日に余った食材を翌日へ繋ぎ、日持ちしない食材から先に使い切る献立を組みます。出力は必ず指定されたJSON形式のみで、余計な説明や前置きを含めないでください。',
      messages: [
        {
          role: 'user',
          content: `以下の条件で${PLAN_DAYS}日分の夕食の献立を組んでください。

【冷蔵庫の食材・調味料】
${fridgeText(fridge)}
${urgentBlock(fridge)}

【今日の特売品】
${flyerText(flyerItems)}
${budgetBlock(budget)}

【献立の組み方】
・買い出しは1日目にまとめて行う前提です。必要な食材は shoppingList にまとめてください。
・2日目以降は、前日に使い切らなかった食材を引き継いで使ってください。
  引き継ぐ食材は、その前日の carryOver に書いてください。
・日持ちしない食材（肉・魚・葉物など）ほど前半の日に使ってください。
  日持ちする食材（乾物・根菜・缶詰など）は後半に回してください。
・献立の流れに繋がりを持たせてください。
  例：1日目に肉じゃがを作り、2日目はその残りにカレールーを足してカレーにする。
・その日だけ少量買い足すもの（ルー、調味料など）は addOns に入れてください。
  addOns は1日あたり2品までにしてください。
・同じ料理を繰り返さないでください。
・各日の reason には、なぜその料理をその日に置いたのかを1文で書いてください。
  「豚こま切れが2日で切れるため初日に使う」のように、食材の都合を必ず書いてください。

以下のJSONオブジェクト形式のみで回答してください:
{
  "shoppingList": [
    { "name": "1日目にまとめ買いする食材名", "estimatedPrice": 概算円 }
  ],
  "days": [
    {
      "day": 1,
      "name": "料理名",
      "emoji": "代表する絵文字1つ",
      "description": "ひとこと説明（30字以内）",
      "reason": "この日にこの料理を置いた理由（40字以内）",
      "usedFromFridge": ["冷蔵庫から使う食材名"],
      "usedFromShopping": ["買い出しから使う食材名"],
      "carryOver": ["翌日へ残す食材名"],
      "addOns": [{ "name": "この日だけ買い足すもの", "estimatedPrice": 概算円 }],
      "totalCost": 1人前の推定コスト円,
      "cookingTime": "約20分"
    }
  ]
}

days は必ず${PLAN_DAYS}日分そろえてください。`,
        },
      ],
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Anthropic API error:', upstream.status, errText);
      return json({ error: 'AI提案サービスからエラーが返されました' }, 502);
    }

    const plan = normalizePlan(parseJsonObject(textOf(await upstream.json())), start);
    if (!plan) {
      return json({ error: '献立を組み立てられませんでした' }, 500);
    }

    return json({ plan });
  } catch (e) {
    console.error('Plan handler error:', e);
    return json({ error: e?.message || 'サーバーエラーが発生しました' }, 500);
  }
}
