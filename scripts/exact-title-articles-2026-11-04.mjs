import { readFileSync } from 'node:fs';

// These H1 and metadata titles are the owner's verbatim publishing request.
// Preserve their spelling and Arabic digits without adding subtitles.
export const articles = JSON.parse(readFileSync(new URL('./exact-title-articles-2026-11-04.json', import.meta.url), 'utf8'));
export const newArticleSlugs = articles.map(article => article.slug);
