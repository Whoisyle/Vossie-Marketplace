# Vossie application foundation

This document implements [ADR 0001](../decisions/0001-universal-expo-foundation.md). It defines engineering boundaries, not marketplace behavior.

## Runtime surfaces

```text
Shared TypeScript application
  -> Expo Router routes
  -> React Native UI
     -> iOS / Android through Expo Go or a development build
     -> Web through React Native Web and Metro
  -> typed service interfaces
     -> Supabase adapters when their contracts are approved
```

## Source layout

- `src/app/`: Expo Router routes and layouts only.
- `src/screens/`: route-level screen compositions.
- `src/components/`: reusable accessible UI.
- `src/theme/`: semantic colors, spacing, typography, and radius tokens.
- `src/config/`: non-secret runtime and foundation configuration.
- `src/services/`: future typed external-service boundaries.
- `assets/`: committed application assets supplied or approved by the project owner.

Native `ios/` and `android/` projects are not committed unless an approved capability requires prebuild or custom native code.

## Environment and security

- Client code may consume only non-secret `EXPO_PUBLIC_*` values.
- Service-role keys, payment secrets, and privileged operations must remain in a trusted server or Supabase Edge Function boundary.
- `.env`, credentials, and `.env.eas-simulator` are ignored.
- Mocks and placeholders must never be described as live integrations.

## Development workflow

1. Install with `npm ci` when the lockfile exists.
2. Run `npm run web` for Chrome, `npm run start:go` for Expo Go on the connected iPhone, or `npm run start:dev-client` for an installed Vossie development build.
3. Save TypeScript files; Metro performs Fast Refresh for connected clients.
4. Run `npm run verify` before handoff.

Only one Vossie Metro instance should own the selected development port. Chrome web, the connected iPhone, and a remote simulator are separate clients; for active page work, the physical iPhone is the primary live client and must be observed before the page is reported as working.

## EAS ownership and native build

- Cloud project: `@paballokalis-team/vossie-marketplace`.
- EAS project ID: `1136195b-ce99-42ad-9935-a9c3a4e4aef8`.
- iOS application identifier: `za.co.vossie.marketplace`.
- `ios-simulator` produces an unsigned simulator development client with Fast Refresh support when connected to Metro.
- `android-remote` produces an APK development client for EAS's remote Android emulator; Vossie does not depend on a local Android Studio emulator.
- `npm run start:remote` starts the account-signed Expo tunnel used by either remote platform. Start it only for an authorized, active EAS Simulator development session and stop it when that session ends.
- Verified build: `a5cd58ce-1bda-4c96-8552-ee5fead49a15` (Expo SDK 57, app version 0.1.0).
- The account's EAS Simulator availability check returned `available: false` on 2026-10-11. The iOS build is ready and the Android build profile is ready, but neither browser-streamed platform can be claimed as verified until Expo enables the service for this account.

## Deferred decisions

The canonical product specification remains required before implementing marketplace screens, roles, journeys, domain entities, permissions, payments, delivery flows, operations, or production data contracts.
