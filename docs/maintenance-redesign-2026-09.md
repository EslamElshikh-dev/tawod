# Maintenance and facilities redesign — 28 September 2026

## Scope

The maintenance business remains under `/maintenance/`, with its own navigation, service catalogue, stylesheet and scripts. Its contact number is **0533152133**. Construction content and its contact number are unchanged.

Seven groups organise 18 service pages: cleaning and disinfection; technical maintenance; landscaping and water features; pest control; leaks, drainage and waterproofing; operation contracts and staffing; education and sports facilities. The home page, catalogue and privacy page bring the section to 21 pages. All previously published service URLs are preserved.

The supplied **RFM Profile.pdf** was used to identify additional service categories (fire systems, waste handling, operational property management and staffing). Its customer logos, portfolio, credentials and business details are not Tawod evidence and were not reused.

## Competitor observations

Reviewed the competitors' own websites, not market-share or ranking data:

| Source | Observed pattern | Application here |
| --- | --- | --- |
| https://astrum.sa/ | Distinct technical and supporting service categories | Seven clear entry points plus specialist pages |
| https://www.success-step.com/ | One-time and recurring services; clear inquiry inputs | Multi-service request with property type and contract preference |
| https://manazelco.com/ | Operations organised around staffing, scope and reporting | Explain visits, materials, responsibilities and agreed coverage |
| https://cfmsaudi.com/services/riyadh/ | Service and sector segmentation | Dedicated education/sports scope and a four-sector overview |

These patterns informed the information architecture. Copy is original. No competitor performance, price, ranking or lead-volume claims are made.

## Implementation

- Charcoal and warm gold connect the brand to Tawod; deep green distinguishes facilities services.
- The courtyard hero is a labelled conceptual image, not a claimed completed project. Three AVIF sizes have WebP fallbacks; the Arabic font is hosted locally.
- `data/maintenance-services.mjs` is the content source; `scripts/build-maintenance-site.mjs` generates the pages and maintenance sitemap entries.
- `npm run build:maintenance` regenerates source pages, installs shared analytics and updates the route manifest. The normal build also runs this generator.
- Individual titles, descriptions, canonical URLs, Service/Organization/FAQ/Breadcrumb structured data and contextual internal links support the Riyadh scope.
- The request form prepares a client-side summary. It opens WhatsApp only after review; the user sends the message there. No form data is stored in a database or local storage.
- `maintenance_request_prepared` is a preparation event, not a confirmed lead. It includes service count and page path, never the user's notes or district.
- Shared analytics and existing advertising attribution are retained. Actual lead quality and market performance require business outcomes; site structure alone does not establish them.

## Verification

- Production build and existing export verification passed for **222 HTML pages**.
- TypeScript, analytics installation checks and existing analytics tests passed.
- All **21 maintenance pages** passed local link/fragment, canonical, JSON-LD syntax and sitemap uniqueness checks.
- Chromium layout checks passed at **320, 360, 390, 768, 1024 and 1440 px** for home, catalogue, facility management and education/sports pages: no horizontal overflow or broken images.
- Menu open/close, Escape, FAQ, required service selection, multi-service summary, text escaping, WhatsApp URL and edit/preserved input were checked without sending a message.
- The mobile WCAG A/AA automated axe scan passed after correcting one number's contrast. This is an automated check, not full accessibility certification.
- Floating contacts hide when the request section, final service CTA or footer is visible.
- Browser review used the exported files through Playwright request routing because local daemon sockets are unavailable in the execution environment. This proves layout and interaction, not production network speed.
- Live PageSpeed/Lighthouse results must be recorded against the deployed revision. A constant 100 score or compatibility with every historical device/OS cannot be guaranteed.

## Future evidence

Real maintenance project photographs, approved customer references, documented operating credentials, service hours and actual inquiry outcomes can strengthen the site once supplied. None have been invented in this redesign.
