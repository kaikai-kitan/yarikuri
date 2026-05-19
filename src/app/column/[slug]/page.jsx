import Link from 'next/link';
import { getColumn, getAllColumnSlugs } from '@/lib/content';

export async function generateStaticParams() {
  return getAllColumnSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }) {
  const col = getColumn(params.slug);
  return {
    title: col.title,
    description: col.description,
    openGraph: {
      title: col.title,
      description: col.description,
      type: 'article',
      publishedTime: col.publishedAt,
    },
  };
}

export default function ColumnDetailPage({ params }) {
  const col = getColumn(params.slug);

  return (
    <article className="fade-up pb-12">
      <nav className="mb-5">
        <Link
          href="/column/"
          className="text-xs"
          style={{ color: '#A87324' }}
        >
          ← コラム一覧に戻る
        </Link>
      </nav>

      <header className="mb-6">
        <time
          dateTime={col.publishedAt}
          className="text-[11px] tracking-wider"
          style={{ color: '#A87324' }}
        >
          {formatDate(col.publishedAt)}
        </time>
        <h1
          className="display text-2xl font-bold mt-2 leading-snug"
          style={{ color: '#221A14' }}
        >
          {col.title}
        </h1>
        {col.description && (
          <p
            className="text-sm mt-3 leading-relaxed"
            style={{ color: '#5C4A3C' }}
          >
            {col.description}
          </p>
        )}
      </header>

      <div
        className="prose"
        dangerouslySetInnerHTML={{ __html: col.html }}
      />

      <footer className="mt-10 pt-6" style={{ borderTop: '1px solid #E8DBC4' }}>
        <Link
          href="/column/"
          className="inline-block text-sm font-bold rounded-full px-5 py-2.5 transition-colors"
          style={{ background: '#E8DBC4', color: '#221A14' }}
        >
          ← コラム一覧を見る
        </Link>
      </footer>
    </article>
  );
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
}
