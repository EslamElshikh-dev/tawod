import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { companySchema, riyadh } from './business-branches.mjs';

const domain = 'https://tawodco.com';
const imageSizes = {};
const escape = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const revision = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 12);
const whatsapp = message => `https://wa.me/966551128884?text=${encodeURIComponent(message)}`;
const serviceUrl = service => `/en/services/${service.slug}/`;
const projectUrl = project => `/en/projects/${project.slug}/`;
const image = (src, alt, { hero = false } = {}) => {
  const [width, height] = imageSizes[src] || [1200, 900];
  return `<img src="/${src}" width="${width}" height="${height}" loading="${hero ? 'eager' : 'lazy'}"${hero ? ' fetchpriority="high"' : ''} decoding="async" alt="${escape(alt)}">`;
};
const services = [
  {
    slug: 'construction', key: 'construction', ar: '/service-construction.html', name: 'Construction',
    title: 'Construction and structural works in Riyadh',
    description: 'Construction and structural works for villas, extensions and commercial buildings in Riyadh, with scope definition and coordinated phase reviews.',
    intro: 'A construction quotation starts with the drawings, site conditions and a clear division of supply and execution. Tawod coordinates structural works and related trades around the agreed scope, specifications and project programme.',
    scope: ['Review the available architectural and structural drawings and site information.', 'Define structural works, quantities, material responsibilities and related exclusions.', 'Coordinate foundations, structural elements and the following trades according to the approved drawings.', 'Review work at the relevant stages before it is covered or the next activity begins.'],
    inputs: 'Send the location, building type, approximate area, current stage and available architectural and structural drawings. A soil report and bill of quantities help define the work when available.',
    cost: ['Building area, structural system and site conditions.', 'Drawing completeness, quantities and specification requirements.', 'Who supplies the materials and the extent of related works.'],
    projects: ['warehouses', 'tanks'],
  },
  {
    slug: 'turnkey', key: 'turnkey', ar: '/service-turnkey.html', name: 'Turnkey delivery',
    title: 'Turnkey project delivery in Riyadh',
    description: 'Turnkey delivery for residential and commercial projects in Riyadh, coordinating construction, technical works, finishing, inspection and agreed handover.',
    intro: 'Turnkey delivery brings the agreed construction, electrical, plumbing and finishing packages into one coordinated programme. The contract defines the materials, responsibilities, approvals and handover requirements for your particular project.',
    scope: ['Define the complete delivery scope and the responsibilities of each party.', 'Coordinate construction, technical systems and finishing in the required sequence.', 'Organize material selections and approvals before the related execution stages.', 'Review the agreed work, record outstanding items and close them before handover.'],
    inputs: 'Share the building type, location, approximate area, drawings, current stage and intended finishing level. Note any owner-supplied materials or packages that should be excluded.',
    cost: ['The exact included packages and owner-supplied items.', 'Finishing specifications, quantities and technical systems.', 'Procurement responsibilities, approvals and programme requirements.'],
    projects: ['arouba'],
  },
  {
    slug: 'renovation', key: 'restoration', ar: '/service-restoration.html', name: 'Renovation',
    title: 'Building renovation and restoration in Riyadh',
    description: 'Building renovation in Riyadh: assess the existing condition, define repair priorities and coordinate renewal and finishing after reviewing the site.',
    intro: 'Existing buildings need a defined scope based on their present condition. The first discussion identifies the affected areas and the intended use; photographs, available drawings and a site assessment help distinguish repair needs from finishing changes.',
    scope: ['Review the current condition and the areas that require attention.', 'Define the required repair or renewal packages after assessment.', 'Coordinate new work with existing finishes and technical systems.', 'Agree the work sequence, access requirements and handover scope.'],
    inputs: 'Send the neighbourhood, building type, approximate area and clear photographs of the affected areas. Explain whether the building will remain occupied and what changes you want to make.',
    cost: ['The condition found at assessment and the confirmed repair scope.', 'Access, occupancy and protection of existing elements.', 'The selected replacement materials and related technical changes.'],
    projects: [],
  },
  {
    slug: 'finishing', key: 'finishing', ar: '/service-finishing.html', name: 'Interior finishing',
    title: 'Villa and interior finishing in Riyadh',
    description: 'Interior and exterior finishing in Riyadh, including completion from the current project stage. View Tawod villa examples and discuss your remaining scope.',
    intro: 'Your project may be at the structural stage or already have some finishing work completed. We begin by reviewing what is ready, what remains and the intended materials, then define the required finishing packages and how they connect to the technical works.',
    scope: ['Review the completed work and define the remaining finishing packages.', 'Coordinate plastering, flooring, painting, ceilings and the agreed façade work.', 'Check levels, junctions and readiness before installing the next material.', 'Review the agreed finishes and close the listed handover items.'],
    inputs: 'Send the villa or building location, approximate area, current stage, photographs and the items you want completed. Add the material choices or design drawings if available.',
    cost: ['The starting stage and condition of completed works.', 'Material grades, quantities and the rooms or façades included.', 'Required coordination with electrical, plumbing and other packages.'],
    projects: ['uhud', 'faisaliah'],
  },
  {
    slug: 'interior-design', key: 'decor', ar: '/service-decor.html', name: 'Interior design',
    title: 'Interior design and décor execution in Riyadh',
    description: 'Interior design and décor for homes, offices and shops in Riyadh, coordinating space use, materials, lighting and practical execution details.',
    intro: 'A useful interior design connects the way a space is used with the materials and details that can be executed. Tawod discusses the intended layout, appearance and technical requirements before defining the design and implementation scope.',
    scope: ['Understand the use of the space and the owner’s preferences.', 'Coordinate layout, lighting, finishes and material selections.', 'Review design details with the relevant execution packages.', 'Define the approved deliverables and execution responsibilities before work begins.'],
    inputs: 'Share the location, space type, area, existing plans or photographs and the intended use. Reference images can help explain your preferences without replacing a project-specific design.',
    cost: ['Area, intended use and required design deliverables.', 'Material selections and the level of execution detail.', 'Included implementation packages and technical coordination.'],
    projects: [],
  },
  {
    slug: 'electrical-plumbing', key: 'mep', ar: '/service-mep.html', name: 'Electrical and plumbing',
    title: 'Electrical, plumbing and MEP coordination in Riyadh',
    description: 'Electrical, plumbing and mechanical works in Riyadh, coordinated with construction and finishing for residential and commercial projects.',
    intro: 'Technical systems affect the layout and sequence of construction and finishing. The project scope identifies the required electrical, plumbing and mechanical packages, available drawings and the inspections needed before walls or ceilings are closed.',
    scope: ['Review service points, routes and the available system drawings.', 'Define the electrical, plumbing and mechanical packages required.', 'Coordinate routes and connections with structural and finishing works.', 'Review the agreed systems at the relevant stages before covering the work.'],
    inputs: 'Send the project location, building type, current stage and available technical drawings. Specify whether you need a complete package or selected electrical, plumbing or mechanical works.',
    cost: ['System scope, capacities, quantities and specifications.', 'The current construction stage and access to existing routes.', 'Testing requirements and coordination with other packages.'],
    projects: [],
  },
];
const projects = [
  {
    id: 'faisaliah', slug: 'faisaliah-villa', ar: '/project-faisaliah-villa-facades-finishing.html',
    name: 'Al Faisaliah villa façades and finishing', location: 'Al Faisaliah, Riyadh', area: '900 m²', duration: '2 months',
    intro: 'The published project scope covers façade work, plastering, marble and interior and exterior ceramic finishes for a residential villa in Al Faisaliah, Riyadh.',
    scope: ['Façade execution and preparation of the related surfaces.', 'Plastering and surface preparation for the following finishes.', 'Marble installation within the defined project scope.', 'Interior and exterior ceramic finishes and review of material junctions.'],
    stages: [['Surface review', 'Review surfaces, dimensions and levels before preparing the next finishing layer.'], ['Plastering and façades', 'Organize the façade and plastering work before material installation.'], ['Finishing materials', 'Coordinate the marble and ceramic installation within the agreed scope.'], ['Review and handover', 'Review levels, junctions and the completed finishing details.']],
    photos: [['images/projects/faisaliah-villa-facades-finishing-01-v3.webp', 'Façade work during execution of the Al Faisaliah villa project.']],
    services: ['finishing', 'interior-design'],
  },
  {
    id: 'uhud', slug: 'uhud-villa', ar: '/project-villa-plaster-ceramic-marble-uhud-riyadh.html',
    name: 'Uhud villa plastering and finishes', location: 'Uhud, Riyadh', area: '700 m²', duration: '3 months',
    intro: 'Tawod’s published case study describes plastering, decorative groove details, ceramic and marble works for a residential villa in Uhud, Riyadh.',
    scope: ['Interior and exterior plastering within the project scope.', 'The façade groove details described in the original case study.', 'Interior and exterior ceramic finishes.', 'Marble installation and coordination of the finishing details.'],
    stages: [['Define the packages', 'Identify the plastering, façade details and material installation requirements.'], ['Prepare the surfaces', 'Review the substrates and levels for the next finishing stages.'], ['Coordinate materials', 'Organize ceramic and marble installation around the prepared surfaces.'], ['Close the scope', 'Review the agreed work and outstanding finishing items.']],
    photos: [['images/projects/villa-plaster-ceramic-marble-uhud-riyadh-01.webp', 'Exterior plastering and façade groove work at the Uhud villa.']],
    services: ['finishing'],
  },
  {
    id: 'arouba', slug: 'arouba-mosque-villas', ar: '/project-arouba-mosque-villas.html',
    name: 'A mosque and two villas in Al Arouba', location: 'Al Arouba, Riyadh', area: '1,800 m²', duration: '12 months',
    intro: 'This published project combines a mosque and two residential villas within one turnkey delivery scope. The case study records an area of 1,800 m² and a 12-month execution period.',
    scope: ['A mosque and two residential villas within one project.', 'Full turnkey delivery as described in the Arabic case study.', 'Coordination of the main and supporting execution stages.', 'Review and preparation for the agreed project handover.'],
    stages: [['Define the combined scope', 'Connect the three project components to one defined execution programme.'], ['Main construction', 'Organize progress across the mosque and the two villas.'], ['Coordinate following trades', 'Connect the supporting works and finishing stages to the wider programme.'], ['Review and handover', 'Review the work and close the agreed outstanding items before handover.']],
    photos: [['images/projects/arouba-mosque-villas-01.webp', 'Construction and masonry work during the mosque and two-villa project.'], ['images/projects/arouba-mosque-villas-02.webp', 'Progress of the exterior works during project execution.']],
    services: ['turnkey', 'construction', 'finishing'],
  },
  {
    id: 'warehouses', slug: 'eight-warehouses-riyadh', ar: '/project-modon-eight-warehouses-riyadh.html',
    name: 'Eight warehouses in Riyadh’s Second Industrial City', location: 'Second Industrial City, Riyadh', area: '29,122.40 m²', duration: '6 months',
    intro: 'The case study records eight warehouses within one industrial site, with a published total area of 29,122.40 m² and a six-month programme. The site photographs show concrete foundation preparation and steel-frame installation.',
    scope: ['Eight warehouse units within one industrial site.', 'Concrete foundation preparation and waterproofing shown in the site record.', 'Installation of the main steel frames.', 'Coordination of progress across the warehouse units.'],
    stages: [['Site organization', 'Arrange working areas and the sequence for the separate warehouse units.'], ['Concrete foundations', 'Prepare the reinforced foundations and the related waterproofing work.'], ['Steel structures', 'Install and coordinate the main steel frames.'], ['Programme review', 'Review progress for each unit against the wider project programme.']],
    photos: [['images/projects/modon-eight-warehouses-01-v4.webp', 'Preparation and waterproofing of concrete foundations at the warehouse site.'], ['images/projects/modon-eight-warehouses-02-v3.webp', 'Steel-frame installation across the warehouse units.']],
    services: ['construction'],
  },
  {
    id: 'tanks', slug: 'king-salman-park-tanks', ar: '/project-alrajhi-tanks-king-salman-park.html',
    name: 'Tank reinforcement and waterproofing at King Salman Park', location: 'King Salman Park, Riyadh', area: '119 m²', duration: '2 weeks',
    intro: 'The published scope covers tank reinforcement and waterproofing for an Al Rajhi Construction project at King Salman Park. It records 119 m² of work completed over two weeks.',
    scope: ['Tank reinforcement and related steel fixing.', 'Waterproofing within the defined project package.', 'Coordination of the work sequence before covering the elements.', 'Review of the completed scope.'],
    stages: [['Scope review', 'Define the tank work, area and relevant execution requirements.'], ['Reinforcement', 'Prepare and install the reinforcement for the tank base.'], ['Waterproofing', 'Complete the specified waterproofing after the related surfaces are ready.'], ['Scope handover', 'Review the agreed package and close the listed items.']],
    photos: [['images/projects/alrajhi-tanks-king-salman-park-01.webp', 'Reinforcement preparation for a tank base at King Salman Park.']],
    services: ['construction'],
  },
];
for (const src of new Set(projects.flatMap(p => p.photos.map(photo => photo[0])))) {
  const { width, height } = await sharp(src).metadata();
  imageSizes[src] = [width, height];
}

export const englishPairs = [
  { ar: '/', en: '/en/' },
  ...services.map(s => ({ ar: s.ar, en: serviceUrl(s) })),
  { ar: '/projects.html', en: '/en/projects/' },
  ...projects.map(p => ({ ar: p.ar, en: projectUrl(p) })),
  { ar: '/contact.html', en: '/en/contact/' },
];
const fileFor = url => url === '/' ? 'index.html' : url.endsWith('/') ? `${url.slice(1)}index.html` : url.slice(1);
const alternates = (ar, en) => `<link rel='alternate' hreflang='ar-SA' href='${domain + ar}'>\n<link rel='alternate' hreflang='en-SA' href='${domain + en}'>\n<link rel='alternate' hreflang='x-default' href='${domain + ar}'>`;
const header = ar => `<a class="skip-link" href="#main">Skip to content</a><header class="en-header"><div class="container"><a class="en-brand" href="/en/" aria-label="Tawod — English home"><img src="/images/logo/tawod-logo-180.webp" width="180" height="80" alt="Tawod"><span>General<br>Contracting</span></a><nav class="en-nav" id="en-nav" aria-label="Main navigation"><a href="/en/#services">Services</a><a href="/en/projects/">Projects</a><a href="/en/#about">About</a><a href="/en/contact/">Contact</a></nav><div class="en-actions"><a class="language-link" href="${ar}" lang="ar" hreflang="ar-SA" aria-label="Read this page in Arabic">العربية</a><a class="btn btn-primary" href="tel:0551128884" data-contact-position="english_header">Call us</a><button class="en-menu" id="en-menu-toggle" type="button" aria-label="Open navigation" aria-controls="en-nav" aria-expanded="false"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button></div></div></header>`;
const footer = () => `<footer class="en-footer"><div class="container"><div class="en-footer-grid"><div><img src="/images/logo/tawod-logo-180.webp" width="180" height="80" loading="lazy" decoding="async" alt="Tawod"><p>General contracting, construction, renovation, finishing and turnkey delivery in Riyadh.</p></div><div><h2>Services</h2><ul>${services.map(s => `<li><a href="${serviceUrl(s)}">${s.name}</a></li>`).join('')}</ul></div><div><h2>Contact</h2><ul><li><a href="tel:0551128884">0551128884</a></li><li><a href="mailto:info@tawodco.com">info@tawodco.com</a></li><li><a href="${riyadh.mapsUrl}" target="_blank" rel="noopener noreferrer">4206 Uthman Bin Affan Branch Road, Al Wadi, Riyadh 13313, Saudi Arabia</a></li><li>Saturday–Thursday, 07:00–22:00 (Riyadh time). Friday closed.</li><li><a href="/en/contact/">Discuss your project</a></li><li><a href="/privacy-policy.html" lang="ar">Privacy policy (Arabic)</a></li></ul></div></div><div class="en-footer-bottom"><p>© 2026 Tawod General Contracting Company</p><a href="/">Arabic website</a></div></div></footer>`;
const organization = companySchema({ name: 'Tawod General Contracting Company', areaServed: { '@type': 'City', name: 'Riyadh' } });
function documentPage({ url, ar, title, description, main, schema, noindex = false, heroImage }) {
  const graph = [organization, { '@type': 'WebPage', '@id': `${domain + url}#webpage`, url: domain + url, name: title, description, inLanguage: 'en-SA', publisher: { '@id': organization['@id'] }, ...(ar ? { translationOfWork: { '@type': 'WebPage', url: domain + ar } } : {}), ...(schema ? { mainEntity: schema } : {}) }];
  return `<!DOCTYPE html>\n<html lang="en-SA" dir="ltr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#1d1e26"><title>${escape(title)} | Tawod</title><meta name="description" content="${escape(description)}"><meta name="robots" content="${noindex ? 'noindex,follow' : 'index,follow,max-image-preview:large'}"><link rel="canonical" href="${domain + url}">${ar ? alternates(ar, url) : ''}<meta property="og:type" content="website"><meta property="og:locale" content="en_SA"><meta property="og:locale:alternate" content="ar_SA"><meta property="og:site_name" content="Tawod General Contracting Company"><meta property="og:url" content="${domain + url}"><meta property="og:title" content="${escape(title)} | Tawod"><meta property="og:description" content="${escape(description)}"><meta property="og:image" content="${domain}/images/social/tawod-og-1200x630.png"><meta property="og:image:type" content="image/png"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta property="og:image:alt" content="Tawod General Contracting Company"><meta name="twitter:card" content="summary_large_image"><meta name="twitter:title" content="${escape(title)} | Tawod"><meta name="twitter:description" content="${escape(description)}"><meta name="twitter:image" content="${domain}/images/social/tawod-og-1200x630.png"><link rel="icon" href="/images/logo/tawod-logo-180.webp" type="image/webp"><link rel="preload" href="/assets/fonts/inter-latin-variable.woff2" as="font" type="font/woff2" crossorigin><link rel="stylesheet" href="/assets/css/tawod-english.css?v=${revision('assets/css/tawod-english.css')}">${heroImage ? `<link rel="preload" href="/${heroImage}" as="image" fetchpriority="high">` : ''}<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@graph': graph }).replace(/</g, '\\u003c')}</script></head><body class="tawod-english">${header(ar || '/')}<main id="main">${main}</main>${footer()}<script src="/assets/js/tawod-english.js?v=${revision('assets/js/tawod-english.js')}" defer></script></body></html>\n`;
}
const steps = items => `<div class="en-steps">${items.map(([title, text]) => `<div class="en-step"><h3>${escape(title)}</h3><p>${escape(text)}</p></div>`).join('')}</div>`;
const serviceCards = () => `<div class="en-grid">${services.map((s, i) => `<article class="en-card"><span class="en-number">0${i + 1}</span><h3>${s.name}</h3><p>${escape(s.description)}</p><a class="text-link" href="${serviceUrl(s)}">Explore ${s.name.toLowerCase()} →</a></article>`).join('')}</div>`;
const projectCards = ids => `<div class="en-grid">${projects.filter(p => !ids || ids.includes(p.id)).map(p => `<article class="en-card en-project-card">${image(p.photos[0][0], p.photos[0][1])}<div class="en-project-copy"><h3>${escape(p.name)}</h3><div class="en-facts"><span>${p.area}</span><span>${p.duration}</span></div><p>${escape(p.intro)}</p><a class="text-link" href="${projectUrl(p)}">View scope and site photographs →</a></div></article>`).join('')}</div>`;
const brief = (service, inputs) => `<section class="section soft"><div class="container"><div class="en-brief"><div><span class="eyebrow">Your next step</span><h2>Discuss your ${service ? service.name.toLowerCase() : 'project'} scope</h2><p>${escape(inputs)}</p></div><div class="en-hero-actions"><a class="btn btn-whatsapp" href="${whatsapp(`Hello Tawod, I would like to discuss ${service ? service.name.toLowerCase() : 'a project'} in Riyadh. Location: … Area: … Current stage: …`)}" data-contact-service="${service?.key || 'general_contracting'}" data-contact-position="english_project_brief">WhatsApp</a><a class="btn btn-outline" href="/en/contact/${service ? `?service=${service.key}` : ''}#form">Send a request</a></div></div></div></section>`;

function servicePage(s) {
  const main = `<section class="en-hero"><div class="container"><div class="en-breadcrumbs"><a href="/en/">Home</a> / <a href="/en/#services">Services</a> / ${s.name}</div><span class="eyebrow">${s.name} · Riyadh</span><h1>${s.title}</h1><p class="lead">${escape(s.intro)}</p><div class="en-hero-actions"><a class="btn btn-primary" href="tel:0551128884" data-contact-service="${s.key}" data-contact-position="english_service_hero">Discuss your project</a><a class="btn btn-whatsapp" href="${whatsapp(`Hello Tawod, I need ${s.name.toLowerCase()} in Riyadh. Location: … Current stage: …`)}" data-contact-service="${s.key}" data-contact-position="english_service_hero">WhatsApp</a>${s.projects.length ? '<a class="btn btn-outline" href="#project-evidence">View a completed project</a>' : ''}</div></div></section><section class="section"><div class="container en-content-grid"><div><span class="eyebrow">Define the work</span><h2>What the scope can include</h2><ul>${s.scope.map(text => `<li>${escape(text)}</li>`).join('')}</ul><p>The quotation and agreed specifications define the packages included in your project.</p></div>${steps([['Review the information', 'Understand your location, current stage and available drawings or photographs.'], ['Define the scope', 'Clarify quantities, materials, responsibilities and the required approvals.'], ['Coordinate execution', 'Organize the work sequence and review the relevant stages.'], ['Review and handover', 'Check the agreed work and close outstanding items.']])}</div></section>${s.projects.length ? `<section class="section soft" id="project-evidence"><div class="container"><div class="section-heading"><span class="eyebrow">From Tawod’s project record</span><h2>Scope and site evidence</h2><p>These examples show their own published scope and duration. Your project programme is defined separately.</p></div>${projectCards(s.projects)}</div></section>` : ''}<section class="section"><div class="container en-content-grid"><div><span class="eyebrow">Before requesting a quotation</span><h2>Information that helps define your request</h2><p>${escape(s.inputs)}</p><a class="text-link" href="/en/contact/?service=${s.key}#form">Send your project request →</a></div><div><h2>What affects the cost?</h2><ul>${s.cost.map(text => `<li>${escape(text)}</li>`).join('')}</ul><p>An assessment and defined quantities are needed for a project-specific offer.</p></div></div></section>${brief(s, s.inputs)}`;
  return documentPage({ url: serviceUrl(s), ar: s.ar, title: s.title, description: s.description, main, schema: { '@type': 'Service', name: s.title, description: s.description, url: domain + serviceUrl(s), provider: { '@id': organization['@id'] }, areaServed: { '@type': 'City', name: 'Riyadh' } } });
}
function projectPage(p) {
  const main = `<section class="en-hero"><div class="container"><div class="en-breadcrumbs"><a href="/en/">Home</a> / <a href="/en/projects/">Projects</a> / Case study</div><span class="eyebrow">Project record · ${p.location}</span><h1>${escape(p.name)}</h1><p class="lead">${escape(p.intro)}</p><div class="en-facts"><span>${p.area}</span><span>${p.duration}</span><span>${escape(p.location)}</span></div><a class="btn btn-primary" href="#site-photographs">View site photographs</a></div></section><section class="section"><div class="container en-content-grid"><div><span class="eyebrow">Published project scope</span><h2>What the work covers</h2><ul>${p.scope.map(text => `<li>${escape(text)}</li>`).join('')}</ul><p>This English case study reflects the details and photographs published in <a class="text-link" href="${p.ar}" lang="ar">the Arabic project record</a>. The duration shown is for this project.</p></div>${steps(p.stages)}</div></section><section class="section soft" id="site-photographs"><div class="container"><div class="section-heading"><span class="eyebrow">From the site</span><h2>Photographs of execution</h2><p>The captions describe the stages visible in the available project photographs.</p></div><div class="en-gallery">${p.photos.map(([src, caption]) => `<figure>${image(src, caption)}<figcaption>${escape(caption)}</figcaption></figure>`).join('')}</div></div></section><section class="section"><div class="container"><h2>Explore related services</h2><div class="en-hero-actions">${services.filter(s => p.services.includes(s.slug)).map(s => `<a class="btn btn-outline" href="${serviceUrl(s)}">${s.name}</a>`).join('')}</div></div></section>${brief(null, 'Share your location, approximate area, current stage and required scope. Available drawings or photographs help us understand the next step.')}`;
  return documentPage({ url: projectUrl(p), ar: p.ar, title: p.name, description: `${p.name}: published scope, ${p.area}, ${p.duration}, and site photographs from Tawod’s project record.`, main });
}
function homePage() {
  const main = `<section class="en-hero"><div class="container en-hero-grid"><div><span class="eyebrow">General contracting · Riyadh</span><h1>Construction, finishing and turnkey project delivery</h1><p class="lead">Tawod coordinates residential and commercial projects from scope definition and construction to technical works, finishing, inspection and agreed handover.</p><div class="en-hero-actions"><a class="btn btn-primary" href="/en/contact/">Discuss your project</a><a class="btn btn-whatsapp" href="${whatsapp('Hello Tawod, I would like to discuss a project in Riyadh. Project type: … Location: … Current stage: …')}" data-contact-service="general_contracting" data-contact-position="english_home_hero">WhatsApp</a></div><div class="en-proof"><span>Defined scope</span><span>Coordinated trades</span><span>Phase reviews</span></div></div><div class="en-hero-image">${image('images/projects/faisaliah-villa-facades-finishing-01-v3.webp', 'Façade and finishing work at Tawod’s Al Faisaliah villa project in Riyadh.', { hero: true })}</div></div></section><section class="section" id="services"><div class="container"><div class="section-heading"><span class="eyebrow">Our services</span><h2>Choose the work your project needs</h2><p>Explore the scope, quotation inputs and related project evidence for each service.</p></div>${serviceCards()}</div></section><section class="section soft" id="projects"><div class="container"><div class="section-heading"><span class="eyebrow">Published project record</span><h2>Real projects with defined scopes</h2><p>Review each example’s location, area, duration and available site photographs.</p></div>${projectCards(['faisaliah', 'uhud', 'arouba'])}<div class="en-hero-actions"><a class="btn btn-outline" href="/en/projects/">Explore all five case studies</a></div></div></section><section class="section" id="about"><div class="container en-content-grid"><div><span class="eyebrow">About Tawod</span><h2>A clear path from discussion to handover</h2><p>We begin by understanding your project and reviewing the available information. The required packages, responsibilities and specifications are then defined before the work is coordinated around the agreed programme.</p><p>Published projects and official verification links let you review the company information and the work shown on this website.</p><div class="en-verification"><a class="text-link" href="https://muqawil.org/ar/contractors/20177725/143" target="_blank" rel="noopener">View the Muqawil profile</a><a class="text-link" href="https://qr.saudibusiness.gov.sa/viewqr/TjdiRWJzVHozZThIZWIrdjkrZU1GZkl6Y1EyK3ZudUxNT2lKbG1talBmVUU5ME5Gc1pIZXM2eFdiQVEvMXNuMw==" target="_blank" rel="noopener">Saudi Business Center verification</a></div></div>${steps([['Understand the project', 'Review the location, area, intended use and current stage.'], ['Define the offer', 'Clarify the included work, materials, responsibilities and programme.'], ['Coordinate the stages', 'Connect the execution packages and review the relevant work.'], ['Review and hand over', 'Check the agreed scope and close the listed outstanding items.']])}</div></section>${brief(null, 'Send your project type, location, approximate area and current stage. Add drawings or photographs if available.')}`;
  return documentPage({ url: '/en/', ar: '/', title: 'General contracting in Riyadh', description: 'Tawod construction, turnkey delivery, renovation, finishing, interior design, electrical and plumbing in Riyadh, with completed project case studies.', main, heroImage: 'images/projects/faisaliah-villa-facades-finishing-01-v3.webp' });
}
function contactPage() {
  const main = `<section class="en-hero"><div class="container"><span class="eyebrow">Contact Tawod</span><h1>Discuss your project in Riyadh</h1><p class="lead">Call, start a WhatsApp conversation or send a project request. The location, current stage and required service help us determine the next step.</p><div class="en-hero-actions"><a class="btn btn-primary" href="tel:0551128884">0551128884</a><a class="btn btn-whatsapp" href="${whatsapp('Hello Tawod, I would like to discuss a project in Riyadh. Service: … Location: … Current stage: …')}">WhatsApp</a></div></div></section><section class="section"><div class="container en-content-grid"><div class="en-contact-info"><div><h2>Contact information</h2><p><a href="tel:0551128884">0551128884</a><br><a href="mailto:info@tawodco.com">info@tawodco.com</a></p></div><div><h3>Riyadh address</h3><p>4206 Othman bin Affan Branch Road, Riyadh, Saudi Arabia.</p></div><div><h3>Dammam branch</h3><p>7671 Zuhair bin Qais Street, Al Shulah, Dammam 34271, Saudi Arabia.</p><p>Saturday–Thursday, 7:00 am–10:00 pm. Friday closed.</p><a class="text-link" href="/dammam/contact/" lang="ar">Dammam branch information (Arabic)</a></div></div><form id="form" class="en-form contact-lead-form" lang="en" action="https://formsubmit.co/info@tawodco.com" method="POST" aria-labelledby="contact-form-title" data-analytics-form="en_quote_request"><h2 id="contact-form-title">Send a project request</h2><p>Your name, mobile number and selected service are enough to start.</p><input type="hidden" name="_subject" value="New English project request — Tawod"><input type="hidden" name="_template" value="table"><input type="hidden" name="_captcha" value="true"><input name="_next" type="hidden" value="${domain}/en/thank-you.html"><input type="hidden" name="request_language" value="English"><div class="form-group"><label for="en-name">Name</label><input class="form-control" id="en-name" name="الاسم" type="text" autocomplete="name" required maxlength="100"></div><div class="form-group"><label for="en-phone">Saudi mobile number</label><input class="form-control" id="en-phone" name="رقم_الجوال" type="tel" inputmode="tel" autocomplete="tel" maxlength="16" required></div><div class="form-group"><label for="en-service">Required service</label><select class="form-control" id="en-service" name="الخدمة_المطلوبة" required><option value="" selected disabled>Select a service</option>${services.map(s => `<option value="${({ construction: 'البناء والإنشاءات', turnkey: 'تسليم مفتاح', restoration: 'ترميم مباني', finishing: 'تشطيبات عامة', decor: 'ديكورات', mep: 'أعمال الكهرباء والسباكة' })[s.key]}">${s.name}</option>`).join('')}</select></div><div class="form-group"><label for="en-email">Email <span class="optional">(optional)</span></label><input class="form-control" id="en-email" name="البريد_الإلكتروني" type="email" autocomplete="email" maxlength="200"></div><div class="form-group"><label for="en-details">Project details <span class="optional">(optional)</span></label><textarea class="form-control" id="en-details" name="التفاصيل" maxlength="1200" placeholder="Location, approximate area and current stage"></textarea></div><div class="privacy-check"><input id="en-privacy" name="الموافقة_على_الخصوصية" type="checkbox" value="موافق" required><label for="en-privacy">I agree to the use of my details to respond to this request, as described in the <a href="/privacy-policy.html" lang="ar">privacy policy (Arabic)</a>.</label></div><button class="btn btn-primary" type="submit">Send request</button></form></div></section>`;
  return documentPage({ url: '/en/contact/', ar: '/contact.html', title: 'Contact Tawod in Riyadh', description: 'Contact Tawod by phone, WhatsApp or a project request form for construction, renovation, finishing and turnkey projects in Riyadh.', main });
}
function thankYouPage() {
  return documentPage({ url: '/en/thank-you.html', title: 'Thank you for your request', description: 'Next steps after sending your project request to Tawod.', noindex: true, main: `<section class="en-hero"><div class="container"><span class="eyebrow">Project request</span><h1>Thank you for contacting Tawod</h1><p class="lead">Our team reviews incoming project requests and follows up to clarify the scope or discuss a site assessment when needed.</p><div class="en-hero-actions"><a class="btn btn-primary" href="/en/">Return to the website</a><a class="btn btn-whatsapp" href="${whatsapp('Hello Tawod, I would like to follow up on the project request I sent from your website.')}">Follow up on WhatsApp</a></div></div></section>` });
}

export function buildEnglishSite() {
  const pages = new Map([
    ['/en/', homePage()], ['/en/projects/', documentPage({ url: '/en/projects/', ar: '/projects.html', title: 'Tawod project case studies in Riyadh', description: 'Five published Tawod case studies: villas, turnkey mosque and villas, industrial warehouses and tank works, with scopes and site photographs.', main: `<section class="en-hero"><div class="container"><span class="eyebrow">Project record · Riyadh</span><h1>Projects with scope and site evidence</h1><p class="lead">Explore five published case studies. Each presents its own scope, area, duration and available photographs.</p></div></section><section class="section"><div class="container">${projectCards()}</div></section>${brief(null, 'Share your project location, current stage and required scope to discuss the appropriate next step.')}` })],
    ...services.map(s => [serviceUrl(s), servicePage(s)]),
    ...projects.map(p => [projectUrl(p), projectPage(p)]),
    ['/en/contact/', contactPage()], ['/en/thank-you.html', thankYouPage()],
  ]);
  let changed = 0;
  for (const [url, html] of pages) {
    const file = fileFor(url);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    // Preserve installed tracking between generator and installer runs.
    const previous = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
    let output = html;
    const tracking = previous.match(/<!-- TAWOD_ANALYTICS_START -->[\s\S]*?<!-- TAWOD_ANALYTICS_END -->/)?.[0];
    if (/contact-conversion\.js/.test(previous) && /formsubmit\.co\//.test(output)) {
      const script = previous.match(/<script[^>]*src=["'][^"']*contact-conversion\.js[^"']*["'][^>]*><\/script>/)?.[0];
      const sheet = previous.match(/<link[^>]*href=["'][^"']*contact-conversion\.css[^"']*["'][^>]*>/)?.[0];
      if (script) output = output.replace('</body>', script + '</body>');
      if (sheet) output = output.replace('</head>', sheet + '</head>');
    }
    if (tracking) output = output.replace('</head>', tracking + '</head>');
    if (output !== previous) { fs.writeFileSync(file, output); changed++; }
  }
  for (const pair of englishPairs) {
    const file = fileFor(pair.ar);
    const previous = fs.readFileSync(file, 'utf8');
    let html = previous.replace(/<link\b(?=[^>]*\brel=["']alternate["'])(?=[^>]*\bhreflang=)[^>]*>\s*/gi, '')
      .replace(/(<link\b(?=[^>]*\brel=["']canonical["'])[^>]*>)/i, '$1\n' + alternates(pair.ar, pair.en));
    if (pair.ar !== '/') {
      // Recreate each control in its own navigation region. Exact class tokens
      // prevent the desktop matcher from also consuming sidebar-language-link.
      html = html.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, anchor => {
        const classes = anchor.match(/\bclass=["']([^"']*)["']/i)?.[1].split(/\s+/) || [];
        return classes.includes('language-link') || classes.includes('sidebar-language-link') ? '' : anchor;
      });
      const link = `<a class="language-link" href="${pair.en}" lang="en" hreflang="en-SA" aria-label="Read this page in English">EN</a>`;
      html = html.replace(/(<div\b[^>]*class=["']header-actions["'][^>]*>)/i, '$1' + link);
      const mobileLink = `<a class="sidebar-language-link" href="${pair.en}" lang="en" hreflang="en-SA">English</a>`;
      html = html.replace(/(<nav\b[^>]*class=["']sidebar-nav["'][^>]*>[\s\S]*?)(<\/nav>)/i, '$1' + mobileLink + '$2');
      if (!html.includes(mobileLink)) throw new Error(`Missing mobile English switch in ${file}`);
      if (!html.includes(`href="${pair.en}" lang="en"`)) throw new Error(`Missing English switch in ${file}`);
    }
    if (html !== previous) fs.writeFileSync(file, html);
  }
  console.log(`Built 14 English public pages and an unindexed confirmation page; ${changed} English files updated.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) buildEnglishSite();
