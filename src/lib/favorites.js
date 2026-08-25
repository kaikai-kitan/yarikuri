const normalizedName = (recipe) => {
  if (typeof recipe?.name !== 'string') return '';
  return recipe.name
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
};

// API のレシピには永続 ID がないため、画面上の料理名を同一性として扱う。
// 全角・半角や前後の空白が違う同じ料理は、重複したお気に入りにしない。
export const recipeFavoriteKey = (recipe) => normalizedName(recipe);

export const isFavoriteRecipe = (favorites, recipe) => {
  const targetKey = recipeFavoriteKey(recipe);
  return Boolean(
    targetKey &&
      favorites.some((favorite) => recipeFavoriteKey(favorite?.recipe) === targetKey)
  );
};

// localStorage を手編集された場合や旧データが混ざった場合に備えて、
// 詳細表示できるスナップショットだけを残し、同名の重複も取り除く。
export const sanitizeFavorites = (list) => {
  const seen = new Set();
  return list.filter((favorite) => {
    const key = recipeFavoriteKey(favorite?.recipe);
    if (typeof favorite?.id !== 'string' || !favorite.id.trim() || !key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};
