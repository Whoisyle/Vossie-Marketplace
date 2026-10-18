import { act, fireEvent, screen } from "@testing-library/react-native";

import { renderWithProviders } from "@/test/renderWithProviders";

import { VossieSignInScreen } from "./VossieSignInScreen";
import { isValidEmail } from "./validation";

const mockReplace = jest.fn();
const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useFocusEffect: () => undefined,
  useRouter: () => ({ back: jest.fn(), canGoBack: () => true, push: mockPush, replace: mockReplace }),
}));

describe("sign-in email validation", () => {
  it("accepts a conventional email address and trims whitespace", () => {
    expect(isValidEmail(" eduv230953@vossie.net ")).toBe(true);
  });

  it("rejects malformed addresses", () => {
    expect(isValidEmail("eduv230953")).toBe(false);
    expect(isValidEmail("name@domain")).toBe(false);
  });
});

describe("VossieSignInScreen", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockReplace.mockClear();
    mockPush.mockClear();
  });

  afterEach(() => jest.useRealTimers());

  it("shows the Microsoft-style card and never asks for a password", () => {
    renderWithProviders(<VossieSignInScreen />);
    expect(screen.getByText("Sign In")).toBeTruthy();
    expect(screen.getByLabelText("Microsoft")).toBeTruthy();
    expect(screen.getByPlaceholderText("Email, phone or Skype")).toBeTruthy();
    expect(screen.queryByPlaceholderText(/password/i)).toBeNull();
  });

  it("explains empty and invalid input without navigating", () => {
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.press(screen.getByTestId("sign-in-next"));
    expect(screen.getByText("Enter your email, phone or Skype name.")).toBeTruthy();

    fireEvent.changeText(screen.getByPlaceholderText("Email, phone or Skype"), "not-an-email");
    fireEvent.press(screen.getByTestId("sign-in-next"));
    expect(screen.getByText(/Enter a valid email address/)).toBeTruthy();
    act(() => jest.runAllTimers());
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("sends a valid email on to the one-time code step", () => {
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Email, phone or Skype"), "eduv230953@vossie.net");
    fireEvent.press(screen.getByTestId("sign-in-next"));
    act(() => jest.runAllTimers());
    expect(mockPush).toHaveBeenCalledWith({ params: { email: "eduv230953@vossie.net" }, pathname: "/verified" });
  });

  it("opens account help", () => {
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.press(screen.getByText("Can’t access your account?"));
    expect(screen.getByText("Vossie will never ask for your password.")).toBeTruthy();
  });
});
