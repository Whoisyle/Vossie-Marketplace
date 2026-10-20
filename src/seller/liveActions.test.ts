import * as money from "@/services/money";
import * as sellerService from "@/services/seller";
import { createInitialState, demoReducer, type DemoAction, type DemoState } from "@/state/demoReducer";

import { completeHandoffLive, isSellerAction, runLiveSellerAction } from "./liveActions";
import type { SellerAction } from "./types";

jest.mock("@/services/seller");
jest.mock("@/services/money");
jest.mock("@/services/commerce", () => ({ newIdempotencyKey: () => "key-123" }));
// reading the state back is tested elsewhere; here it should return nothing so only the calls are checked
jest.mock("./live", () => ({ ...jest.requireActual("./live"), loadSellerState: jest.fn().mockResolvedValue(null) }));

const seller = sellerService as jest.Mocked<typeof sellerService>;
const cash = money as jest.Mocked<typeof money>;

function state(): DemoState {
  let current = demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
  for (const action of [{ kind: "campus-business", type: "sellerSetKind" }, { phone: "0825735164", storeName: "CampusBites", type: "sellerSetBasics" }] as SellerAction[]) current = demoReducer(current, action);
  return current;
}

const none: (action: DemoAction) => void = () => undefined;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("sending seller actions to the real services", () => {
  it("recognises seller actions", () => {
    expect(isSellerAction({ type: "sellerStart" })).toBe(true);
    expect(isSellerAction({ type: "signOut" })).toBe(false);
  });

  it("creates the seller as soon as step 1 is done, in the database's words", async () => {
    await runLiveSellerAction({ phone: "0825735164", storeName: "CampusBites", type: "sellerSetBasics" }, state(), none);
    expect(seller.saveSellerOnboarding).toHaveBeenCalledWith(expect.objectContaining({ campusId: "potchefstroom", displayName: "CampusBites", kind: "campus_business", phone: "0825735164", openDays: ["mon", "tue", "wed", "thu", "fri"] }));
  });

  it("uploads a document with the file that was picked", async () => {
    await runLiveSellerAction({ fileName: "id.jpg", kind: "id", type: "sellerUploadDocument", uri: "file:///id.jpg" }, state(), none);
    expect(seller.attachSellerDocument).toHaveBeenCalledWith("id", { name: "id.jpg", uri: "file:///id.jpg" });
    await runLiveSellerAction({ fileName: "x.jpg", kind: "student-card", type: "sellerUploadDocument", uri: "file:///c.jpg" }, state(), none);
    expect(seller.attachSellerDocument).toHaveBeenLastCalledWith("student_card", expect.anything());
  });

  it("submits for review, accepts, declines and advances orders", async () => {
    await runLiveSellerAction({ type: "sellerSubmitVerification" }, state(), none);
    expect(seller.submitSellerVerification).toHaveBeenCalled();
    await runLiveSellerAction({ accept: true, id: "so-1", type: "sellerRespondOrder" }, state(), none);
    expect(seller.respondToOrder).toHaveBeenCalledWith("so-1", true, undefined);
    await runLiveSellerAction({ accept: false, id: "so-2", reason: "Sold out", type: "sellerRespondOrder" }, state(), none);
    expect(seller.respondToOrder).toHaveBeenLastCalledWith("so-2", false, "Sold out");
    await runLiveSellerAction({ id: "so-1", to: "ready", type: "sellerAdvanceOrder" }, state(), none);
    expect(seller.advanceOrder).toHaveBeenCalledWith("so-1", "ready");
  });

  it("saves a listing and asks for it to be published, and pauses one", async () => {
    seller.upsertListing.mockResolvedValue("listing-1");
    await runLiveSellerAction({ listing: { category: "food", description: "Tasty", id: "sl-new", onHand: 5, priceCents: 4500, status: "published", title: "Kota", photos: [], sku: "VM-0001", unlimited: false, updatedAt: "", variants: [] }, type: "sellerSaveListing" }, state(), none);
    expect(seller.upsertListing).toHaveBeenCalledWith(expect.objectContaining({ id: undefined, title: "Kota", type: "goods" }), [expect.objectContaining({ onHand: 5, priceCents: 4500 })]);
    expect(seller.submitListing).toHaveBeenCalledWith("listing-1");
    await runLiveSellerAction({ id: "listing-1", paused: true, type: "sellerPauseListing" }, state(), none);
    expect(seller.setListingPaused).toHaveBeenCalledWith("listing-1", true);
  });

  it("withdraws to the saved payout destination with an idempotency key", async () => {
    cash.listPayoutDestinations.mockResolvedValue([{ account_holder: "V", account_last4: "1234", bank_name: "Capitec", id: "dest-1", is_default: true }] as never);
    let current = state();
    current = demoReducer(current, { bank: { accountHolder: "V", bankName: "Capitec", last4: "1234" }, type: "sellerSaveBank" });
    await runLiveSellerAction({ amountCents: 50_000, type: "sellerWithdraw" }, current, none);
    expect(cash.requestPayout).toHaveBeenCalledWith(50_000, "seller", "dest-1", "key-123");
  });

  it("does not call the server for wizard steps or the demo review", async () => {
    await runLiveSellerAction({ step: 2, type: "sellerGoToStep" }, state(), none);
    await runLiveSellerAction({ type: "sellerReviewTick" }, state(), none);
    expect(seller.saveSellerOnboarding).not.toHaveBeenCalled();
    expect(seller.submitSellerVerification).not.toHaveBeenCalled();
  });

  it("reads the truth back even when the server says no, and passes the error on", async () => {
    const live = jest.requireMock("./live") as { loadSellerState: jest.Mock };
    live.loadSellerState.mockResolvedValueOnce({ status: "setup" });
    seller.submitSellerVerification.mockRejectedValueOnce(new Error("documents_missing: {id}"));
    const dispatched: DemoAction[] = [];
    await expect(runLiveSellerAction({ type: "sellerSubmitVerification" }, state(), (action) => dispatched.push(action))).rejects.toThrow("documents_missing");
    expect(dispatched).toEqual([{ patch: { status: "setup" }, type: "sellerHydrate" }]);
  });
});

describe("the collection code", () => {
  it("is checked by the server and its answer is shown in plain words", async () => {
    seller.completeCampusHandoff.mockResolvedValueOnce({ ok: true });
    expect(await completeHandoffLive("so-1", " 123456 ", none)).toEqual({ ok: true });
    expect(seller.completeCampusHandoff).toHaveBeenCalledWith("so-1", "123456");
    seller.completeCampusHandoff.mockResolvedValueOnce({ error: "wrong_code", ok: false });
    expect(await completeHandoffLive("so-1", "000000", none)).toMatchObject({ message: expect.stringContaining("does not match"), ok: false });
    seller.completeCampusHandoff.mockResolvedValueOnce({ error: "locked", ok: false });
    expect((await completeHandoffLive("so-1", "000000", none)).message).toMatch(/Too many wrong tries/);
  });
});
