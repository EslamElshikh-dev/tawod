import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const write = process.argv.includes("--write");
const domain = "https://tawodco.com";

export const queryOwnership = [
  { query: "مقاول عظم الرياض", intent: "commercial", file: "service-construction.html", url: "/service-construction.html", signal: "مقاول بناء عظم في الرياض" },
  { query: "اعمال mep", intent: "informational", file: "blog/mechanical-mep-works-riyadh/index.html", url: "/blog/mechanical-mep-works-riyadh/", signal: "ما هي أعمال MEP" },
  { query: "شركات مقاولات في الرياض", intent: "commercial", file: "index.html", url: "/", signal: "أفضل شركة مقاولات عامة في الرياض" },
  { query: "اختيار شركة مقاولات", intent: "informational", file: "blog/best-contracting-company-riyadh/index.html", url: "/blog/best-contracting-company-riyadh/", signal: "كيف تختار أفضل شركة مقاولات في الرياض" },
  { query: "تسليم مفتاح للمشاريع التجارية", intent: "commercial", file: "service-turnkey.html", url: "/service-turnkey.html", signal: "تسليم مفتاح للمشاريع السكنية والتجارية في الرياض" },
  { query: "ترميم مباني", intent: "commercial", file: "service-restoration.html", url: "/service-restoration.html", signal: "ترميم مباني في الرياض" },
  { query: "ترميمات الرياض", intent: "commercial", file: "service-restoration.html", url: "/service-restoration.html", signal: "ترميم مباني في الرياض" },
  { query: "مقاول mep", intent: "commercial", file: "service-mep.html", url: "/service-mep.html", signal: "مقاول MEP في الرياض" },
  { query: "تشطيب داخلي", intent: "commercial", file: "service-finishing.html", url: "/service-finishing.html", signal: "تشطيب داخلي وخارجي في الرياض" },
  { query: "أفضل شركة مقاولات بالرياض", intent: "commercial", file: "index.html", url: "/", signal: "أفضل شركة مقاولات عامة في الرياض" },
  { query: "عقد مقاولات تسليم مفتاح", intent: "informational", file: "blog/turnkey-contracts-riyadh/index.html", url: "/blog/turnkey-contracts-riyadh/", signal: "عقد مقاولات تسليم مفتاح في الرياض" },
  { query: "كود الدمام", intent: "informational", file: "dammam/blog/saudi-building-code-owner-guide-dammam/index.html", url: "/dammam/blog/saudi-building-code-owner-guide-dammam/", signal: "الكود السعودي للبناء في الدمام" },
];

const replacements = {
  "service-construction.html": [
    ["<title>البناء والإنشاءات في الرياض | شركة تعاود للمقاولات العامة</title>", "<title>مقاول بناء عظم في الرياض | البناء والإنشاءات | تعاود</title>"],
    ["<meta name=\"description\" content=\"خدمة البناء والإنشاءات في الرياض من شركة تعاود للمقاولات العامة للمشاريع السكنية والتجارية، تنفيذ عظم، فلل، ملاحق ومباني بإدارة ومتابعة منظمة.\">", "<meta name=\"description\" content=\"مقاول بناء عظم في الرياض لتنفيذ الفلل والملاحق والمباني السكنية والتجارية، مع نطاق واضح ومتابعة منظمة لمراحل البناء والإنشاءات.\">"],
    ["<meta property=\"og:title\" content=\"البناء والإنشاءات في الرياض | شركة تعاود\">", "<meta property=\"og:title\" content=\"مقاول بناء عظم والبناء والإنشاءات في الرياض | تعاود\">"],
    ["<h1>البناء والإنشاءات في الرياض</h1>", "<h1>بناء العظم والإنشاءات في الرياض</h1>"],
    ["<p>تنفيذ أعمال البناء والعظم للمشاريع السكنية والتجارية بإدارة واضحة ومتابعة لمراحل التنفيذ من البداية حتى التسليم.</p>", "<p>شركة تعاود مقاول بناء عظم في الرياض للمشاريع السكنية والتجارية، بنطاق واضح ومتابعة لمراحل التنفيذ من البداية حتى تسليم الأعمال.</p>"],
  ],
  "service-turnkey.html": [
    ["<title>تسليم مفتاح في الرياض | شركة تعاود للمقاولات العامة</title>", "<title>تسليم مفتاح للمشاريع في الرياض | سكني وتجاري | تعاود</title>"],
    ["<meta name=\"description\" content=\"خدمة تسليم مفتاح في الرياض من شركة تعاود للمقاولات العامة تشمل تنسيق البناء والتشطيب والديكور والكهرباء والسباكة حتى التسليم النهائي.\">", "<meta name=\"description\" content=\"خدمة تسليم مفتاح للمشاريع السكنية والتجارية في الرياض، تشمل تنسيق البناء وMEP والتشطيب والديكور والفحص حتى التسليم النهائي.\">"],
    ["<meta property=\"og:title\" content=\"تسليم مفتاح في الرياض | شركة تعاود\">", "<meta property=\"og:title\" content=\"تسليم مفتاح للمشاريع السكنية والتجارية في الرياض | تعاود\">"],
    ["<h1>تسليم مفتاح في الرياض</h1>", "<h1>تسليم مفتاح للمشاريع السكنية والتجارية في الرياض</h1>"],
  ],
  "service-mep.html": [
    ["<title>أعمال الكهرباء والسباكة في الرياض | شركة تعاود للمقاولات</title>", "<title>مقاول MEP في الرياض | كهرباء وسباكة وميكانيكا | تعاود</title>"],
    ["<meta name=\"description\" content=\"خدمة أعمال الكهرباء والسباكة وMEP في الرياض من شركة تعاود للمقاولات، تنسيق وتنفيذ الكهرباء والسباكة للمشاريع السكنية والتجارية ضمن مراحل البناء والتشطيب.\">", "<meta name=\"description\" content=\"مقاول MEP في الرياض لتنفيذ وتنسيق أعمال الكهرباء والسباكة والميكانيكا للمشاريع السكنية والتجارية ضمن مراحل البناء والتشطيب.\">"],
    ["<meta property=\"og:title\" content=\"أعمال الكهرباء والسباكة في الرياض\">", "<meta property=\"og:title\" content=\"مقاول MEP وأعمال الكهرباء والسباكة في الرياض\">"],
    ["<h1>أعمال الكهرباء والسباكة في الرياض</h1>", "<h1>مقاول MEP وأعمال الكهرباء والسباكة في الرياض</h1>"],
  ],
  "service-finishing.html": [
    ["<title>تشطيبات عامة في الرياض | شركة تعاود للمقاولات العامة</title>", "<title>تشطيب داخلي وخارجي في الرياض | شركة تعاود للمقاولات</title>"],
    ["<meta name=\"description\" content=\"خدمة التشطيبات العامة في الرياض من شركة تعاود للمقاولات العامة تشمل التشطيب الداخلي والخارجي، الواجهات، الدهانات، الأرضيات، التنسيق النهائي للمشروع.\">", "<meta name=\"description\" content=\"خدمة التشطيب الداخلي والخارجي في الرياض للمشاريع السكنية والتجارية، وتشمل الأرضيات والدهانات والأسقف والواجهات والتنسيق النهائي.\">"],
    ["<meta property=\"og:title\" content=\"تشطيبات عامة في الرياض | شركة تعاود\">", "<meta property=\"og:title\" content=\"تشطيب داخلي وخارجي في الرياض | شركة تعاود\">"],
    ["<h1>تشطيبات عامة في الرياض</h1>", "<h1>تشطيب داخلي وخارجي في الرياض</h1>"],
  ],
  "service-decor.html": [
    ["<title>ديكورات وتصميم داخلي في الرياض | شركة تعاود للمقاولات</title>", "<title>تصميم وديكور داخلي في الرياض | شركة تعاود</title>"],
    ["<meta property=\"og:title\" content=\"ديكورات وتصميم داخلي في الرياض\">", "<meta property=\"og:title\" content=\"تصميم وديكور داخلي في الرياض\">"],
    ["<h1>ديكورات وتصميم داخلي في الرياض</h1>", "<h1>تصميم وديكور داخلي في الرياض</h1>"],
  ],
  "blog/mechanical-mep-works-riyadh/index.html": [
    ["<title>أعمال الكهرباء والسباكة والميكانيكا MEP في الرياض | دليل شامل</title>", "<title>ما هي أعمال MEP في الرياض؟ | دليل الكهرباء والسباكة والميكانيكا</title>"],
    ["<h1>أعمال الكهرباء والسباكة والميكانيكا في الرياض</h1>", "<h1>ما هي أعمال MEP؟ دليل الكهرباء والسباكة والميكانيكا في الرياض</h1>"],
  ],
  "blog/turnkey-commercial-fitout-riyadh/index.html": [
    ["<title>تسليم مفتاح محلات ومكاتب في الرياض | تجهيز تجاري متكامل</title>", "<title>تجهيز المحلات والمكاتب في الرياض | دليل تسليم المفتاح التجاري</title>"],
    ["<meta name='description' content='دليل شامل عن تسليم مفتاح محلات ومكاتب في الرياض: تجهيز تجاري، تشطيب مكاتب ومحلات، كهرباء، سباكة، إضاءة، ديكور، وهوية المكان.'>", "<meta name='description' content='دليل تجهيز المحلات والمكاتب في الرياض بنظام تسليم المفتاح: تحديد النطاق، تنسيق MEP، اختيار التشطيبات، والاستلام الجاهز للتشغيل.'>"],
    ["<meta property='og:title' content='تسليم مفتاح محلات ومكاتب في الرياض'>", "<meta property='og:title' content='دليل تجهيز المحلات والمكاتب بنظام تسليم المفتاح في الرياض'>"],
    ["<h1>تسليم مفتاح محلات ومكاتب في الرياض</h1>", "<h1>دليل تجهيز المحلات والمكاتب بنظام تسليم المفتاح في الرياض</h1>"],
  ],
  "blog/turnkey-contracts-riyadh/index.html": [
    ["<title>عقود تسليم على المفتاح بالرياض | البنود قبل التوقيع</title>", "<title>عقد مقاولات تسليم مفتاح في الرياض | البنود قبل التوقيع</title>"],
    ["<meta name=\"description\" content=\"دليل عملي لعقود تسليم على المفتاح في الرياض يشرح النطاق والمستندات والمواصفات والسعر والدفعات والمدة والتغييرات والجودة والاستلام والضمان قبل التوقيع.\">", "<meta name=\"description\" content=\"دليل عقد مقاولات تسليم مفتاح في الرياض يشرح النطاق والمستندات والمواصفات والسعر والدفعات والمدة والتغييرات والجودة والاستلام قبل التوقيع.\">"],
    ["<meta property=\"og:title\" content=\"عقود تسليم على المفتاح في الرياض: البنود التي تمنع الخلافات\">", "<meta property=\"og:title\" content=\"عقد مقاولات تسليم مفتاح في الرياض: البنود التي تمنع الخلافات\">"],
    ["<meta name=\"twitter:title\" content=\"عقود تسليم على المفتاح في الرياض: البنود التي تمنع الخلافات\">", "<meta name=\"twitter:title\" content=\"عقد مقاولات تسليم مفتاح في الرياض: البنود التي تمنع الخلافات\">"],
    ["<h1>عقود تسليم على المفتاح في الرياض: البنود التي تمنع الخلافات</h1>", "<h1>عقد مقاولات تسليم مفتاح في الرياض: البنود التي تمنع الخلافات</h1>"],
  ],
  "blog/turnkey-contract-checklist-riyadh/index.html": [
    ["<title>عقد تسليم مفتاح في الرياض | قائمة فحص قبل التعاقد</title>", "<title>قائمة فحص عقد تسليم المفتاح | مراجعة عملية قبل التعاقد</title>"],
    ["<meta name='description' content='قائمة فحص شاملة لأهم بنود عقد تسليم مفتاح في الرياض: نطاق العمل، المواد، التوريد، الدفعات، مدة التنفيذ، الاستلام، والتعديلات.'>", "<meta name='description' content='قائمة فحص عملية لمراجعة عقد تسليم المفتاح قبل التعاقد: النطاق والمواد والتوريد والدفعات والمدة والتعديلات والاستلام.'>"],
    ["<meta property='og:title' content='عقد تسليم مفتاح في الرياض'>", "<meta property='og:title' content='قائمة فحص عقد تسليم المفتاح قبل التعاقد'>"],
    ["<h1>عقد تسليم مفتاح في الرياض</h1>", "<h1>قائمة فحص عقد تسليم المفتاح قبل التعاقد</h1>"],
  ],
  "scripts/blog-archive-content.mjs": [
    ["\"mechanical-mep-works-riyadh\": \"أعمال الميكانيكا وMEP\"", "\"mechanical-mep-works-riyadh\": \"ما هي أعمال MEP؟\""],
    ["\"turnkey-commercial-fitout-riyadh\": \"تشطيب تجاري تسليم مفتاح\"", "\"turnkey-commercial-fitout-riyadh\": \"دليل تجهيز المحلات والمكاتب\""],
    ["\"turnkey-contract-checklist-riyadh\": \"عقد تسليم مفتاح\"", "\"turnkey-contract-checklist-riyadh\": \"قائمة فحص عقد تسليم المفتاح\""],
  ],
  "scripts/build-static-pages.mjs": [
    ["desc=first(h,/<meta[^>]*name=\"description\"[^>]*content=\"([^\"]*)\"/i,c.scope)", "desc=metaDescription(h,c.scope)"],
    ["rootServices.has(r)?'2026-08-23':existingDate", "serviceRefreshDates.get(r)||existingDate"],
  ],
  "scripts/seo-cluster-2026-08-23.mjs": [
    ["title: \"عقود تسليم على المفتاح في الرياض: البنود التي تمنع الخلافات\"", "title: \"عقد مقاولات تسليم مفتاح في الرياض: البنود التي تمنع الخلافات\""],
    ["seoTitle: \"عقود تسليم على المفتاح بالرياض | البنود قبل التوقيع\"", "seoTitle: \"عقد مقاولات تسليم مفتاح في الرياض | البنود قبل التوقيع\""],
    ["description: \"دليل عملي لعقود تسليم على المفتاح في الرياض يشرح النطاق والمستندات والمواصفات والسعر والدفعات والمدة والتغييرات والجودة والاستلام والضمان قبل التوقيع.\"", "description: \"دليل عقد مقاولات تسليم مفتاح في الرياض يشرح النطاق والمستندات والمواصفات والسعر والدفعات والمدة والتغييرات والجودة والاستلام قبل التوقيع.\""],
  ],
};

function walk(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".next", "node_modules", "out", "public"].includes(entry.name)) return [];
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? walk(absolute) : [absolute];
  });
}

function applyReplacements() {
  const changed = [];
  const errors = [];
  for (const [relative, pairs] of Object.entries(replacements)) {
    const absolute = path.join(root, relative);
    let html = fs.readFileSync(absolute, "utf8");
    const original = html;
    for (const [before, after] of pairs) {
      if (html.includes(before)) html = html.replaceAll(before, after);
      else if (!html.includes(after)) errors.push(`${relative}: replacement source is missing: ${before.slice(0, 90)}`);
    }
    if (html !== original) {
      fs.writeFileSync(absolute, html);
      changed.push(relative);
    }
  }

  for (const absolute of walk(path.join(root, "blog")).filter((file) => file.endsWith("index.html"))) {
    const html = fs.readFileSync(absolute, "utf8");
    const cleaned = html.replace(/<h2\b[^>]*>كلمات SEO المستهدفة<\/h2>\s*<p>[\s\S]*?<\/p>/gi, "");
    if (cleaned !== html) {
      fs.writeFileSync(absolute, cleaned);
      changed.push(path.relative(root, absolute).split(path.sep).join("/"));
    }
  }

  if (errors.length) throw new Error(errors.join("\n"));
  return [...new Set(changed)].sort();
}

function expectedCanonical(url) {
  return url === "/" ? `${domain}/` : `${domain}${url}`;
}

function validate() {
  const errors = [];
  if (queryOwnership.length !== 12) errors.push(`Expected 12 query owners, found ${queryOwnership.length}`);

  for (const owner of queryOwnership) {
    const absolute = path.join(root, owner.file);
    if (!fs.existsSync(absolute)) {
      errors.push(`${owner.query}: missing ${owner.file}`);
      continue;
    }
    const html = fs.readFileSync(absolute, "utf8");
    if (/noindex/i.test(html.match(/<meta\b(?=[^>]*name=["']robots["'])[^>]*>/i)?.[0] || "")) errors.push(`${owner.query}: owner is noindex`);
    if (!html.includes(owner.signal)) errors.push(`${owner.query}: missing ownership signal "${owner.signal}"`);
    const canonical = html.match(/<link\b(?=[^>]*rel=["']canonical["'])[^>]*href=["']([^"']+)/i)?.[1]
      || html.match(/<link\b(?=[^>]*href=["']([^"']+)["'])(?=[^>]*rel=["']canonical["'])[^>]*>/i)?.[1];
    if (canonical !== expectedCanonical(owner.url)) errors.push(`${owner.query}: canonical ${canonical || "missing"} != ${expectedCanonical(owner.url)}`);
  }

  const landingFiles = walk(path.join(root, "lp")).filter((file) => file.endsWith(".html"));
  for (const absolute of landingFiles) {
    const html = fs.readFileSync(absolute, "utf8");
    if (!/<meta\b(?=[^>]*name=["']robots["'])(?=[^>]*content=["'][^"']*noindex[^"']*follow)[^>]*>/i.test(html)) {
      errors.push(`${path.relative(root, absolute)}: landing page must be noindex,follow`);
    }
  }

  const sitemap = fs.readFileSync(path.join(root, "sitemap.xml"), "utf8");
  if (/tawodco\.com\/lp\//i.test(sitemap)) errors.push("Landing pages must not appear in sitemap.xml");

  const vercel = fs.readFileSync(path.join(root, "vercel.json"), "utf8");
  if (!/"source"\s*:\s*"\/lp\/\(\.\*\)"[\s\S]*?"key"\s*:\s*"X-Robots-Tag"[\s\S]*?"value"\s*:\s*"noindex, follow"/i.test(vercel)) {
    errors.push("vercel.json must send X-Robots-Tag: noindex, follow for /lp/*");
  }

  const visibleSeoLabels = walk(path.join(root, "blog"))
    .filter((file) => file.endsWith("index.html") && /<h2\b[^>]*>كلمات SEO المستهدفة<\/h2>/i.test(fs.readFileSync(file, "utf8")));
  if (visibleSeoLabels.length) errors.push(`Visible SEO keyword blocks remain in ${visibleSeoLabels.length} article(s)`);

  if (errors.length) throw new Error(errors.join("\n"));
}

const changed = write ? applyReplacements() : [];
validate();
console.log(`SEO ownership validated for ${queryOwnership.length} queries; ${changed.length} file(s) changed.`);
