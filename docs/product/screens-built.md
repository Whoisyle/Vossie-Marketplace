# Screens built from `design/screens/`

Status of the frontend demo. Every screen runs on the in-memory demo store (`src/state/DemoStore.tsx`) and mock catalogue (`src/data/`). Nothing here is live: no identity, payment, payout, carrier or messaging provider is connected.

| Reference | Screen | Route | Notes |
| --- | --- | --- | --- |
| 02, 03 | Welcome, Sign in | `/`, `/sign-in` | Built earlier. |
| 05 (all variants) | Home | `/home` | Category chips filter the popular grid. |
| 06 | Listing detail | `/home/listing/[id]` | Options, quantity, follow, message seller. |
| (none) | Explore | `/explore` | No reference supplied; search and category filter written to match Home. |
| 18 | Reels | `/reels` | Like, comments sheet, share, link to listing. No video; coloured canvas as in the reference. |
| 10 (+ empty) | Activity | `/activity` | Empty state shown only when there are no orders and no bookings. |
| 11 | My Orders | `/activity/orders` | Active, Upcoming, Complete, Cancelled. |
| (none) | Order detail, Booking detail | `/activity/order/[id]`, `/activity/booking/[id]` | Not in the references; added because notifications link to them. |
| (none) | Cart | `/cart` | No reference supplied. |
| 07 | Checkout | `/cart/checkout` | Voucher codes `VOSSIE10`, `WELCOME20`. |
| 08 | Add a new card | `/cart/add-card` | Card is kept in memory only. |
| 09 | Order confirmation | `/cart/confirmation` | |
| 12, 12-alt | Account | `/account` | Role switch is demo only. |
| 13 | Edit profile | `/account/edit-profile` | Email is locked (comes from Eduvos). |
| 14 | Wallet | `/account/wallet` | Add funds is a demo top-up. |
| 15 | Inbox, conversation | `/account/inbox`, `/account/inbox/[id]` | |
| 16 | Security and settings | `/account/security` | Password is managed by Eduvos Microsoft sign-in. |
| 17 | Help | `/account/help` | FAQ accordion; support chat opens a local conversation. |

## Deviations from the references

- The "Save card details" checkbox on Add a new card is omitted: a card that is not saved cannot be selected at checkout, so the control would not do what it says.
- Wallet is not offered as a payment method at checkout; the reducer does not debit it.
- Burger & Chips and other listings without photos show the grey placeholder until real images are supplied.
- The notification bell shows a toast; a notifications screen has not been designed.

## Not verified

Chrome web export was checked against the references. The physical iPhone (Expo Go) pass and Guardian review from `docs/engineering/page-build-loop.md` have not been run for these screens.
