# Vossie cinematic intro

The root route runs an 8-second, cold-launch-only brand sequence before settling on the approved Welcome screen. `VossieIntroTransition.ts` is the single timing contract; all movement and reveals derive from its UI-thread clock.

- The canonical `assets/branding/vossie-wordmark.svg` remains unchanged. The files under `assets/` are derived blue-dot, dotless, and white variants used to animate its original geometry.
- The Welcome layout follows the 2026-10-18 owner reference (`../welcome/assets/reference-screen/vossie-welcome-2026-10-18.png`), measured onto the 852x1846 canvas in `VossieIntroTransition.ts`. The intro wordmark lands on `welcomeReference.logo`.
- Welcome photographs are the 2026-10-23 owner set (cropped from `Vossie Design Inspiration/courier screens/Screenshot 2026-10-23 144203.png`), shown with `cover` inside the reference tile frames. The top row (3 photos) scrolls left to right and the bottom row (4 photos) scrolls right to left, continuously, one loop every 48 seconds (`LOOP_SECONDS` in `AnimatedPhotoGallery.tsx`). Reduced Motion keeps the rows still. Higher-resolution originals would sharpen the tiles.
- Welcome copy renders as live text: the display title uses Georgia and the descriptor uses the system font. "Sign In with Eduvos" is a live-text pill button (`#376371`, design-system primary action) with a minimum 44pt target.
- After the 600ms splash handoff, the isolated dot pops in above V and makes five 250ms hops across V → O → S → S → I, landing on the authored i-dot at 2100ms. It then compresses into the existing blue portal preparation. The full intro remains 8 seconds, with skip available at 1500ms.
- Photos begin with the Welcome transition at 5900ms, stagger by 80ms, and finish by 6730ms.
- A tap can skip the intro after 1500ms. Reduced Motion uses a 250ms crossfade. Backgrounding does not restart the sequence; a process restart does.
- The Eduvos action opens the local email sign-in demo; it does not authenticate. QR sign-in was removed on 2026-10-18. Footer links (Vossie Business, Terms, Privacy) remain intentionally unconnected until their screens or URLs are supplied.
- `action-eduvos.png`, `action-scan.png`, `descriptor.png`, `supporting-copy.png`, `welcome-title-canto.png` and the `footer-*.png` slices are no longer referenced.
- Development web builds accept `?introDebugMs=<0-8000>` to freeze a deterministic review frame. The override is excluded from production builds.
