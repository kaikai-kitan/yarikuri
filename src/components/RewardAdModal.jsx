import { useEffect, useState } from 'react';
import { X, Check, Play } from 'lucide-react';
import { COLORS } from '../theme';
import AdSlot from './AdSlot';

const COUNTDOWN_SECONDS = 15;

/**
 * 検索前リワード広告モーダル。
 * 毎回の検索前に表示され、15秒の経過で「検索開始」ボタンが活性化する。
 * 経過時間ベースで報酬を渡すことでAdSenseポリシー準拠。
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
          <Play
            size={16}
            style={{ color: COLORS.tomato }}
            fill={COLORS.tomato}
          />
          <span
            className="display text-sm font-bold"
            style={{ color: COLORS.ink }}
          >
            広告のあとレシピ検索
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
          <div className="text-5xl mb-3">🍳</div>
          <h3
            className="display text-xl font-bold mb-2"
            style={{ color: COLORS.ink }}
          >
            無料でご利用いただけます
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ color: COLORS.inkSoft }}
          >
            このアプリは広告で運営されています。
            <br />
            {COUNTDOWN_SECONDS}秒間広告をご覧いただくと、
            <br />
            レシピ検索を開始できます。
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
            label="リワード広告 (300×250)"
            minHeight={250}
            format="rectangle"
          />
        </div>
      </div>

      {/* Footer */}
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
            レシピ検索を開始
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
          広告のクリックは不要です。経過時間で自動的に進めます。
        </div>
      </div>
    </div>
  );
}
