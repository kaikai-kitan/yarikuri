import { checkRateLimit } from './_ratelimit.js';
import { json, callAnthropic, textOf, parseJsonObject } from './_ai.js';
import { normalizeReceipt } from './_receipt.js';

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

各品目を次の3つのいずれかに分類し、category に入れてください。
・food  … 冷蔵庫で管理する食材・調味料（肉、魚、野菜、卵、乳製品、豆腐、米、麺、しょうゆ、みそ、砂糖など）
・daily … 日用品・生活雑貨（洗剤、ティッシュ、洗面用品、電池、ゴミ袋など）
・other … 上記以外（雑誌、医薬品、その場で食べる惣菜・弁当、たばこ、酒類など）

判断に迷う場合は other にしてください。

品目名は冷蔵庫に登録して読みやすい一般名に正規化してください（例：「北海道産牛乳1L」→「牛乳」）。
値引き行・小計・ポイントなどの品目でない行は含めないでください。

以下のJSONオブジェクト形式のみで回答してください:
{
  "store": "店名（不明なら空文字）",
  "date": "購入日 YYYY-MM-DD（不明なら空文字）",
  "total": 合計金額の数値（円）,
  "items": [
    { "name": "品目名", "price": 価格の数値（円）, "category": "food" または "daily" または "other" }
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

