# Vossie page build loop

Every page supplied by the project owner follows one repeatable loop:

1. Decompose the reference into route, screen composition, sections, reusable components, interactions, and assets.
2. Scaffold `src/screens/<page>/` with a page-local `assets/` directory. Put each page-only asset in `assets/<asset-name>/`; keep reusable brand assets in `assets/branding/`.
3. Implement the screen and route in the approved Expo structure without inventing product behavior that is not in the supplied reference or canonical specification.
4. Run lint, strict TypeScript, tests, static web export, and Expo Doctor.
5. Verify the saved source change and rendered page in Chrome.
6. Update the existing Appetize Vossie build using the finished iOS Simulator artifact, then confirm the same Appetize link shows the completed page.
7. Run Guardian review before committing the page.

Use the scaffold helper when a page arrives:

```powershell
npm run scaffold:page -- -PageName "seller profile" -AssetName "avatar,header image,rating icon"
```

The helper creates the page directory, a local README, the page `assets/` directory, and optional per-asset folders. It never overwrites existing files.
