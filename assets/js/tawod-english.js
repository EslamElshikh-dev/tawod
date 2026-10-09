(function () {
  'use strict';
  var button = document.getElementById('en-menu-toggle');
  var menu = document.getElementById('en-nav');
  if (!button || !menu) return;
  function closeMenu(returnFocus) {
    menu.classList.remove('open');
    button.setAttribute('aria-expanded', 'false');
    button.setAttribute('aria-label', 'Open navigation');
    if (returnFocus) button.focus();
  }
  button.addEventListener('click', function () {
    var open = button.getAttribute('aria-expanded') !== 'true';
    menu.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
  });
  menu.addEventListener('click', function (event) {
    if (event.target.closest('a')) closeMenu(false);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && button.getAttribute('aria-expanded') === 'true') closeMenu(true);
  });
  document.addEventListener('click', function (event) {
    if (!menu.contains(event.target) && !button.contains(event.target)) closeMenu(false);
  });
})();
