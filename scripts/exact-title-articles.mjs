import { articles as november4 } from './exact-title-articles-2026-11-04.mjs';
import { articles as november21 } from '../content/riyadh-construction-articles-2026-11-21.mjs';
import { articles as projectGuides } from '../content/riyadh-project-decisions-2026-11-21.mjs';
import { articles as november26 } from '../content/riyadh-owner-guides-2026-11-26.mjs';

const linkedNovember21 = november21.map(article => {
  const guides = [...projectGuides, ...november26].filter(guide => guide.parentSlug === article.slug);
  return {
    ...article,
    content: `${article.content}${guides.map(guide => `\n<p>${guide.parentLead} <a href="/blog/${guide.slug}/">${guide.question}</a></p>`).join('')}`,
  };
});

export const editions = new Map([
  ['2026-11-04', november4],
  ['2026-11-21', [...linkedNovember21, ...projectGuides]],
  ['2026-11-26', november26],
]);

export const newArticleSlugs = [...editions.values()].flatMap(articles => articles.map(article => article.slug));
