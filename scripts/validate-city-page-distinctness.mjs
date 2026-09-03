import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const cityPairs = [
  ['dammam', 'khobar'],
  ['dammam', 'dhahran'],
  ['khobar', 'dhahran']
];
const maxSimilarity = 0.86;
const pageRoutes = [
  '',
  'about',
  'services',
  'projects',
  'contact',
  'construction',
  'turnkey',
  'renovation',
  'finishing',
  'decor',
  'mep',
  'blog'
];

function pageFile(city, route) {
  return path.join(root, city, route, 'index.html');
}

function articleFile(city, dammamSlug) {
  const slug = dammamSlug.replace(/-dammam$/, `-${city}`);
  return path.join(root, city, 'blog', slug, 'index.html');
}

function mainWords(file) {
  const html = fs.readFileSync(file, 'utf8');
  const main = html.match(/<main\b[\s\S]*?<\/main>/i)?.[0] || '';
  return main
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:nbsp|amp|quot|apos|lt|gt);/gi, ' ')
    .replace(/الدمام|الخبر|الظهران/g, 'المدينة')
    .replace(/dammam|khobar|dhahran/gi, 'city')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean);
}

function trigrams(words) {
  const counts = new Map();
  for (let index = 0; index < words.length - 2; index += 1) {
    const trigram = words.slice(index, index + 3).join(' ');
    counts.set(trigram, (counts.get(trigram) || 0) + 1);
  }
  return counts;
}

function cosineSimilarity(leftWords, rightWords) {
  const left = trigrams(leftWords);
  const right = trigrams(rightWords);
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (const value of left.values()) leftMagnitude += value * value;
  for (const value of right.values()) rightMagnitude += value * value;
  for (const [key, value] of left) dot += value * (right.get(key) || 0);

  const denominator = Math.sqrt(leftMagnitude * rightMagnitude);
  return denominator ? dot / denominator : 0;
}

const comparisons = [];
for (const [leftCity, rightCity] of cityPairs) {
  for (const route of pageRoutes) {
    const left = pageFile(leftCity, route);
    const right = pageFile(rightCity, route);
    comparisons.push({
      label: `${leftCity}/${route || 'home'} <> ${rightCity}/${route || 'home'}`,
      score: cosineSimilarity(mainWords(left), mainWords(right))
    });
  }
}

const dammamArticleSlugs = fs.readdirSync(path.join(root, 'dammam', 'blog'), { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

for (const [leftCity, rightCity] of cityPairs) {
  for (const slug of dammamArticleSlugs) {
    comparisons.push({
      label: `${leftCity}/${slug} <> ${rightCity}/${slug}`,
      score: cosineSimilarity(mainWords(articleFile(leftCity, slug)), mainWords(articleFile(rightCity, slug)))
    });
  }
}

const failures = comparisons.filter(({ score }) => score > maxSimilarity).sort((a, b) => b.score - a.score);
const highest = [...comparisons].sort((a, b) => b.score - a.score)[0];

if (failures.length) {
  console.error(`City-page distinctness failed: ${failures.length} comparison(s) exceed ${Math.round(maxSimilarity * 100)}%.`);
  for (const { label, score } of failures) console.error(` - ${(score * 100).toFixed(1)}% ${label}`);
  process.exit(1);
}

console.log(`Checked ${comparisons.length} city-page pairs; highest normalized main-content similarity is ${(highest.score * 100).toFixed(1)}% (${highest.label}).`);
