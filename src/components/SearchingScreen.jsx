import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { COLORS } from '../theme';
import AdSlot from './AdSlot';

const MESSAGES = {
  flyer: [
    'チラシをめくっています…',
    '特売品を読み取っています…',
    '冷蔵庫の中身も確認中…',
    'コスパを計算しています…',
    'おいしい組み合わせを探しています…',
  ],
  fridge: [
    '冷蔵庫を覗いています…',
    '今夜のメニューを考え中…',
    'コスパを計算しています…',
    'おいしい組み合わせを探しています…',
  ],
};

export default function SearchingScreen({ source = 'fridge', adSlot }) {
  const [idx, setIdx] = useState(0);
  const messages = MESSAGES[source] || MESSAGES.fridge;

  useEffect(() => {
    const t = setInterval(
      () => setIdx((i) => (i + 1) % messages.length),
      1700
    );
    return () => clearInterval(t);
  }, [messages.length]);

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ background: COLORS.cream }}
    >
      <div className="min-h-full flex flex-col px-5 pt-16 pb-8">
        {/* Status */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-5 pulse-slow">
            {source === 'flyer' ? '📋' : '🍳'}
          </div>
          <div
            className="display text-lg font-bold mb-2"
            style={{ color: COLORS.ink }}
          >
            {messages[idx]}
          </div>
          <div
            className="text-xs flex items-center justify-center gap-1.5"
            style={{ color: COLORS.inkSoft }}
          >
            <Loader2 className="spin-slow" size={12} />
            <span>15秒ほどお待ちください</span>
          </div>
        </div>

        {/* Ad */}
        <div className="flex-1">
          <div
            className="text-[10px] tracking-widest text-center mb-2"
            style={{ color: COLORS.inkSoft }}
          >
            — Sponsored —
          </div>
          <AdSlot
            slot={adSlot}
            label="検索中広告 (300×250)"
            minHeight={250}
          />
        </div>

        {/* Skeleton preview */}
        <div className="space-y-3 mt-4">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="rounded-2xl p-4 pulse-slow"
              style={{
                background: COLORS.paper,
                border: `1px solid ${COLORS.border}`,
                opacity: 0.7,
                animationDelay: `${i * 0.15}s`,
              }}
            >
              <div
                className="h-4 rounded mb-3"
                style={{ background: COLORS.border, width: '60%' }}
              />
              <div
                className="h-3 rounded mb-2"
                style={{ background: COLORS.border, width: '85%' }}
              />
              <div
                className="h-3 rounded"
                style={{ background: COLORS.border, width: '40%' }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
