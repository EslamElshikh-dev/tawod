import { articles as november4 } from './exact-title-articles-2026-11-04.mjs';
import { articles as november21 } from '../content/riyadh-construction-articles-2026-11-21.mjs';
import { articles as projectGuides } from '../content/riyadh-project-decisions-2026-11-21.mjs';
import { articles as november26 } from '../content/riyadh-owner-guides-2026-11-26.mjs';
import { articles as november26Second } from '../content/riyadh-owner-guides-2026-11-26-second.mjs';
import { articles as november28 } from '../content/riyadh-exact-title-articles-2026-11-28.mjs';
import { articles as november28Second } from '../content/riyadh-exact-title-second-2026-11-28.mjs';

const linkedNovember21 = november21.map(article => {
  const guides = [...projectGuides, ...november26, ...november26Second].filter(guide => guide.parentSlug === article.slug);
  return {
    ...article,
    content: `${article.content}${guides.map(guide => `\n<p>${guide.parentLead} <a href="/blog/${guide.slug}/">${guide.question}</a></p>`).join('')}`,
  };
});

export const editions = new Map([
  ['2026-11-04', november4],
  ['2026-11-21', [...linkedNovember21, ...projectGuides]],
  ['2026-11-26', [...november26, ...november26Second]],
  ['2026-11-28', [...november28, ...november28Second]],
]);

export const newArticleSlugs = [...editions.values()].flatMap(articles => articles.map(article => article.slug));
