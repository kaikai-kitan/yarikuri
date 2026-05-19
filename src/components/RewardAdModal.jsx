'use client';
import { useEffect, useState } from 'react';
import { X, Check } from 'lucide-react';
import { COLORS } from '../theme';

const COUNTDOWN_SECONDS = 5;

const TIPS = [
  { emoji: '🥕', title: '野菜の保存', body: '人参は葉を切り落とし、湿らせたキッチンペーパーで包むと1週間長持ちします。' },
  { emoji: '🍳', title: '炒め物のコツ', body: '強火で短時間が基本。具材を入れすぎると水分が出てべたつくので、少量ずつ炒めましょう。' },
  { emoji: '🧅', title: '玉ねぎの切り方', body: '繊維に沿って切ると食感が残り、繊維を断ち切ると甘みが出てトロトロになります。' },
  { emoji: '🍚', title: 'ご飯の炊き方', body: '洗米後30分吸水させてから炊くと、ふっくら甘みのあるご飯に仕上がります。' },
  { emoji: '🫙', title: '冷凍保存', body: 'きのこ類は洗わずそのまま冷凍OK。凍ったまま調理できて旨味もアップします。' },
  { emoji: '🔪', title: '包丁のメンテ', body: '切れ味が悪い包丁は料理のストレス源。月1回の研ぎで調理が格段に楽になります。' },
];

function randomTip() {
  return TIPS[Math.floor(Math.random() * TIPS.length)];
}

export default function RewardAdModal({ onClaim, onCancel }) {
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [tip] = useState(() => randomTip());

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
        <span className="display text-sm font-bold" style={{ color: COLORS.ink }}>
          料理の豆知識
        </span>
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
      <div className="flex-1 overflow-y-auto px-5 py-8 flex flex-col items-center justify-center">
        <div className="text-7xl mb-5">{tip.emoji}</div>
        <h3
          className="display text-xl font-bold mb-3"
          style={{ color: COLORS.ink }}
        >
          {tip.title}
        </h3>
        <p
          className="text-sm leading-relaxed text-center"
          style={{ color: COLORS.inkSoft, maxWidth: 280 }}
        >
          {tip.body}
        </p>

        <div
          className="mt-10 rounded-2xl px-6 py-4 text-center"
          style={{
            background: COLORS.paper,
            border: `1px solid ${COLORS.border}`,
          }}
        >
          <p className="text-xs mb-1" style={{ color: COLORS.inkSoft }}>
            AIがレシピを考えています…
          </p>
          <p className="text-xs" style={{ color: COLORS.inkSoft }}>
            少しお待ちください
          </p>
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
      </div>
    </div>
  );
}
