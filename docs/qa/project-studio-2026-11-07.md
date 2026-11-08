# Project studio design review — 7 November 2026

The seven project viewers now share an architectural studio frame in forest green, warm ivory and brass. Evening lighting also changes the surrounding controls to a dark palette. The reference photograph opens in a native, keyboard-accessible dialog and follows the selected construction layer. Sahafa and Wadi use the original full-resolution photograph in that dialog.

An optional slow orbit tour stops when the visitor rotates, zooms or selects another view. It respects reduced motion and pauses rendering while the stage or document is hidden. Rendering remains on demand when the tour is off. Camera reset and Home retain the selected floor or construction layer.

The expanded viewer falls back to an accessible viewport overlay when native fullscreen is unavailable or rejected. Escape restores the normal view and returns focus; Tab stays within the expanded viewer. Mobile controls and the full-width reference card have their own responsive layout.

## Validation

- Production build and export verification: 285 HTML pages.
- 30 viewer tests, including orbit state, reduced motion, rejected fullscreen, Escape/focus restoration, stage-preserving reset, model geometry, photo-derived features, lighting and software depth rendering.
- 4 English parity tests and TypeScript checks.
- Mobile performance budgets, contracting design verification and site validation pass. Site validation retains the existing short-description warning for `en/thank-you.html`.
- Cloud browser: all seven Arabic pages at a 340 CSS-pixel viewport; all seven English pages at 340 and 1280 pixels. These are local exported-page iframe previews, not physical phones or touch-device measurements.
- Those 21 browser cases exercise all 66 selected layers with reset, 63 detail selections, 84 camera presets, zoom in/out and both lighting settings. No horizontal document overflow was observed.
- Additional interaction checks cover the photograph dialog, Escape/focus return, explicit tour start and stopping on manual rotation, and the expanded overlay when the browser rejects native fullscreen.

## Limits

The browser's actual WebGL 2 context probe returned no context. The live model canvases reported `data-renderer="software"`. Browser observations and screenshots therefore verify the software fallback only. Actual WebGL rendering and GPU shadows remain unverified; native fullscreen is also unverified in this environment. No physical mobile GPU, touch gestures or frame-rate measurements are claimed.

Screenshots are supplied separately for visual approval. This design is prepared on a separate branch and requires the owner's explicit approval before merging or production deployment.
