import { act, fireEvent, screen } from "@testing-library/react-native";

import { hasCompletedSetup } from "@/lib/deviceFlag";
import { renderWithProviders } from "@/test/renderWithProviders";

import { signInDirect, signInLimited } from "./realLogin";
import { VossieSignInScreen } from "./VossieSignInScreen";
import { isValidEmail } from "./validation";

jest.mock("@/lib/deviceFlag", () => ({ hasCompletedSetup: jest.fn(() => false), markSetupDone: jest.fn() }));
jest.mock("./realLogin", () => ({
  signInDirect: jest.fn().mockResolvedValue(null),
  signInLimited: jest.fn(() => false),
}));

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

  it("sends a new student to verification", async () => {
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Email, phone or Skype"), "eduv240111@vossie.net");
    fireEvent.press(screen.getByTestId("sign-in-next"));
    await act(async () => { jest.runAllTimers(); });
    expect(mockPush).toHaveBeenCalledWith({ params: { email: "eduv240111@vossie.net" }, pathname: "/verified" });
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("signs a returning student straight in to Home", async () => {
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Email, phone or Skype"), "eduv230953@vossie.net");
    fireEvent.press(screen.getByTestId("sign-in-next"));
    await act(async () => { jest.runAllTimers(); });
    expect(mockReplace).toHaveBeenCalledWith("/home");
    expect(mockPush).not.toHaveBeenCalled();
  });

  const realProfile = {
    campusId: "potchefstroom" as const,
    email: "eduv11223@vossie.net",
    fullName: "Vumisa Malindi",
    id: "real-user-id",
    isVerifiedStudent: true,
    phone: "",
    real: true,
    role: "buyer" as const,
    studentNumber: "eduv11223",
  };

  it("sends a real account's first login on this device through the verified card", async () => {
    jest.mocked(signInDirect).mockResolvedValueOnce(realProfile);
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Email, phone or Skype"), "eduv11223@vossie.net");
    fireEvent.press(screen.getByTestId("sign-in-next"));
    await act(async () => { jest.runAllTimers(); });
    expect(signInDirect).toHaveBeenCalledWith("eduv11223@vossie.net");
    expect(mockReplace).toHaveBeenCalledWith({ params: { email: "eduv11223@vossie.net", real: "1" }, pathname: "/verified" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("takes a real account that already finished setup on this device straight to Home", async () => {
    jest.mocked(signInDirect).mockResolvedValueOnce(realProfile);
    jest.mocked(hasCompletedSetup).mockReturnValueOnce(true);
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Email, phone or Skype"), "eduv11223@vossie.net");
    fireEvent.press(screen.getByTestId("sign-in-next"));
    await act(async () => { jest.runAllTimers(); });
    expect(mockReplace).toHaveBeenCalledWith("/home");
  });

  it("has no demo-account shortcuts", () => {
    renderWithProviders(<VossieSignInScreen />);
    expect(screen.queryByTestId("demo-accounts")).toBeNull();
    expect(screen.queryByText("Try a demo account")).toBeNull();
  });

  it("denies any other account when the real backend is in use", async () => {
    jest.mocked(signInLimited).mockReturnValueOnce(true);
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.changeText(screen.getByPlaceholderText("Email, phone or Skype"), "someone@vossie.net");
    fireEvent.press(screen.getByTestId("sign-in-next"));
    await act(async () => { jest.runAllTimers(); });
    expect(screen.getByText("This account doesn’t have access to Vossie yet.")).toBeTruthy();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("opens account help", () => {
    renderWithProviders(<VossieSignInScreen />);
    fireEvent.press(screen.getByText("Can’t access your account?"));
    expect(screen.getByText("Vossie will never ask for your password.")).toBeTruthy();
  });
});
