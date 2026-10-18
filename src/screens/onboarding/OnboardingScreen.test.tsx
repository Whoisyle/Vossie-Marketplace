import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { forYou } from "@/data/personalise";
import { listings } from "@/data/mock/catalog";
import { createInitialState, demoReducer, type DemoState } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { OnboardingScreen } from "./OnboardingScreen";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
}));

function newStudent(): DemoState {
  let state = demoReducer(createInitialState(), { email: "eduv240111@vossie.net", type: "signIn" });
  state = demoReducer(state, {
    profile: { campusId: "potchefstroom", email: "eduv240111@vossie.net", fullName: "Kamo Dlamini", phone: "", studentNumber: state.profile?.studentNumber },
    type: "completeProfile",
  });
  return state;
}

beforeEach(() => mockReplace.mockClear());

describe("new student onboarding", () => {
  it("shows the four optional steps and a skip", () => {
    renderWithProviders(<OnboardingScreen />, newStudent());
    expect(screen.getByText(/Make Vossie yours, Kamo/)).toBeTruthy();
    expect(screen.getByText("What are you into?")).toBeTruthy();
    expect(screen.getByText("Stay in the loop")).toBeTruthy();
    expect(screen.getByText("Where do you usually get things?")).toBeTruthy();
    expect(screen.getByText("Got a friend's code?")).toBeTruthy();
    fireEvent.press(screen.getByTestId("onboarding-skip"));
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });

  it("saves interests, a usual spot and a friend's code, then goes Home", async () => {
    renderWithProviders(<OnboardingScreen />, newStudent());
    fireEvent.press(screen.getByTestId("interest-food"));
    fireEvent.press(screen.getByTestId("interest-books"));
    fireEvent.press(screen.getByTestId("spot-library"));
    fireEvent.changeText(screen.getByLabelText("Referral code (optional)"), "LERA-4321");
    fireEvent.press(screen.getByTestId("onboarding-finish"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/home"));
  });

  it("rejects a bad referral code and stays on the screen", async () => {
    renderWithProviders(<OnboardingScreen />, newStudent());
    fireEvent.changeText(screen.getByLabelText("Referral code (optional)"), "nope");
    fireEvent.press(screen.getByTestId("onboarding-finish"));
    await waitFor(() => expect(screen.getByText("Codes look like VUMI-9530.")).toBeTruthy());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps what the student picked in the state and uses it for For you", () => {
    let state = newStudent();
    state = demoReducer(state, { interests: ["books"], type: "setInterests" });
    expect(state.interests).toEqual(["books"]);
    const picks = forYou(listings, { favourites: [], following: [], interests: state.interests, orders: [], recentViews: [] });
    expect(picks.length).toBeGreaterThan(0);
    expect(picks.every((listing) => listing.categoryId === "books")).toBe(true);
    // with no interests and no history there is nothing to base a pick on
    expect(forYou(listings, { favourites: [], following: [], orders: [], recentViews: [] })).toHaveLength(0);
  });
});
