import { fireEvent, render, screen } from "@testing-library/react-native";

import { buyerActions, KIND_TINT } from "./NotificationBanner";
import { PushCard } from "./PushCard";

describe("the push card", () => {
  it("shows the app, the words and the buttons, and tells you which was pressed", () => {
    const pressed = jest.fn();
    render(<PushCard actions={buyerActions("orders")} appName="VOSSIE" body="Your Zinger Meal is with the courier." icon="package" onAction={pressed} tint={KIND_TINT.orders} title="Your order is on its way" />);
    expect(screen.getByText("VOSSIE")).toBeTruthy();
    expect(screen.getByText("Your order is on its way")).toBeTruthy();
    fireEvent.press(screen.getByTestId("push-track"));
    expect(pressed).toHaveBeenCalledWith({ key: "track", label: "Track order" });
  });

  it("has a button for each kind of buyer notification, and says silent when it is quiet", () => {
    expect(buyerActions("messages")[0]?.label).toBe("Reply");
    expect(buyerActions("offers")[0]?.label).toBe("See the deal");
    expect(buyerActions("account")[0]?.label).toBe("Open");
    render(<PushCard actions={[]} appName="VOSSIE" body="b" icon="bell" quiet tint="#000" title="t" />);
    expect(screen.getByText(/silent/)).toBeTruthy();
  });
});
