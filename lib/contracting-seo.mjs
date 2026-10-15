import { company, companySchema, riyadh, workingHours } from './business-schema.mjs';
import { applyContractingImagePresentation } from './contracting-image-presentation.mjs';

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

export function repairContractingSeo(relativePath, source) {
  source = source.replace(/(\bhref=["'])tel:(?:0551128884|00966551128884|966551128884)(["'])/gi, '$1tel:+966551128884$2');
  let html = source.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (script, raw) => {
    const data = JSON.parse(raw);
    let changed = false;
    function visit(node) {
      if (!node || typeof node !== 'object') return;
      if (node['@id'] === company.schemaId && [].concat(node['@type'] || []).includes('GeneralContractor')) {
        Object.assign(node, companySchema(node));
        delete node.serviceType;
        changed = true;
      }
      Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(visit) : visit(value));
    }
    visit(data);
    return changed ? script.replace(raw, json(data)) : script;
  });

  html = html.replace(/<footer\b[\s\S]*?<\/footer>/i, footer => {
    footer = footer.replace(/<h4\b([^>]*\bclass=["'][^"']*\bfooter-title\b[^"']*["'][^>]*)>([\s\S]*?)<\/h4>/gi, '<h2$1>$2</h2>');
    // Show the verified main-office details alongside its structured data.
    if (['index.html', 'contact.html'].includes(relativePath)) {
      footer = footer.replace(/4206 طريق عثمان بن عفان الفرعي(?:، حي الوادي)?(?:، الرياض(?: 13313)?)?(?:، المملكة العربية السعودية)?/g, riyadh.formattedAddress);
      if (!footer.includes('data-riyadh-hours')) {
        const office = `<div class="contracting-office-details" data-riyadh-hours><p>مكتب الرياض: <a href="${riyadh.mapsUrl}" target="_blank" rel="noopener noreferrer">${riyadh.formattedAddress}</a></p><p>مواعيد مكتب الرياض: ${workingHours.label} · ${workingHours.closedLabel}</p></div>`;
        footer = /<div\b[^>]*class=["']footer-bottom["']/i.test(footer)
          ? footer.replace(/(?=<div\b[^>]*class=["']footer-bottom["'])/i, office)
          : footer.replace(/<\/footer>/i, `<div class="container">${office}</div></footer>`);
      }
    }
    return footer;
  });

  // The image alternative and the actual visible badges form the accessible
  // name together. A separate aria-label was overriding the visible label.
  html = html.replace(/<a\b[^>]*class=["'][^"']*\b(?:home-project-media|tawod-project-media)\b[^"']*["'][^>]*>/gi,
    tag => tag.replace(/\saria-label=(["'])[^"']*\1/i, ''));
  html = html.replace(/<a\b[^>]*class=["'][^"']*\blogo\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, anchor =>
    /<img\b[^>]*alt=["'][^"']+["']/i.test(anchor) ? anchor.replace(/\saria-label=(["'])[^"']*\1/i, '') : anchor);
  html = html.replace(/<a\b[^>]*class=["'][^"']*\blanguage-link\b[^"']*["'][^>]*>[\s\S]*?<\/a>/gi, anchor => {
    const label = attr(anchor, 'aria-label');
    const text = anchor.replace(/<[^>]*>/g, '').trim();
    return label && text === 'EN' && !/^EN\b/.test(label)
      ? anchor.replace(/aria-label=(["'])[^"']*\1/i, `aria-label="EN — ${label}"`) : anchor;
  });

  return applyContractingImagePresentation(relativePath, html);
}
