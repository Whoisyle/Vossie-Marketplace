# Vossie page build loop

Every page supplied by the project owner follows one repeatable loop:

1. Decompose the reference into route, screen composition, sections, reusable components, interactions, and assets.
2. Scaffold `src/screens/<page>/` with a page-local `assets/` directory. Put each page-only asset in `assets/<asset-name>/`; keep reusable brand assets in `assets/branding/`.
3. Implement the screen and route in the approved Expo structure without inventing product behavior that is not in the supplied reference or canonical specification.
4. Run lint, strict TypeScript, tests, static web export, and Expo Doctor.
5. Verify the saved source change and rendered page in Chrome.
6. Verify the completed page on the connected iPhone through Expo Go (Metro Fast Refresh is the primary live loop). Use `npm run start:go` on the same network, or `npm run start:go:remote` when LAN discovery is unavailable. Appetize is an optional secondary artifact when its quota is available; do not block a page on an Appetize quota limit.
7. Run Guardian review before committing the page.
8. Commit the approved page and its documentation with a focused Conventional Commit. Confirm `git status --short` contains only intentional changes before committing; never stage `.env`, `.local/`, credentials, or generated evidence unless explicitly approved.

For every supplied reference, the loop also includes these fit and behavior checks:

- Treat the reference as a design reference, not a fixed canvas. Use the device's runtime width, height, safe-area insets, text scaling, keyboard, and orientation so the screen fits the actual Expo client.
- Preserve a minimum 44 pt touch target and add iOS-style press feedback to every actionable control. Respect reduced-motion preferences and use native stack transitions for screen-to-screen movement.
- Inventory every visible control before implementation: navigation, inputs, validation, focus/keyboard behavior, loading, error, success, and back/help states. If an external contract is not approved, implement only a clearly labelled local prototype and document the integration gap; never claim a mock is live.
- Verify the interaction path, not only the first frame: press the primary button, enter invalid and valid values, submit, go back, and repeat the flow at narrow and tall device dimensions.
- When the live iPhone is connected, repeat the check on the physical device after every page change: save source, wait for Metro Fast Refresh, then confirm the updated screen and interaction on the phone before moving to the next page.
- Verify a native relaunch path: background/exit the app, return to it, and confirm the root route restarts the Vossie opening animation before continuing to the welcome page.

The final handoff for each page includes the commit hash, verification result, EAS build ID, Appetize link, and any visual verification caveat. A typical commit sequence is:

```powershell
git status --short
git add <intended-page-files>
git commit -m "feat: build <page name> screen"
git status --short
```

The loop is complete only after the commit succeeds and the post-commit status check confirms that excluded local files remain untracked and unstaged.

Use the scaffold helper when a page arrives:

```powershell
npm run scaffold:page -- -PageName "seller profile" -AssetName "avatar,header image,rating icon"
```

The helper creates the page directory, a local README, the page `assets/` directory, and optional per-asset folders. It never overwrites existing files.
