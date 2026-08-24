import { describe, test, expect, beforeEach, vi, afterEach } from 'vitest';
import { onRequestPost } from '../functions/api/recipe-link.js';

const APP_ID = 'c5f9dd70-96d0-4f62-a911-ef3cbd1e8900';
const ACCESS_KEY = 'pk_test';

const ENV = { RAKUTEN_APPLICATION_ID: APP_ID, RAKUTEN_ACCESS_KEY: ACCESS_KEY };

const CATEGORIES = [{ id: '30-275-1626', name: '肉じゃが' }];

const RANKING_BODY = {
  result: [
    {
      recipeTitle: '基本の肉じゃが',
      recipeUrl: 'https://recipe.rakuten.co.jp/recipe/1/',
      foodImageUrl: 'https://image.example/1.jpg',
      recipeMaterial: ['豚こま切れ 200g'],
      recipeIndication: '約30分',
      recipeCost: '300円前後',
    },
  ],
};

const requestFor = (body) =>
  new Request('https://yarikuri.pages.dev/api/recipe-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.1' },
    body: JSON.stringify(body),
  });

const call = async (body, env = ENV) => {
  const res = await onRequestPost({ request: requestFor(body), env });
  return { status: res.status, body: await res.json() };
};

// カテゴリ一覧を温めておくと、1リクエスト/秒の待機を挟まずランキングだけを検証できる。
const warmCategories = () => {
  globalThis.__rakutenCategories = { fetchedAt: Date.now(), list: CATEGORIES };
};

const respondWith = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

beforeEach(() => {
  // _ratelimit.js は読み込み時に Map の参照を掴むため、差し替えではなく中身を消す
  globalThis.__rateLimitStore?.clear();
  globalThis.__rakutenCategories = { fetchedAt: 0, list: null };
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('credentials', () => {
  test('says why it is inactive when the application id is missing', async () => {
    // Arrange
    warmCategories();

    // Act
    const { body } = await call({ name: '肉じゃが' }, { RAKUTEN_ACCESS_KEY: ACCESS_KEY });

    // Assert
    expect(body).toEqual({ configured: false, link: null, reason: 'not_configured' });
  });

  test('says why it is inactive when the access key is missing', async () => {
    // 新ゲートウェイは accessKey なしでは 400 を返すため、叩く前に止める
    warmCategories();
    const { body } = await call({ name: '肉じゃが' }, { RAKUTEN_APPLICATION_ID: APP_ID });
    expect(body).toEqual({ configured: false, link: null, reason: 'not_configured' });
  });
});

describe('successful lookup', () => {
  test('sends the access key as a header and returns the top recipe', async () => {
    // Arrange
    warmCategories();
    const fetchMock = vi.fn().mockResolvedValue(respondWith(RANKING_BODY));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    const { body } = await call({ name: '肉じゃが' });

    // Assert
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain('openapi.rakuten.co.jp/recipems/api/Recipe/CategoryRanking');
    expect(url).not.toContain('accessKey');
    expect(init.headers).toMatchObject({ accessKey: ACCESS_KEY });
    expect(body.link.title).toBe('基本の肉じゃが');
    expect(body).toMatchObject({ configured: true, reason: null });
  });

  test('fetches the category list first when the cache is cold', async () => {
    // Arrange
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        respondWith({ result: { large: [{ categoryId: '30', categoryName: '肉じゃが' }] } })
      )
      .mockResolvedValueOnce(respondWith(RANKING_BODY));
    vi.stubGlobal('fetch', fetchMock);

    // Act
    const { body } = await call({ name: '肉じゃが' });

    // Assert
    expect(fetchMock.mock.calls[0][0]).toContain('CategoryList');
    expect(fetchMock.mock.calls[0][1].headers).toMatchObject({ accessKey: ACCESS_KEY });
    expect(body.link.title).toBe('基本の肉じゃが');
  });
});

describe('failures are reported, not swallowed', () => {
  test('reports auth_failure when the gateway rejects the key', async () => {
    // Arrange
    warmCategories();
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(respondWith({ errors: { errorMessage: 'Invalid Access Key' } }, 403))
    );

    // Act
    const { body } = await call({ name: '肉じゃが' });

    // Assert
    expect(body).toEqual({ configured: true, link: null, reason: 'auth_failed' });
    expect(console.error).toHaveBeenCalled();
  });

  test('reports rate_limited so the cause is distinguishable', async () => {
    warmCategories();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respondWith({ message: 'Rate limit' }, 429)));
    const { body } = await call({ name: '肉じゃが' });
    expect(body.reason).toBe('rate_limited');
  });

  test('reports a failing category list instead of pretending nothing matched', async () => {
    // Arrange
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respondWith({}, 403)));

    // Act
    const { body } = await call({ name: '肉じゃが' });

    // Assert
    expect(body).toEqual({ configured: true, link: null, reason: 'auth_failed' });
    expect(console.error).toHaveBeenCalled();
  });

  test('logs the upstream body so the reason is visible in the tail', async () => {
    warmCategories();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(respondWith({ errors: { errorMessage: 'Invalid Access Key' } }, 403)));
    await call({ name: '肉じゃが' });
    const logged = console.error.mock.calls.flat().join(' ');
    expect(logged).toContain('Invalid Access Key');
  });

  test('reports upstream_error when the network throws', async () => {
    warmCategories();
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('boom')));
    const { body } = await call({ name: '肉じゃが' });
    expect(body).toEqual({ configured: true, link: null, reason: 'upstream_error' });
  });
});

describe('no match', () => {
  test('is distinct from a failure', async () => {
    warmCategories();
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const { body } = await call({ name: '宇宙料理' });

    expect(body).toEqual({ configured: true, link: null, reason: 'no_match' });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe('input validation', () => {
  test('rejects a missing dish name', async () => {
    warmCategories();
    const { status, body } = await call({ name: '  ' });
    expect(status).toBe(400);
    expect(body.error).toBeTruthy();
  });
});

describe('guard rails', () => {
  test('rejects a body that is not json', async () => {
    // Arrange
    warmCategories();
    const request = new Request('https://yarikuri.pages.dev/api/recipe-link', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-forwarded-for': '203.0.113.9' },
      body: 'not json',
    });

    // Act
    const res = await onRequestPost({ request, env: ENV });

    // Assert
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBeTruthy();
  });

  test('rate limits a single caller before reaching the gateway', async () => {
    // Arrange
    warmCategories();
    const fetchMock = vi.fn().mockResolvedValue(respondWith(RANKING_BODY));
    vi.stubGlobal('fetch', fetchMock);

    // Act — 1分あたりの上限は10回
    const results = [];
    for (let i = 0; i < 12; i += 1) {
      results.push((await call({ name: '肉じゃが' })).status);
    }

    // Assert
    expect(results.filter((s) => s === 429).length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.length).toBeLessThan(12);
  });
});
