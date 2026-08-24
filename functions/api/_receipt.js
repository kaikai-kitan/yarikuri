// レシートOCRの出力を、保存できる形に整える。
// AIの応答をそのまま信用しないための境界。純関数なのでテストから直接呼べる。

const MAX_ITEMS = 60;
const MAX_NAME = 40;
const MAX_STORE = 30;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const CATEGORIES = ['food', 'daily', 'other'];

// 食材の日持ちの種別。判定できない場合は staple（期限を設けない）に寄せる。
export const FOOD_KINDS = ['perishable', 'vegetable', 'dairy', 'staple'];

const todayIso = () => new Date().toISOString().slice(0, 10);

// カテゴリ未対応の応答が来ても壊れないよう、isFood からも拾う。
function categoryOf(item) {
  if (CATEGORIES.includes(item?.category)) return item.category;
  return item?.isFood === true ? 'food' : 'other';
}

export function normalizeReceipt(parsed) {
  const items = (Array.isArray(parsed?.items) ? parsed.items : [])
    .filter(
      (i) => i && typeof i.name === 'string' && i.name.trim() && Number.isFinite(Number(i.price))
    )
    .slice(0, MAX_ITEMS)
    .map((i) => {
      const category = categoryOf(i);
      return {
        name: String(i.name).slice(0, MAX_NAME).trim(),
        price: Math.round(Number(i.price)),
        category,
        kind: FOOD_KINDS.includes(i?.kind) ? i.kind : 'staple',
        // 旧クライアント向けの後方互換
        isFood: category === 'food',
      };
    });

  const itemsTotal = items.reduce((sum, i) => sum + i.price, 0);
  const reported = Number(parsed?.total);
  const date =
    typeof parsed?.date === 'string' && DATE_PATTERN.test(parsed.date) ? parsed.date : todayIso();

  return {
    store: typeof parsed?.store === 'string' ? parsed.store.slice(0, MAX_STORE).trim() : '',
    date,
    // 合計が読めなかった場合は品目の合計で代用する
    total: Number.isFinite(reported) && reported > 0 ? Math.round(reported) : itemsTotal,
    items,
  };
}
