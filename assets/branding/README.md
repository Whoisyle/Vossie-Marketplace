# Vossie brand assets

`vossie-wordmark.svg` is the supplied editable vector wordmark and the canonical source asset for the Vossie Marketplace lockup.

`vossie-wordmark.png` is the Expo runtime fallback used by the native screens today. Keep the vector and raster versions together when updating the brand so spacing, proportions, and the Marketplace descriptor remain consistent.

The shared UI tokens live in `src/theme/index.ts` under `brand` and are used by the splash, welcome, Eduvos, and QR screens.

## App icon

`app-icon/icon.png` (light, 1024 px, used for iOS and web), `icon-dark.png` (iOS dark appearance), `adaptive-foreground.png` and `adaptive-monochrome.png` (Android adaptive icon, mark kept inside the middle 66%) and `favicon.png` are traced from the supplied photo of the "SS" icon. `python scripts/make-app-icon.py` rebuilds them. Replace them with the original vector artwork when it is available. Custom icons show in builds (TestFlight, App Store, APK), not in Expo Go.
