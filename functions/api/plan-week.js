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

【組み立ての手順】
この順番で考えてください。順番を入れ替えないでください。
1. まず7日分の料理を決めます。日持ちしない食材（肉・魚・葉物）を前半の日に、
   日持ちする食材（乾物・根菜・缶詰）を後半の日に使ってください。
2. 次に、決めた料理に必要で、かつ冷蔵庫に無いものだけを shoppingList に挙げます。
   先に買い物リストを作ってから料理を決めてはいけません。
3. 最後に、各日の材料を usedFromFridge と usedFromShopping に振り分けます。

【前日からの作り替え】
これがこの献立の要です。
・carryOver には「その日に作った料理の、翌日に回す余り」を書いてください。
  冷蔵庫にまだ残っている食材のことではありません。
・carryOver を書いた日の翌日は、その余りを作り替えた料理にしてください。
  例：1日目 肉じゃが（carryOver: 「肉じゃがの残り」）
      → 2日目 カレー（addOns: カレールー。肉じゃがにルーを足すだけ）
・7日のうち最低2回は、この作り替えを入れてください。
・作り替えをしない日は carryOver を空の配列にしてください。

【守ること】
・冷蔵庫、shoppingList、その日の addOns のいずれにも無い食材は使わないでください。
・料理名は簡潔にしてください。括弧で副題や補足を付けないでください。
・同じ料理を繰り返さないでください。
・addOns は1日あたり2品までです。
・shoppingList に挙げたものは、必ずどこかの日の usedFromShopping に現れるようにしてください。
  買わせたのに使わない、ということが無いようにしてください。
・各日の reason には、なぜその料理をその日に置いたのかを1文で書いてください。
  「豚こま切れが明日で切れるため初日に使う」「前日の肉じゃがを作り替える」のように、
  食材の都合か前日との繋がりを必ず書いてください。

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
      "carryOver": ["翌日に作り替える余り（無ければ空）"],
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
