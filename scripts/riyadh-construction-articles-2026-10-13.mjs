import { readFileSync } from 'node:fs';

export const articles = JSON.parse(readFileSync(new URL('./riyadh-construction-articles-2026-10-13.json', import.meta.url), 'utf8'));
export const newArticleSlugs = articles.map(article => article.slug);
