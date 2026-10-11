# Vossie page build loop

Every page supplied by the project owner follows one repeatable loop:

1. Decompose the reference into route, screen composition, sections, reusable components, interactions, and assets.
2. Scaffold `src/screens/<page>/` with a page-local `assets/` directory. Put each page-only asset in `assets/<asset-name>/`; keep reusable brand assets in `assets/branding/`.
3. Implement the screen and route in the approved Expo structure without inventing product behavior that is not in the supplied reference or canonical specification.
4. Run lint, strict TypeScript, tests, static web export, and Expo Doctor.
5. Verify the saved source change and rendered page in Chrome.
6. Build the `ios-appetize` profile (an embedded-JS iOS Simulator build, not the Metro-only `ios-simulator` development client), update the existing Appetize Vossie build, then confirm the same Appetize link shows the completed page.
7. Run Guardian review before committing the page.
8. Commit the approved page and its documentation with a focused Conventional Commit. Confirm `git status --short` contains only intentional changes before committing; never stage `.env`, `.local/`, credentials, or generated evidence unless explicitly approved.

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
