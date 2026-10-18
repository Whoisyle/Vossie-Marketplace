import { act, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/renderWithProviders";

import { FIELD_COUNT, FILL_STEP_MS, SCAN_MS, TOTAL_MS, VerifiedScreen } from "./VerifiedScreen";

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

  it("scans, fills in the details, shows the student card, then goes to Home", () => {
    renderWithProviders(<VerifiedScreen />);
    expect(screen.getByText("Scanning your student record")).toBeTruthy();
    expect(screen.getByTestId("record-skeleton")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(SCAN_MS + 1);
    });
    expect(screen.getByText("Checking your details")).toBeTruthy();
    expect(screen.getByText("eduv230953@vossie.net")).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(FIELD_COUNT * FILL_STEP_MS + 400);
    });
    expect(screen.getByText("You're verified")).toBeTruthy();
    expect(screen.getByTestId("student-card")).toBeTruthy();
    expect(screen.getByText("Potchefstroom")).toBeTruthy();
    expect(screen.getByText(/^\d{4} \d{5}$/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(TOTAL_MS);
    });
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });
});
