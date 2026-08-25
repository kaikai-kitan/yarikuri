'use client';
import { useState, useCallback, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import RecipesView, { RecipeResultsView } from '@/components/RecipesView';
import WeekPlanView from '@/components/WeekPlanView';
import RecipeDetail from '@/components/RecipeDetail';
import SearchingScreen from '@/components/SearchingScreen';
import { Toast } from '@/components/ui';
import {
  useExpenses,
  useFavorites,
  useFridge,
  useHistory,
  useMonthlyLimit,
  useWeekPlan,
} from '@/lib/hooks';
import { toggleCooked } from '@/lib/plan';
import { budgetSummary, recipeBudgetContext } from '@/lib/budget';
import { fridgeForSuggestion, expiringSoonNames } from '@/lib/fridge';
import { newId } from '@/lib/id';
import { isFavoriteRecipe } from '@/lib/favorites';
import { ocrFlyer, suggestRecipes, planWeek, fetchRecipeLink } from '@/lib/api';
import { recipeLinkErrorMessage } from '@/lib/recipeLink';
import { compressImage } from '@/lib/image';
import { COLORS } from '@/theme';

export default function RecipesPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const autoAction = searchParams.get('auto');
  const consumedAutoAction = useRef(null);
  const [fridge, setFridge, fridgeReady] = useFridge();
  const [, pushHistory, historyReady] = useHistory();
  const [monthlyLimit, , limitReady] = useMonthlyLimit();
  const [expenses, , expensesReady] = useExpenses();
  const [weekPlan, setWeekPlan, planReady] = useWeekPlan();
  const [favorites, toggleFavorite, favoritesReady] = useFavorites();

  const [currentRecipes, setCurrentRecipes] = useState([]);
  const [currentMeta, setCurrentMeta] = useState(null);
  const [searching, setSearching] = useState(null);
  const [recipeLinks, setRecipeLinks] = useState({});
  const [recipeOpen, setRecipeOpen] = useState(null);
  const [toast, setToast] = useState(null);
  // auto パラメータによる提案結果を表示するモード
  const [showResults, setShowResults] = useState(false);

  const ready =
    fridgeReady &&
    historyReady &&
    limitReady &&
    expensesReady &&
    planReady &&
    favoritesReady;

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('yarikuri:open-entry');
      if (raw) {
        const { recipes, meta } = JSON.parse(raw);
        setCurrentRecipes(recipes);
        setCurrentMeta(meta);
        setShowResults(true);
        sessionStorage.removeItem('yarikuri:open-entry');
      }
    } catch { /* ignore */ }
  }, []);

  const showToast = (message, type = 'info') => setToast({ message, type });

  const handleToggleFavorite = (recipe) => {
    const removing = isFavoriteRecipe(favorites, recipe);
    toggleFavorite(recipe);
    showToast(removing ? 'お気に入りを解除しました' : 'お気に入りに追加しました');
  };

  const searchFromFlyer = useCallback((file) => {
    if (!file) return;
    (async () => {
      setSearching('flyer');
      setCurrentRecipes([]);
      setCurrentMeta(null);
      setShowResults(true);
      try {
        const { base64, mediaType } = await compressImage(file);
        const flyerItems = await ocrFlyer(base64, mediaType);
        if (!flyerItems.length) { showToast('特売品を検出できませんでした', 'error'); setSearching(null); return; }
        const fridgeNames = fridgeForSuggestion(fridge);
        const recipes = await suggestRecipes(fridgeNames, flyerItems, budgetContext(monthlyLimit, expenses));
        if (!recipes.length) { showToast('作れるレシピが見つかりませんでした', 'error'); setSearching(null); return; }
        const entry = { id: newId(), searchedAt: Date.now(), source: 'flyer', fridgeUsed: fridgeNames, flyerItems, recipes };
        pushHistory(entry);
        setCurrentRecipes(recipes);
        setCurrentMeta({ source: 'flyer', flyerCount: flyerItems.length, fridgeCount: fridgeNames.length });
        showToast(`チラシから${flyerItems.length}件読取り、レシピを提案しました`);
      } catch (e) {
        showToast(e.message || '検索に失敗しました', 'error');
      } finally { setSearching(null); }
    })();
  }, [fridge, pushHistory, monthlyLimit, expenses]);

  // 冷蔵庫＋近隣チラシを両方読み込んでレシピ提案（1回分）
  const searchCombined = useCallback(() => {
    if (fridge.length === 0) { showToast('冷蔵庫タブで食材を追加してください', 'error'); return; }
    (async () => {
      setSearching('flyer');
      setCurrentRecipes([]);
      setCurrentMeta(null);
      setShowResults(true);
      try {
        const fridgeNames = fridgeForSuggestion(fridge);
        // 近隣チラシを取得（位置情報が使えない場合はチラシなしで提案）
        let flyerItems = [];

        const recipes = await suggestRecipes(fridgeNames, flyerItems, budgetContext(monthlyLimit, expenses));
        if (!recipes.length) { showToast('作れるレシピが見つかりませんでした', 'error'); setSearching(null); return; }

        const source = flyerItems.length > 0 ? 'combined' : 'fridge';
        const entry = { id: newId(), searchedAt: Date.now(), source, fridgeUsed: fridgeNames, flyerItems: flyerItems.length ? flyerItems : null, recipes };
        pushHistory(entry);
        setCurrentRecipes(recipes);
        setCurrentMeta({ source, flyerCount: flyerItems.length, fridgeCount: fridgeNames.length });
        showToast(flyerItems.length
          ? `チラシ${flyerItems.length}件＋冷蔵庫${fridgeNames.length}品からレシピを提案しました`
          : `冷蔵庫${fridgeNames.length}品からレシピを提案しました`);
      } catch (e) {
        showToast(e.message || '検索に失敗しました', 'error');
      } finally { setSearching(null); }
    })();
  }, [fridge, pushHistory, monthlyLimit, expenses]);

  // 一週間分の献立（チラシも読み込む）
  const createWeekPlan = useCallback(() => {
    if (fridge.length === 0) { showToast('冷蔵庫タブで食材を追加してください', 'error'); return; }
    (async () => {
      setSearching('plan');
      setShowResults(true);
      try {
        const fridgeNames = fridgeForSuggestion(fridge);
        // 近隣チラシを取得
        let flyerItems = [];

        const plan = await planWeek({
          fridge: fridgeNames,
          flyerItems,
          budget: budgetContext(monthlyLimit, expenses),
          startDate: todayIso(),
        });
        setWeekPlan({ ...plan, createdAt: Date.now() });
        setRecipeLinks({});
        showToast(`${plan.days.length}日分の献立を組みました`);
      } catch (e) {
        showToast(e.message || '献立の作成に失敗しました', 'error');
      } finally { setSearching(null); }
    })();
  }, [fridge, monthlyLimit, expenses, setWeekPlan]);

  // 献立1日分のレシピを引く。1リクエスト/秒の制限があるため、タップされた分だけ取りに行く。
  const fetchLinkFor = async (index) => {
    const target = weekPlan?.days?.[index];
    if (!target) return;

    setRecipeLinks((prev) => ({ ...prev, [index]: 'loading' }));
    const { link, reason } = await fetchRecipeLink(target.name);

    // 楽天で引けなくてもWeb検索リンクが返る。1本も出せなかったときだけ知らせる。
    if (!link) {
      const message = recipeLinkErrorMessage(reason);
      if (message) showToast(message, 'error');
    }

    setRecipeLinks((prev) => ({ ...prev, [index]: link }));
  };

  // 作った日を切り替える。作ったことにした場合だけ、使った食材を冷蔵庫から減らす。
  // 取り消しでは戻さない（買い直したかどうかは分からないため）。
  const toggleCookedDay = (index) => {
    const target = weekPlan?.days?.[index];
    if (!target) return;

    const wasCooked = Boolean(target.cookedAt);
    setWeekPlan(toggleCooked(weekPlan, index));
    if (wasCooked) return;

    const usedTexts = target.usedFromFridge || [];
    const isConsumed = (f) => usedTexts.some(text => text.includes(f.name) || f.name.includes(text));

    const consumed = fridge.filter(isConsumed);
    if (!consumed.length) return;

    setFridge(fridge.filter((f) => !isConsumed(f)));
    showToast(`${consumed.map((f) => f.name).join('、')}を冷蔵庫から減らしました`);
  };

  const searchFromFridge = useCallback(() => {
    if (fridge.length === 0) { showToast('冷蔵庫タブで食材を追加してください', 'error'); return; }
    (async () => {
      setSearching('fridge');
      setCurrentRecipes([]);
      setCurrentMeta(null);
      setShowResults(true);
      try {
        const fridgeNames = fridgeForSuggestion(fridge);
        const recipes = await suggestRecipes(fridgeNames, [], budgetContext(monthlyLimit, expenses));
        if (!recipes.length) { showToast('作れるレシピが見つかりませんでした', 'error'); setSearching(null); return; }
        const entry = { id: newId(), searchedAt: Date.now(), source: 'fridge', fridgeUsed: fridgeNames, flyerItems: null, recipes };
        pushHistory(entry);
        setCurrentRecipes(recipes);
        setCurrentMeta({ source: 'fridge', flyerCount: 0, fridgeCount: fridgeNames.length });
        showToast('冷蔵庫からレシピを提案しました');
      } catch (e) {
        showToast(e.message || '検索に失敗しました', 'error');
      } finally { setSearching(null); }
    })();
  }, [fridge, pushHistory, monthlyLimit, expenses]);

  useEffect(() => {
    if (!ready) return;
    if (!autoAction) {
      consumedAutoAction.current = null;
      return;
    }
    if (consumedAutoAction.current === autoAction) return;
    consumedAutoAction.current = autoAction;

    // 同じ提案を続けて選べるよう、実行前にクエリを消費する。
    router.replace('/recipes/', { scroll: false });

    if (autoAction === 'fridge') {
      searchFromFridge();
    } else if (autoAction === 'combined') {
      searchCombined();
    } else if (autoAction === 'week') {
      createWeekPlan();
    } else if (autoAction === 'flyer') {
      const file = window.__pendingFlyerImage;
      if (file) {
        window.__pendingFlyerImage = null;
        searchFromFlyer(file);
      }
    }
  }, [
    ready,
    autoAction,
    router,
    searchFromFridge,
    searchCombined,
    createWeekPlan,
    searchFromFlyer,
  ]);

  if (!ready) {
    return (
      <div className="flex items-center justify-center pt-32" style={{ color: COLORS.inkSoft }}>
        <Loader2 className="spin-slow" size={20} />
      </div>
    );
  }

  // 提案結果表示モードかお気に入り一覧モードかを切り替え
  const content = showResults ? (
    <RecipeResultsView
      currentRecipes={currentRecipes}
      currentMeta={currentMeta}
      onOpenRecipe={setRecipeOpen}
      favorites={favorites}
      onToggleFavorite={handleToggleFavorite}
      expiringNames={expiringSoonNames(fridge)}
      planSlot={
        weekPlan ? (
          <WeekPlanView
            plan={weekPlan}
            onClearPlan={() => {
              setWeekPlan(null);
              setRecipeLinks({});
            }}
            onToggleCooked={toggleCookedDay}
            links={recipeLinks}
            onFetchLink={fetchLinkFor}
          />
        ) : null
      }
    />
  ) : (
    <RecipesView
      favorites={favorites}
      onToggleFavorite={handleToggleFavorite}
      onOpenRecipe={setRecipeOpen}
    />
  );

  return (
    <>
      {content}
      {searching && <SearchingScreen source={searching} />}
      {recipeOpen && <RecipeDetail recipe={recipeOpen} onClose={() => setRecipeOpen(null)} />}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </>
  );
}

// 予算が未設定なら null になり、AI側の予算ブロックが省かれる。
function budgetContext(monthlyLimit, expenses) {
  return recipeBudgetContext(budgetSummary({ monthlyLimit, expenses }));
}

const pad2 = (n) => String(n).padStart(2, '0');

// ローカル日付の 'YYYY-MM-DD'。toISOString は UTC でずれるため使わない。
function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}
