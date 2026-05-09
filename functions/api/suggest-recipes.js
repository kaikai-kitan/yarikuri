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

  const { fridge = [], flyerItems = [] } = body || {};
  if (!Array.isArray(fridge) || !Array.isArray(flyerItems)) {
    return json({ error: 'リクエスト形式が不正です' }, 400);
  }

  const fridgeText = fridge.length
    ? fridge.map((n) => `・${n}`).join('\n')
    : '（登録なし）';
  const flyerText = flyerItems.length
    ? flyerItems
        .map((d) => `・${d.name} ${d.price}円${d.store ? `（${d.store}）` : ''}`)
        .join('\n')
    : '（なし）';

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

【今日の特売品】
${flyerText}

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
      }),
    });

    if (!upstream.ok) {
      const errText = await upstream.text();
      console.error('Anthropic API error:', upstream.status, errText);
      return json({ error: 'AI提案サービスからエラーが返されました' }, 502);
    }

    const data = await upstream.json();
    const text = (data.content || [])
      .map((b) => (b.type === 'text' ? b.text : ''))
      .join('\n');

    const recipes = parseJsonArray(text);
    if (recipes === null) {
      return json({ error: '提案結果のフォーマットが不正です' }, 500);
    }

    return json({ recipes });
  } catch (e) {
    console.error('Recipe handler error:', e);
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
