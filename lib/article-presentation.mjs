// Match the existing client-side article enhancement before first paint. The
// client keeps its fallback, but does not insert a second byline or caption.
import { enhanceArticleReader } from './article-reader.mjs';
const byline = '<div class="article-byline"><div class="article-byline-author"><span class="article-byline-logo"><img src="/images/logo/tawod-logo-180.webp" width="180" height="80" alt="شركة تعاود للمقاولات" loading="lazy" decoding="async" fetchpriority="low"></span><span class="article-byline-copy"><strong>إعداد فريق تعاود للمقاولات</strong><span>محتوى هندسي وتوعوي للمشاريع السكنية والتجارية</span></span></div><span class="article-byline-badge"><i class="fa-solid fa-circle-check"></i> محتوى مراجع</span></div>';

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
const setAttr = (tag, name, value) => {
  const pattern = new RegExp(`\\s${name}=(["'])[^"']*\\1`, 'i');
  return pattern.test(tag) ? tag.replace(pattern, ` ${name}="${value}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${value}">`);
};

function prioritizeCover(html) {
  return html.replace(/(<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>)([\s\S]*?)(<\/article>)/i, (_, open, content, close) => {
    let found = false;
    const body = content.replace(/<img\b[^>]*>/gi, tag => {
      // Reapplying the transform must skip the author logo inserted earlier.
      if (found || /(?:^|\/)images\/(?:logo|icons)\//.test(attr(tag, 'src') || '')) return tag;
      found = true;
      tag = setAttr(setAttr(tag, 'loading', 'eager'), 'fetchpriority', 'high');
      tag = setAttr(tag, 'data-article-cover', 'true');
      const width = Number(attr(tag, 'width')), height = Number(attr(tag, 'height'));
      if (width > 0 && height > 0) {
        // Authored aspect-ratio:auto rules otherwise override the HTML size
        // hint. Reserve the real ratio even while no image bytes are present.
        const style = (attr(tag, 'style') || '').replace(/(?:^|;)\s*aspect-ratio\s*:[^;]+;?/gi, ';').replace(/^;+|;+$/g, '').trim();
        tag = setAttr(tag, 'style', `${style ? style + ';' : ''}aspect-ratio:auto ${width} / ${height} !important;`);
      }
      return tag;
    });
    return open + body + close;
  });
}

function normalizePortraitShare(html) {
  const width = Number(html.match(/<meta\b(?=[^>]*property=["']og:image:width["'])[^>]*content=["'](\d+)/i)?.[1]);
  const height = Number(html.match(/<meta\b(?=[^>]*property=["']og:image:height["'])[^>]*content=["'](\d+)/i)?.[1]);
  if (!(width > 0 && height > width)) return html;
  const values = {
    'og:image': 'https://tawodco.com/images/social/tawod-og-1200x630.png',
    'twitter:image': 'https://tawodco.com/images/social/tawod-og-1200x630.png',
    'og:image:width': '1200', 'og:image:height': '630',
    'og:image:alt': 'شركة تعاود للمقاولات العامة بالرياض: بناء وتشطيب وترميم وتسليم مفتاح',
    'twitter:image:alt': 'شركة تعاود للمقاولات العامة بالرياض: بناء وتشطيب وترميم وتسليم مفتاح',
  };
  return html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, head => head.replace(/<meta\b[^>]*>/gi, tag => {
    const key = attr(tag, 'property') || attr(tag, 'name');
    return values[key] ? setAttr(tag, 'content', values[key]) : tag;
  }));
}

export function optimizeArticleMarkup(relativePath, html) {
  if (!/(?:^|\/)blog\/(?!page\/|topics\/)[^/]+\/index\.html$/.test(relativePath)) return html;
  if (html.includes('data-reader-template="2026-10"')) return html;
  let optimized = html.replace(/(<article\b[^>]*\bclass=(["']))([^"']*\barticle-content\b[^"']*)(\2[^>]*>)/i,
    (_, start, quote, classes, end) => `${start}${classes.split(/\s+/).filter(n => n && n !== 'reveal-up').join(' ')}${end}`);
  optimized = prioritizeCover(optimized);
  optimized = optimized.replace(/(<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>)\s*(<img\b[^>]*>)/i,
    (_, open, cover) => {
      const caption = (cover.match(/\balt=(["'])(.*?)\1/i)?.[2] || 'صورة توضيحية من مجال أعمال شركة تعاود للمقاولات').replace(/</g, '&lt;');
      if (/\btawod-field-cover\b/.test(cover)) {
        const photoCaption = (cover.match(/\bdata-photo-caption=(["'])(.*?)\1/i)?.[2] || caption).replace(/</g, '&lt;');
        const source = cover.match(/\bsrc=(["'])(.*?)\1/i)?.[2];
        return `${open}<figure class="article-cover-figure tawod-field-photo"><a href="${source}" target="_blank" rel="noopener" aria-label="عرض الصورة بحجمها الكامل">${cover}</a><figcaption>${photoCaption}</figcaption></figure>`;
      }
      return `${open}<figure class="article-cover-figure">${cover}<figcaption>${caption}</figcaption></figure>`;
    });
  if (!/class=["'][^"']*\barticle-byline\b/.test(optimized)) {
    const fieldByline = byline.replace('إعداد فريق تعاود للمقاولات', 'شركة تعاود للمقاولات العامة').replace('محتوى هندسي وتوعوي للمشاريع السكنية والتجارية', 'محتوى إرشادي للمشاريع السكنية والتجارية').replace('محتوى مراجع', 'دليل عملي للمالك');
    const selectedByline = /\btawod-field-article\b/.test(optimized) ? fieldByline : byline;
    optimized = optimized.replace(/<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>/i, open => open + selectedByline);
  }
  return enhanceArticleReader(relativePath, normalizePortraitShare(optimized));
}
