import { fireEvent, render, screen } from "@testing-library/react-native";

import { DocScanner } from "./DocScanner";

let mockPhoto = 0;
jest.mock("expo-camera", () => {
  const React = jest.requireActual("react");
  const { View } = jest.requireActual("react-native");
  return {
    CameraView: React.forwardRef(function FakeCamera(_props: unknown, ref: React.Ref<unknown>) {
      React.useImperativeHandle(ref, () => ({ takePictureAsync: async () => ({ uri: `file:///shot-${++mockPhoto}.jpg` }) }));
      return <View testID="camera" />;
    }),
    useCameraPermissions: () => [{ canAskAgain: true, granted: true }, jest.fn()],
  };
});
jest.mock("expo-image", () => ({ Image: () => null }));
jest.mock("react-native-safe-area-context", () => ({ useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }) }));

const press = async (id: string) => {
  fireEvent.press(screen.getByTestId(id));
  await screen.findByTestId("doc-scanner");
};

describe("DocScanner", () => {
  beforeEach(() => {
    mockPhoto = 0;
  });

  it("scans the front and then the back of an ID, and hands back both", async () => {
    const onDone = jest.fn();
    render(<DocScanner kind="id" onClose={jest.fn()} onDone={onDone} visible />);
    expect(screen.getByText("Front of your ID")).toBeTruthy();
    fireEvent.press(screen.getByTestId("scan-shutter"));
    await screen.findByTestId("scan-check");
    fireEvent.press(screen.getByTestId("scan-keep"));
    expect(await screen.findByText("Back of your ID")).toBeTruthy();
    fireEvent.press(screen.getByTestId("scan-shutter"));
    await screen.findByTestId("scan-check");
    fireEvent.press(screen.getByTestId("scan-keep"));
    expect(await screen.findByText("Your ID, front and back")).toBeTruthy();
    await press("scan-done");
    const result = onDone.mock.calls[0]![0];
    expect(result.front.uri).toBe("file:///shot-1.jpg");
    expect(result.back.uri).toBe("file:///shot-2.jpg");
    expect(result.front.name).toMatch(/^id-front-/);
    expect(result.back.name).toMatch(/^id-back-/);
  });

  it("scans a proof of residence as one whole page, with no back", async () => {
    const onDone = jest.fn();
    render(<DocScanner kind="address" onClose={jest.fn()} onDone={onDone} visible />);
    expect(screen.getByText("Proof of residence")).toBeTruthy();
    fireEvent.press(screen.getByTestId("scan-shutter"));
    await screen.findByTestId("scan-check");
    fireEvent.press(screen.getByTestId("scan-keep"));
    await screen.findByText("Your proof of residence");
    await press("scan-done");
    expect(onDone.mock.calls[0]![0].back).toBeUndefined();
    expect(onDone.mock.calls[0]![0].front.name).toMatch(/^proof-of-address-/);
  });

  it("lets a bad photo be retaken before moving on", async () => {
    render(<DocScanner kind="id" onClose={jest.fn()} onDone={jest.fn()} visible />);
    fireEvent.press(screen.getByTestId("scan-shutter"));
    await screen.findByTestId("scan-check");
    fireEvent.press(screen.getByTestId("scan-retake"));
    expect(screen.getByText("Front of your ID")).toBeTruthy();
    expect(screen.queryByTestId("scan-check")).toBeNull();
  });
});
