import BudgetPageClient from './client';

export const metadata = {
  title: '家計簿',
  description:
    'レシートを読み取るだけで、食材は冷蔵庫に登録され、金額は今月の予算から差し引かれます。残り予算はレシピ提案にも反映されます。',
};

export default function BudgetPage() {
  return <BudgetPageClient />;
}
