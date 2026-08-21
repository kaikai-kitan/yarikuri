// Anthropic API 呼び出しまわりの共通処理。
// ocr-flyer / ocr-receipt / suggest-recipes で共有する。

export const MODEL = 'claude-haiku-4-5';

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
  });
}

// 応答本文からテキストブロックだけを連結して返す。
export function textOf(data) {
  return (data.content || []).map((b) => (b.type === 'text' ? b.text : '')).join('\n');
}

export async function callAnthropic(apiKey, payload) {
  return fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model: MODEL, ...payload }),
  });
}

const stripFence = (text) => text.replace(/```json|```/g, '').trim();

export function parseJsonArray(text) {
  try {
    const cleaned = stripFence(text);
    const start = cleaned.search(/\[/);
    const end = cleaned.lastIndexOf(']');
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export function parseJsonObject(text) {
  try {
    const cleaned = stripFence(text);
    const start = cleaned.search(/\{/);
    const end = cleaned.lastIndexOf('}');
    if (start === -1 || end === -1) return null;
    const parsed = JSON.parse(cleaned.slice(start, end + 1));
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
