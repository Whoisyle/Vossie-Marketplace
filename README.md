<div align="center">

# Vossie Marketplace

### Buy. Sell. Deliver. The campus marketplace for Eduvos students.

One app for iPhone, Android and the web, with three modes: **Buyer**, **Seller** and **Courier**.

[![Live demo](https://img.shields.io/badge/Live_demo-vossie--marketplace.vercel.app-1F3A4D?style=for-the-badge&logo=vercel&logoColor=white)](https://vossie-marketplace.vercel.app)
[![Status](https://img.shields.io/badge/Status-Working_prototype-F59E0B?style=for-the-badge)](docs/DEMO-TO-REAL.md)
[![License](https://img.shields.io/badge/License-Proprietary-B91C1C?style=for-the-badge)](LICENSE)

<br />

<a href="docs/media/vossie-launch.mp4">
  <img src="docs/media/vossie-launch-poster.jpg" width="720" alt="Watch the Vossie launch film" />
</a>

**[▶ Watch the launch film](docs/media/vossie-launch.mp4)**

</div>

<br />

## Getting in

<table>
  <tr>
    <td align="center"><img src="docs/screenshots/01-intro.png" width="200" alt="Animated intro" /></td>
    <td align="center"><img src="docs/screenshots/02-welcome.png" width="200" alt="Animated welcome" /></td>
    <td align="center"><img src="docs/screenshots/03-microsoft-sign-in.png" width="200" alt="Microsoft sign in" /></td>
    <td align="center"><img src="docs/screenshots/04-verified-student-card.png" width="200" alt="Verified student card" /></td>
  </tr>
  <tr>
    <td align="center"><b>Intro</b><br />Animated wordmark</td>
    <td align="center"><b>Welcome</b><br />Animated gallery</td>
    <td align="center"><b>Sign in</b><br />Microsoft account</td>
    <td align="center"><b>Verified</b><br />Student card</td>
  </tr>
</table>

## What it does

| Mode | What you can do |
| --- | --- |
| **Buyer** | Browse by category, search, watch Reels, view listings, add to cart, check out with card or voucher, track orders and bookings, manage wallet, inbox and security. |
| **Seller** | Set up a store, list products, manage stock, receive and fulfil orders, hand over with a code, see earnings and payouts. |
| **Courier** | Set up availability, take delivery jobs, run an active delivery, track earnings. |

Money is handled as integer ZAR cents throughout.

> **Working prototype.** The full experience is built and runs on demo data. The Supabase backend is designed, tested and live, but payments, real sign-in and verification are not connected yet. See [what is still demo](docs/DEMO-TO-REAL.md).

## Tech stack

**App**

![Expo](https://img.shields.io/badge/Expo-000020?style=for-the-badge&logo=expo&logoColor=white)
![React Native](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![React](https://img.shields.io/badge/React-149ECA?style=for-the-badge&logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Expo Router](https://img.shields.io/badge/Expo_Router-4630EB?style=for-the-badge&logo=expo&logoColor=white)

**Backend**

![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Row Level Security](https://img.shields.io/badge/Row_Level_Security-0F766E?style=for-the-badge)
![Edge Functions](https://img.shields.io/badge/Edge_Functions-F97316?style=for-the-badge&logo=deno&logoColor=white)

**Build, test and ship**

![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge&logo=vercel&logoColor=white)
![EAS](https://img.shields.io/badge/EAS_Build-4630EB?style=for-the-badge&logo=expo&logoColor=white)
![Jest](https://img.shields.io/badge/Jest-C21325?style=for-the-badge&logo=jest&logoColor=white)
![ESLint](https://img.shields.io/badge/ESLint-4B32C3?style=for-the-badge&logo=eslint&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-88CE02?style=for-the-badge&logo=greensock&logoColor=black)

## Getting started

```bash
npm ci
cp .env.example .env.local   # add your own Supabase values
npm run web                  # open the Metro URL in Chrome
```

```bash
npm run start:go             # iPhone with Expo Go on the same network
npm run start:dev-client     # an installed Vossie development build
```

Out of the box the app runs on in-memory demo data, so it works without a backend. Set `EXPO_PUBLIC_USE_BACKEND=true` to use Supabase.

**Demo sign-in:** `eduv230953@vossie.net` is a returning user. Any other email starts profile setup. Voucher codes: `VOSSIE10`, `WELCOME20`.

## Checks

```bash
npm run verify      # lint, typecheck, unit tests, web export
npm run test:db     # database and row-level security tests
```

## Project layout

| Path | Purpose |
| --- | --- |
| `src/app/` | Expo Router routes: tabs, seller, courier and onboarding flows |
| `src/screens/`, `src/components/` | Screens and shared UI |
| `src/seller/`, `src/courier/` | Seller and courier modes |
| `src/services/`, `src/backend/` | Typed service layer over Supabase |
| `src/theme/` | Design tokens |
| `supabase/` | Migrations, Edge Functions, seed data and database tests |
| `design/` | Design system, reference screens and tokens |
| `docs/` | Architecture, product, security and decision records |
| `promo-video/` | Source for the launch film |

## Documentation

- [Backend architecture](docs/architecture/backend.md)
- [Screens built](docs/product/screens-built.md)
- [Design system](design/README.md)
- [What is still demo](docs/DEMO-TO-REAL.md)
- [Documentation index](docs/INDEX.md)

## Engineering workflow

The repository also carries an AI-agent engineering runtime ([`AGENTS.md`](AGENTS.md), [`AGENT-CONTRACTS.md`](AGENT-CONTRACTS.md), `.vossie/`, `.cursor/`). Contributors working by hand can ignore it.

## Contributing

Open a pull request using the [template](.github/PULL_REQUEST_TEMPLATE.md). Run `npm run verify` first.

## License

Copyright © 2026 Vossie Marketplace. All rights reserved. See [LICENSE](LICENSE).
