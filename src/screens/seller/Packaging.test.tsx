import { render, screen } from "@testing-library/react-native";

import { Hero, PackagingScene, SCENE } from "./Packaging";

jest.mock("@/lib/haptics", () => ({ haptic: { success: jest.fn() } }));

describe("PackagingScene", () => {
  it("draws on every slide, with the same scene carrying on from slide to slide", () => {
    const view = render(<PackagingScene index={0} />);
    expect(screen.getByTestId("packaging-scene")).toBeTruthy();
    view.rerender(<PackagingScene index={1} />);
    expect(screen.getByTestId("packaging-scene")).toBeTruthy();
    view.rerender(<PackagingScene index={2} />);
    expect(screen.getByTestId("packaging-scene")).toBeTruthy();
  });

  it("is drawn at the size it is asked for", () => {
    render(<PackagingScene index={2} scale={0.5} still />);
    const style = screen.getByTestId("packaging-scene").props.style;
    expect(style.width).toBe(SCENE.width * 0.5);
    expect(style.height).toBe(SCENE.height * 0.5);
  });

  it("shows the small fixed version used in the setup headers", () => {
    render(<Hero index={1} scale={0.4} />);
    expect(screen.getByTestId("packaging-scene").props.style.width).toBe(SCENE.width * 0.4);
  });
});
