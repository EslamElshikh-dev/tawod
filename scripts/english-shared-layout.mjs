import fs from 'node:fs';
import * as solid from '@fortawesome/free-solid-svg-icons';
import * as regular from '@fortawesome/free-regular-svg-icons';
import * as brands from '@fortawesome/free-brands-svg-icons';

const translations = JSON.parse(fs.readFileSync(new URL('./english-home-translations.json', import.meta.url), 'utf8'));
const arabic = /[\u0600-\u06ff]/;
const decode = text => text.replace(/&(?:amp|quot|apos|lt|gt|nbsp|copy|#\d+|#x[\da-f]+);/gi, entity => {
  const named = { '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&nbsp;': '\u00a0', '&copy;': '©' };
  return named[entity.toLowerCase()] ?? String.fromCodePoint(parseInt(entity.slice(2, -1).replace(/^x/i, ''), /^&#x/i.test(entity) ? 16 : 10));
});
const escape = text => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const icons = new Map();
for (const [style, module] of [['solid', solid], ['regular', regular], ['brands', brands]]) for (const icon of Object.values(module)) {
  if (!icon?.icon) continue;
  for (const name of [icon.iconName, ...icon.icon[2].filter(a => typeof a === 'string')]) icons.set(`${style}-${name}`, icon);
}
export function englishIcon(name, style = 'solid') {
  const icon = icons.get(`${style}-${name}`);
  if (!icon) throw new Error(`Missing English layout icon: ${style}-${name}`);
  const [width, height, , , paths] = icon.icon;
  return `<svg class="icon-svg" viewBox="0 0 ${width} ${height}" aria-hidden="true" focusable="false">${(Array.isArray(paths) ? paths : [paths]).map(d => `<path d="${d}"/>`).join('')}</svg>`;
}
function translate(text) {
  const value = decode(text).trim();
  if (!arabic.test(value)) return text;
  if (!translations[value]) throw new Error(`English translation required: ${value}`);
  return text.replace(/\S[\s\S]*\S|\S/, escape(translations[value]));
}
export function localizeArabicMarkup(markup, routes) {
  let skip = false;
  let output = markup.replace(/<!--[\s\S]*?-->|<[^>]*>|[^<]+/g, token => {
    if (/^<!--/.test(token)) return token;
    if (/^<(?:script|style)\b/i.test(token)) skip = true;
    if (/^<\/(?:script|style)\b/i.test(token)) { skip = false; return token; }
    if (skip) return token;
    if (!token.startsWith('<')) return translate(token);
    let tag = token.replace(/\b(alt|aria-label|placeholder|title)=(["'])([^"']*)\2/gi, (_, name, quote, text) => `${name}=${quote}${translate(text)}${quote}`);
    tag = tag.replace(/\b(src|href|srcset)=(["'])([^"']*)\2/gi, (_, name, quote, value) => {
      if (name.toLowerCase() === 'href') {
        if (/^https:\/\/wa\.me\//.test(value)) value = 'https://wa.me/966551128884?text=' + encodeURIComponent('Hello Tawod, I would like to discuss a project. Project type: … Location: … Area: … Current stage: …');
        else if (value.startsWith('#')) value = `/en/${value}`;
        else if (!/^(?:https?:|mailto:|tel:|\/\/)/.test(value)) {
          const local = '/' + value.replace(/^\//, '');
          value = routes.get(local) ?? (local === '/index.html' ? '/en/' : local);
        }
      } else value = value.replace(/(^|,\s*)(images\/)/g, '$1/$2');
      return `${name}=${quote}${value}${quote}`;
    });
    if (/^<a\b/.test(tag) && /href=["']\/(?:blog\/|privacy-policy\.html)/.test(tag)) tag = tag.replace(/>$/, ' lang="ar">');
    return tag;
  });
  output = output.replace(/<i\b[^>]*class=(["'])([^"']*\bfa-[^"']*)\1[^>]*>[\s\S]*?<\/i>/gi, (_, q, classes) => {
    const style = classes.includes('fa-brands') ? 'brands' : classes.includes('fa-regular') ? 'regular' : 'solid';
    const name = classes.split(/\s+/).find(c => /^fa-/.test(c) && !['fa-solid', 'fa-regular', 'fa-brands', 'fa-fw'].includes(c));
    return `<i class="${classes}" aria-hidden="true">${englishIcon(name.slice(3), style)}</i>`;
  });
  return output;
}
export function englishMainFromArabic(file, routes) {
  const source = fs.readFileSync(file, 'utf8');
  let main = localizeArabicMarkup(source.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)[1], routes);
  main = main.replace(/<form\b[^>]*>/gi, tag => tag.replace(/\sdata-analytics-form=["'][^"']*["']/i, '').replace(/>$/, ' lang="en" data-analytics-form="en_home_quote_request"><input name="request_language" type="hidden" value="English">'))
    .replace(/(<input\b(?=[^>]*\bname=["']_next["'])[^>]*\bvalue=)["'][^"']*["']/gi, '$1"https://tawodco.com/en/thank-you.html"')
    .replace(/(<input\b(?=[^>]*\bname=["']_subject["'])[^>]*\bvalue=)["'][^"']*["']/gi, '$1"New English project request — Tawod"');
  if (file === 'index.html') main = main.replace(/<section\b[^>]*class=["']hero["'][^>]*>[\s\S]*?<\/section>/i, section => {
    const open = section.match(/^<section\b[^>]*>/)[0];
    const content = section.slice(open.length).replace(/<\/section>$/, '').replace(/class=(["'])container hero-content([^"']*)\1/, 'class="hero-content$2"');
    return `${open}<div class="container contracting-hero-grid">${content}</div></section>`;
  }).replace('General contracting in Riyadh</span>', 'General contracting in <span class="contracting-city">Riyadh</span></span>');
  return main;
}
export function englishSharedFooter(routes, office) {
  const source = fs.readFileSync('index.html', 'utf8').match(/<footer\b[\s\S]*?<\/footer>/i)[0];
  return localizeArabicMarkup(source, routes).replace(/(<h4\b[^>]*class=["'][^"']*footer-title[^"']*["'][^>]*>[\s\S]*?<\/h4>)\s*(<ul\b[^>]*class=["'][^"']*footer-links[^"']*["'][^>]*>[\s\S]*?<\/ul>)/gi, '<details class="contracting-footer-group" open><summary>$1</summary>$2</details>')
    .replace(/(<div\b[^>]*class=["']footer-bottom["'][^>]*>)/i, `<div class="contracting-office-details"><p>Riyadh office: <a href="${office.mapsUrl}" target="_blank" rel="noopener noreferrer">4206 Uthman Bin Affan Branch Road, Al Wadi, Riyadh 13313, Saudi Arabia</a></p><p>Saturday–Thursday, 7:00 am–10:00 pm. Friday closed.</p></div>$1`);
}
export function englishSharedStyle(ar) {
  const file = 'lib/contracting-design-assets.mjs';
  if (!fs.existsSync(file) || ar === '/') return '/assets/css/tawod-home-performance.css';
  const styles = JSON.parse(fs.readFileSync(file, 'utf8').match(/export const pageStyles=([^;]+);/)[1]);
  const source = ar?.endsWith('/') ? `${ar.slice(1)}index.html` : ar?.slice(1);
  return styles[source] ?? '/assets/css/tawod-home-performance.css';
}
export const englishFloatingContact = () => `<div class="float-btns"><a class="float-btn float-whatsapp" href="https://wa.me/966551128884" aria-label="WhatsApp"><i aria-hidden="true">${englishIcon('whatsapp', 'brands')}</i></a><a class="float-btn float-call" href="tel:0551128884" aria-label="Call Tawod"><i aria-hidden="true">${englishIcon('phone')}</i></a></div>`;
export function englishProjectShowcase(routes) {
  const source = fs.readFileSync('lib/legacy-pages.ts', 'utf8').match(/const projectsShowcaseMarkup = `([\s\S]*?)`;/)[1];
  return localizeArabicMarkup(source, routes);
}
export function englishInnerTrust(routes) {
  const source = fs.readFileSync('about.html', 'utf8').match(/<section\b[^>]*class=["'][^"']*tawod-inner-trust[^"']*["'][^>]*>[\s\S]*?<\/section>/)[0];
  return localizeArabicMarkup(source, routes);
}
export function englishFaqSchema(markup, url) {
  const plain = text => decode(text.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();
  const questions = [...markup.matchAll(/<button\b(?=[^>]*\bclass=["'][^"']*\bfaq-question\b)[^>]*>([\s\S]*?)<\/button>\s*<div\b(?=[^>]*\bclass=["'][^"']*\bfaq-answer\b)[^>]*>([\s\S]*?)<\/div>/gi)];
  return questions.length ? { '@type': 'FAQPage', '@id': `${url}#faq`, inLanguage: 'en-SA', mainEntity: questions.map(match => ({ '@type': 'Question', name: plain(match[1]), acceptedAnswer: { '@type': 'Answer', text: plain(match[2]) } })) } : null;
}
