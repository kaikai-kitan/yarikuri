import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import matter from 'gray-matter';
import { marked } from 'marked';

const COLUMNS_DIR = join(process.cwd(), 'content', 'columns');

export function getAllColumns() {
  const files = readdirSync(COLUMNS_DIR);
  return files
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const slug = f.replace(/\.md$/, '');
      const raw = readFileSync(join(COLUMNS_DIR, f), 'utf-8');
      const { data, content } = matter(raw);
      const excerpt = content.replace(/#{1,6}\s/g, '').slice(0, 120).trim() + '…';
      return { slug, ...data, excerpt };
    })
    .sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
}

export function getColumn(slug) {
  const raw = readFileSync(join(COLUMNS_DIR, `${slug}.md`), 'utf-8');
  const { data, content } = matter(raw);
  const html = marked.parse(content);
  return { slug, ...data, html };
}

export function getAllColumnSlugs() {
  return readdirSync(COLUMNS_DIR)
    .filter((f) => f.endsWith('.md'))
    .map((f) => f.replace(/\.md$/, ''));
}
