/* Footer and direct contact controls, independent of motion preferences. */
(() => {
  function start() {
    const body = document.body;
    if (!body.classList.contains('tawod-contracting')) return;
    const compact = window.matchMedia('(max-width: 767px)');
    const groups = [...document.querySelectorAll('.contracting-footer-group')];
    function arrange() {
      groups.forEach(group => {
        group.open = !compact.matches;
        const summary = group.querySelector('summary');
        if (compact.matches) summary.removeAttribute('tabindex');
        else summary.setAttribute('tabindex', '-1');
      });
    }
    arrange();
    compact.addEventListener('change', arrange);
    groups.forEach(group => group.querySelector('summary').addEventListener('click', event => {
      if (!compact.matches) event.preventDefault();
    }));
    const footer = document.querySelector('footer');
    if (footer && 'IntersectionObserver' in window) {
      new IntersectionObserver(entries => {
        body.classList.toggle('tawod-footer-in-view', entries[0].isIntersecting);
      }).observe(footer);
    } else {
      body.classList.add('tawod-footer-in-view');
    }
    function focusChanged() {
      body.classList.toggle('tawod-input-active', !!document.activeElement?.matches('input, select, textarea'));
    }
    document.addEventListener('focusin', focusChanged);
    document.addEventListener('focusout', () => queueMicrotask(focusChanged));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
