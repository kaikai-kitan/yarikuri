// フロントエンドからVercel Serverless Functionを呼び出すクライアント。
// Anthropic APIキーはサーバー側で保持され、ブラウザに露出しない。

export async function ocrFlyer(imageBase64, mediaType) {
  const res = await fetch('/api/ocr-flyer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `OCRリクエスト失敗 (${res.status})`);
  }
  return data.items || [];
}

// レシート画像から店名・日付・合計・品目（食材判定つき）を読み取る。
export async function ocrReceipt(imageBase64, mediaType) {
  const res = await fetch('/api/ocr-receipt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, mediaType }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `レシート解析失敗 (${res.status})`);
  }
  if (!data.receipt) {
    throw new Error('レシートを読み取れませんでした');
  }
  return data.receipt;
}

// budget を渡すと、予算内に収まる提案をAIに指示する。
export async function suggestRecipes(fridge, flyerItems, budget = null) {
  const res = await fetch('/api/suggest-recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fridge, flyerItems, budget: budget ?? null }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `レシピ提案失敗 (${res.status})`);
  }
  return data.recipes || [];
}

// 一週間分の献立を1リクエストで取得する。
export async function planWeek({ fridge, flyerItems = [], budget = null, startDate }) {
  const res = await fetch('/api/plan-week', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fridge, flyerItems, budget: budget ?? null, startDate }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `献立の作成に失敗 (${res.status})`);
  }
  if (!data.plan) {
    throw new Error('献立を組み立てられませんでした');
  }
  return data.plan;
}

// 料理名から楽天レシピの実在ページを引く。
// リンクが出ないだけで献立は使えるため、失敗しても投げない。
// ただし「見つからない」と「連携が壊れている」を区別できるよう reason を返す。
export async function fetchRecipeLink(name) {
  try {
    const res = await fetch('/api/recipe-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { configured: true, link: null, reason: 'upstream_error' };
    return {
      configured: data.configured !== false,
      link: data.link ?? null,
      reason: data.reason ?? null,
    };
  } catch {
    return { configured: true, link: null, reason: 'upstream_error' };
  }
}
