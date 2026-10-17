import { nativePhotos } from './contracting-image-assets.mjs';

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
const escape = value => String(value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const text = html => html.replace(/<[^>]*>/g, '').trim();
const local = src => (src || '').replace(/^\//, '').replace(/^(?:\.\.\/)+/, '').split('?')[0];
const hasClass = (tag, name) => (attr(tag, 'class') || '').split(/\s+/).includes(name);
const addClass = (tag, name) => /\bclass=["']/.test(tag) ? tag.replace(/\bclass=(["'])([^"']*)\1/, (_, q, c) => `class=${q}${c} ${name}${q}`) : tag.replace(/>$/, ` class="${name}">`);
const setAttr = (tag, name, value) => {
  const re = new RegExp(`\\s${name}=(["'])[^"']*\\1`, 'i');
  return re.test(tag) ? tag.replace(re, ` ${name}="${escape(value)}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${escape(value)}">`);
};

// Match complete nested elements, rather than stopping at the first inner div.
function elementEnd(html, start) {
  const tag = html.slice(start).match(/^<([a-z][\w-]*)\b/i)?.[1];
  if (!tag) return start;
  const re = new RegExp(`<\\/?${tag}\\b[^>]*>`, 'gi');
  re.lastIndex = start;
  let depth = 0, match;
  while ((match = re.exec(html))) {
    if (match[0].startsWith('</')) depth--;
    else if (!match[0].endsWith('/>')) depth++;
    if (!depth) return re.lastIndex;
  }
  return html.length;
}
function replaceElements(html, matches, render) {
  let cursor = 0, output = '', match;
  const re = /<[a-z][\w-]*\b[^>]*>/gi;
  while ((match = re.exec(html))) {
    if (!matches(match[0])) continue;
    const end = elementEnd(html, match.index);
    output += html.slice(cursor, match.index) + render(html.slice(match.index, end), match[0]);
    cursor = end;
    re.lastIndex = end;
  }
  return output + html.slice(cursor);
}

// Replace small-text social posters with existing photographs suited to their
// subjects. These assets already ship on the site; no new image payloads.
const replacements = [
  [/tawod-gbp-before-turnkey-|turnkey-project-readiness-riyadh/, '/images/projects/project-luxury-villa-turnkey-alqusur.webp', 'واجهة فيلا سكنية مكتملة، مثال بصري على مرحلة تسليم المشروع.'],
  [/tawod-gbp-floor-alignment-|interior-design-execution-riyadh|villa-finishing-coordination-riyadh/, '/images/projects/interior-01.webp', 'مساحة داخلية في مرحلة التشطيب، مع أعمال الأسقف والأرضيات والإضاءة.'],
  [/tawod-gbp-facade-details-|tawod-gbp-renewed-home-/, '/images/projects/project-villa-facade-marble-ceramic-manar.webp', 'تفاصيل واجهة فيلا سكنية وخامات التشطيب الخارجي.'],
  [/tawod-gbp-before-closure-|mep-wall-closure-riyadh/, '/images/blog/mechanical-mep-works-riyadh.webp', 'تنسيق تمديدات الخدمات فوق السقف ضمن أعمال التجهيز الداخلي.'],
];
function selectedMedia(path, image) {
  if (/turnkey-commercial-fitout-riyadh/.test(path)) return { src: '/images/projects/interior-01.webp', caption: 'مساحة داخلية في مرحلة التشطيب، لتوضيح تنسيق الأسقف والإضاءة والخدمات قبل التجهيز النهائي.' };
  const match = replacements.find(([pattern]) => pattern.test(local(attr(image, 'src'))));
  return match ? { src: match[1], caption: match[2] } : null;
}

function prepareCover(path, content) {
  const found = [...content.matchAll(/<img\b[^>]*>/gi)].find(m => !/images\/(?:logo|icons)\//.test(attr(m[0], 'src') || ''));
  if (!found) return { content, media: null };
  let image = found[0];
  const selected = selectedMedia(path, image);
  if (selected) {
    image = setAttr(setAttr(image, 'src', selected.src), 'alt', selected.caption)
      .replace(/\s(?:srcset|sizes)=["'][^"']*["']/gi, '');
  }
  const dimensions = nativePhotos[local(attr(image, 'src'))] || { width: Number(attr(image, 'width')), height: Number(attr(image, 'height')) };
  if (dimensions.width && dimensions.height) {
    image = setAttr(setAttr(image, 'width', dimensions.width), 'height', dimensions.height);
    const style = (attr(image, 'style') || '').replace(/(?:^|;)\s*aspect-ratio\s*:[^;]+;?/gi, ';').replace(/^;+|;+$/g, '');
    image = setAttr(image, 'style', `${style ? style + ';' : ''}aspect-ratio:auto ${dimensions.width} / ${dimensions.height} !important;`);
  }
  image = setAttr(setAttr(setAttr(image, 'loading', 'eager'), 'fetchpriority', 'high'), 'data-article-cover', 'true');
  let start = found.index, end = found.index + found[0].length;
  const figureStart = content.lastIndexOf('<figure', start);
  let caption = attr(image, 'data-photo-caption') || attr(image, 'alt') || 'صورة توضيحية لموضوع المقال';
  let open = '<figure class="article-cover-figure reader-cover">';
  let link = '';
  if (figureStart >= 0 && elementEnd(content, figureStart) > end) {
    start = figureStart;
    end = elementEnd(content, start);
    const old = content.slice(start, end);
    open = old.match(/^<[^>]+>/)[0];
    open = addClass(open, 'reader-cover');
    caption = old.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1] || caption;
    // Retain the original project link and caption when the photograph stays.
    link = old.match(/<a\b[^>]*>[\s\S]*?<img\b/i)?.[0].match(/^<a\b[^>]*>/i)?.[0] || '';
  }
  if (selected) caption = escape(selected.caption);
  const href = attr(image, 'src');
  link = link ? setAttr(link, 'href', href) : `<a href="${escape(href)}" target="_blank" rel="noopener" aria-label="عرض صورة المقال بحجمها الأصلي">`;
  if (selected) link = setAttr(link, 'aria-label', 'عرض صورة المقال بحجمها الأصلي');
  open = setAttr(open, 'data-cover-shape', dimensions.height > dimensions.width ? 'portrait' : 'landscape');
  const figure = `${open}${link}${image}</a><figcaption><span class="reader-photo-label">صورة المقال</span><div>${caption}</div></figcaption></figure>`;
  return { content: content.slice(0, start) + figure + content.slice(end), media: selected ? { ...selected, ...dimensions } : null };
}

function nativeFaq(html) {
  return replaceElements(html, tag => hasClass(tag, 'faq-item') || hasClass(tag, 'seo-faq-item'), (block, tag) => {
    if (hasClass(tag, 'seo-faq-item')) {
      const question = block.match(/<h3\b[^>]*>([\s\S]*?)<\/h3>/i);
      if (!question) return block;
      const answer = block.slice(block.indexOf(question[0]) + question[0].length).replace(/<\/div>\s*$/, '');
      return `<details class="reader-faq"><summary>${question[1]}<span class="reader-faq-icon" aria-hidden="true"></span></summary><div class="reader-faq-answer">${answer}</div></details>`;
    }
    const question = block.match(/<button\b[^>]*class=["'][^"']*\bfaq-question\b[^"']*["'][^>]*>([\s\S]*?)<\/button>/i);
    const answerStart = block.search(/<div\b[^>]*class=["'][^"']*\bfaq-answer\b/i);
    if (!question || answerStart < 0) return block;
    const answer = block.slice(answerStart, elementEnd(block, answerStart));
    const answerOpen = answer.match(/^<[^>]+>/)[0];
    const answerBody = answer.slice(answerOpen.length).replace(/<\/div>$/, '');
    const label = question[1].replace(/<i\b[\s\S]*?<\/i>/gi, '').replace(/<svg\b[\s\S]*?<\/svg>/gi, '').trim();
    return `<details class="reader-faq"><summary>${label}<span class="reader-faq-icon" aria-hidden="true"></span></summary><div class="reader-faq-answer"${attr(answerOpen, 'id') ? ` id="${escape(attr(answerOpen, 'id'))}"` : ''}>${answerBody}</div></details>`;
  });
}

const services = [
  ['construction', 'البناء والإنشاءات', 'الهياكل والأعمال الإنشائية'],
  ['turnkey', 'تسليم مفتاح', 'من التخطيط حتى التسليم'],
  ['restoration', 'الترميم والتجديد', 'معالجة المباني ورفع كفاءتها'],
  ['finishing', 'التشطيبات العامة', 'تشطيبات داخلية وخارجية'],
  ['decor', 'الديكور والتصميم الداخلي', 'تصميم وتنفيذ المساحات'],
  ['mep', 'الكهرباء والسباكة', 'حلول فنية متكاملة'],
];
function nativeServices(html) {
  const links = services.map(([slug, label, detail]) => `<a href="/service-${slug}.html"><strong>${label}</strong><small>${detail}</small></a>`).join('');
  const isServices = tag => /(?:index\.html|\/)#services["']/.test(tag);
  html = html.replace(/<header\b[\s\S]*?<\/header>/i, header => replaceElements(header, tag => /^<li\b/.test(tag), block => {
    const link = block.match(/<a\b[^>]*>[\s\S]*?<\/a>/i)?.[0];
    if (!link || !isServices(link)) return block;
    return `<li class="reader-services-item">${link}<details class="reader-services"><summary aria-label="عرض قائمة الخدمات"><span class="reader-faq-icon" aria-hidden="true"></span></summary><div class="reader-services-list" aria-label="خدمات تعاود">${links}</div></details></li>`;
  }));
  return html.replace(/<nav\b(?=[^>]*class=["']sidebar-nav["'])[^>]*>[\s\S]*?<\/nav>/i, nav => nav.replace(/<a\b[^>]*>[\s\S]*?<\/a>/gi, link => isServices(link) ? `<details class="reader-services-mobile"><summary>خدماتنا<span class="reader-faq-icon" aria-hidden="true"></span></summary><div>${links}${link.replace(/>[^<]*<\/a>$/, '>جميع الخدمات</a>')}</div></details>` : link));
}

export function enhanceArticleReader(path, html) {
  if (html.includes('data-reader-template="2026-10"')) return html;
  const article = html.match(/<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>/i);
  if (!article) return html;
  const start = article.index, end = elementEnd(html, start);
  let content = html.slice(start + article[0].length, end).replace(/<\/article>$/, '');
  // Some legacy pages prepend an outline-based summary to authored advice.
  const generatedSummary = /<!-- TAWOD_STATIC_TAKEAWAYS_START -->[\s\S]*?<!-- TAWOD_STATIC_TAKEAWAYS_END -->/g;
  const withoutGenerated = content.replace(generatedSummary, '');
  if (/\btawod-key-takeaways\b/.test(withoutGenerated)) content = withoutGenerated;
  content = replaceElements(content, tag => hasClass(tag, 'article-byline') || hasClass(tag, 'decision-publisher'), () => '');
  const cover = prepareCover(path, content);
  content = cover.content;
  if (cover.media) content = replaceElements(content, tag => hasClass(tag, 'tawod-campaign-caption'), () => '');
  content = content.replace(/<div\b[^>]*>/gi, tag => hasClass(tag, 'decision-table') || hasClass(tag, 'tawod-table-scroll') ? tag.replace(/\s(?:tabindex|role|aria-label)=["'][^"']*["']/gi, '') : tag);
  // One publisher line, rendered before scripts and shared by every template.
  const publisher = '<div class="article-byline"><span class="reader-brand"><img src="/images/logo/tawod-logo-180.webp" width="180" height="80" loading="lazy" decoding="async" alt="شركة تعاود للمقاولات"></span><span class="article-byline-copy"><strong>إعداد فريق تعاود للمقاولات</strong><span>أدلة عملية للبناء والتشطيب · <a href="/editorial-policy/">السياسة التحريرية</a></span></span></div>';
  // Native disclosure keeps the full table of contents available without JS.
  let toc = '';
  content = replaceElements(content, tag => hasClass(tag, 'tawod-article-toc') || hasClass(tag, 'article-toc'), block => {
    const list = block.match(/<ol\b[^>]*>[\s\S]*?<\/ol>/i)?.[0] || block.match(/<ul\b[^>]*>[\s\S]*?<\/ul>/i)?.[0];
    if (!toc && list) toc = `<details class="reader-toc"><summary><span>محتويات المقال</span><span class="reader-toc-hint">انتقل إلى ما يهمك</span><span class="reader-faq-icon" aria-hidden="true"></span></summary>${list}</details>`;
    return '';
  });
  if (!toc) {
    let n = 0;
    const headings = [];
    content = content.replace(/<h2\b([^>]*)>([\s\S]*?)<\/h2>/gi, (all, attrs, label) => {
      const id = attr(`<h2${attrs}>`, 'id') || `reader-section-${++n}`;
      if (headings.length < 12) headings.push(`<li><a href="#${escape(id)}">${label}</a></li>`);
      return `<h2${attrs}${/\bid=["']/.test(attrs) ? '' : ` id="${id}"`}>${label}</h2>`;
    });
    if (headings.length) toc = `<details class="reader-toc"><summary><span>محتويات المقال</span><span class="reader-toc-hint">انتقل إلى ما يهمك</span><span class="reader-faq-icon" aria-hidden="true"></span></summary><ol>${headings.join('')}</ol></details>`;
  }
  const coverEnd = content.indexOf('</figure>');
  if (coverEnd >= 0) content = content.slice(0, coverEnd + 9) + toc + content.slice(coverEnd + 9);
  else content = toc + content;
  content = content.replace(/<table\b[\s\S]*?<\/table>/gi, table => {
    const label = text(table.match(/<caption\b[^>]*>([\s\S]*?)<\/caption>/i)?.[1] || 'جدول توضيحي: مرر أفقيًا لقراءة جميع الأعمدة');
    return `<div class="reader-table" tabindex="0" role="region" aria-label="${escape(label)}">${table}</div>`;
  });
  content = replaceElements(content, tag => hasClass(tag, 'seo-inline-cta'), block => block.replace(/<a\b[^>]*>/gi, tag => hasClass(tag, 'btn') ? tag : addClass(addClass(tag, 'btn'), /wa\.me/.test(attr(tag, 'href') || '') ? 'btn-whatsapp' : 'btn-primary')));
  // All article images have explicit sizes and defer only below-the-cover media.
  content = content.replace(/<img\b[^>]*>/gi, image => {
    if (attr(image, 'data-article-cover') === 'true') return image;
    const dims = nativePhotos[local(attr(image, 'src'))];
    if (dims) image = setAttr(setAttr(image, 'width', dims.width), 'height', dims.height);
    return setAttr(setAttr(image, 'loading', 'lazy'), 'decoding', 'async');
  });
  const articleId = attr(article[0], 'id') || 'reader-article';
  html = html.slice(0, start) + setAttr(setAttr(setAttr(article[0], 'data-reader-template', '2026-10'), 'id', articleId), 'tabindex', '-1') + publisher + content + '</article>' + html.slice(end);
  html = nativeFaq(html);
  html = html.replace(/<body\b[^>]*>/i, tag => addClass(addClass(tag, 'tawod-reader'), 'tawod-article-page'));
  html = html.replace(/(<body\b[^>]*>)/i, `$1<a class="reader-skip" href="#${escape(articleId)}">تخطَّ إلى المقال</a>`);
  html = nativeServices(html);
  // Existing sources provide share controls on most pages. Add the same useful
  // controls to the decision guides, preserving their original contact CTAs.
  if (!/\bdata-share-article(?:\s|>)/.test(html)) {
    html = html.replace(/<\/article>/i, '<div class="tawod-article-tools"><strong>احتفظ بالدليل أو شاركه</strong><div><button type="button" data-share-article>مشاركة الرابط</button><button type="button" data-print-article>طباعة الدليل</button><a href="https://wa.me/" data-whatsapp-share target="_blank" rel="noopener">مشاركة عبر واتساب</a></div></div></article>');
  }
  // Share URLs also work without JavaScript, including city-specific articles.
  const canonical = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)/i)?.[1];
  const title = text(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || 'دليل تعاود');
  if (canonical) html = html.replace(/<a\b(?=[^>]*\bdata-whatsapp-share\b)[^>]*>/gi, tag => setAttr(tag, 'href', `https://wa.me/?text=${encodeURIComponent(title + ' ' + canonical)}`));
  html = replaceElements(html, tag => hasClass(tag, 'tawod-article-tools'), block => block.replace(/<\/div>$/, `<div class="reader-share-link" data-share-fallback hidden><label>رابط المقال<input value="${escape(canonical || '')}" readonly dir="ltr" aria-label="رابط المقال للمشاركة"></label></div><p class="reader-share-status" data-share-status role="status" aria-live="polite"></p></div>`));
  if (cover.media) {
    html = html.replace(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi, (all, raw) => {
      const data = JSON.parse(raw);
      let changed = false;
      const walk = node => {
        if (!node || typeof node !== 'object') return;
        if (node['@type'] === 'Article') {
          node.image = { '@type': 'ImageObject', url: 'https://tawodco.com' + cover.media.src, width: cover.media.width, height: cover.media.height, caption: cover.media.caption };
          changed = true;
        }
        Object.values(node).forEach(value => Array.isArray(value) ? value.forEach(walk) : walk(value));
      };
      walk(data);
      return changed ? all.replace(raw, JSON.stringify(data).replace(/</g, '\\u003c')) : all;
    });
  }
  return html;
}
