import { fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { SellerQuickActions } from "./SellerQuickActions";

const mockPush = jest.fn();
jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  usePathname: () => "/seller/home",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, push: mockPush, replace: jest.fn() }),
}));

const signedIn = () => demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });

describe("the quick actions menu", () => {
  beforeEach(() => mockPush.mockClear());

  it("lists the things a seller does most", () => {
    renderWithProviders(<SellerQuickActions onClose={jest.fn()} visible />, signedIn());
    for (const key of ["product", "reel", "promotion", "share", "early", "withdraw"]) expect(screen.getByTestId(`quick-${key}`)).toBeTruthy();
  });

  it("opens the right page and closes the menu", () => {
    const onClose = jest.fn();
    renderWithProviders(<SellerQuickActions onClose={onClose} visible />, signedIn());
    fireEvent.press(screen.getByTestId("quick-product"));
    expect(mockPush).toHaveBeenLastCalledWith("/seller/products/new");
    fireEvent.press(screen.getByTestId("quick-reel"));
    expect(mockPush).toHaveBeenLastCalledWith("/seller/products/reel/new");
    fireEvent.press(screen.getByTestId("quick-promotion"));
    expect(mockPush).toHaveBeenLastCalledWith("/seller/account/promotion/new");
    fireEvent.press(screen.getByTestId("quick-withdraw"));
    expect(mockPush).toHaveBeenLastCalledWith("/seller/payouts");
    expect(onClose).toHaveBeenCalledTimes(4);
  });

  it("shows nothing when it is not open", () => {
    renderWithProviders(<SellerQuickActions onClose={jest.fn()} visible={false} />, signedIn());
    expect(screen.queryByTestId("quick-actions")).toBeNull();
  });
});
