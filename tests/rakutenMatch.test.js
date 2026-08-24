import { describe, test, expect } from 'vitest';
import { flattenCategories, matchCategory, normalizeRecipeLink } from '../functions/api/_rakuten.js';

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

// 楽天レシピ カテゴリ別ランキングAPIの応答を模したもの
const rankingResult = {
  result: [
    {
      recipeTitle: '基本の肉じゃが',
      recipeUrl: 'https://recipe.rakuten.co.jp/recipe/1234567890/',
      foodImageUrl: 'https://image.example/1234567890.jpg',
      recipeMaterial: ['豚こま切れ 200g', 'じゃがいも 3個', 'にんじん 1本'],
      recipeIndication: '約30分',
      recipeCost: '300円前後',
      recipeDescription: 'ほくほくの定番',
      rank: '1',
    },
    { recipeTitle: '2位のレシピ', recipeUrl: 'https://recipe.rakuten.co.jp/recipe/2/' },
  ],
};

describe('normalizeRecipeLink', () => {
  test('takes the top ranked recipe', () => {
    const link = normalizeRecipeLink(rankingResult);
    expect(link).toMatchObject({
      title: '基本の肉じゃが',
      url: 'https://recipe.rakuten.co.jp/recipe/1234567890/',
      imageUrl: 'https://image.example/1234567890.jpg',
      indication: '約30分',
      cost: '300円前後',
    });
  });

  test('keeps the ingredient list', () => {
    expect(normalizeRecipeLink(rankingResult).materials)
      .toEqual(['豚こま切れ 200g', 'じゃがいも 3個', 'にんじん 1本']);
  });

  test('returns nothing when the ranking is empty', () => {
    expect(normalizeRecipeLink({ result: [] })).toBeNull();
    expect(normalizeRecipeLink({})).toBeNull();
    expect(normalizeRecipeLink(null)).toBeNull();
  });

  test('returns nothing without a title or a link', () => {
    expect(normalizeRecipeLink({ result: [{ recipeUrl: 'https://x' }] })).toBeNull();
    expect(normalizeRecipeLink({ result: [{ recipeTitle: '肉じゃが' }] })).toBeNull();
  });

  test('refuses a link that is not a rakuten recipe page', () => {
    // 応答に別ホストのURLが混ざっても、そこへは誘導しない
    const link = normalizeRecipeLink({
      result: [{ recipeTitle: '肉じゃが', recipeUrl: 'https://evil.example/phish' }],
    });
    expect(link).toBeNull();
  });

  test('drops a non-https image rather than mixing content', () => {
    const link = normalizeRecipeLink({
      result: [{ recipeTitle: '肉じゃが', recipeUrl: 'https://recipe.rakuten.co.jp/recipe/1/', foodImageUrl: 'http://image.example/a.jpg' }],
    });
    expect(link.imageUrl).toBe('');
  });

  test('fills in the fields that are missing', () => {
    const link = normalizeRecipeLink({
      result: [{ recipeTitle: '肉じゃが', recipeUrl: 'https://recipe.rakuten.co.jp/recipe/1/' }],
    });
    expect(link).toMatchObject({ imageUrl: '', materials: [], indication: '', cost: '' });
  });

  test('keeps only string entries in the ingredient list', () => {
    const link = normalizeRecipeLink({
      result: [{ recipeTitle: '肉じゃが', recipeUrl: 'https://recipe.rakuten.co.jp/recipe/1/', recipeMaterial: ['卵', 42, null] }],
    });
    expect(link.materials).toEqual(['卵']);
  });
});
