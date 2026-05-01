// /api/ocr-flyer
// チラシ画像をClaude Visionで解析し、特売品のテキスト情報のみを返す。
// 画像データは保存せず、レスポンス後に破棄される。

const MODEL = 'claude-sonnet-4-5';

export const config = {
  api: {
    bodyParser: { sizeLimit: '6mb' },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'サーバー設定エラー (APIキー未設定)' });
  }

  const { imageBase64, mediaType } = req.body || {};
  if (!imageBase64 || typeof imageBase64 !== 'string') {
    return res.status(400).json({ error: '画像データがありません' });
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
      return res
        .status(502)
        .json({ error: 'AI解析サービスからエラーが返されました' });
    }

    const data = await upstream.json();
    const text = (data.content || [])
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n');

    const items = parseJsonArray(text);
    if (!items) {
      return res.status(500).json({ error: '解析結果のフォーマットが不正です' });
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

    return res.status(200).json({ items: cleaned });
  } catch (e) {
    console.error('OCR handler error:', e);
    return res
      .status(500)
      .json({ error: e?.message || 'サーバーエラーが発生しました' });
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
