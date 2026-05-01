import { Wallet, ExternalLink, Image as ImageIcon, Search } from 'lucide-react';
import { COLORS } from '../theme';

export default function RecipeDetail({ recipe, onClose }) {
  const cookpadUrl = `https://cookpad.com/jp/search/${encodeURIComponent(
    recipe.name
  )}`;
  const rakutenUrl = `https://recipe.rakuten.co.jp/search/${encodeURIComponent(
    recipe.name
  )}`;
  const googleUrl = `https://www.google.com/search?q=${encodeURIComponent(
    recipe.name + ' レシピ'
  )}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(34, 26, 20, 0.55)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-t-3xl overflow-hidden fade-up"
        style={{ background: COLORS.cream, maxHeight: '92vh' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-center pt-3 pb-1">
          <div
            className="w-10 h-1 rounded-full"
            style={{ background: COLORS.border }}
          />
        </div>

        <div
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(92vh - 24px)' }}
        >
          {/* Hero */}
          <div
            className="px-6 pt-4 pb-6 text-center"
            style={{
              background: `linear-gradient(135deg, ${COLORS.blush} 0%, ${COLORS.cream} 100%)`,
            }}
          >
            <div className="text-7xl mb-3">{recipe.emoji || '🍽'}</div>
            <div
              className="text-[10px] tracking-[0.3em] mb-1"
              style={{ color: COLORS.gold }}
            >
              {recipe.cookingTime || '—'}
            </div>
            <h2
              className="display text-2xl font-bold leading-snug"
              style={{ color: COLORS.ink }}
            >
              {recipe.name}
            </h2>
            <p className="text-sm mt-2" style={{ color: COLORS.inkSoft }}>
              {recipe.description}
            </p>
          </div>

          <div className="px-6 py-5 space-y-5">
            {/* Cost */}
            <div
              className="rounded-2xl p-4 flex items-center gap-3"
              style={{ background: COLORS.ink, color: COLORS.paper }}
            >
              <Wallet size={20} />
              <div className="flex-1">
                <div className="text-[10px] tracking-widest opacity-70">
                  TOTAL / 1人前
                </div>
                <div
                  className="display font-bold"
                  style={{ fontSize: 24, color: COLORS.paper }}
                >
                  ¥{(recipe.totalCost || 0).toLocaleString()}
                </div>
              </div>
            </div>

            {recipe.usedFromFridge?.length > 0 && (
              <Block label="冷蔵庫から使うもの" color={COLORS.matcha}>
                <div className="flex flex-wrap gap-1.5">
                  {recipe.usedFromFridge.map((x, i) => (
                    <Chip key={i} text={x} dotColor={COLORS.matcha} />
                  ))}
                </div>
              </Block>
            )}

            {recipe.usedFromDeals?.length > 0 && (
              <Block label="特売品から使うもの" color={COLORS.tomato}>
                <div className="flex flex-wrap gap-1.5">
                  {recipe.usedFromDeals.map((x, i) => (
                    <Chip key={i} text={x} dotColor={COLORS.tomato} />
                  ))}
                </div>
              </Block>
            )}

            {recipe.missingIngredients?.length > 0 && (
              <Block label="追加購入が必要" color={COLORS.gold}>
                <ul className="space-y-1.5">
                  {recipe.missingIngredients.map((m, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between text-sm rounded-lg px-3 py-2"
                      style={{
                        background: COLORS.paper,
                        border: `1px solid ${COLORS.border}`,
                      }}
                    >
                      <span style={{ color: COLORS.ink }}>{m.name}</span>
                      <span
                        className="display font-bold text-xs"
                        style={{ color: COLORS.gold }}
                      >
                        ¥{(m.estimatedPrice || 0).toLocaleString()}
                      </span>
                    </li>
                  ))}
                </ul>
              </Block>
            )}

            {/* External links */}
            <div>
              <div
                className="text-[10px] tracking-widest mb-2"
                style={{ color: COLORS.inkSoft }}
              >
                作り方を見る
              </div>
              <div className="space-y-2">
                <ExternalLinkButton
                  href={cookpadUrl}
                  label="クックパッドで検索"
                  icon={<ImageIcon size={16} />}
                />
                <ExternalLinkButton
                  href={rakutenUrl}
                  label="楽天レシピで検索"
                  icon={<ImageIcon size={16} />}
                />
                <ExternalLinkButton
                  href={googleUrl}
                  label="Googleで検索"
                  icon={<Search size={16} />}
                />
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full rounded-full py-3 text-sm font-bold mt-2"
              style={{
                background: 'transparent',
                border: `1px solid ${COLORS.border}`,
                color: COLORS.inkSoft,
              }}
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Block({ label, color, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-1 h-3 rounded-full"
          style={{ background: color }}
        />
        <div
          className="text-[11px] tracking-widest font-bold"
          style={{ color: COLORS.ink }}
        >
          {label}
        </div>
      </div>
      {children}
    </div>
  );
}

function Chip({ text, dotColor }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs"
      style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.ink,
      }}
    >
      <span
        className="w-1 h-1 rounded-full"
        style={{ background: dotColor }}
      />
      {text}
    </span>
  );
}

function ExternalLinkButton({ href, label, icon }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-xl px-4 py-3 flex items-center gap-2 text-sm font-medium active:scale-[0.99] transition-transform"
      style={{
        background: COLORS.paper,
        border: `1px solid ${COLORS.border}`,
        color: COLORS.ink,
      }}
    >
      <span style={{ color: COLORS.tomato }}>{icon}</span>
      <span className="flex-1">{label}</span>
      <ExternalLink size={14} style={{ color: COLORS.inkSoft }} />
    </a>
  );
}
