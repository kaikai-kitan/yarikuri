'use client';
import { COLORS } from '../theme';
import { useFridge, useHistory } from '@/lib/hooks';

export default function AppHeader() {
  const [fridge] = useFridge();
  const [history] = useHistory();

  return (
    <header
      className="sticky top-0 z-30 px-5 pt-4 pb-3"
      style={{
        background: COLORS.cream,
        borderBottom: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="flex items-end justify-between">
        <div>
          <div
            className="text-xs tracking-[0.4em] uppercase"
            style={{ color: COLORS.gold }}
          >
            Tokubai × Recipe
          </div>
          <h1
            className="display text-2xl font-bold mt-1"
            style={{ color: COLORS.ink }}
          >
            ヤリクリ<span style={{ color: COLORS.tomato }}>。</span>
          </h1>
        </div>
        <div
          className="text-[11px] text-right leading-tight"
          style={{ color: COLORS.inkSoft }}
        >
          登録不要・端末に保存
          <br />
          冷蔵庫 {fridge.length}品 / 履歴 {history.length}件
        </div>
      </div>
    </header>
  );
}
