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
  try {
    localStorage.setItem(key, JSON.stringify(list));
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
