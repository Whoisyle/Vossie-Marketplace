import { newIdempotencyKey } from "@/services/commerce";
import * as money from "@/services/money";
import * as sellerService from "@/services/seller";
import type { DemoAction, DemoState } from "@/state/demoReducer";

import { DOC_KIND_TO_DB, loadSellerState } from "./live";
import type { SellerAction, SellerListing, SellerProfile } from "./types";

type Dispatch = (action: DemoAction) => void;

const KIND_TO_DB = { "campus-business": "campus_business", registered: "registered", student: "student" } as const;

/** Whether an action is one of the seller's (they all start with "seller"). */
export function isSellerAction(action: DemoAction): action is SellerAction {
  return action.type.startsWith("seller");
}

/** A local picture, as opposed to a path already in storage. */
function isLocalFile(uri: string | undefined): uri is string {
  return Boolean(uri && /^(file:|blob:|content:|data:|https?:)/.test(uri));
}

async function saveOnboarding(profile: SellerProfile, campusId: string): Promise<void> {
  if (!profile.kind) return;
  let logoPath: string | null = null;
  if (isLocalFile(profile.logoUri)) {
    logoPath = await sellerService.uploadSellerFile("logo", { name: "logo.jpg", uri: profile.logoUri }, "avatars");
  }
  await sellerService.saveSellerOnboarding({
    bio: profile.description,
    campusId,
    closesAt: profile.closes,
    displayName: profile.storeName,
    kind: KIND_TO_DB[profile.kind],
    locationText: profile.location,
    logoPath,
    openDays: profile.days,
    opensAt: profile.opens,
    phone: profile.phone,
  });
}

function listingInput(listing: SellerListing, campusId: string) {
  return {
    campusId,
    categoryId: listing.category,
    description: listing.description || listing.title,
    id: listing.id.startsWith("sl-") ? undefined : listing.id,
    title: listing.title,
    type: listing.category === "services" ? ("service" as const) : ("goods" as const),
  };
}

/**
 * Sends one seller action to the real services. The screens have already applied it locally (so they feel instant and a
 * half-finished setup is kept); this makes it real and then reads the truth back. A failure is thrown for the caller to
 * show, and the truth is read back anyway, which undoes the local change.
 */
export async function runLiveSellerAction(action: SellerAction, state: DemoState, dispatch: Dispatch): Promise<void> {
  const seller = state.seller;
  const campusId = state.profile?.campusId ?? "potchefstroom";
  try {
    switch (action.type) {
      case "sellerSetBasics":
        // the seller row has to exist before documents can be attached to it, so it is created as soon as step 1 is done
        await saveOnboarding({ ...seller.profile, phone: action.phone, storeName: action.storeName }, campusId);
        break;
      case "sellerSaveStore":
        await saveOnboarding({ ...seller.profile, ...action.patch }, campusId);
        break;
      case "sellerUploadDocument":
        if (action.uri) await sellerService.attachSellerDocument(DOC_KIND_TO_DB[action.kind], { name: action.fileName, uri: action.uri });
        break;
      case "sellerSubmitVerification":
        await sellerService.submitSellerVerification();
        break;
      case "sellerRespondOrder":
        await sellerService.respondToOrder(action.id, action.accept, action.reason);
        break;
      case "sellerAdvanceOrder":
        await sellerService.advanceOrder(action.id, action.to);
        break;
      case "sellerSaveListing": {
        const input = listingInput(action.listing, campusId);
        const id = await sellerService.upsertListing(input, [{ id: action.listing.optionId, label: "Standard", onHand: action.listing.onHand, priceCents: action.listing.priceCents, unlimited: action.listing.unlimited }]);
        // publishing needs a photo, which the app cannot upload yet; the server says so and the listing stays a draft
        if (action.listing.status === "published" || action.listing.status === "under-review") await sellerService.submitListing(id);
        break;
      }
      case "sellerPauseListing":
        await sellerService.setListingPaused(action.id, action.paused);
        break;
      case "sellerRestock": {
        const listing = seller.listings.find((item) => item.id === action.id);
        if (listing) {
          await sellerService.upsertListing(listingInput(listing, campusId), [{ id: listing.optionId, label: "Standard", onHand: listing.onHand + action.quantity, priceCents: listing.priceCents, unlimited: listing.unlimited }]);
        }
        break;
      }
      case "sellerAdjustStock": {
        const listing = seller.listings.find((item) => item.id === action.id);
        if (listing) {
          await sellerService.upsertListing(listingInput(listing, campusId), [{ id: listing.optionId, label: "Standard", onHand: Math.max(0, listing.onHand + action.delta), priceCents: listing.priceCents, unlimited: listing.unlimited }]);
        }
        break;
      }
      case "sellerArchiveListing":
        // the database has no archived state yet, so an archived product is paused there
        await sellerService.setListingPaused(action.id, action.archived);
        break;
      case "sellerSaveBank": {
        const known = await money.listPayoutDestinations();
        if (!known.some((item) => item.account_last4 === action.bank.last4 && item.bank_name === action.bank.bankName)) {
          await money.addPayoutDestination(action.bank.bankName, action.bank.accountHolder, action.bank.last4);
        }
        break;
      }
      case "sellerWithdraw": {
        const destinations = await money.listPayoutDestinations();
        const bank = seller.profile.bank;
        const destination = destinations.find((item) => bank && item.account_last4 === bank.last4) ?? destinations[0];
        if (!destination) throw new Error("no_payout_destination");
        await money.requestPayout(action.amountCents, "seller", destination.id, newIdempotencyKey());
        break;
      }
      default:
        // wizard steps, alerts, the demo review and the courier, promotion, review, case and team screens (still demo) need no server call
        return;
    }
  } finally {
    const patch = await loadSellerState().catch(() => null);
    if (patch) dispatch({ patch, type: "sellerHydrate" });
  }
}

/** Checks a collection code with the server. The code itself never reaches the seller's screen. */
export async function completeHandoffLive(sellerOrderId: string, code: string, dispatch: Dispatch): Promise<{ ok: boolean; message?: string }> {
  const result = await sellerService.completeCampusHandoff(sellerOrderId, code.trim());
  const patch = await loadSellerState().catch(() => null);
  if (patch) dispatch({ patch, type: "sellerHydrate" });
  if (result.ok) return { ok: true };
  const messages = { expired: "That code has expired. Ask the buyer for a new one.", locked: "Too many wrong tries. Wait a few minutes, then try again.", no_code: "This order has no code to check.", wrong_code: "That code does not match. Ask the buyer to read it out again." } as const;
  return { message: messages[result.error], ok: false };
}
