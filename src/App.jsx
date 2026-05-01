import { useEffect, useState, useCallback } from 'react';
import { Home, Refrigerator, ChefHat, Loader2 } from 'lucide-react';
import { COLORS } from './theme';
import { loadList, saveList } from './lib/storage';
import { ocrFlyer, suggestRecipes } from './lib/api';
import { compressImage } from './lib/image';
import HomeView from './components/HomeView';
import FridgeView from './components/FridgeView';
import RecipesView from './components/RecipesView';
import RecipeDetail from './components/RecipeDetail';
import SearchingScreen from './components/SearchingScreen';
import RewardAdModal from './components/RewardAdModal';
import { Toast } from './components/ui';

const HISTORY_LIMIT = 3;

// AdSense広告ユニットのスロットID。各タブが独立URLを持つので
// AdSense管理画面で個別ユニット作成 → ページ別最適化が可能。
// 空文字のままだと自動広告に任せる動作になる。
const AD_SLOTS = {
  homeBanner: '',
  searchingFullscreen: '',
  resultsFeed: '',
  rewardModal: '',
};

const PATH_TO_TAB = {
  '/': 'home',
  '/fridge': 'fridge',
  '/recipes': 'recipes',
};
const TAB_TO_PATH = {
  home: '/',
  fridge: '/fridge',
  recipes: '/recipes',
};

function getTabFromPath() {
  if (typeof window === 'undefined') return 'home';
  return PATH_TO_TAB[window.location.pathname] || 'home';
}

export default function App() {
  const [tab, setTab] = useState(() => getTabFromPath());
  const [fridge, setFridge] = useState([]);
  const [history, setHistory] = useState([]);
  const [currentRecipes, setCurrentRecipes] = useState([]);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [recipeOpen, setRecipeOpen] = useState(null);
  const [toast, setToast] = useState(null);
  const [searching, setSearching] = useState(null);
  const [showReward, setShowReward] = useState(false);
  // 広告視聴後に実行する検索処理を保持
  const [pendingAction, setPendingAction] = useState(null);
  const [ready, setReady] = useState(false);

  /* --- URL routing --- */
  const navigate = useCallback((nextTab) => {
    const targetPath = TAB_TO_PATH[nextTab] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
    setTab(nextTab);
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, []);

  useEffect(() => {
    const handler = () => setTab(getTabFromPath());
    window.addEventListener('popstate', handler);
    return () => window.removeEventListener('popstate', handler);
  }, []);

  useEffect(() => {
    const titles = {
      home: 'ヤリクリ｜特売×冷蔵庫の最安レシピ',
      fridge: '冷蔵庫の在庫管理 ｜ ヤリクリ',
      recipes: 'レシピを探す ｜ ヤリクリ',
    };
    document.title = titles[tab] || titles.home;
  }, [tab]);

  /* --- initial load --- */
  useEffect(() => {
    (async () => {
      const [f, h] = await Promise.all([
        loadList('fridge:items'),
        loadList('history:searches'),
      ]);
      setFridge(f);
      setHistory(h);
      setReady(true);
    })();
  }, []);

  /* --- persist --- */
  useEffect(() => {
    if (ready) saveList('fridge:items', fridge);
  }, [fridge, ready]);
  useEffect(() => {
    if (ready) saveList('history:searches', history);
  }, [history, ready]);

  const showToast = (message, type = 'info') => setToast({ message, type });

  /* --- fridge --- */
  const addFridgeItem = (name) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (fridge.some((f) => f.name === trimmed)) {
      showToast('すでに登録されています', 'error');
      return;
    }
    setFridge([
      { id: crypto.randomUUID(), name: trimmed, addedAt: Date.now() },
      ...fridge,
    ]);
  };
  const removeFridgeItem = (id) =>
    setFridge(fridge.filter((f) => f.id !== id));

  const recordHistory = (entry) => {
    const next = [entry, ...history].slice(0, HISTORY_LIMIT);
    setHistory(next);
  };

  /* --- 全検索の前にリワード広告を表示する共通ラッパー --- */
  const gateBehindAd = (actionFn) => {
    setPendingAction(() => actionFn);
    setShowReward(true);
  };

  const handleRewardClaim = () => {
    setShowReward(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  };
  const handleRewardCancel = () => {
    setShowReward(false);
    setPendingAction(null);
  };

  /* --- 履歴を開く (これは課金不要、過去結果の再表示) --- */
  const openHistory = (entry) => {
    setCurrentRecipes(entry.recipes);
    setCurrentMeta({
      source: entry.source,
      flyerCount: entry.flyerItems?.length || 0,
      fridgeCount: entry.fridgeUsed?.length || 0,
    });
    navigate('recipes');
  };

  /* --- search from flyer (要広告視聴) --- */
  const searchFromFlyer = (file) => {
    if (!file) return;
    gateBehindAd(async () => {
      setSearching('flyer');
      setCurrentRecipes([]);
      setCurrentMeta(null);
      try {
        const { base64, mediaType } = await compressImage(file);
        const flyerItems = await ocrFlyer(base64, mediaType);
        if (!flyerItems.length) {
          showToast('特売品を検出できませんでした', 'error');
          setSearching(null);
          return;
        }
        const fridgeNames = fridge.map((f) => f.name);
        const recipes = await suggestRecipes(fridgeNames, flyerItems);
        if (!recipes.length) {
          showToast('作れるレシピが見つかりませんでした', 'error');
          setSearching(null);
          return;
        }
        const entry = {
          id: crypto.randomUUID(),
          searchedAt: Date.now(),
          source: 'flyer',
          fridgeUsed: fridgeNames,
          flyerItems,
          recipes,
        };
        recordHistory(entry);
        setCurrentRecipes(recipes);
        setCurrentMeta({
          source: 'flyer',
          flyerCount: flyerItems.length,
          fridgeCount: fridgeNames.length,
        });
        showToast(`チラシから${flyerItems.length}件読取り、レシピを提案しました`);
      } catch (e) {
        console.error(e);
        showToast(e.message || '検索に失敗しました', 'error');
      } finally {
        setSearching(null);
      }
    });
  };

  /* --- search from fridge only (要広告視聴) --- */
  const searchFromFridge = () => {
    if (fridge.length === 0) {
      showToast('冷蔵庫タブで食材を追加してください', 'error');
      return;
    }
    gateBehindAd(async () => {
      setSearching('fridge');
      setCurrentRecipes([]);
      setCurrentMeta(null);
      try {
        const fridgeNames = fridge.map((f) => f.name);
        const recipes = await suggestRecipes(fridgeNames, []);
        if (!recipes.length) {
          showToast('作れるレシピが見つかりませんでした', 'error');
          setSearching(null);
          return;
        }
        const entry = {
          id: crypto.randomUUID(),
          searchedAt: Date.now(),
          source: 'fridge',
          fridgeUsed: fridgeNames,
          flyerItems: null,
          recipes,
        };
        recordHistory(entry);
        setCurrentRecipes(recipes);
        setCurrentMeta({
          source: 'fridge',
          flyerCount: 0,
          fridgeCount: fridgeNames.length,
        });
        showToast('冷蔵庫からレシピを提案しました');
      } catch (e) {
        console.error(e);
        showToast(e.message || '検索に失敗しました', 'error');
      } finally {
        setSearching(null);
      }
    });
  };

  /* --- render --- */
  return (
    <div className="min-h-screen w-full" style={{ paddingBottom: 88 }}>
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

      <main className="px-5 pt-5">
        {!ready ? (
          <div
            className="flex items-center justify-center pt-32"
            style={{ color: COLORS.inkSoft }}
          >
            <Loader2 className="spin-slow" size={20} />
          </div>
        ) : (
          <>
            {tab === 'home' && (
              <HomeView
                history={history}
                fridgeCount={fridge.length}
                onGo={navigate}
                onOpenHistory={openHistory}
                adSlot={AD_SLOTS.homeBanner}
              />
            )}
            {tab === 'fridge' && (
              <FridgeView
                items={fridge}
                onAdd={addFridgeItem}
                onRemove={removeFridgeItem}
              />
            )}
            {tab === 'recipes' && (
              <RecipesView
                currentRecipes={currentRecipes}
                currentMeta={currentMeta}
                onSearchFromFlyer={searchFromFlyer}
                onSearchFromFridge={searchFromFridge}
                onOpenRecipe={setRecipeOpen}
                fridgeCount={fridge.length}
                adSlot={AD_SLOTS.resultsFeed}
              />
            )}
          </>
        )}
      </main>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40"
        style={{
          background: COLORS.paper,
          borderTop: `1px solid ${COLORS.border}`,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="grid grid-cols-3">
          {[
            { k: 'home', label: 'ホーム', icon: Home },
            { k: 'fridge', label: '冷蔵庫', icon: Refrigerator },
            { k: 'recipes', label: 'レシピ', icon: ChefHat },
          ].map(({ k, label, icon: Icon }) => {
            const active = tab === k;
            return (
              <button
                key={k}
                onClick={() => navigate(k)}
                className="flex flex-col items-center justify-center pt-2 pb-3 transition-colors"
                style={{ color: active ? COLORS.tomato : COLORS.inkSoft }}
              >
                <Icon
                  size={22}
                  strokeWidth={active ? 2.4 : 1.8}
                  fill={active && k === 'home' ? COLORS.tomato : 'none'}
                />
                <span
                  className="text-[10px] mt-1 tracking-widest"
                  style={{ fontWeight: active ? 700 : 500 }}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      {searching && (
        <SearchingScreen
          source={searching}
          adSlot={AD_SLOTS.searchingFullscreen}
        />
      )}
      {showReward && (
        <RewardAdModal
          slot={AD_SLOTS.rewardModal}
          onClaim={handleRewardClaim}
          onCancel={handleRewardCancel}
        />
      )}
      {recipeOpen && (
        <RecipeDetail
          recipe={recipeOpen}
          onClose={() => setRecipeOpen(null)}
        />
      )}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
