# Seller app redesign (2026-11-18)

Inspiration: the owner's "Insightlancer" reference (a navy app with a greeting and search, an outlined welcome card with an illustration, a 2 x 2 grid of progress cards with one dark highlighted card, a floating centre "+" button, and a profile page with a big header card, stats, a folders row and a team list).

## Owner decisions

| Question | Answer |
| --- | --- |
| Scope | Everything on the seller side, built in stages and shipped one at a time. |
| Colours | Vossie teal with the owner's accent colours (sage, steel, slate, charcoal). Not navy. |
| Centre "+" button | A quick actions menu. Payouts leaves the bar and is reached from Home and Account. |
| Home content | Greeting, search and shop status; live order cards with progress; a welcome banner with the boxes; today at a glance; and more ideas from me. |

## Stages

**A. Home, the bar and quick actions: built.**
- Home: "Hi Vumisa!" with the store logo and bell; a search over orders and products; shop status and close-early; a welcome card whose message follows what matters now (verification, new orders, finishing the shop, or a tip), with the looping Vossie boxes; a shop checklist ("Your shop is 33% complete") with the next step; "Ongoing orders" as cards with progress bars, the most urgent one dark teal; "Today at a glance" with sales today against yesterday, seven small bars, this week and the weekly goal; needs your attention; best sellers; grow your shop.
- Bar: Home, Products, a round "+" in the middle, Orders, Account. The "+" opens Add a product, Post a reel, New promotion, Share your store, Close early today, Withdraw money.
- Not built from the list: campus demand insights (needs real data).

**B. Account as a store profile: built.** A teal header card with the store logo, name, campus and verified badge, and three big numbers (Orders, Rating, Products); then a "Collections" row, a team list (the owner and helpers, then couriers who deliver for you), the student card, and the existing rows with softer sage icon tiles. Followers are not shown because there is no real follower count yet.

**C. Orders: built.** Three number cards (New, In progress, Ready) that filter the list, the same search field as Home, and a progress bar on every order in progress. The order page already had a timeline, so it is unchanged.

**D. Products and Payouts: built.** Products is a two-column grid with a photo, price, stock bar (orange when low) and Restock and Pause buttons, with Live, Low stock and Drafts cards at the top. Payouts is a dark teal balance card, Pending and Fees cards, the week chart, and a "How payouts work" explainer (not tied to a particular payout). Pages not listed here (Reels, Promotions, Analytics, Reviews, Team and so on) keep their current look; they can be brought across one by one.

## Ideas added beyond the brief

Shop checklist with a percent ring; sales today against yesterday; best sellers; low-stock count beside them; a search over orders and products; and a banner that changes with the situation. Candidates for later: busy-hours heat map on Home, a "students are looking for" strip (needs real data), and a courier arriving ETA on ready orders.

## Notes

- The page uses the white tone (the bar turns dark teal on it), with white cards and the dark-teal highlight, sage and cloud-grey tints.
- The bar now counts only the tabs it shows, so a page without a tab (Payouts) no longer shifts the highlight.
- `src/seller/homeData.ts` holds the logic (progress, today vs yesterday, checklist, best sellers, search) and is unit tested.
