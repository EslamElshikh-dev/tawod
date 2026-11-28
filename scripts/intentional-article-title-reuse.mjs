// The owner explicitly requested two batches of ten new articles with existing
// titles unchanged on 2026-11-28. Permit only the named routes for each title;
// any unlisted page must still fail the normal duplicate-title gate.
const approvedGroups = [
  ['افضل شركة مقاولات في الرياض', 'riyadh-contractor-occupied-villa', 'riyadh-contractor-project-budget-decisions', 'construction-riyadh-value-options-review'],
  ['افضل شركة مقاولات عامة', 'best-general-contractor-trade-coordination', 'general-contractor-concealed-work-inspections'],
  ['شركة مقاولات عامة بالرياض', 'general-contractor-riyadh-consistent-finishing', 'riyadh-general-contractor-villa-extension-interface'],
  ['افضل مقاول بناء في الرياض', 'best-building-contractor-riyadh-future-home', 'riyadh-building-contractor-site-levels-readiness'],
  ['شركة مقاولات عامة في الرياض', 'riyadh-general-contractor-retail-handover', 'riyadh-general-contractor-phased-project-delivery'],
  ['المقاولات العامة', 'general-contracting-one-door-from-plan-to-handover', 'general-contracting-project-responsibility-map'],
  ['شركة إنشاءات بالرياض', 'construction-company-riyadh-warehouse-operation', 'riyadh-construction-warehouse-operating-brief'],
  ['افضل شركة إنشاءات بالرياض', 'best-construction-company-riyadh-building-value', 'riyadh-construction-building-maintenance-access'],
  ['أحسن شركة مقاولات بالرياض', 'best-contractor-riyadh-clear-progress-report', 'riyadh-contractor-finished-work-protection'],
  ['افضل شركة بناء بالرياض', 'riyadh-builder-labour-materials-quote', 'riyadh-building-owner-vendor-installation-coordination', 'construction-riyadh-structural-system-brief'],
  ['افضل ١٠ شركات مقاولات بالرياض', 'ten-contracting-construction-companies-riyadh', 'construction-riyadh-ten-contractors-service-fit'],
  ['افضل ١٠ شركات إنشاءات بالرياض', 'riyadh-ten-construction-companies-projects', 'construction-riyadh-ten-builders-technical-shortlist'],
  ['افضل شركة إنشاءات في الرياض', 'riyadh-construction-rental-apartment-pilot', 'construction-riyadh-villa-privacy-coordination'],
  ['أحسن شركة مقاولات', 'contractor-after-handover-follow-up', 'construction-contractor-bathroom-sample-review'],
  ['اكبر شركة مقاولات عامة', 'general-contractor-size-saudi-prequalification', 'construction-general-contractor-resource-coverage'],
  ['اكبر شركة مقاولات عامة بالرياض', 'largest-contractor-riyadh-project-capacity', 'construction-riyadh-long-lead-schedule'],
  ['اكبر شركة مقاولات', 'largest-contractor-global-enr-ranking', 'construction-specialist-trade-prequalification'],
  ['اكبر شركة مقاولات بالرياض', 'largest-riyadh-contractors-local-contracts', 'construction-riyadh-tight-site-logistics'],
];

const reuseGroups = new Map(approvedGroups.map(([title, ...slugs]) => [
  title,
  new Set(slugs.map(slug => `blog/${slug}/index.html`)),
]));

export function isIntentionalArticleTitleReuse(title, firstFile, secondFile) {
  const approved = reuseGroups.get(title);
  return firstFile !== secondFile && !!approved?.has(firstFile) && approved.has(secondFile);
}
