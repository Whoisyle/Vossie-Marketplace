# Vossie opening screen

The opening screen reproduces the project-owner supplied 1290x2796 iOS reference at its native 3x aspect ratio.

- Canonical layout reference: `assets/reference-screen/vossie-ios-splash.png`
- Canonical wordmark: `../../../assets/branding/vossie-wordmark.svg` (`#29475B`)
- Runtime behavior: static, full-screen, no controls
- Scaling: preserve the entire reference with `contain` on a white canvas
- System chrome: status bar and iOS home indicator hidden for the approved presentation

Do not redraw the legal line. Preserve its supplied rasterization and place the canonical SVG wordmark at the measured reference bounds.
