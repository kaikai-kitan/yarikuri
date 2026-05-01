import { useEffect, useState } from 'react';
import { Gift, X, Check } from 'lucide-react';
import { COLORS } from '../theme';
import AdSlot from './AdSlot';

const COUNTDOWN_SECONDS = 15;

/**
 * リワード広告モーダル。
 * フルスクリーンで広告を表示し、15秒経過後に「報酬を受け取る」ボタンが活性化する。
 * AdSenseポリシー準拠のため、広告クリックを報酬条件にせず、
 * 純粋に経過時間で報酬を渡す。
 */
export default function RewardAdModal({ onClaim, onCancel, slot }) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  const ready = secondsLeft <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col"
      style={{ background: COLORS.cream }}
    >
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${COLORS.border}` }}
      >
        <div className="flex items-center gap-2">
          <Gift size={18} style={{ color: COLORS.tomato }} />
          <span
            className="display text-sm font-bold"
            style={{ color: COLORS.ink }}
          >
            広告で1回分追加
          </span>
        </div>
        <button
          onClick={onCancel}
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ color: COLORS.inkSoft }}
          aria-label="閉じる"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-5 py-6">
        <div className="text-center mb-5">
          <div className="text-5xl mb-3">🎁</div>
          <h3
            className="display text-xl font-bold mb-2"
            style={{ color: COLORS.ink }}
          >
            広告を見て、もう1回検索
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ color: COLORS.inkSoft }}
          >
            この広告を{COUNTDOWN_SECONDS}秒間ご覧いただくと、
            <br />
            レシピ検索を1回追加でご利用いただけます。
          </p>
        </div>

        {/* Ad area */}
        <div
          className="rounded-2xl p-4 mb-5"
          style={{
            background: COLORS.paper,
            border: `1px solid ${COLORS.border}`,
            minHeight: 280,
          }}
        >
          <div
            className="text-[10px] tracking-widest text-center mb-2"
            style={{ color: COLORS.inkSoft }}
          >
            — Sponsored —
          </div>
          <AdSlot
            slot={slot}
            label="リワード広告 (300×250 程度)"
            minHeight={250}
            format="rectangle"
          />
        </div>
      </div>

      {/* Footer / claim button */}
      <div
        className="px-5 py-4"
        style={{
          background: COLORS.paper,
          borderTop: `1px solid ${COLORS.border}`,
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)',
        }}
      >
        {ready ? (
          <button
            onClick={onClaim}
            className="w-full rounded-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
            style={{ background: COLORS.tomato, color: COLORS.paper }}
          >
            <Check size={16} />
            報酬を受け取る (検索1回分)
          </button>
        ) : (
          <button
            disabled
            className="w-full rounded-full py-3.5 font-bold text-sm"
            style={{
              background: COLORS.border,
              color: COLORS.inkSoft,
              cursor: 'not-allowed',
            }}
          >
            あと {secondsLeft} 秒…
          </button>
        )}
        <div
          className="text-[10px] text-center mt-2"
          style={{ color: COLORS.inkSoft }}
        >
          広告のクリックは不要です。{COUNTDOWN_SECONDS}秒経過で自動的に受取可能になります。
        </div>
      </div>
    </div>
  );
}
