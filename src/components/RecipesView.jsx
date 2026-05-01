import { useRef } from 'react';
import { Camera, Refrigerator, ChefHat, Wallet } from 'lucide-react';
import { COLORS } from '../theme';
import { SectionHeader, EmptyState } from './ui';
import AdSlot from './AdSlot';
import QuotaBanner from './QuotaBanner';

export default function RecipesView({
  currentRecipes,
  currentMeta,
  onSearchFromFlyer,
  onSearchFromFridge,
  onOpenRecipe,
  fridgeCount,
  quotaStatus,
  onWatchAd,
  adSlot,
}) {
  const fileRef = useRef(null);

  return (
    <div className="fade-up">
      <SectionHeader
        eyebrow="AI SUGGESTIONS"
        title="レシピを探す"
        sub="チラシ画像か冷蔵庫の在庫からレシピを提案します。"
      />

      <QuotaBanner status={quotaStatus} onWatchAd={onWatchAd} />

      {/* Action buttons */}
      <div className="space-y-3 mb-6">
        <button
          onClick={() => fileRef.current?.click()}
          className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-[0.99] transition-transform"
          style={{
            background: `linear-gradient(135deg, ${COLORS.tomato} 0%, ${COLORS.tomatoDeep} 100%)`,
            color: COLORS.paper,
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ background: 'rgba(255,255,255,0.18)' }}
          >
            <Camera size={22} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-bold mb-0.5">
              チラシ画像を読み取ってレシピを探す
            </div>
            <div className="text-xs opacity-85">
              撮影またはアルバムから画像を選択できます
            </div>
          </div>
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onSearchFromFlyer(f);
            e.target.value = '';
          }}
          style={{ display: 'none' }}
        />

        <button
          onClick={onSearchFromFridge}
          disabled={fridgeCount === 0}
          className="w-full rounded-2xl p-5 flex items-center gap-4 active:scale-[0.99] transition-transform"
          style={{
            background:
              fridgeCount === 0
                ? COLORS.border
                : `linear-gradient(135deg, ${COLORS.matcha} 0%, #2D4530 100%)`,
            color: fridgeCount === 0 ? COLORS.inkSoft : COLORS.paper,
            cursor: fridgeCount === 0 ? 'not-allowed' : 'pointer',
          }}
        >
          <div
            className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0"
            style={{
              background:
                fridgeCount === 0
                  ? 'rgba(0,0,0,0.05)'
                  : 'rgba(255,255,255,0.18)',
            }}
          >
            <Refrigerator size={22} />
          </div>
          <div className="flex-1 text-left">
            <div className="text-sm font-bold mb-0.5">
              冷蔵庫にあるものからレシピを探す
            </div>
            <div className="text-xs opacity-85">
              {fridgeCount === 0
                ? '先に冷蔵庫タブで食材を追加してください'
                : `登録中の${fridgeCount}品からおすすめを提案`}
            </div>
          </div>
        </button>
      </div>

      {/* Results */}
      {currentRecipes.length === 0 ? (
        <EmptyState
          icon={<ChefHat size={32} />}
          title="まだ提案がありません"
          desc="上のボタンを押してレシピを探してみましょう"
        />
      ) : (
        <>
          {currentMeta && (
            <div
              className="text-xs flex items-center justify-center gap-3 mb-4"
              style={{ color: COLORS.inkSoft }}
            >
              <span>
                {currentMeta.source === 'flyer'
                  ? `チラシから ${currentMeta.flyerCount}件`
                  : '冷蔵庫から'}
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>冷蔵庫 {currentMeta.fridgeCount}品</span>
            </div>
          )}
          <div className="space-y-4">
            {currentRecipes.map((r, i) => (
              <RecipeCard
                key={i}
                recipe={r}
                onOpen={() => onOpenRecipe(r)}
                rank={i + 1}
              />
            ))}
            <AdSlot
              slot={adSlot}
              label="フィード内広告 (336×280)"
              minHeight={250}
            />
          </div>
        </>
      )}
    </div>
  );
}

function RecipeCard({ recipe, onOpen, rank }) {
  const missingTotal = (recipe.missingIngredients || []).reduce(
    (s, m) => s + (m.estimatedPrice || 0),
    0
  );
  return (
    <button
      onClick={onOpen}
      className="w-full rounded-2xl text-left overflow-hidden active:scale-[0.99] transition-transform"
      style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <div className="flex items-stretch">
        <div
          className="flex-shrink-0 flex items-center justify-center"
          style={{
            width: 110,
            background: `linear-gradient(135deg, ${COLORS.blush} 0%, ${COLORS.cream} 100%)`,
          }}
        >
          <span className="text-5xl">{recipe.emoji || '🍽'}</span>
        </div>
        <div className="flex-1 p-4 min-w-0">
          <div
            className="text-[10px] tracking-widest mb-1"
            style={{ color: COLORS.gold }}
          >
            #{rank} BEST VALUE
          </div>
          <div
            className="display text-base font-bold leading-tight mb-1.5 truncate"
            style={{ color: COLORS.ink }}
          >
            {recipe.name}
          </div>
          <div
            className="text-xs leading-snug mb-2 line-clamp-2"
            style={{ color: COLORS.inkSoft }}
          >
            {recipe.description}
          </div>
          <div className="flex items-baseline gap-3">
            <div>
              <div className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                1人前
              </div>
              <div
                className="display font-bold flex items-center gap-1"
                style={{ color: COLORS.tomato, fontSize: 18 }}
              >
                <Wallet size={14} />¥
                {(recipe.totalCost || 0).toLocaleString()}
              </div>
            </div>
            {missingTotal > 0 && (
              <div className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                追加購入 ¥{missingTotal.toLocaleString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
