// /api/recipe-link が返す理由コードを、画面に出す文言に変える。
//
// 「見つからなかった」と「連携が壊れている」は利用者にとって意味が違う。
// 前者は黙って流し、後者だけ知らせる。

const MESSAGES = {
  auth_failed: '楽天レシピ連携の認証に失敗しました。設定を確認してください',
  rate_limited: '楽天レシピが混み合っています。少し待ってからお試しください',
};

const SILENT = new Set(['no_match', 'no_recipe']);

const FALLBACK = '楽天レシピの取得に失敗しました';

export function recipeLinkErrorMessage(reason) {
  if (!reason || SILENT.has(reason)) return '';
  return MESSAGES[reason] ?? FALLBACK;
}
