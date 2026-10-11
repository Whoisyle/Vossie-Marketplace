# ADR 0001: Universal Expo application foundation

- Status: accepted
- Date: 2026-10-10
- Decision: DEC-002
- Approved by: project owner

## Context

Vossie needs one development loop for React Native interfaces on iOS, Android, and the web. The repository previously had no approved frontend framework, package manager, hosting path, or application source. The product and 177-screen specification package is still missing, so this decision must enable engineering without inventing marketplace behavior.

## Decision

Vossie will use:

- Expo managed workflow, pinned to Expo SDK 57.
- React Native and React Native Web with Expo Router.
- Strict TypeScript and the `src/app` route convention.
- npm with a committed `package-lock.json`.
- Expo Go for the first native development loop; development builds only when native capabilities require them.
- EAS Build for native artifacts, EAS Update for compatible JavaScript and asset updates, and EAS Hosting for the exported web application.
- Supabase behind typed service adapters. Database schema, authorization policies, authentication behavior, and marketplace data contracts require separate approved decisions.

Application code lives at the repository root. Route files contain routing concerns only; reusable UI, screen bodies, configuration, services, and theme tokens live under `src/`.

## Quality gates

Every foundation change must pass lint, strict TypeScript checking, unit tests, and a static web export. A running Metro server and an HTTP response do not alone prove a visible client refresh; browser and native clients are verified independently.

## Consequences

- Windows supports local web and physical-device development, but cannot run Apple's local iOS Simulator.
- Remote iOS Simulator use depends on EAS account access and a compatible development build.
- Product flows, visual identity beyond supplied assets, authentication, payments, logistics, database schema, and the canonical screen map remain unapproved.
- Additional state or data libraries are added only when approved features justify them.
