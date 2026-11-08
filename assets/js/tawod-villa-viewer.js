/* Lightweight controller. The 3D renderer is fetched only after activation. */
(() => {
  'use strict';
  const copy = {
    ar: { loading: 'جارٍ تجهيز النموذج…', ready: 'العرض جاهز للتفاعل', tour: 'جولة حول المشروع', pause: 'إيقاف الجولة', start: 'تشغيل العرض ثلاثي الأبعاد', failure: 'العرض ثلاثي الأبعاد غير متاح الآن. صورة المشروع متاحة للمشاهدة.', retry: 'إعادة تشغيل العرض', free: 'عرض حر', general: 'منظور عام', front: 'من الأمام', top: 'من الأعلى', rear: 'من الخلف', ground: 'كشف الدور الأرضي', upper: 'كشف الدور الأول', living: 'المجلس والجلسات', kitchen: 'المطبخ والخدمات', terrace: 'السطح والتراس', garden: 'الحوش والمحيط', lighting: 'تفاصيل الإنارة', floor: 'الأرضيات', walls: 'الجدران', entrance: 'المدخل', columns: 'الأعمدة والشرفة', steps: 'الدرج والإنارة', full: 'تكبير العرض', exit: 'تصغير العرض', canvas: 'نموذج معماري توضيحي تفاعلي. استخدم الأسهم للتحريك، وزري الجمع والطرح للتقريب، وHome لإعادة العرض.' },
    en: { loading: 'Preparing the model…', ready: 'Ready to explore', tour: 'Orbit tour', pause: 'Pause tour', start: 'Start the 3D experience', failure: 'The 3D view is currently unavailable. You can still view the project photograph.', retry: 'Restart the 3D view', free: 'Free view', general: 'Overview', front: 'Front view', top: 'Top view', rear: 'Rear view', ground: 'Ground floor cutaway', upper: 'Upper floor cutaway', living: 'Living spaces', kitchen: 'Kitchen and service spaces', terrace: 'Roof terrace', garden: 'Courtyard and grounds', lighting: 'Lighting details', floor: 'Floor finishes', walls: 'Walls', entrance: 'Entrance', columns: 'Columns and balcony', steps: 'Steps and lighting', full: 'Expand view', exit: 'Exit expanded view', canvas: 'Interactive architectural illustration. Use arrow keys to rotate, plus and minus to zoom, and Home to reset.' },
  };
  let engine;
  for (const root of document.querySelectorAll('[data-villa-viewer]')) {
    const t = copy[root.dataset.lang] || copy.ar, stage = root.querySelector('.villa-3d-stage');
    const mount = root.querySelector('[data-3d-mount]'), start = root.querySelector('[data-3d-start]');
    const status = root.closest('.villa-3d-section')?.querySelector('[data-3d-status]'), viewLabel = root.querySelector('[data-3d-view]');
    const tools = root.querySelector('[data-3d-tools]'), fullscreen = root.querySelector('[data-3d-action="fullscreen"]');
    const tour = root.querySelector('[data-3d-action="tour"]'), dialog = root.querySelector('[data-3d-reference-dialog]');
    if (!mount || !start || !status || !viewLabel || !tools || !fullscreen) continue;
    const controls = [...root.querySelectorAll('[data-3d-preset],[data-3d-detail],[data-3d-light],[data-3d-mode]')];
    let api, generation = 0, light = 'day', stageInView = true;
    function expand(value) {
      root.dataset.expanded = String(value);
      if (value) { stage.setAttribute('role', 'dialog'); stage.setAttribute('aria-modal', 'true'); stage.setAttribute('aria-label', t.full); }
      else { stage.removeAttribute('role'); stage.removeAttribute('aria-modal'); stage.removeAttribute('aria-label'); }
      fullscreen.setAttribute('aria-label', value ? t.exit : t.full);
      fullscreen.setAttribute('aria-pressed', String(value));
      api?.resize();
    }
    function onTour(active) {
      root.dataset.tour = active ? 'on' : 'off';
      tour?.setAttribute('aria-pressed', String(active));
      const label = tour?.querySelector('[data-tour-label]');
      if (label) label.textContent = active ? t.pause : t.tour;
    }
    function onView(name) {
      const button = [...root.querySelectorAll('[data-3d-preset],[data-3d-detail],[data-3d-mode]')].find(value => (value.dataset['3dPreset'] || value.dataset['3dDetail'] || value.dataset['3dMode']) === name);
      viewLabel.textContent = button ? (button.querySelector('[data-control-label],strong') || button).textContent.trim() : t[name] || t.free;
      for (const button of root.querySelectorAll('[data-3d-preset],[data-3d-detail]')) button.setAttribute('aria-pressed', String((button.dataset['3dPreset'] || button.dataset['3dDetail']) === name));
    }
    function onMode(name) {
      root.dataset.display = name;
      const reference=root.querySelector('[data-3d-reference-image]'),source=root.getAttribute('data-reference-'+name);
      if(reference&&source&&reference.getAttribute('src')!==source)reference.src=source;
      const current = source || root.getAttribute('data-reference-original') || reference?.getAttribute('src');
      if (current) root.querySelectorAll('[data-3d-open-reference]').forEach(link => link.setAttribute('href', current));
      root.querySelectorAll('[data-3d-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset['3dMode'] === name)));
    }
    function setState(state) {
      root.dataset.state = state; start.disabled = state === 'loading';
      start.querySelector('span').textContent = state === 'loading' ? t.loading : state === 'error' ? t.retry : t.start;
      start.setAttribute('aria-busy', String(state === 'loading'));
      controls.forEach(button => { button.disabled = state !== 'ready'; });
      tools.hidden = state !== 'ready';
      if (tour) { tour.hidden = state !== 'ready'; tour.disabled = state !== 'ready'; }
      root.querySelector('[data-3d-hint]').hidden = state !== 'ready';
      root.querySelector('[data-3d-overlay]').hidden = state === 'ready';
      status.textContent = state === 'loading' ? t.loading : state === 'ready' ? t.ready : state === 'error' ? t.failure : '';
    }
    function stop(state = 'idle') {
      if (root.dataset.expanded === 'true') expand(false);
      if (document.fullscreenElement === stage) document.exitFullscreen().catch(() => {});
      generation++; const current = api; api = undefined; current?.dispose(); mount.replaceChildren(); light = 'day'; root.dataset.lighting = 'day';
      onTour(false);
      root.querySelectorAll('[data-3d-light]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset['3dLight'] === 'day')));
      onView('general'); onMode(root.dataset.defaultMode||'exterior'); setState(state);
    }
    start.hidden = false;
    start.addEventListener('click', async () => {
      if (root.dataset.state === 'loading' || api) return;
      const token = ++generation; setState('loading');
      try {
        engine ||= import('/assets/js/tawod-villa-engine-a4217f7024ad.mjs');
        const module = await engine;
        if (token !== generation) return;
        const viewer = await module.createVillaViewer({ mount, variant: root.dataset.model, label: t.canvas, onView, onMode, onTour, onFailure: () => stop('error') });
        if (token !== generation) { viewer.dispose(); return; }
        api = viewer; light = 'day';
        root.querySelectorAll('[data-3d-light]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset['3dLight'] === 'day')));
        root.dataset.lighting = 'day';
        setState('ready'); api.resize(); api.visibility(stageInView && !document.hidden); api.canvas.focus({ preventScroll: true });
      } catch (error) { console.warn('Tawod villa view could not start:', error); engine = undefined; if (token === generation) stop('error'); }
    });
    root.addEventListener('click', async event => {
      const reference = event.target.closest('[data-3d-open-reference]');
      if (reference?.dataset['3dOpenReference'] !== undefined && root.contains(reference) && dialog?.showModal) {
        event.preventDefault();
        const image = dialog.querySelector('[data-3d-reference-full]');
        image.src = reference.getAttribute('href');
        api?.tour(false); dialog.showModal(); return;
      }
      const button = event.target.closest('button'); if (!button || !root.contains(button) || !api) return;
      if (button.dataset['3dPreset']) api.viewpoint(button.dataset['3dPreset']);
      if (button.dataset['3dDetail']) api.view(button.dataset['3dDetail']);
      if (button.dataset['3dMode']) api.mode(button.dataset['3dMode']);
      if (button.dataset['3dLight']) {
        const mode = button.dataset['3dLight']; if (mode !== light) { light = mode; api.lighting(mode); }
        root.querySelectorAll('[data-3d-light]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset['3dLight'] === light)));
        root.dataset.lighting = light;
      }
      const action = button.dataset['3dAction'];
      if (action === 'in') api.zoom(.85);
      if (action === 'out') api.zoom(1.18);
      if (action === 'reset') api.viewpoint('general');
      if (action === 'tour') api.tour(root.dataset.tour !== 'on');
      if (action === 'photo') stop();
      if (action === 'fullscreen') {
        if (root.dataset.expanded === 'true') { expand(false); fullscreen.focus({ preventScroll: true }); return; }
        try {
          if (document.fullscreenElement === stage) { await document.exitFullscreen(); return; }
          if (document.fullscreenEnabled && stage.requestFullscreen) await stage.requestFullscreen();
          if (document.fullscreenElement !== stage) expand(true);
        } catch { expand(true); }
      }
    });
    dialog?.addEventListener('click', event => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
    });
    document.addEventListener('keydown', event => {
      if (root.dataset.expanded !== 'true') return;
      if (event.key === 'Escape') { event.preventDefault(); expand(false); fullscreen.focus({ preventScroll: true }); }
      if (event.key === 'Tab') {
        const targets = [...stage.querySelectorAll('canvas,button:not([hidden]):not(:disabled)')].filter(el => el.getClientRects().length);
        const first = targets[0], last = targets[targets.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    });
    document.addEventListener('fullscreenchange', () => {
      fullscreen.setAttribute('aria-label', document.fullscreenElement === stage ? t.exit : t.full);
      fullscreen.setAttribute('aria-pressed', String(document.fullscreenElement === stage)); api?.resize();
    });
    const observer = new IntersectionObserver(entries => { stageInView = entries[0].isIntersecting; api?.visibility(stageInView && !document.hidden); }, { rootMargin: '80px' }); observer.observe(stage);
    document.addEventListener('visibilitychange', () => api?.visibility(stageInView && !document.hidden));
    window.addEventListener('pagehide', event => { if (event.persisted) api?.visibility(false); else { stop(); observer.disconnect(); } });
    window.addEventListener('pageshow', () => api?.visibility(stageInView && !document.hidden));
  }
})();
