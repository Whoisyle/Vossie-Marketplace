# Design-system governance

## Naming

- Tokens use semantic names such as `color.text.primary`, never value names such as `darkBlue`.
- Components use `Domain/Component/Variant/State` in Figma and equivalent stable names in code.
- Screen-specific visual decisions stay with the screen until two verified uses justify promotion into the shared system.

## Change process

1. Record the problem and affected screens.
2. Identify the current token/component and authoritative source.
3. Test the proposed change in compact, medium, and expanded layouts.
4. Check accessibility and reduced motion.
5. Update JSON, CSS, TypeScript, Figma variables/components, PDF, and changelog together.
6. Run application verification on affected screens.
7. Obtain Guardian PASS.

## Versioning

- Patch: documentation correction or token alias that does not change rendered behavior.
- Minor: additive token, component, or backwards-compatible variant.
- Major: renamed/removed tokens, navigation change, brand direction change, or incompatible component contract.

## Deprecation

- Mark a token/component deprecated with its replacement and removal target.
- Keep a compatibility alias through at least one minor release when practical.
- Remove only after repository search confirms no approved screen depends on it.

## Ownership

- Pixel owns implementation and Figma/code parity.
- Kinetic owns motion contracts and reduced-motion equivalents.
- Lens verifies visual fidelity and accessibility.
- Scribe owns documentation synchronization.
- Guardian gates release of design-system changes.
- The project owner approves brand, navigation, and product-scope changes.

## Decision notes for v1.1

- Preserved the supplied teal-led design direction.
- Added complete semantic light aliases and explicit status colors.
- Added experimental dark aliases but prohibited production enablement before audit.
- Reconciled navigation with the approved v1 plan by feature-gating Reels.
- Added responsive, component, accessibility, implementation, and governance contracts.
- Added platform-neutral, web, and Expo token deliverables.
