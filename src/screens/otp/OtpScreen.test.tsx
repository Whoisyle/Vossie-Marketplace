import { act, fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/renderWithProviders";

import { OtpScreen } from "./OtpScreen";

const mockReplace = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ email: "eduv230953@vossie.net" }),
  useRouter: () => ({ back: jest.fn(), replace: mockReplace }),
}));

describe("OtpScreen (demo mode)", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
  });
  afterEach(() => jest.useRealTimers());

  it("shows the masked email and the demo hint", () => {
    renderWithProviders(<OtpScreen />);
    expect(screen.getByText("Check your email")).toBeTruthy();
    expect(screen.getByText(/e••••••3@vossie\.net/)).toBeTruthy();
    expect(screen.getByText(/Demo mode/)).toBeTruthy();
  });

  it("rejects a wrong code and lets the user try again", async () => {
    renderWithProviders(<OtpScreen />);
    fireEvent.changeText(screen.getByLabelText("One-time code"), "000000");
    await act(async () => {
      jest.advanceTimersByTime(600);
    });
    expect(screen.getByText("That code isn't right. Try again.")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    await act(async () => {
      jest.advanceTimersByTime(800);
    });
    expect(screen.getByLabelText("One-time code").props.value).toBe("");
  });

  it("signs in with the right code and enters the app", async () => {
    renderWithProviders(<OtpScreen />);
    fireEvent.changeText(screen.getByLabelText("One-time code"), "123456");
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    await act(async () => {
      jest.advanceTimersByTime(1_000);
    });
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });

  it("ignores letters and keeps the resend locked while the timer runs", () => {
    renderWithProviders(<OtpScreen />);
    fireEvent.changeText(screen.getByLabelText("One-time code"), "12ab");
    expect(screen.getByLabelText("One-time code").props.value).toBe("12");
    expect(screen.getByText(/Resend code in 30s/)).toBeTruthy();
  });
});
