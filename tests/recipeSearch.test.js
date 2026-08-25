import { describe, test, expect } from 'vitest';
import { webSearchLink } from '../functions/api/_recipeSearch.js';

describe('webSearchLink', () => {
  test('points at a web search for that dish', () => {
    // Act
    const link = webSearchLink('肉じゃが');

    // Assert
    const url = new URL(link.url);
    expect(url.hostname).toContain('google');
    expect(url.searchParams.get('q')).toBe('肉じゃが レシピ');
  });

  test('says plainly that it is a search, not a specific recipe', () => {
    expect(webSearchLink('肉じゃが').title).toContain('肉じゃが');
    expect(webSearchLink('肉じゃが').title).toContain('検索');
  });

  test('marks where the link came from', () => {
    // 楽天のクレジット表記を出すかどうかの判断に使う
    expect(webSearchLink('肉じゃが').source).toBe('search');
  });

  test('fills the same fields the card reads, so nothing breaks', () => {
    const link = webSearchLink('肉じゃが');
    expect(link.imageUrl).toBe('');
    expect(link.materials).toEqual([]);
    expect(link.indication).toBe('');
    expect(link.cost).toBe('');
  });

  test('escapes a dish name with characters that break urls', () => {
    const url = new URL(webSearchLink('鶏&野菜の炒め物').url);
    expect(url.searchParams.get('q')).toBe('鶏&野菜の炒め物 レシピ');
  });

  test('refuses to build a link with no dish name', () => {
    expect(webSearchLink('')).toBeNull();
    expect(webSearchLink('   ')).toBeNull();
    expect(webSearchLink(undefined)).toBeNull();
  });
});
