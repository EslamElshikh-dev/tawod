import { articles as november4 } from './exact-title-articles-2026-11-04.mjs';
import { articles as november21 } from '../content/riyadh-construction-articles-2026-11-21.mjs';
import { articles as projectGuides } from '../content/riyadh-project-decisions-2026-11-21.mjs';

const guidesByParent = new Map(projectGuides.map(guide => [guide.parentSlug, guide]));
const linkedNovember21 = november21.map(article => {
  const guide = guidesByParent.get(article.slug);
  if (!guide) return article;
  return {
    ...article,
    content: `${article.content}\n<p>${guide.parentLead} <a href="/blog/${guide.slug}/">${guide.question}</a></p>`,
  };
});

export const editions = new Map([
  ['2026-11-04', november4],
  ['2026-11-21', [...linkedNovember21, ...projectGuides]],
]);

export const newArticleSlugs = [...editions.values()].flatMap(articles => articles.map(article => article.slug));
