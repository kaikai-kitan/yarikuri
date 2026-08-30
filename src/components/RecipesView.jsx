'use client';
import { Star, Wallet, Flame } from 'lucide-react';
import { COLORS } from '../theme';
import { isFavoriteRecipe, recipeFavoriteKey } from '../lib/favorites';
import { SectionHeader, EmptyState } from './ui';
import ProposalSettings from './ProposalSettings';
import { PRIORITY_LABELS } from '../lib/preferences';

// 並び順の根拠を見出しにも出す。軸を変えたのに「BEST VALUE」のままだと嘘になる。
const RANK_LABELS = {
  cost: 'BEST VALUE',
  calorie: 'LOW CALORIE',
  time: 'QUICKEST',
};

/**
 * レシピタブ — お気に入り一覧のみを表示するシンプルなビュー。
 * 検索・提案フローは AppNav のV字メニュー経由で別途表示される。
 */
export default function RecipesView({
  favorites = [],
  onToggleFavorite = () => {},
  onOpenRecipe,
  preferences = null,
  onChangePreferences = () => {},
}) {
  return (
    <div className="fade-up">
      {preferences && (
        <ProposalSettings preferences={preferences} onChange={onChangePreferences} />
      )}

      <SectionHeader
        eyebrow="FAVORITES"
        title="お気に入りレシピ"
        sub="星マークで保存したレシピをここで確認できます。"
      />

      {favorites.length === 0 ? (
        <EmptyState
          icon={<Star size={32} />}
          title="お気に入りはまだありません"
          desc="レシピ提案で表示されたレシピの星マークを押すと、ここに保存されます"
        />
      ) : (
        <div className="space-y-4">
          <div className="text-xs text-center" style={{ color: COLORS.inkSoft }}>
            保存したレシピ {favorites.length}件
          </div>
          {favorites.map((favorite) => (
            <RecipeCard
              key={favorite.id}
              recipe={favorite.recipe}
              onOpen={() => onOpenRecipe(favorite.recipe)}
              favorite
              onToggleFavorite={onToggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * レシピ提案の結果表示用ビュー。
 * AppNav のV字メニューから提案フローを実行した際に表示される。
 */
export function RecipeResultsView({
  currentRecipes,
  currentMeta,
  onOpenRecipe,
  favorites = [],
  onToggleFavorite = () => {},
  expiringNames = [],
  planSlot = null,
  preferences = null,
}) {
  return (
    <div className="fade-up">
      <SectionHeader
        eyebrow="AI SUGGESTIONS"
        title="レシピ提案結果"
        sub="冷蔵庫の食材とチラシ情報からAIが提案しました。"
      />

      {planSlot}

      {currentRecipes.length === 0 ? (
        <EmptyState
          icon={<Star size={32} />}
          title="提案を生成中..."
          desc="レシピを探しています"
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
                  : currentMeta.source === 'combined'
                  ? `チラシ ${currentMeta.flyerCount}件 + 冷蔵庫`
                  : '冷蔵庫から'}
              </span>
              <span style={{ opacity: 0.4 }}>·</span>
              <span>冷蔵庫 {currentMeta.fridgeCount}品</span>
              {preferences && (
                <>
                  <span style={{ opacity: 0.4 }}>·</span>
                  <span>
                    {preferences.servings}人分／{PRIORITY_LABELS[preferences.priority]}重視
                  </span>
                </>
              )}
            </div>
          )}
          <div className="space-y-4">
            {currentRecipes.map((r, i) => (
              <RecipeCard
                key={`${recipeFavoriteKey(r)}-${i}`}
                recipe={r}
                onOpen={() => onOpenRecipe(r)}
                rank={i + 1}
                expiringNames={expiringNames}
                favorite={isFavoriteRecipe(favorites, r)}
                onToggleFavorite={onToggleFavorite}
                rankLabel={RANK_LABELS[preferences?.priority] ?? RANK_LABELS.cost}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// 期限が近い食材を何品使い切れるかを一言で伝える。
function useUpMessage(recipe, expiringNames) {
  const used = (recipe.usedFromFridge || []).filter((name) => expiringNames.includes(name));
  if (!used.length) return null;
  return used.length === 1
    ? `${used[0]}を使い切れます`
    : `${used[0]}ほか${used.length - 1}品を使い切れます`;
}

function RecipeCard({
  recipe,
  onOpen,
  rank,
  rankLabel = 'BEST VALUE',
  expiringNames = [],
  favorite = false,
  onToggleFavorite,
}) {
  const missingTotal = (recipe.missingIngredients || []).reduce(
    (s, m) => s + (m.estimatedPrice || 0),
    0
  );
  const useUp = useUpMessage(recipe, expiringNames);
  return (
    <article
      className="relative w-full rounded-2xl overflow-hidden"
      style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
      }}
    >
      <button
        type="button"
        onClick={onOpen}
        aria-label={`${recipe.name}の詳細を見る`}
        className="w-full text-left active:scale-[0.99] transition-transform"
      >
        <div className="flex items-stretch">
        <div
          className="flex-shrink-0 flex items-center justify-center min-h-[164px]"
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
            {rank ? `#${rank} ${rankLabel}` : 'FAVORITE RECIPE'}
          </div>
          {useUp && (
            <div
              className="inline-block text-[10px] font-bold rounded-full px-2 py-0.5 mb-1.5"
              style={{ background: COLORS.blush, color: COLORS.tomatoDeep }}
            >
              {useUp}
            </div>
          )}
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
            {recipe.calories != null && (
              <div>
                <div className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                  カロリー
                </div>
                <div
                  className="display font-bold flex items-center gap-1"
                  style={{ color: COLORS.matcha, fontSize: 18 }}
                >
                  <Flame size={14} />
                  {recipe.calories}
                  <span className="text-[11px] font-normal">kcal</span>
                </div>
              </div>
            )}
            {missingTotal > 0 && (
              <div className="text-[10px]" style={{ color: COLORS.inkSoft }}>
                追加購入 ¥{missingTotal.toLocaleString()}
              </div>
            )}
          </div>
        </div>
        </div>
      </button>
      <button
        type="button"
        aria-label={
          favorite
            ? `${recipe.name}のお気に入りを解除`
            : `${recipe.name}をお気に入りに追加`
        }
        aria-pressed={favorite}
        onClick={() => onToggleFavorite(recipe)}
        className="absolute left-3 top-3 z-10 rounded-full flex items-center justify-center active:scale-90 transition-transform"
        style={{
          width: 44,
          height: 44,
          color: favorite ? COLORS.paper : COLORS.gold,
          background: favorite ? COLORS.gold : 'rgba(255, 253, 247, 0.94)',
          border: `1px solid ${favorite ? COLORS.gold : COLORS.border}`,
          boxShadow: '0 2px 8px rgba(34, 26, 20, 0.12)',
        }}
      >
        <Star size={18} fill={favorite ? 'currentColor' : 'none'} />
      </button>
    </article>
  );
}
