// 楽天レシピAPI のカテゴリ照合。
//
// このAPIは自由検索を持たず、カテゴリ別ランキングしか取れない。
// ただしカテゴリには「肉じゃが」「カレー」のような具体的な料理名が多数あるため、
// AIが出した料理名をカテゴリ名に突き合わせて実在レシピへ繋ぐ。
//
// 純関数なのでテストから直接呼べる。

// 1文字の一致で結び付けると「肉」→「肉じゃが」のような乱暴な紐付けが起きる。
const MIN_MATCH_LENGTH = 2;

const isFilledString = (value) => typeof value === 'string' && value.trim() !== '';

// 表記ゆれの吸収。空白と中黒を落とすだけに留める。
// ひらがな／カタカナの変換まで踏み込むと誤爆が増えるため行わない。
const normalize = (value) => value.replace(/[\s　・･]/g, '').toLowerCase();

const asList = (value) => (Array.isArray(value) ? value : []);

// ランキングAPIは階層を連ねたIDを要求する（例: '30-275-1626'）。
export function flattenCategories(result) {
  if (!result || typeof result !== 'object') return [];

  const flat = [];
  const idOf = new Map();

  const take = (entries, parentKey) => {
    for (const entry of asList(entries)) {
      const id = entry?.categoryId;
      const name = entry?.categoryName;
      if (!isFilledString(String(id ?? '')) || !isFilledString(name)) continue;

      const parentId = entry?.parentCategoryId;
      let fullId;
      if (parentKey === null) {
        fullId = String(id);
      } else {
        const parent = idOf.get(String(parentId));
        if (!parent) continue;
        fullId = `${parent}-${id}`;
      }

      idOf.set(String(id), fullId);
      flat.push({ id: fullId, name });
    }
  };

  take(result.large, null);
  take(result.medium, 'large');
  take(result.small, 'medium');

  return flat;
}

// 料理名に合うカテゴリを探す。見つからなければ null。
// 推測で近いものを返すより、リンクを出さないほうがよい。
export function matchCategory(dishName, categories) {
  if (!isFilledString(dishName)) return null;

  const list = asList(categories).filter((c) => isFilledString(c?.name));
  if (!list.length) return null;

  const dish = normalize(dishName);
  if (dish.length < MIN_MATCH_LENGTH) return null;

  const exact = list.find((c) => normalize(c.name) === dish);
  if (exact) return exact;

  // 長いカテゴリ名ほど具体的なので優先する
  const byLengthDesc = [...list].sort((a, b) => normalize(b.name).length - normalize(a.name).length);

  const contained = byLengthDesc.find((c) => {
    const name = normalize(c.name);
    return name.length >= MIN_MATCH_LENGTH && dish.includes(name);
  });
  if (contained) return contained;

  return (
    byLengthDesc
      .slice()
      .reverse()
      .find((c) => normalize(c.name).includes(dish)) ?? null
  );
}
