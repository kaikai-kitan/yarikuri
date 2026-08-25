import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { onRequestPost as suggestRecipes } from '../functions/api/suggest-recipes.js';
import { onRequestPost as planWeek } from '../functions/api/plan-week.js';
import { onRequestPost as ocrReceipt } from '../functions/api/ocr-receipt.js';
import { onRequestPost as ocrFlyer } from '../functions/api/ocr-flyer.js';

const MOCK_ENV = { MOCK_AI: '1' };

const IMAGE = { imageBase64: 'ZmFrZQ==', mediaType: 'image/jpeg' };

let ip = 0;

const call = async (handler, body, env = MOCK_ENV) => {
  ip += 1;
  const request = new Request('http://localhost:8789/api/x', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': `198.51.100.${ip % 250}` },
    body: JSON.stringify(body),
  });
  const res = await handler({ request, env });
  return { status: res.status, body: await res.json() };
};

let fetchMock;

beforeEach(() => {
  globalThis.__rateLimitStore?.clear();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('mock mode — the screens work without an API key', () => {
  test('suggests recipes without calling Anthropic', async () => {
    // Arrange & Act
    const { status, body } = await call(suggestRecipes, {
      fridge: [{ name: '豚こま切れ' }],
      flyerItems: [],
    });

    // Assert
    expect(status).toBe(200);
    expect(body.recipes).toHaveLength(3);
    expect(body.mock).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('plans a week without calling Anthropic', async () => {
    const { status, body } = await call(planWeek, {
      fridge: [{ name: '豚こま切れ' }],
      flyerItems: [],
      startDate: '2026-08-25',
    });

    expect(status).toBe(200);
    expect(body.plan.days).toHaveLength(7);
    expect(body.plan.startDate).toBe('2026-08-25');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('reads a receipt without calling Anthropic', async () => {
    const { status, body } = await call(ocrReceipt, IMAGE);

    expect(status).toBe(200);
    expect(body.receipt.items.length).toBeGreaterThan(0);
    expect(body.receipt.total).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('reads a flyer without calling Anthropic', async () => {
    const { status, body } = await call(ocrFlyer, IMAGE);

    expect(status).toBe(200);
    expect(body.items.length).toBeGreaterThan(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('mock mode — it still refuses bad input', () => {
  test('rejects a malformed suggestion request', async () => {
    const { status } = await call(suggestRecipes, { fridge: 'いろいろ', flyerItems: [] });
    expect(status).toBe(400);
  });

  test('rejects an image request with no image', async () => {
    const { status } = await call(ocrReceipt, {});
    expect(status).toBe(400);
  });
});

describe('without mock mode — nothing changes', () => {
  test('still reports a missing API key', async () => {
    // Arrange & Act
    const { status, body } = await call(suggestRecipes, { fridge: [], flyerItems: [] }, {});

    // Assert
    expect(status).toBe(500);
    expect(body.error).toContain('APIキー未設定');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test('still calls Anthropic when a key is present', async () => {
    // Arrange
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ content: [{ type: 'text', text: '[]' }] }), { status: 200 })
    );

    // Act
    const { status } = await call(
      suggestRecipes,
      { fridge: [], flyerItems: [] },
      { ANTHROPIC_API_KEY: 'sk-ant-real' }
    );

    // Assert
    expect(status).toBe(200);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.anthropic.com/v1/messages',
      expect.anything()
    );
  });
});
