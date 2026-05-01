import { Sparkles, Gift } from 'lucide-react';
import { COLORS } from '../theme';

export default function QuotaBanner({ status, onWatchAd }) {
  const { freeRemaining, rewardedTickets, needsReward } = status;

  if (needsReward) {
    return (
      <button
        onClick={onWatchAd}
        className="w-full rounded-2xl px-4 py-3 flex items-center gap-3 mb-4 active:scale-[0.99] transition-transform"
        style={{
          background: COLORS.paper,
          border: `1px dashed ${COLORS.tomato}`,
          color: COLORS.ink,
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ background: COLORS.blush, color: COLORS.tomatoDeep }}
        >
          <Gift size={16} />
        </div>
        <div className="flex-1 text-left min-w-0">
          <div
            className="text-xs font-bold"
            style={{ color: COLORS.tomatoDeep }}
          >
            今日の無料利用は終了しました
          </div>
          <div className="text-[11px]" style={{ color: COLORS.inkSoft }}>
            広告を15秒見ると追加で検索できます
          </div>
        </div>
        <span
          className="text-xs font-bold px-3 py-1.5 rounded-full"
          style={{ background: COLORS.tomato, color: COLORS.paper }}
        >
          視聴
        </span>
      </button>
    );
  }

  return (
    <div
      className="rounded-2xl px-4 py-3 flex items-center gap-3 mb-4"
      style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0"
        style={{ background: COLORS.blush, color: COLORS.tomato }}
      >
        <Sparkles size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div
          className="text-xs font-bold"
          style={{ color: COLORS.ink }}
        >
          今日の残り {freeRemaining + rewardedTickets} 回
        </div>
        <div className="text-[11px]" style={{ color: COLORS.inkSoft }}>
          {freeRemaining > 0 && `無料 ${freeRemaining} 回`}
          {freeRemaining > 0 && rewardedTickets > 0 && ' / '}
          {rewardedTickets > 0 && `追加 ${rewardedTickets} 回`}
        </div>
      </div>
    </div>
  );
}
