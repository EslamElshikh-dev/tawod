// Match the existing client-side article enhancement before first paint. The
// client keeps its fallback, but does not insert a second byline or caption.
const byline = '<div class="article-byline"><div class="article-byline-author"><span class="article-byline-logo"><img src="/images/logo/tawod-logo-180.webp" width="180" height="80" alt="شركة تعاود للمقاولات" loading="lazy" decoding="async" fetchpriority="low"></span><span class="article-byline-copy"><strong>إعداد فريق تعاود للمقاولات</strong><span>محتوى هندسي وتوعوي للمشاريع السكنية والتجارية</span></span></div><span class="article-byline-badge"><i class="fa-solid fa-circle-check"></i> محتوى مراجع</span></div>';

export function optimizeArticleMarkup(relativePath, html) {
  if (!/(?:^|\/)blog\/(?!page\/|topics\/)[^/]+\/index\.html$/.test(relativePath)) return html;
  let optimized = html.replace(/(<article\b[^>]*\bclass=(["']))([^"']*\barticle-content\b[^"']*)(\2[^>]*>)/i,
    (_, start, quote, classes, end) => `${start}${classes.split(/\s+/).filter(n => n && n !== 'reveal-up').join(' ')}${end}`);
  optimized = optimized.replace(/(<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>[\s\S]*?<img\b)([^>]*)(>)/i,
    (_, start, attributes, end) => `${start}${attributes.replace(/\s+(?:loading|fetchpriority|decoding)=["'][^"']*["']/gi, '')} loading="lazy" decoding="async" fetchpriority="low"${end}`);
  optimized = optimized.replace(/(<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>)\s*(<img\b[^>]*>)/i,
    (_, open, cover) => {
      const caption = (cover.match(/\balt=(["'])(.*?)\1/i)?.[2] || 'صورة توضيحية من مجال أعمال شركة تعاود للمقاولات').replace(/</g, '&lt;');
      return `${open}<figure class="article-cover-figure">${cover}<figcaption>${caption}</figcaption></figure>`;
    });
  if (!/class=["'][^"']*\barticle-byline\b/.test(optimized)) {
    optimized = optimized.replace(/<article\b[^>]*\bclass=["'][^"']*\barticle-content\b[^"']*["'][^>]*>/i, open => open + byline);
  }
  return optimized;
}
