import { fireEvent, screen, waitFor } from "@testing-library/react-native";

import { createInitialState, demoReducer } from "@/state/demoReducer";
import { renderWithProviders } from "@/test/renderWithProviders";

import { ProfileSetupScreen } from "./ProfileSetupScreen";

const mockReplace = jest.fn();
const mockUpdate = jest.fn().mockResolvedValue({});
const mockSubmitNumber = jest.fn().mockResolvedValue(undefined);
const mockMarkDone = jest.fn();

jest.mock("expo-router", () => ({
  Redirect: () => null,
  useRouter: () => ({ back: jest.fn(), push: jest.fn(), replace: mockReplace }),
}));
jest.mock("@/lib/deviceFlag", () => ({ hasCompletedSetup: jest.fn(() => false), markSetupDone: (id: string) => mockMarkDone(id) }));
jest.mock("@/services", () => ({
  auth: {
    isDemoStudentNumber: (value: string) => value.trim().toLowerCase().startsWith("eduv") && value.trim().length >= 7,
    submitStudentNumber: (value: string) => mockSubmitNumber(value),
    updateMyProfile: (patch: unknown) => mockUpdate(patch),
  },
  backendEnabled: true,
}));
jest.mock("./usePickPhoto", () => ({ usePickPhoto: () => async () => "file:///photo.jpg" }));

function realState() {
  return demoReducer(createInitialState(), {
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
}

describe("ProfileSetupScreen for a real account", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    mockUpdate.mockClear();
    mockSubmitNumber.mockClear();
    mockMarkDone.mockClear();
  });

  it("starts with the name, student number and campus filled in", () => {
    renderWithProviders(<ProfileSetupScreen />, realState());
    expect(screen.getByDisplayValue("Vumisa Malindi")).toBeTruthy();
    expect(screen.getByDisplayValue("eduv11223")).toBeTruthy();
    expect(screen.getByText("Add photo (required)")).toBeTruthy();
  });

  it("will not continue without a photo or the agreement tick", async () => {
    renderWithProviders(<ProfileSetupScreen />, realState());
    fireEvent.press(screen.getByTestId("profile-setup-continue"));
    expect(await screen.findByText("Add a profile photo to continue.")).toBeTruthy();
    expect(screen.getByText(/Please agree to the Terms/)).toBeTruthy();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("saves the details to the account, remembers this device and moves on", async () => {
    renderWithProviders(<ProfileSetupScreen />, realState());
    fireEvent.press(screen.getByLabelText("Add photo"));
    await screen.findByText("Change photo");
    fireEvent.press(screen.getByTestId("agree-terms"));
    fireEvent.press(screen.getByTestId("profile-setup-continue"));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith("/onboarding"));
    expect(mockUpdate).toHaveBeenCalledWith({ campusId: "potchefstroom", displayName: "Vumisa Malindi", phone: undefined });
    expect(mockSubmitNumber).not.toHaveBeenCalled();
    expect(mockMarkDone).toHaveBeenCalledWith("real-user-id");
  });
});
