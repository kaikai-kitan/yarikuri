// AIを呼ばずに画面を動かすための定型データ。
//
// APIキーが無い・使えない状態でもUIの確認と手戻りのない開発ができるようにする。
// 本番で誤って有効にならないよう、環境変数 MOCK_AI='1' を明示したときだけ働く。
//
// 純関数なのでテストから直接呼べる。実データと同じ正規化関数を通す前提の
// 「AIが返したつもりの生の形」を返す。

export const isMockEnabled = (env) => env?.MOCK_AI === '1';

const nameOf = (item) => (typeof item?.name === 'string' ? item.name.trim() : '');

const namesOf = (list, count) =>
  (Array.isArray(list) ? list : []).map(nameOf).filter(Boolean).slice(0, count);

// --- レシピ提案 ---------------------------------------------------------

const RECIPE_TEMPLATES = [
  {
    name: '豚こまとじゃがいもの甘辛炒め',
    emoji: '🍳',
    description: 'フライパンひとつ、15分で',
    missingIngredients: [{ name: 'みりん', estimatedPrice: 198, buyAt: '' }],
    totalCost: 280,
    cookingTime: '約15分',
  },
  {
    name: '具だくさん豚汁',
    emoji: '🍲',
    description: '残り野菜をまとめて使い切る',
    missingIngredients: [],
    totalCost: 210,
    cookingTime: '約25分',
  },
  {
    name: '鶏むねの塩レモン蒸し',
    emoji: '🍋',
    description: 'レンジ加熱だけで作れる',
    missingIngredients: [{ name: 'レモン', estimatedPrice: 128, buyAt: 'スーパーA' }],
    totalCost: 240,
    cookingTime: '約12分',
  },
];

export function mockRecipes(fridge = [], flyerItems = []) {
  const fromFridge = namesOf(fridge, 3);
  const fromDeals = namesOf(flyerItems, 2);

  // 在庫を1品ずつ配って、どのレシピも手持ちと噛み合って見えるようにする。
  return RECIPE_TEMPLATES.map((template, i) => ({
    ...template,
    usedFromFridge: fromFridge.filter((_, index) => index % RECIPE_TEMPLATES.length === i),
    usedFromDeals: fromDeals.filter((_, index) => index % RECIPE_TEMPLATES.length === i),
  }));
}

// --- チラシ解析 ---------------------------------------------------------

export function mockFlyerItems() {
  return [
    { name: '豚こま切れ', price: 98, store: 'スーパーA' },
    { name: '鶏もも肉', price: 128, store: 'スーパーA' },
    { name: 'じゃがいも', price: 158, store: 'スーパーB' },
    { name: '玉ねぎ', price: 108, store: 'スーパーB' },
  ];
}

// --- レシート解析 -------------------------------------------------------

export function mockReceipt() {
  return {
    store: 'スーパーA 中央店',
    date: new Date().toISOString().slice(0, 10),
    total: 1836,
    items: [
      { name: '豚こま切れ 300g', price: 398, category: 'food', kind: 'perishable' },
      { name: 'じゃがいも 3個', price: 258, category: 'food', kind: 'vegetable' },
      { name: '玉ねぎ 3個', price: 198, category: 'food', kind: 'vegetable' },
      { name: '牛乳 1L', price: 218, category: 'food', kind: 'dairy' },
      { name: '米 2kg', price: 598, category: 'food', kind: 'staple' },
      { name: '台所用洗剤', price: 166, category: 'daily', kind: 'staple' },
    ],
  };
}

// --- 週次献立 -----------------------------------------------------------

const PLAN_DAYS = [
  {
    name: '豚こまとじゃがいもの甘辛炒め',
    emoji: '🍳',
    description: 'まず傷みやすい豚こまから',
    reason: '日持ちしない豚こまを初日に使い切るため',
    usedFromShopping: ['豚こま切れ', 'じゃがいも'],
    carryOver: ['玉ねぎ'],
    totalCost: 280,
    cookingTime: '約15分',
  },
  {
    name: '玉ねぎたっぷり鶏そぼろ丼',
    emoji: '🍚',
    description: '前日の玉ねぎをそのまま',
    reason: '初日に余った玉ねぎを翌日へ繋ぐため',
    usedFromShopping: ['鶏ひき肉'],
    carryOver: ['鶏ひき肉'],
    totalCost: 230,
    cookingTime: '約20分',
  },
  {
    name: '麻婆豆腐',
    emoji: '🌶',
    description: '残ったひき肉を寄せて',
    reason: '前日のひき肉を使い切るため',
    usedFromShopping: ['豆腐'],
    carryOver: [],
    totalCost: 250,
    cookingTime: '約20分',
  },
  {
    name: '鮭のホイル焼き',
    emoji: '🐟',
    description: '魚の日をはさむ',
    reason: '肉が続いたので魚に切り替えるため',
    usedFromShopping: ['甘塩鮭'],
    carryOver: [],
    totalCost: 320,
    cookingTime: '約25分',
  },
  {
    name: '野菜たっぷりカレー',
    emoji: '🍛',
    description: '半端に残った野菜を全部',
    reason: '週の中盤で野菜を整理するため',
    usedFromShopping: ['にんじん', 'カレールー'],
    carryOver: ['カレー'],
    totalCost: 260,
    cookingTime: '約35分',
  },
  {
    name: '焼きカレーうどん',
    emoji: '🍜',
    description: '前日のカレーをリメイク',
    reason: '前日のカレーを別の一皿に作り替えるため',
    usedFromShopping: ['うどん'],
    carryOver: [],
    totalCost: 180,
    cookingTime: '約10分',
  },
  {
    name: '冷蔵庫一掃の具だくさん味噌汁',
    emoji: '🥣',
    description: '残りものを締めに',
    reason: '週末に冷蔵庫を空にして翌週へ持ち越さないため',
    usedFromShopping: [],
    carryOver: [],
    totalCost: 150,
    cookingTime: '約15分',
  },
];

export function mockPlan(fridge = []) {
  const fromFridge = namesOf(fridge, PLAN_DAYS.length);

  return {
    shoppingList: [
      { name: '豚こま切れ', estimatedPrice: 398 },
      { name: '鶏ひき肉', estimatedPrice: 298 },
      { name: '甘塩鮭 2切', estimatedPrice: 358 },
      { name: 'じゃがいも 3個', estimatedPrice: 258 },
      { name: 'にんじん 2本', estimatedPrice: 158 },
      { name: '豆腐', estimatedPrice: 78 },
      { name: 'うどん 2玉', estimatedPrice: 118 },
    ],
    days: PLAN_DAYS.map((day, i) => ({
      ...day,
      // 手持ちの在庫も1品ずつ割り当てて、冷蔵庫と地続きに見せる
      usedFromFridge: fromFridge[i] ? [fromFridge[i]] : [],
    })),
  };
}
