import { checkRateLimit } from './_ratelimit.js';

const MODEL = 'claude-haiku-4-5';

function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
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

  const { imageBase64, mediaType } = body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return json({ error: '画像データがありません' }, 400);
  }

  try {
    const upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1500,
        system:
          'あなたはチラシ画像から食材・調味料の特売情報を正確に抽出するアシスタントです。出力は必ず指定されたJSON形式のみで、余計な説明や前置きを含めないでください。',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'image',
                source: {
                  type: 'base64',
                  media_type: mediaType || 'image/jpeg',
                  data: imageBase64,
                },
              },
              {
                type: 'text',
                text: `このスーパーのチラシ画像から特売品を抽出してください。
食品・食材・調味料のみが対象です（雑貨や日用品は除外）。

以下のJSON配列形式のみで回答してください:
[
  { "name": "商品名（簡潔に）", "price": 価格の数値（円）, "store": "店名（不明なら空文字）" }
]

価格が読み取れない商品はスキップ。重複は1つにまとめてください。`,
              },
            ],
          },
        ],
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Anthropic API error:', upstream.status, errText);
      return json({ error: 'AI解析サービスからエラーが返されました' }, 502);
    }

    const data = await upstream.json();
    const text = (data.content || [])
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n');

    const items = parseJsonArray(text);
    if (!items) {
      return json({ error: '解析結果のフォーマットが不正です' }, 500);
    }

    const cleaned = items
      .filter(
        (i) =>
          i &&
          typeof i.name === 'string' &&
          i.name.trim() &&
          Number.isFinite(Number(i.price))
      )
      .map((i) => ({
        name: String(i.name).slice(0, 40).trim(),
        price: Math.round(Number(i.price)),
        store: typeof i.store === 'string' ? i.store.slice(0, 30).trim() : '',
      }));

    return json({ items: cleaned });
  } catch (e) {
    console.error('OCR handler error:', e);
    return json({ error: e?.message || 'サーバーエラーが発生しました' }, 500);
  }
}

function parseJsonArray(text) {
  try {
    const cleaned = text.replace(/```json|```/g, '').trim();
    const start = cleaned.search(/\[/);
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
