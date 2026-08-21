// localStorageの薄いラッパー
// すべて同期APIだが、将来サーバー保存に切り替えやすいよう Promise を返す。

export async function loadList(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveList(key, list) {
  return saveValue(key, list);
}

// 配列以外の単一値（数値・オブジェクト等）用。未保存・破損時は null。
export async function loadValue(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveValue(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('storage save failed:', e);
  }
}

export async function clearKey(key) {
  try {
    localStorage.removeItem(key);
  } catch (e) {
    console.error('storage clear failed:', e);
  }
}
