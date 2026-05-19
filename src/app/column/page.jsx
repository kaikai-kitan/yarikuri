import Link from 'next/link';
import { getAllColumns } from '@/lib/content';

export const metadata = {
  title: 'コラム',
  description: '節約レシピ・食費管理・チラシ活用術など、日々の料理と買い物に役立つコラムを掲載しています。',
};

export default function ColumnListPage() {
  const columns = getAllColumns();

  return (
    <div className="fade-up pb-8">
      <div className="mb-6">
        <div className="text-xs tracking-[0.4em] uppercase mb-1" style={{ color: '#A87324' }}>
          COLUMN
        </div>
        <h1 className="display text-2xl font-bold" style={{ color: '#221A14' }}>
          節約・料理コラム
        </h1>
        <p className="text-sm mt-2 leading-relaxed" style={{ color: '#5C4A3C' }}>
          食費の節約術やヤリクリの使い方など、日々の料理と買い物に役立つ情報をお届けします。
        </p>
      </div>

      <ul className="space-y-4">
        {columns.map((col) => (
          <li key={col.slug}>
            <Link
              href={`/column/${col.slug}/`}
              className="block rounded-2xl p-5 active:scale-[0.99] transition-transform"
              style={{ background: '#FFFDF7', border: '1px solid #E8DBC4' }}
            >
              <time
                dateTime={col.publishedAt}
                className="text-[11px] tracking-wider"
                style={{ color: '#A87324' }}
              >
                {formatDate(col.publishedAt)}
              </time>
              <h2
                className="display text-base font-bold mt-1 mb-2"
                style={{ color: '#221A14' }}
              >
                {col.title}
              </h2>
              <p className="text-xs leading-relaxed" style={{ color: '#5C4A3C' }}>
                {col.excerpt}
              </p>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
