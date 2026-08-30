// レシピ提案の設定。「何人分か」と「何を優先するか」。
//
// 端末に保存され、提案・献立のどちらのリクエストにも載る。
// 保存値は手編集や旧スキーマが混ざりうるため、読み出し時に必ず正規化する。

export const MIN_SERVINGS = 1;
export const MAX_SERVINGS = 8;

// 提案の軸。安さ以外でも選べるようにするための入り口。
export const PRIORITIES = ['cost', 'calorie', 'time'];

export const PRIORITY_LABELS = {
  cost: '安さ',
  calorie: 'カロリー控えめ',
  time: '時短',
};

export const PRIORITY_DESCRIPTIONS = {
  cost: '1食あたりの材料費をいちばん安く',
  calorie: '1人前のカロリーを抑えめに',
  time: '調理時間の短いものから',
};

export const DEFAULT_PREFERENCES = { servings: 2, priority: 'cost' };

const clampServings = (value) => {
  const n = Number(value);
  if (typeof value !== 'number' || !Number.isFinite(n)) return null;
  return Math.min(MAX_SERVINGS, Math.max(MIN_SERVINGS, Math.round(n)));
};

export function normalizePreferences(stored) {
  if (!stored || typeof stored !== 'object' || Array.isArray(stored)) {
    return DEFAULT_PREFERENCES;
  }

  return {
    servings: clampServings(stored.servings) ?? DEFAULT_PREFERENCES.servings,
    priority: PRIORITIES.includes(stored.priority)
      ? stored.priority
      : DEFAULT_PREFERENCES.priority,
  };
}

export function withServings(preferences, servings) {
  return normalizePreferences({
    ...preferences,
    servings: clampServings(servings) ?? preferences?.servings,
  });
}

export function withPriority(preferences, priority) {
  return normalizePreferences({ ...preferences, priority });
}
