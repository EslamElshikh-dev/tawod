/* Article-only interactions. Reading, contents, services and FAQs render in HTML. */
(() => {
  'use strict';
  const q = selector => document.querySelector(selector);
  const all = (selector, root = document) => [...root.querySelectorAll(selector)];
  const sidebar = q('#mobileSidebar'), menu = q('#menuBtn'), close = q('#closeSidebar'), overlay = q('#sidebarOverlay');
  let previousOverflow = '';
  function setMenu(open, restoreFocus = false) {
    if (!sidebar || !menu) return;
    if (open) previousOverflow = document.body.style.overflow;
    sidebar.inert = !open;
    sidebar.setAttribute('aria-hidden', String(!open));
    sidebar.classList.toggle('active', open);
    overlay?.classList.toggle('active', open);
    document.body.classList.toggle('menu-open', open);
    document.body.style.overflow = open ? 'hidden' : previousOverflow;
    menu.setAttribute('aria-expanded', String(open));
    if (open) close?.focus();
    else if (restoreFocus) menu.focus();
  }
  if (sidebar && menu) {
    sidebar.inert = true;
    sidebar.setAttribute('aria-hidden', 'true');
    menu.setAttribute('aria-controls', sidebar.id);
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => setMenu(true));
    close?.addEventListener('click', () => setMenu(false, true));
    overlay?.addEventListener('click', () => setMenu(false, true));
    all('a[href]', sidebar).forEach(link => link.addEventListener('click', () => setMenu(false)));
    sidebar.addEventListener('keydown', event => {
      if (event.key !== 'Tab' || !sidebar.classList.contains('active')) return;
      const items = all('a[href],button,summary', sidebar).filter(item => item.getClientRects().length);
      const first = items[0], last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    window.matchMedia('(min-width: 1051px)').addEventListener('change', event => {
      if (event.matches && sidebar.classList.contains('active')) setMenu(false);
    });
  }
  const services = q('.reader-services');
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (sidebar?.classList.contains('active')) { setMenu(false, true); return; }
    if (services?.open) { services.open = false; services.querySelector('summary').focus(); }
  });
  if (services) document.addEventListener('click', event => {
    if (services.open && !services.contains(event.target)) services.open = false;
  });
  const compact = window.matchMedia('(max-width: 767px)');
  const footerGroups = all('.contracting-footer-group');
  function arrangeFooter() {
    footerGroups.forEach(group => {
      group.open = !compact.matches;
      const summary = group.querySelector('summary');
      if (compact.matches) { summary.removeAttribute('tabindex'); group.setAttribute('name', 'tawod-footer-nav'); }
      else { summary.tabIndex = -1; group.removeAttribute('name'); }
    });
  }
  arrangeFooter();
  compact.addEventListener('change', arrangeFooter);
  footerGroups.forEach(group => group.querySelector('summary').addEventListener('click', event => { if (!compact.matches) event.preventDefault(); }));
  const focusChanged = () => document.body.classList.toggle('tawod-input-active', !!document.activeElement?.matches('input,select,textarea'));
  document.addEventListener('focusin', focusChanged);
  document.addEventListener('focusout', () => queueMicrotask(focusChanged));
  const url = q('link[rel="canonical"]')?.href || location.href;
  const status = q('[data-share-status]');
  function fallback() {
    const holder = q('[data-share-fallback]'), input = holder?.querySelector('input');
    if (holder) holder.hidden = false;
    if (input) { input.value = url; input.focus(); input.select(); }
    if (status) status.textContent = 'انسخ رابط المقال، أو شاركه عبر واتساب.';
  }
  function copy() {
    if (!navigator.clipboard) return fallback();
    navigator.clipboard.writeText(url).then(() => { if (status) status.textContent = 'تم نسخ رابط المقال.'; }).catch(fallback);
  }
  q('[data-share-article]')?.addEventListener('click', () => {
    if (navigator.share) navigator.share({ title: document.title, url }).catch(error => { if (error.name !== 'AbortError') copy(); });
    else copy();
  });
  q('[data-print-article]')?.addEventListener('click', () => window.print());
  let printClosed = [];
  window.addEventListener('beforeprint', () => {
    printClosed = all('.reader-faq:not([open])');
    printClosed.forEach(item => { item.open = true; });
  });
  window.addEventListener('afterprint', () => { printClosed.forEach(item => { item.open = false; }); printClosed = []; });
})();
