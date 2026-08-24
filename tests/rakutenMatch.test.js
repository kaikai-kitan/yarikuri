import { describe, test, expect } from 'vitest';
import { flattenCategories, matchCategory } from '../functions/api/_rakuten.js';

// 楽天レシピカテゴリ一覧APIの応答を模したもの（実際の項目名に合わせている）
const categoryResult = {
  large: [{ categoryId: '30', categoryName: '肉' }],
  medium: [{ categoryId: '275', categoryName: '豚肉', parentCategoryId: '30' }],
  small: [
    { categoryId: '1626', categoryName: '肉じゃが', parentCategoryId: '275' },
    { categoryId: '1627', categoryName: 'カレー', parentCategoryId: '275' },
  ],
};

describe('flattenCategories', () => {
  test('builds the id chain each level needs', () => {
    const flat = flattenCategories(categoryResult);
    expect(flat).toContainEqual({ id: '30', name: '肉' });
    expect(flat).toContainEqual({ id: '30-275', name: '豚肉' });
    expect(flat).toContainEqual({ id: '30-275-1626', name: '肉じゃが' });
  });

  test('drops a child whose parent is missing', () => {
    const flat = flattenCategories({
      large: [],
      medium: [{ categoryId: '275', categoryName: '豚肉', parentCategoryId: '99' }],
      small: [],
    });
    expect(flat).toEqual([]);
  });

  test('tolerates a response with missing sections', () => {
    expect(flattenCategories({})).toEqual([]);
    expect(flattenCategories(null)).toEqual([]);
  });

  test('drops entries without a name or an id', () => {
    const flat = flattenCategories({ large: [{ categoryId: '30' }, { categoryName: '肉' }] });
    expect(flat).toEqual([]);
  });
});

describe('matchCategory', () => {
  const categories = flattenCategories(categoryResult);

  test('finds an exact match', () => {
    expect(matchCategory('肉じゃが', categories)).toEqual({ id: '30-275-1626', name: '肉じゃが' });
  });

  test('ignores spaces and middle dots', () => {
    expect(matchCategory('肉 じゃが', categories)?.name).toBe('肉じゃが');
    expect(matchCategory('肉・じゃが', categories)?.name).toBe('肉じゃが');
  });

  test('finds a category contained in a longer dish name', () => {
    expect(matchCategory('野菜たっぷりカレー', categories)?.name).toBe('カレー');
  });

  test('prefers the longest category name when several fit', () => {
    // Arrange
    const many = [
      { id: 'a', name: 'カレー' },
      { id: 'b', name: '野菜カレー' },
    ];

    // Act & Assert
    expect(matchCategory('とろとろ野菜カレー', many)?.name).toBe('野菜カレー');
  });

  test('finds a category that contains a short dish name', () => {
    expect(matchCategory('じゃが', categories)?.name).toBe('肉じゃが');
  });

  test('gives up rather than guessing', () => {
    expect(matchCategory('宇宙料理', categories)).toBeNull();
  });

  test('gives up on an empty or missing dish name', () => {
    expect(matchCategory('', categories)).toBeNull();
    expect(matchCategory(undefined, categories)).toBeNull();
  });

  test('gives up when there are no categories', () => {
    expect(matchCategory('肉じゃが', [])).toBeNull();
    expect(matchCategory('肉じゃが', undefined)).toBeNull();
  });

  test('does not match on a single character', () => {
    // 「肉」だけで肉じゃがに繋げるのは乱暴なので、1文字の一致は採らない
    expect(matchCategory('肉', [{ id: 'a', name: '肉じゃが' }])).toBeNull();
  });
});
