import { transform } from 'lightningcss';

export function cssVocabulary(html, interactionCode = '') {
  const markup = html.replace(/<style\b[\s\S]*?<\/style>/gi,'').replace(/<script\b[\s\S]*?<\/script>/gi,'');
  return new Set((markup+'\n'+interactionCode).match(/[a-zA-Z][a-zA-Z0-9_-]*/g)||[]);
}

// Keep existing component geometry and interaction states, replacing their
// visual rules with the shared design. Unknown nested selectors are retained.
export function compileContractingCss(source, vocabulary, filename, layoutOnly = false) {
  return transform({filename,code:Buffer.from(source),minify:true,visitor:{
    Declaration(declaration) {
      if (layoutOnly && /^(?:background(?:-|$)|border(?:-|$)|color$|font(?:-|$)|box-shadow$|text-shadow$|filter$|backdrop-filter$|letter-spacing$)/.test(declaration.property)) return [];
    },
    Rule:{
      'font-face'() { if(layoutOnly) return []; },
      style(rule) {
        if(!rule.value.selectors.some(s=>s.every(p=>!['class','id'].includes(p.type)||vocabulary.has(p.name)))) return [];
        // Retained native nodes stay untouched, avoiding shorthand round-trips.
      }
    }
  }}).code;
}
