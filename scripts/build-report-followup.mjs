import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEnglishSite } from './build-english-site.mjs';
import { generateSitemaps } from './generate-sitemaps.mjs';

export function applyReportFollowup() {
  let changed = 0;
  for (const file of ['index.html', 'contact.html']) {
    const before = fs.readFileSync(file, 'utf8');
    let html = before;
    if (file === 'index.html') {
      html = html.replace('أفضل شركة مقاولات عامة في الرياض', 'شركة مقاولات عامة في الرياض')
        .replace('نبني المستقبل بخطى ثابتة ورؤية مدروسة', 'بناء وتشطيب وتسليم مفتاح بإدارة هندسية')
        .replace('دعم فني ومتابعة على مدار الساعة', 'تواصل ومتابعة خلال مراحل المشروع')
        .replace('فريق عمل متميز بخبرة طويلة', 'تنسيق هندسي وفني بين التخصصات');
      html = html.replace(/<article\b[^>]*>[\s\S]*?<\/article>/gi, block =>
        block.includes('faisaliah-villa-facades-finishing-01-v3.webp')
          ? block.replace(/href=(["'])\/projects\.html\1/g, 'href="/project-faisaliah-villa-facades-finishing.html"') : block);
    }
    html = html.replace(/<form\b[^>]*formsubmit\.co\/[\s\S]*?<\/form>/gi, block => {
      block = block.replace(/<input\b[^>]*name=["']البريد_الإلكتروني["'][^>]*>/i, tag => {
        const input = tag.replace(/\srequired(?:=["'][^"']*["'])?/i, '')
          .replace(/placeholder=(["'])[^"']*\1/i, 'placeholder="البريد الإلكتروني (اختياري)"');
        return /\bdir=/.test(input) ? input.replace(/\bdir=["'][^"']*["']/i, 'dir="ltr"') : input.replace(/>$/, ' dir="ltr">');
      });
      block = block.replace(/<textarea\b[^>]*name=["']التفاصيل["'][^>]*>/i, tag =>
        tag.replace(/\srequired(?:=["'][^"']*["'])?/i, '').replace(/placeholder=(["'])[^"']*\1/i, 'placeholder="الحي، المساحة والمرحلة الحالية (اختياري)"'));
      block = block.replace(/<input\b[^>]*name=["']_captcha["'][^>]*>/i, '<input name="_captcha" type="hidden" value="true">')
        .replace(/<input\b[^>]*name=["']_autoresponse["'][^>]*>\s*/i, '');
      if (file === 'index.html') {
        block = block.replace(/class=['"]sr-only['"]\s*(?=for=)/g, '')
          .replace(/(<label\b[^>]*for=['"]home-email['"][^>]*>)[^<]*(<\/label>)/i, '$1البريد الإلكتروني <span class="optional">(اختياري)</span>$2')
          .replace(/(<label\b[^>]*for=['"]home-details['"][^>]*>)[^<]*(<\/label>)/i, '$1تفاصيل المشروع <span class="optional">(اختياري)</span>$2')
          .replace(/class=['"]form-group home-privacy-consent['"]/i, 'class="privacy-check form-group-full"');
      } else {
        block = block.replace(/(<label\b[^>]*for=['"]contact-details['"][^>]*>)[\s\S]*?(<\/label>)/i, '$1تفاصيل المشروع <span class="optional">(اختياري)</span>$2');
      }
      return block;
    });
    // Keep asset attributes idempotent when the build re-applies these edits.
    html = html.replace(/dir="ltr"\s+dir="ltr"/g, 'dir="ltr"');
    if (html !== before) { fs.writeFileSync(file, html); changed++; }
  }
  buildEnglishSite();
  generateSitemaps();
  console.log(`Applied report follow-up to ${changed} Arabic pages and rebuilt English equivalents.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) applyReportFollowup();
