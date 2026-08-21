// 日本語入力(IME)の変換候補を確定する Enter は keydown でも発火するため、
// そのまま送信すると未変換のかなが登録されてしまう。変換中の Enter は無視する。
export function isSubmitKey(e) {
  return e.key === 'Enter' && !e.nativeEvent?.isComposing;
}
