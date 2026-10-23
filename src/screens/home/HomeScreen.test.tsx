import { act, fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { HomeScreen } from "./HomeScreen";
import { HERO_HOLD_MS } from "./HomeHero";
import { PROMOS } from "./PromoCarousel";

const mockPush = jest.fn();
const mockNavigate = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  usePathname: () => "/home",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: mockNavigate, push: mockPush, replace: jest.fn() }),
}));

const signedIn = () => demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });

describe("Home", () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockNavigate.mockClear();
  });

  it("shows the teal header with the campus, search with filters, and the first promo", () => {
    renderWithProviders(<HomeScreen />, signedIn());
    expect(screen.getByTestId("home-campus")).toBeTruthy();
    expect(screen.getByText("Potchefstroom")).toBeTruthy();
    expect(screen.getByLabelText("Search products, service and sellers")).toBeTruthy();
    expect(screen.getByTestId("open-filters")).toBeTruthy();
    expect(screen.getByTestId("home-hero")).toBeTruthy();
    expect(screen.getByText(PROMOS[0]!.title)).toBeTruthy();
  });

  it("fades to the next promo on its own, and tapping a promo opens it", () => {
    jest.useFakeTimers();
    renderWithProviders(<HomeScreen />, signedIn());
    act(() => {
      jest.advanceTimersByTime(HERO_HOLD_MS + 50);
    });
    expect(screen.getByText(PROMOS[1]!.title)).toBeTruthy();
    fireEvent.press(screen.getByLabelText(new RegExp(PROMOS[1]!.title)));
    expect(mockPush).toHaveBeenCalledWith(`/home/promo/${PROMOS[1]!.id}`);
    jest.useRealTimers();
  });

  it("narrows the Popular row when a category card is chosen, and clears it when tapped again", () => {
    renderWithProviders(<HomeScreen />, signedIn());
    expect(screen.getByTestId("category-cards")).toBeTruthy();
    expect(screen.getAllByTestId("listing-card-planner-notebooks").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("category-food"));
    expect(screen.queryByTestId("listing-card-planner-notebooks")).toBeNull();
    expect(screen.getAllByTestId("listing-card-burger-chips").length).toBeGreaterThan(0);
    fireEvent.press(screen.getByTestId("category-food"));
    expect(screen.getAllByTestId("listing-card-planner-notebooks").length).toBeGreaterThan(0);
  });
});
