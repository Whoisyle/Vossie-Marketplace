import { act, fireEvent, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { ExploreScreen } from "./explore/ExploreScreen";
import { ReviewScreen } from "./listing/ReviewScreen";
import { ReelsScreen } from "./reels/ReelsScreen";
import { StorefrontScreen } from "./store/StorefrontScreen";

const mockPush = jest.fn();
let mockParams: { id: string } = { id: "iced-latte" };

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useLocalSearchParams: () => mockParams,
  usePathname: () => "/explore",
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, navigate: jest.fn(), push: mockPush, replace: jest.fn() }),
}));

function signedIn(): DemoState {
  return demoReducer(createInitialState(), { email: "eduv230953@vossie.net", type: "signIn" });
}

beforeEach(() => {
  mockPush.mockClear();
  mockParams = { id: "iced-latte" };
});

describe("Explore", () => {
  it("shows featured items, top stores and categories while idle", () => {
    renderWithProviders(<ExploreScreen />, signedIn());
    expect(screen.getAllByText("Featured").length).toBeGreaterThan(0);
    expect(screen.getByText("Top stores near you")).toBeTruthy();
    expect(screen.getByText("Browse by category")).toBeTruthy();
    expect(screen.getByTestId("featured-carousel")).toBeTruthy();
  });

  it("suggests as you type and opens a store from a suggestion", () => {
    renderWithProviders(<ExploreScreen />, signedIn());
    fireEvent.changeText(screen.getByLabelText("Search products, stores and categories"), "campus");
    fireEvent.press(screen.getByText("CampusBites"));
    expect(mockPush).toHaveBeenCalledWith("/explore/store/campusbites");
  });

  it("runs a search, remembers it and offers alternatives when nothing matches", () => {
    renderWithProviders(<ExploreScreen />, signedIn());
    const box = screen.getByLabelText("Search products, stores and categories");
    fireEvent.changeText(box, "latte");
    fireEvent.press(screen.getByTestId("search-all"));
    expect(screen.getByText(/results? for “latte”/)).toBeTruthy();
    fireEvent.changeText(box, "zzzz");
    fireEvent.press(screen.getByTestId("search-all"));
    expect(screen.getByText("Nothing found")).toBeTruthy();
  });
});

describe("Reviews", () => {
  it("lets a buyer who received the item rate it and post a review", () => {
    renderWithProviders(<ReviewScreen />, signedIn());
    expect(screen.getByText("Ratings and reviews")).toBeTruthy();
    expect(screen.getByText("How was it?")).toBeTruthy();
    fireEvent.press(screen.getByLabelText("5 stars"));
    fireEvent.changeText(screen.getByLabelText("Your review"), "Perfect.");
    fireEvent.press(screen.getByTestId("post-review"));
    expect(screen.getByText("Thank you")).toBeTruthy();
    expect(screen.getByText("Perfect.")).toBeTruthy();
  });

  it("explains why someone who has not bought the item cannot review it", () => {
    mockParams = { id: "mint-laptop" };
    renderWithProviders(<ReviewScreen />, signedIn());
    expect(screen.queryByText("How was it?")).toBeNull();
    expect(screen.getByText(/Only buyers with a completed order/)).toBeTruthy();
  });
});

describe("Storefront", () => {
  it("shows the store, its menu and switches to reviews", () => {
    mockParams = { id: "campusbites" };
    renderWithProviders(<StorefrontScreen />, signedIn());
    expect(screen.getAllByText("CampusBites").length).toBeGreaterThan(0);
    expect(screen.getByText(/^Menu/)).toBeTruthy();
    fireEvent.press(screen.getByText(/^Reviews/));
    expect(screen.getByText("Best burger on campus, still hot when it arrived.")).toBeTruthy();
  });
});

describe("Reels", () => {
  it("shows the store, campus and description and likes on a double tap", () => {
    jest.useFakeTimers();
    renderWithProviders(<ReelsScreen />, signedIn());
    expect(screen.getAllByText("CampusBites").length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Eduvos Potchefstroom|Potchefstroom/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Fresh off the grill/)).toBeTruthy();
    const page = screen.getByTestId("reel-reel-1");
    act(() => {
      fireEvent.press(page, { nativeEvent: { locationX: 40, locationY: 60 } });
      fireEvent.press(page, { nativeEvent: { locationX: 40, locationY: 60 } });
    });
    expect(screen.getByLabelText("Unlike, 215")).toBeTruthy();
    jest.useRealTimers();
  });
});
