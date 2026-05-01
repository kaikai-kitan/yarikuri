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

export async function suggestRecipes(fridge, flyerItems) {
  const res = await fetch('/api/suggest-recipes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fridge, flyerItems }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `レシピ提案失敗 (${res.status})`);
  }
  return data.recipes || [];
}
