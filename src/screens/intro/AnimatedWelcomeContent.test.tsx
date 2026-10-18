import { fireEvent, render } from "@testing-library/react-native";

import { AnimatedWelcomeContent } from "./AnimatedWelcomeContent";

const mockPush = jest.fn();

jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("react-native-reanimated", () => {
  const ReactNative = jest.requireActual<typeof import("react-native")>(
    "react-native",
  );

  return {
    __esModule: true,
    default: { View: ReactNative.View },
    Easing: {
      bezier: () => ({ factory: () => (value: number) => value }),
    },
    useAnimatedReaction: jest.fn(),
    useAnimatedStyle: (styleFactory: () => object) => styleFactory(),
  };
});

jest.mock("react-native-worklets", () => ({
  scheduleOnRN: jest.fn(),
}));

describe("AnimatedWelcomeContent actions", () => {
  beforeEach(() => mockPush.mockClear());

  it("shows one labelled sign-in action and no QR scan action", () => {
    const screen = render(
      <AnimatedWelcomeContent
        clock={{ get: () => 8_000 } as never}
        interactive
        reducedMotion={false}
        scale={1}
      />,
    );

    expect(
      screen.getByRole("button", { name: "Sign In with Eduvos" }),
    ).toBeTruthy();
    expect(screen.getByText("Sign In with Eduvos")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Scan to sign in" })).toBeNull();
    expect(screen.queryByText(/campus marketplace, made for students/)).toBeNull();
  });

  it("keeps a 44pt sign-in target centred on its design frame on compact screens", () => {
    const scale = 0.3;
    const screen = render(
      <AnimatedWelcomeContent
        clock={{ get: () => 8_000 } as never}
        interactive
        reducedMotion={false}
        scale={scale}
      />,
    );

    const hostStyle = screen.getByTestId("welcome-sign-in-host").props.style[1];

    expect(hostStyle.height).toBe(44);
    expect(hostStyle.top + hostStyle.height / 2).toBeCloseTo(
      1594 * scale + (116 * scale) / 2,
    );
  });

  it("disables the sign-in action before the reveal completes", () => {
    const screen = render(
      <AnimatedWelcomeContent
        clock={{ get: () => 7_000 } as never}
        interactive={false}
        reducedMotion={false}
        scale={1}
      />,
    );

    const signIn = screen.getByRole("button", { name: "Sign In with Eduvos" });
    expect(signIn.props.accessibilityState).toMatchObject({ disabled: true });

    fireEvent.press(signIn);
    expect(mockPush).not.toHaveBeenCalled();
  });

  it("navigates to sign in", () => {
    const screen = render(
      <AnimatedWelcomeContent
        clock={{ get: () => 8_000 } as never}
        interactive
        reducedMotion={false}
        scale={1}
      />,
    );

    fireEvent.press(screen.getByRole("button", { name: "Sign In with Eduvos" }));
    expect(mockPush).toHaveBeenCalledTimes(1);
    expect(mockPush).toHaveBeenCalledWith("/sign-in");
  });
});
