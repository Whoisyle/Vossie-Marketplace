# Vossie design system

This folder is the implementation handoff for the Vossie Marketplace design system.

## Authority

Use this order when sources disagree:

1. Latest explicit project-owner decision.
2. Accepted repository decision record.
3. Latest owner-approved screen supplied for the feature being built.
4. `Vossie_Marketplace_Design_System_v1.1.pdf` and the token files in this folder.
5. Historical screen atlases and prototypes.

The archived 177-screen atlas is useful for inventory and edge cases. It is not the current screen source. The owner supplies the correct screens one by one.

## Contents

- `source/` - preserved, unmodified input PDF.
- `Vossie_Marketplace_Design_System_v1.1.pdf` - expanded visual and interaction specification.
- `tokens/vossie.tokens.json` - platform-neutral token source.
- `tokens/vossie.css` - web custom properties.
- `tokens/vossie.ts` - typed Expo/React Native tokens.
- `COMPONENTS.md` - component contracts and required states.
- `SCREEN_INTAKE.md` - checklist for each owner-supplied screen.
- `GOVERNANCE.md` - naming, review, versioning, and change rules.

## Current release rules

- The primary theme is light mode.
- Dark aliases are experimental and must not be enabled in production until contrast, imagery, badge, shadow, and component-state audits pass.
- Reels is outside v1. The navigation slot is feature-gated; v1 uses the approved four-destination marketplace navigation unless the owner changes the scope.
- Eduvos sign-in is delegated to the real institutional provider. Do not build a fake institutional password form.
- The approved geometric Vossie wordmark is always used as artwork. Never recreate it by typing a font name.
- Canto and Minimalist require verified licensed font files. Until those files are present, use the documented platform fallbacks.

## Implementation status

These artifacts define the design contract. They do not automatically update `src/theme/index.ts`; a scoped Pixel task must reconcile the application theme, test every changed screen, and obtain Guardian PASS.
