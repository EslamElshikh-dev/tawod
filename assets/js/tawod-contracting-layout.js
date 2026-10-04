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
        if (compact.matches) {
          summary.removeAttribute('tabindex');
          group.setAttribute('name', 'tawod-footer-nav');
        } else {
          summary.setAttribute('tabindex', '-1');
          group.removeAttribute('name');
        }
      });
    }
    arrange();
    compact.addEventListener('change', arrange);
    groups.forEach(group => group.querySelector('summary').addEventListener('click', event => {
      if (!compact.matches) event.preventDefault();
    }));
    function focusChanged() {
      body.classList.toggle('tawod-input-active', !!document.activeElement?.matches('input, select, textarea'));
    }
    document.addEventListener('focusin', focusChanged);
    document.addEventListener('focusout', () => queueMicrotask(focusChanged));
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
