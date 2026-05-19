import FridgePageClient from './client';

export const metadata = {
  title: '冷蔵庫の在庫管理',
  description: '食材を登録して冷蔵庫の在庫を管理します。登録した食材はレシピ提案に活用されます。',
};

export default function FridgePage() {
  return <FridgePageClient />;
}
