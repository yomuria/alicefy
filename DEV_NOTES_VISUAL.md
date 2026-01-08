iOS-style Glass & Aurora visual upgrade — notes

What I changed
- Added **Aurora** background component (`src/components/Aurora.jsx` + `aurora.css`) with layered animated gradients.
- Added **Glass** component (`src/components/Glass.jsx` + `glass.css`) with SVG refraction, edge highlights, dynamic sheen, and tilt (pointer-driven).
- Extended `src/index.css` with CSS variables (`--primary-color`, `--secondary-color`, `--glass-blur`), refined `.ios-glass` styles and noise/mesh adjustments.
- Replaced plain background layers in `App.jsx` with `<Aurora colors={colors} />` and wrapped the player control area with `<Glass>`.

How to tune
- Colors: the app sets `--primary-color` / `--secondary-color` from the track artwork using `FastAverageColor`.
- Sheen/tilt: tweak transitions and max values in `src/components/glass.css` and `Glass.jsx` pointer math for a more aggressive or subtle effect.
- Performance: reduce `--glass-blur` for CPU-constrained devices and disable pointer-driven updates for low power modes.

Optional upgrades
- Use `gsap` for heavyweight timeline animations if you need choreographed stage transitions.
- Use `three.js` / `@react-three/fiber` and a small render-to-texture shader for a physically accurate refraction pass (higher quality but heavier).

QA checklist
- Verify `backdrop-filter` support across target browsers; ensure fallback styles for unsupported browsers.
- Test on iOS Safari and macOS Safari for the crispest backdrop-filter behavior.
- Use `prefers-reduced-motion` and `prefers-reduced-transparency` to reduce effects for accessibility.
