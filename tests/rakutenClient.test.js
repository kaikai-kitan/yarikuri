import { describe, test, expect } from 'vitest';
import {
  CATEGORY_LIST_URL,
  CATEGORY_RANKING_URL,
  categoryListUrl,
  categoryRankingUrl,
  authHeaders,
  failureReason,
} from '../functions/api/_rakutenClient.js';

describe('endpoints', () => {
  // 旧 app.rakuten.co.jp は UUID 形式の applicationId を受け付けない。
  // 新コンソールは UUID しか発行しないため、新ゲートウェイ以外は必ず失敗する。
  test('point at the new gateway, not the retired domain', () => {
    expect(CATEGORY_LIST_URL).toBe(
      'https://openapi.rakuten.co.jp/recipems/api/Recipe/CategoryList/20170426'
    );
    expect(CATEGORY_RANKING_URL).toBe(
      'https://openapi.rakuten.co.jp/recipems/api/Recipe/CategoryRanking/20170426'
    );
  });
});

describe('categoryListUrl', () => {
  test('carries the application id and json format', () => {
    // Arrange
    const appId = 'c5f9dd70-96d0-4f62-a911-ef3cbd1e8900';

    // Act
    const url = new URL(categoryListUrl(appId));

    // Assert
    expect(url.origin + url.pathname).toBe(CATEGORY_LIST_URL);
    expect(url.searchParams.get('applicationId')).toBe(appId);
    expect(url.searchParams.get('format')).toBe('json');
  });

  test('never puts the access key in the url', () => {
    // アクセスキーはヘッダで送る。URL に載せるとログに残る。
    expect(categoryListUrl('id-1')).not.toContain('accessKey');
  });
});

describe('categoryRankingUrl', () => {
  test('carries the hierarchical category id', () => {
    const url = new URL(categoryRankingUrl('id-1', '30-275-1626'));
    expect(url.origin + url.pathname).toBe(CATEGORY_RANKING_URL);
    expect(url.searchParams.get('categoryId')).toBe('30-275-1626');
  });

  test('escapes values instead of concatenating raw', () => {
    const url = new URL(categoryRankingUrl('a b', '1&2'));
    expect(url.searchParams.get('applicationId')).toBe('a b');
    expect(url.searchParams.get('categoryId')).toBe('1&2');
  });
});

describe('authHeaders', () => {
  test('sends the access key under the name the gateway expects', () => {
    // 実測: `accessKey` は通り、`X-Access-Key` は 400 になる
    expect(authHeaders('pk_abc')).toEqual({ accessKey: 'pk_abc' });
  });
});

describe('failureReason', () => {
  test.each([
    [400, 'bad_request'],
    [401, 'auth_failed'],
    [403, 'auth_failed'],
    [429, 'rate_limited'],
    [500, 'upstream_error'],
    [503, 'upstream_error'],
  ])('maps %i to %s', (status, expected) => {
    expect(failureReason(status)).toBe(expected);
  });
});
