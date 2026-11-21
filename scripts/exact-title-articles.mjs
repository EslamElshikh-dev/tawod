import { articles as november4 } from './exact-title-articles-2026-11-04.mjs';
import { articles as november21 } from '../content/riyadh-construction-articles-2026-11-21.mjs';

export const editions = new Map([
  ['2026-11-04', november4],
  ['2026-11-21', november21],
]);

export const newArticleSlugs = [...editions.values()].flatMap(articles => articles.map(article => article.slug));
