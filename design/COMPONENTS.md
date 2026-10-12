# Component contracts

Every component must define anatomy, variants, sizes, states, accessibility behavior, and data authority. Visual examples in the PDF are illustrative; code and Figma names follow the contracts below.

## Buttons

- Variants: primary, secondary, ghost, destructive, icon, link.
- Sizes: small 40, default 48, large 56. Interactive area remains at least 44 by 44.
- States: default, hover/web, pressed, focus-visible, loading, disabled.
- Loading keeps the label width stable and prevents duplicate submission.
- Disabled is never communicated by opacity alone; use disabled semantics and appropriate text/border tokens.
- Destructive actions name the effect and use a confirmation only when reversal is difficult.

## Inputs and text areas

- Anatomy: persistent label, control, optional leading/trailing affordance, help text, error text.
- States: empty, filled, hover/web, focus, valid, error, disabled, read-only, loading.
- Placeholder text never replaces the label.
- Error text identifies what failed and how to fix it.
- Password, OTP, search, money, phone, and multiline inputs are separate variants.

## Selection controls

- Checkbox for independent multi-selection.
- Radio for one choice from a visible set.
- Switch for an immediate setting; never for form submission.
- Segmented control for two to five peer views, not primary navigation.
- Chips support filters and compact categories; selected state includes more than color.

## Listing and service cards

- Required anatomy: media, item/service name, seller/trust context, price, campus or fulfillment signal, availability/status, primary action.
- Variants: product, food, service, rental, skeleton, unavailable.
- Seller verification is shown only from authoritative data.
- Do not fabricate delivery time, distance, inventory, discount, rating, or campus.
- Images use approved aspect ratios and meaningful accessibility labels when informative.

## Navigation

- Marketplace v1: Home, Explore, Activity, Account.
- Reels is a feature-gated slot outside v1. When enabled later, it occupies the documented third position after owner approval.
- Seller, courier, and staff workspaces use role-appropriate navigation without granting permission.
- Account holds role switching and enrollment status; role visibility never substitutes for server authorization.
- Web operations use a persistent sidebar at expanded widths and a compact drawer at smaller widths.

## Feedback and overlays

- Badge: verification, neutral status, success, warning, danger, info.
- Banner: page-level persistent information with action.
- Toast: brief confirmation; never the only record of a financial or custody result.
- Inline alert: local validation or recoverable failure.
- Modal: blocking decision with focus trap and clear dismissal behavior.
- Sheet: contextual mobile task with drag and explicit close affordances.
- Empty state: explains why the area is empty and provides one useful next action.
- Skeleton: mirrors content structure and stops when authoritative data resolves.

## Commerce patterns

- Price breakdown shows item subtotal, service amount, delivery, fee, discount, tax if applicable, and total using immutable quote data.
- Order status uses text, icon, and timestamp; color is supporting information.
- Payment, refund, payout, custody, and delivery success appear only after server/provider confirmation.
- Reorder creates a new cart and requires fresh stock, price, fulfillment, and payment confirmation.

## Required cross-component states

`default`, `hover`, `focus-visible`, `pressed`, `loading`, `empty`, `offline`, `error`, `success`, `disabled`, `read-only`, `expired`, `restricted`, and `permission-denied` as applicable.
