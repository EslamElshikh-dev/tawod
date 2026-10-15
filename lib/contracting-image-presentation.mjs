import { responsiveImages, nativePhotos, logoProfiles } from './contracting-image-assets.mjs';

const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
const setAttr = (tag, name, value) => {
  const pattern = new RegExp(`\\s${name}=(["'])[^"']*\\1`, 'i');
  return pattern.test(tag) ? tag.replace(pattern, ` ${name}="${value}"`) : tag.replace(/\s*\/?>$/, ` ${name}="${value}">`);
};

export function applyContractingImagePresentation(relativePath, html) {
  if (relativePath.startsWith('maintenance/') || ['admin.html', '404.html'].includes(relativePath)) return html;
  return html.replace(/<img\b[^>]*>/gi, (tag, offset) => {
    const src = (attr(tag, 'src') || '').replace(/^\//, '').replace(/^(?:\.\.\/)+/, '').split('?')[0];
    if (/^images\/logo\/tawod-logo(?:\.png|-180\.webp)$/.test(src)) {
      tag = setAttr(tag, 'srcset', logoProfiles.map(p => `${p.url} ${p.width}w`).join(', '));
      const publisherLogo = /reader-brand/.test(html.slice(Math.max(0, offset - 180), offset));
      return setAttr(tag, 'sizes', publisherLogo ? '(max-width: 767px) 49px, 62px' : '(max-width: 767px) 122px, 132px');
    }
    const dimensions = nativePhotos[src];
    if (!dimensions) return tag;
    tag = setAttr(setAttr(tag, 'width', dimensions.width), 'height', dimensions.height);
    if (attr(tag, 'data-article-cover') === 'true') {
      const style = (attr(tag, 'style') || '').replace(/(?:^|;)\s*aspect-ratio\s*:[^;]+;?/gi, ';').replace(/^;+|;+$/g, '').trim();
      tag = setAttr(tag, 'style', `${style ? style + ';' : ''}aspect-ratio:auto ${dimensions.width} / ${dimensions.height} !important;`);
    }
    const profile = responsiveImages[src];
    if (!profile) {
      // A small historical photograph stays at its actual resolution.
      const classes = (attr(tag, 'class') || '').split(/\s+/).filter(Boolean);
      if (!classes.includes('tawod-native-photo')) classes.push('tawod-native-photo');
      tag = setAttr(tag, 'class', classes.join(' '));
      const originalStyle = (attr(tag, 'style') || '').replace(/--photo-native-(?:width|ratio)\s*:[^;]+;?/g, '').trim().replace(/^;+|;+$/g, '');
      return setAttr(tag, 'style', `${originalStyle ? originalStyle + ';' : ''}--photo-native-width:${dimensions.width}px;--photo-native-ratio:${dimensions.width} / ${dimensions.height};`);
    }
    if (attr(tag, 'data-article-cover') === 'true' && html.includes('tawod-reader')) {
      const ratio = dimensions.width / dimensions.height;
      const sizes = ratio < 1
        ? `(max-width: 420px) ${Math.ceil(225 * ratio)}px, (max-width: 767px) ${Math.ceil(250 * ratio)}px, ${Math.ceil(312 * ratio)}px`
        : `(max-width: 767px) calc(100vw - 90px), ${Math.ceil(312 * ratio)}px`;
      return setAttr(setAttr(setAttr(tag, 'srcset', profile.map(p => `${p.url} ${p.width}w`).join(', ')), 'sizes', sizes), 'data-image-slot', 'article-cover');
    }
    const nearby = html.slice(Math.max(0, offset - 450), offset);
    const articleStart = html.lastIndexOf('<article', offset);
    const articleEnd = html.lastIndexOf('</article', offset);
    const articleOpen = articleStart > articleEnd ? html.slice(articleStart, Math.min(offset, articleStart + 400)) : '';
    const featuredProject = /\btawod-project-card-featured\b/.test(articleOpen);
    const projectCard = /home-project-media|tawod-project-media|en-project-card/.test(nearby);
    const card = projectCard || /article-thumb|card-img-wrap|card-media|en-service-card|blog-card/.test(nearby);
    // Include the source width needed for cover crops, then let the browser
    // choose the density appropriate for the actual screen.
    const previousSlot = attr(tag, 'data-image-slot');
    const campaignCard = (card || previousSlot === 'card') && /^images\/blog\/tawod-gbp-/.test(src);
    const slot = featuredProject ? 'featured-project' : campaignCard ? 'campaign-card' : previousSlot || (projectCard ? 'project-card' : card ? 'card' : 'content');
    const sizes = slot === 'featured-project'
      ? '(max-width: 767px) calc(100vw - 42px), (max-width: 1199px) 85vw, 860px'
      : slot === 'campaign-card'
        ? '(max-width: 767px) calc(100vw - 42px), (max-width: 1199px) 60vw, 620px'
      : slot === 'project-card'
      ? '(max-width: 767px) calc(100vw - 42px), (max-width: 1199px) 45vw, 440px'
      : slot === 'card'
        ? '(max-width: 767px) calc(100vw - 42px), (max-width: 1199px) 48vw, 480px'
        : '(max-width: 767px) calc(100vw - 42px), (max-width: 1199px) 75vw, 860px';
    return setAttr(setAttr(setAttr(tag, 'srcset', profile.map(p => `${p.url} ${p.width}w`).join(', ')), 'sizes', sizes), 'data-image-slot', slot);
  });
}
