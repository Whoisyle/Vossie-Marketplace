import { act, screen } from "@testing-library/react-native";

import { createInitialState, demoReducer } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { FIELD_COUNT, FILL_STEP_MS, SCAN_MS, TOTAL_MS, VerifiedScreen } from "./VerifiedScreen";

const mockReplace = jest.fn();
let mockParams: { email: string; real?: string } = { email: "eduv230953@vossie.net" };

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
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
    expect(screen.getByText("DISPLAY NAME")).toBeTruthy();
    expect(screen.getByLabelText(/Student number \d{4} \d{5}\. .*Potchefstroom/)).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(TOTAL_MS);
    });
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });

  it("shows a real account's own details and carries on to profile setup", () => {
    mockParams = { email: "eduv11223@vossie.net", real: "1" };
    const state = demoReducer(createInitialState(), {
      firstTime: true,
      profile: {
        campusId: "potchefstroom",
        email: "eduv11223@vossie.net",
        fullName: "Vumisa Malindi",
        id: "real-user-id",
        isVerifiedStudent: true,
        phone: "",
        real: true,
        role: "buyer",
        studentNumber: "eduv11223",
      },
      type: "signInAs",
    });
    renderWithProviders(<VerifiedScreen />, state);
    act(() => {
      jest.advanceTimersByTime(SCAN_MS + FIELD_COUNT * FILL_STEP_MS + 400);
    });
    expect(screen.getByText("Vumisa Malindi")).toBeTruthy();
    expect(screen.getByLabelText(/Student number Eduv11223\. .*Potchefstroom/)).toBeTruthy();
    act(() => {
      jest.advanceTimersByTime(TOTAL_MS);
    });
    expect(mockReplace).toHaveBeenCalledWith("/profile-setup");
    mockParams = { email: "eduv230953@vossie.net" };
  });
});
