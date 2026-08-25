'use client';
import { History, ChevronRight, Tag, Refrigerator } from 'lucide-react';
import { COLORS } from '../theme';
import { SectionHeader, EmptyState } from './ui';
import WeekPlanView from './WeekPlanView';

/**
 * ホーム — 直近に作ったメニューを並べるだけの画面。
 * 献立を作る導線は下部ナビのV字メニューに集約しているため、ここには置かない。
 */
export default function HomeView({
  history,
  onOpenHistory,
  weekPlan,
  onClearPlan,
  onToggleCooked,
  recipeLinks,
  linkingAvailable,
  onFetchLink,
  adSlot,
}) {
  return (
    <div className="fade-up">
      {weekPlan && (
        <>
          <SectionHeader
            eyebrow="WEEK PLAN"
            title="直近の1週間献立"
            sub="最近作成した1週間の献立です"
          />
          <WeekPlanView
            plan={weekPlan}
            onClearPlan={onClearPlan}
            onToggleCooked={onToggleCooked}
            links={recipeLinks}
            linkingAvailable={linkingAvailable}
            onFetchLink={onFetchLink}
          />
          <div className="h-6" />
        </>
      )}

      <SectionHeader
        eyebrow="LATEST"
        title="直近のメニュー"
        sub="最近作ったメニューを新しい順に並べています。"
      />

      {history.length === 0 ? (
        <EmptyState
          icon={<History size={32} />}
          title="まだメニューがありません"
          desc="画面下の魔法の杖ボタンから献立を作ると、ここに3件まで残ります"
        />
      ) : (
        <ul className="space-y-3">
          {history.map((entry) => (
            <li key={entry.id}>
              <MenuCard entry={entry} onOpen={() => onOpenHistory(entry)} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MenuCard({ entry, onOpen }) {
  const fromFlyer = entry.source === 'flyer';
  return (
    <button
      onClick={onOpen}
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
            background: fromFlyer ? COLORS.tomato : COLORS.matcha,
            color: COLORS.paper,
          }}
        >
          {fromFlyer ? (
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
        <span className="text-[10px]" style={{ color: COLORS.inkSoft }}>
          {formatDate(entry.searchedAt)}
        </span>
      </div>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-xs mb-1" style={{ color: COLORS.inkSoft }}>
            {entry.recipes.length}件のメニュー
          </div>
          <ul className="space-y-0.5">
            {entry.recipes.map((r, i) => (
              <li
                key={`${r.name}-${i}`}
                className="display text-sm font-bold truncate"
                style={{ color: COLORS.ink }}
              >
                {r.emoji} {r.name}
              </li>
            ))}
          </ul>
        </div>
        <ChevronRight size={18} style={{ color: COLORS.inkSoft, flexShrink: 0 }} />
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
