import { Sparkles, History, ChevronRight, Tag, Refrigerator } from 'lucide-react';
import { COLORS } from '../theme';
import { SectionHeader, EmptyState } from './ui';
import AdSlot from './AdSlot';

export default function HomeView({
  history,
  fridgeCount,
  onGo,
  onOpenHistory,
  adSlot,
}) {
  return (
    <div className="fade-up">
      {/* Hero */}
      <section
        className="rounded-3xl p-6 mb-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${COLORS.tomato} 0%, ${COLORS.tomatoDeep} 100%)`,
          color: COLORS.paper,
        }}
      >
        <div
          className="absolute -right-6 -top-8 text-[120px] opacity-15 pointer-events-none select-none"
          aria-hidden
        >
          🍳
        </div>
        <div className="text-xs tracking-widest opacity-80 mb-2">
          TONIGHT'S DEAL
        </div>
        <h2 className="display text-2xl font-bold leading-snug mb-3">
          今夜のごはん、
          <br />
          冷蔵庫とチラシで。
        </h2>
        <p
          className="text-sm leading-relaxed mb-5 opacity-90"
          style={{ maxWidth: 260 }}
        >
          特売品と在庫から、その日いちばん安く作れるレシピをAIが提案します。
        </p>
        <button
          onClick={() => onGo('recipes')}
          className="w-full rounded-full py-3.5 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
          style={{
            background: COLORS.paper,
            color: COLORS.tomatoDeep,
          }}
        >
          <Sparkles size={16} />
          レシピを探す
        </button>
      </section>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <StatCard
          icon={<Refrigerator size={18} />}
          label="冷蔵庫の在庫"
          value={`${fridgeCount}`}
          unit="品"
          onClick={() => onGo('fridge')}
        />
        <StatCard
          icon={<History size={18} />}
          label="検索履歴"
          value={`${history.length}`}
          unit="件"
          onClick={() => onGo('recipes')}
          accent
        />
      </div>

      {/* History */}
      <SectionHeader
        eyebrow="HISTORY"
        title="最近のレシピ"
        sub="直近3回分のレシピ提案を表示しています。"
      />

      {history.length === 0 ? (
        <EmptyState
          icon={<History size={32} />}
          title="まだ履歴がありません"
          desc="レシピタブから検索すると、ここに3件まで保存されます"
        />
      ) : (
        <ul className="space-y-3">
          {history.map((entry) => (
            <li key={entry.id}>
              <button
                onClick={() => onOpenHistory(entry)}
                className="w-full rounded-2xl p-4 text-left active:scale-[0.99] transition-transform"
                style={{
                  background: COLORS.paper,
                  border: `1px solid ${COLORS.border}`,
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider"
                    style={{
                      background:
                        entry.source === 'flyer'
                          ? COLORS.tomato
                          : COLORS.matcha,
                      color: COLORS.paper,
                    }}
                  >
                    {entry.source === 'flyer' ? (
                      <>
                        <Tag size={10} />
                        チラシ
                      </>
                    ) : (
                      <>
                        <Refrigerator size={10} />
                        冷蔵庫
                      </>
                    )}
                  </span>
                  <span
                    className="text-[10px]"
                    style={{ color: COLORS.inkSoft }}
                  >
                    {formatDate(entry.searchedAt)}
                  </span>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div
                      className="text-xs mb-1"
                      style={{ color: COLORS.inkSoft }}
                    >
                      提案された{entry.recipes.length}件のレシピ
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {entry.recipes.slice(0, 3).map((r, i) => (
                        <span
                          key={i}
                          className="display text-sm font-bold truncate"
                          style={{ color: COLORS.ink, maxWidth: '100%' }}
                        >
                          {r.emoji} {r.name}
                          {i < entry.recipes.length - 1 && (
                            <span
                              style={{ color: COLORS.border }}
                              className="mx-1"
                            >
                              ・
                            </span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                  <ChevronRight
                    size={18}
                    style={{ color: COLORS.inkSoft, flexShrink: 0 }}
                  />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      <AdSlot slot={adSlot} label="ホームバナー (320×100)" minHeight={100} />
    </div>
  );
}

function StatCard({ icon, label, value, unit, onClick, accent }) {
  return (
    <button
      onClick={onClick}
      className="rounded-2xl p-4 text-left active:scale-[0.98] transition-transform"
      style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div
        className="flex items-center gap-2 text-xs mb-2"
        style={{ color: accent ? COLORS.tomato : COLORS.inkSoft }}
      >
        {icon}
        <span>{label}</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span
          className="display text-3xl font-bold"
          style={{ color: COLORS.ink }}
        >
          {value}
        </span>
        <span className="text-xs" style={{ color: COLORS.inkSoft }}>
          {unit}
        </span>
      </div>
    </button>
  );
}

function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  const diffHour = Math.floor(diffMs / 3600000);
  const diffDay = Math.floor(diffMs / 86400000);
  if (diffMin < 1) return 'たった今';
  if (diffMin < 60) return `${diffMin}分前`;
  if (diffHour < 24) return `${diffHour}時間前`;
  if (diffDay < 7) return `${diffDay}日前`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
}
