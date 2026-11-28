// The owner explicitly requested ten new articles with these existing titles
// unchanged on 2026-11-28. Permit only the named pairs; an unrelated page or
// a third use of any title must still fail the normal duplicate-title gate.
const approvedPairs = [
  ['افضل شركة مقاولات في الرياض', 'riyadh-contractor-occupied-villa', 'riyadh-contractor-project-budget-decisions'],
  ['افضل شركة مقاولات عامة', 'best-general-contractor-trade-coordination', 'general-contractor-concealed-work-inspections'],
  ['شركة مقاولات عامة بالرياض', 'general-contractor-riyadh-consistent-finishing', 'riyadh-general-contractor-villa-extension-interface'],
  ['افضل مقاول بناء في الرياض', 'best-building-contractor-riyadh-future-home', 'riyadh-building-contractor-site-levels-readiness'],
  ['شركة مقاولات عامة في الرياض', 'riyadh-general-contractor-retail-handover', 'riyadh-general-contractor-phased-project-delivery'],
  ['المقاولات العامة', 'general-contracting-one-door-from-plan-to-handover', 'general-contracting-project-responsibility-map'],
  ['شركة إنشاءات بالرياض', 'construction-company-riyadh-warehouse-operation', 'riyadh-construction-warehouse-operating-brief'],
  ['افضل شركة إنشاءات بالرياض', 'best-construction-company-riyadh-building-value', 'riyadh-construction-building-maintenance-access'],
  ['أحسن شركة مقاولات بالرياض', 'best-contractor-riyadh-clear-progress-report', 'riyadh-contractor-finished-work-protection'],
  ['افضل شركة بناء بالرياض', 'riyadh-builder-labour-materials-quote', 'riyadh-building-owner-vendor-installation-coordination'],
];

const reuseGroups = new Map(approvedPairs.map(([title, ...slugs]) => [
  title,
  new Set(slugs.map(slug => `blog/${slug}/index.html`)),
]));

export function isIntentionalArticleTitleReuse(title, firstFile, secondFile) {
  const approved = reuseGroups.get(title);
  return firstFile !== secondFile && !!approved?.has(firstFile) && approved.has(secondFile);
}
