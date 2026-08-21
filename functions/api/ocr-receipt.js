import { checkRateLimit } from './_ratelimit.js';
import { json, callAnthropic, textOf, parseJsonObject } from './_ai.js';

const MAX_ITEMS = 60;
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

  const { imageBase64, mediaType } = body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return json({ error: '画像データがありません' }, 400);
  }

  try {
    const upstream = await callAnthropic(apiKey, {
      max_tokens: 2000,
      system:
        'あなたはレシート画像から購入品と価格を正確に読み取るアシスタントです。出力は必ず指定されたJSON形式のみで、余計な説明や前置きを含めないでください。',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageBase64 },
            },
            {
              type: 'text',
              text: `このレシート画像から店名・購入日・合計金額・購入品を読み取ってください。

各品目について、冷蔵庫で管理する食材または調味料かどうかを isFood で判定してください。
食材・調味料（肉、魚、野菜、卵、乳製品、豆腐、米、麺、しょうゆ、みそ、砂糖など）は true。
日用品・雑貨・惣菜以外の加工品でない品（洗剤、ティッシュ、雑誌、電池など）は false。

品目名は冷蔵庫に登録して読みやすい一般名に正規化してください（例：「北海道産牛乳1L」→「牛乳」）。
値引き行・小計・ポイントなどの品目でない行は含めないでください。

以下のJSONオブジェクト形式のみで回答してください:
{
  "store": "店名（不明なら空文字）",
  "date": "購入日 YYYY-MM-DD（不明なら空文字）",
  "total": 合計金額の数値（円）,
  "items": [
    { "name": "品目名", "price": 価格の数値（円）, "isFood": true または false }
  ]
}`,
            },
          ],
        },
      ],
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Anthropic API error:', upstream.status, errText);
      return json({ error: 'AI解析サービスからエラーが返されました' }, 502);
    }

    const parsed = parseJsonObject(textOf(await upstream.json()));
    if (!parsed) {
      return json({ error: 'レシートを読み取れませんでした' }, 500);
    }

    return json({ receipt: normalizeReceipt(parsed) });
  } catch (e) {
    console.error('Receipt handler error:', e);
    return json({ error: e?.message || 'サーバーエラーが発生しました' }, 500);
  }
}

// AI の出力をそのまま信用せず、保存できる形に整える。
function normalizeReceipt(parsed) {
  const items = (Array.isArray(parsed.items) ? parsed.items : [])
    .filter((i) => i && typeof i.name === 'string' && i.name.trim() && Number.isFinite(Number(i.price)))
    .slice(0, MAX_ITEMS)
    .map((i) => ({
      name: String(i.name).slice(0, 40).trim(),
      price: Math.round(Number(i.price)),
      isFood: i.isFood === true,
    }));

  const itemsTotal = items.reduce((sum, i) => sum + i.price, 0);
  const reported = Number(parsed.total);
  const date = typeof parsed.date === 'string' && DATE_PATTERN.test(parsed.date) ? parsed.date : todayIso();

  return {
    store: typeof parsed.store === 'string' ? parsed.store.slice(0, 30).trim() : '',
    date,
    // 合計が読めなかった場合は品目の合計で代用する
    total: Number.isFinite(reported) && reported > 0 ? Math.round(reported) : itemsTotal,
    items,
  };
}
