import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const businessData = JSON.parse(fs.readFileSync(new URL('../data/business-branches.json', import.meta.url), 'utf8'));
export const { company, workingHours, dammam } = businessData;
const root = fileURLToPath(new URL('../', import.meta.url));
const schemaPattern = /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
const markerPattern = /<!-- TAWOD_BRANCH_[A-Z]+_START -->[\s\S]*?<!-- TAWOD_BRANCH_[A-Z]+_END -->/g;
const esc = value => String(value).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');
const block = (name, content) => `<!-- TAWOD_BRANCH_${name}_START -->${content}<!-- TAWOD_BRANCH_${name}_END -->`;
const normalized = html => html.replace(/[ \t]+$/gm, '').replace(/\n{3,}/g, '\n\n').trim() + '\n';

export function branchSchema() {
  return {
    '@type': 'GeneralContractor',
    '@id': dammam.schemaId,
    name: dammam.name,
    url: dammam.url,
    logo: company.logo,
    telephone: company.telephone,
    email: company.email,
    address: { '@type': 'PostalAddress', ...dammam.address },
    geo: { '@type': 'GeoCoordinates', ...dammam.geo },
    hasMap: dammam.mapsUrl,
    areaServed: { '@type': 'City', name: dammam.areaServed },
    parentOrganization: { '@id': company.schemaId },
    openingHoursSpecification: [{
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: workingHours.days.map(day => `https://schema.org/${day}`),
      opens: workingHours.opens,
      closes: workingHours.closes,
    }, ...workingHours.closedDays.map(day => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${day}`,
      opens: '00:00',
      closes: '00:00',
    }))],
  };
}

// Other city generators use Dammam's templates. Restore the company reference
// and remove this physical location before they translate any source markup.
export function stripBranchMarkup(value) {
  return String(value).replace(markerPattern, '').replace(schemaPattern, (script, source) => {
    const parsed = JSON.parse(source);
    let changed = false;
    const restore = node => {
      if (!node || typeof node !== 'object') return;
      if (node['@id'] === dammam.schemaId) {
        node['@id'] = company.schemaId;
        changed = true;
      }
      Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(restore) : restore(value));
    };
    restore(parsed);
    return changed ? script.replace(source, json(parsed)) : script;
  });
}

function contactItems() {
  return `<li><a href="tel:${company.displayTelephone}"><i class="fa-solid fa-phone" aria-hidden="true"></i><span dir="ltr">${company.displayTelephone}</span></a></li><li><a href="mailto:${company.email}"><i class="fa-solid fa-envelope" aria-hidden="true"></i><span dir="ltr">${company.email}</span></a></li><li><a href="${esc(dammam.mapsUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>${esc(dammam.formattedAddress)}</span></a></li><li><div class="info-only"><i class="fa-regular fa-clock" aria-hidden="true"></i><span>${esc(workingHours.label)}<br>${workingHours.closedLabel}</span></div></li>`;
}

function branchSection() {
  return `<section class="section-padding tawod-branch-section" aria-labelledby="dammam-branch-title"><div class="container"><div class="tawod-branch-panel"><div class="tawod-branch-intro"><span class="eyebrow">فرع الدمام · حي الشعلة</span><h2 id="dammam-branch-title">${esc(dammam.name)}</h2><p>نتابع مشاريع البناء والتشطيب والترميم في الدمام من مقرنا في حي الشعلة. تواصل معنا لمناقشة مشروعك وتنسيق المعاينة.</p><div class="tawod-branch-actions"><a class="btn btn-primary" href="${esc(dammam.mapsUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-location-dot" aria-hidden="true"></i> موقع الفرع على الخريطة</a><a class="btn btn-dark" href="${dammam.contactUrl}">تواصل مع الفرع <i class="fa-solid fa-arrow-left-long" aria-hidden="true"></i></a></div></div><dl class="tawod-branch-details"><div><dt>مقرنا في الدمام</dt><dd><address>${esc(dammam.formattedAddress)}</address></dd></div><div><dt>مواعيد العمل</dt><dd>${esc(workingHours.label)}<br><span>${workingHours.closedLabel}</span></dd></div><div><dt>الهاتف والواتساب الموحّد</dt><dd><a href="tel:${company.displayTelephone}" dir="ltr">${company.displayTelephone}</a><span aria-hidden="true"> · </span><a href="${company.whatsappUrl}">واتساب</a></dd></div><div><dt>البريد الإلكتروني</dt><dd><a href="mailto:${company.email}" dir="ltr">${company.email}</a></dd></div></dl></div></div></section>`;
}

export function enhanceBranchHtml(html, relativePath) {
  if (['sitemap.xml', 'sitemap-dammam.xml'].includes(relativePath)) {
    const updatedPages = new Set([dammam.url, dammam.contactUrl, `${dammam.url}about/`, `${company.url}contact.html`]);
    return html.replace(/<url><loc>([^<]+)<\/loc><lastmod>[^<]+<\/lastmod><\/url>/g,
      (entry, url) => updatedPages.has(url) ? entry.replace(/<lastmod>[^<]+<\/lastmod>/, `<lastmod>${dammam.updatedAt}</lastmod>`) : entry);
  }
  const local = relativePath.startsWith('dammam/') && relativePath.endsWith('.html');
  const mainContact = relativePath === 'contact.html';
  if (!local && !mainContact) return html;
  html = stripBranchMarkup(html);

  if (local) {
    html = html.replace(schemaPattern, (script, source) => {
      const data = JSON.parse(source);
      let changed = false;
      for (const node of data['@graph'] || [data]) {
        const types = [].concat(node['@type'] || []);
        if (types.some(type => ['WebPage', 'ContactPage', 'AboutPage'].includes(type)) && node.about?.['@id'] === company.schemaId) {
          node.about = { '@id': dammam.schemaId };
          changed = true;
        }
        if (types.includes('Service')) {
          node.provider = { '@id': dammam.schemaId };
          changed = true;
        }
      }
      return changed ? script.replace(source, json(data)) : script;
    });
    const footer = block('FOOTER', `<div class="footer-contact-column"><h4 class="footer-title">تواصل مع فرع الدمام</h4><ul class="footer-contact">${contactItems()}</ul></div>`);
    html = html.replace(/(<footer class="footer">[\s\S]*?)(<\/div><div class="footer-bottom">)/i, `$1${footer}$2`);
    const sidebar = block('SIDEBAR', `<li><a href="${esc(dammam.mapsUrl)}" target="_blank" rel="noopener noreferrer"><i class="fa-solid fa-location-dot" aria-hidden="true"></i><span>${esc(dammam.formattedAddress)}</span></a></li>`);
    html = html.replace(/(<div class="sidebar-contact">[\s\S]*?)(<\/ul>)/i, `$1${sidebar}$2`);
  }

  if (mainContact || ['dammam/index.html', 'dammam/about/index.html', 'dammam/contact/index.html'].includes(relativePath)) {
    const section = block('SECTION', branchSection());
    html = /<section id="faq"/i.test(html)
      ? html.replace(/<section id="faq"/i, `${section}<section id="faq"`)
      : html.replace(/<\/main>/i, `${section}</main>`);
  }

  const graph = [branchSchema()];
  if (local) graph.unshift({ '@type': 'Organization', '@id': company.schemaId, name: company.name, url: company.url, logo: company.logo });
  const additions = block('STYLE', '<link rel="stylesheet" href="/assets/css/tawod-branches.css">')
    + block('SCHEMA', `<script type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': graph })}</script>`);
  return html.includes('<!-- TAWOD_ANALYTICS_START -->')
    ? html.replace('<!-- TAWOD_ANALYTICS_START -->', `${additions}<!-- TAWOD_ANALYTICS_START -->`)
    : html.replace(/<\/head>/i, `${additions}</head>`);
}

function htmlFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? htmlFiles(file) : entry.name.endsWith('.html') ? [file] : [];
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const files = ['contact.html', 'sitemap.xml', 'sitemap-dammam.xml'].map(file => path.join(root, file)).concat(htmlFiles(path.join(root, 'dammam')));
  const changed = [];
  for (const file of files) {
    const old = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file).split(path.sep).join('/');
    const next = normalized(enhanceBranchHtml(old, relative));
    if (next === old) continue;
    changed.push(relative);
    if (!check) fs.writeFileSync(file, next);
  }
  console.log(`${check ? 'Checked' : 'Synced'} business branches: ${files.length} files; ${changed.length} ${check ? 'stale' : 'updated'}.`);
  if (check && changed.length) { console.error(changed.join('\n')); process.exitCode = 1; }
}
