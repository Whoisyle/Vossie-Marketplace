import { act, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/renderWithProviders";

import { CHECK_MS, HOLD_MS, VerifiedScreen } from "./VerifiedScreen";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ email: "eduv230953@vossie.net" }),
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
}));

describe("VerifiedScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("checks the record, shows the verified details, then goes to Home", () => {
    renderWithProviders(<VerifiedScreen />);
    expect(screen.getByText("Checking your student record")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(CHECK_MS);
    });
    expect(screen.getByText("You're verified")).toBeTruthy();
    expect(screen.getByText("eduv230953@vossie.net")).toBeTruthy();
    expect(screen.getByText("Potchefstroom")).toBeTruthy();
    expect(screen.getByText(/^\d{4} \d{5}$/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(HOLD_MS);
    });
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });
});
