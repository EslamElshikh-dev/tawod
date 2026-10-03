/* Progressive enhancement: content stays visible without JavaScript. */
(() => {
  function start() {
    if (!document.body.classList.contains('tawod-contracting') ||
        window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
        !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add('tawod-entered');
        observer.unobserve(entry.target);
      }
    }, { threshold: .12, rootMargin: '0px 0px -35px 0px' });
    document.querySelectorAll(
      '.premium-card .card-body, .home-project-body, .section-title > p, .step-card > h3, .step-card > p'
    ).forEach(element => {
      if (element.getBoundingClientRect().top > window.innerHeight) observer.observe(element);
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
