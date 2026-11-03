const asciiWhitespace = /[\t\n\f\r ]/;

// Follow the URL/descriptor tokenization in the HTML srcset algorithm. Commas
// inside a URL (including data: payloads) are not candidate separators.
// https://html.spec.whatwg.org/multipage/images.html#parse-a-srcset-attribute
export function srcsetUrls(input) {
  const urls = [];
  let position = 0;
  while (position < input.length) {
    while (position < input.length && /[\t\n\f\r ,]/.test(input[position])) position++;
    const start = position;
    while (position < input.length && !asciiWhitespace.test(input[position])) position++;
    const token = input.slice(start, position);
    if (!token) break;
    const url = token.replace(/,+$/, '');
    if (url) urls.push(url);
    if (token.endsWith(',')) continue;

    // Descriptors may contain parentheses; only an outside comma ends them.
    let inParens = false;
    while (position < input.length) {
      const character = input[position++];
      if (character === '(') inParens = true;
      else if (character === ')') inParens = false;
      else if (character === ',' && !inParens) break;
    }
  }
  return urls;
}

function decodeAttribute(value) {
  const named = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>' };
  return value.replace(/&(?:#(x[\da-f]+|\d+)|(amp|quot|apos|lt|gt));/gi, (entity, numeric, name) => {
    if (name) return named[name.toLowerCase()];
    const code = parseInt(numeric.replace(/^x/i, ''), /^x/i.test(numeric) ? 16 : 10);
    return code > 0 && code <= 0x10ffff && !(code >= 0xd800 && code <= 0xdfff)
      ? String.fromCodePoint(code) : '\ufffd';
  });
}

export function htmlReferences(html) {
  const references = [];
  const tags = /<!--[\s\S]*?(?:-->|$)|<([a-z][\w:-]*)\b((?:[^<>"']|"[^"]*"|'[^']*')*)>/gi;
  const supported = new Set(['a', 'link', 'script', 'img', 'source', 'iframe']);
  for (let match; (match = tags.exec(html));) {
    const tag = match[1]?.toLowerCase();
    if (supported.has(tag)) {
      const seen = new Set();
      const attributes = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      for (const attribute of match[2].matchAll(attributes)) {
        const name = attribute[1].toLowerCase();
        if (seen.has(name)) continue;
        seen.add(name);
        if (!['href', 'src', 'srcset', 'imagesrcset'].includes(name)) continue;
        const value = decodeAttribute(attribute[2] ?? attribute[3] ?? attribute[4] ?? '').trim();
        if (!value) continue;
        references.push(...(name.endsWith('srcset') ? srcsetUrls(value) : [value]));
      }
    }
    // Markup-looking text in comments and raw-text elements is not a resource.
    if (['script', 'style', 'textarea', 'title'].includes(tag)) {
      const end = new RegExp(`</${tag}\\s*>`, 'gi');
      end.lastIndex = tags.lastIndex;
      tags.lastIndex = end.exec(html) ? end.lastIndex : html.length;
    }
  }
  return references;
}

function schemaObjects(value) {
  if (!value || typeof value !== 'object') return [];
  return [value, ...Object.values(value).flatMap(schemaObjects)];
}

export function homepageSchemaErrors(schemas) {
  const objects = schemas.flatMap(schemaObjects);
  const company = objects.find(node => node['@id'] === 'https://tawodco.com/#organization'
    && [node['@type']].flat().includes('GeneralContractor'));
  const errors = [];
  if (!company) errors.push('index.html entity graph missing GeneralContractor organization');
  if (!company || ![company.identifier].flat().some(identifier => identifier?.value === '7033495099')) {
    errors.push('index.html organization missing identifier 7033495099');
  }
  if (!company?.hasOfferCatalog || typeof company.hasOfferCatalog !== 'object') {
    errors.push('index.html organization missing hasOfferCatalog');
  }
  if (objects.some(node => node['@id'] === 'https://tawodco.com/#localbusiness')) {
    errors.push('index.html entity graph still contains #localbusiness');
  }
  if (objects.some(node => Object.hasOwn(node, 'priceRange'))) {
    errors.push('index.html entity graph still contains priceRange');
  }
  return errors;
}
