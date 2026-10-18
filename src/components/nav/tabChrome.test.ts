import { nextChromeState, SCROLL_THRESHOLD, TOP_ZONE } from "./TabChrome";

describe("floating bar scroll rules", () => {
  it("always shows the bar near the top", () => {
    expect(nextChromeState(0, 10, 0).action).toBe("show");
    expect(nextChromeState(50, TOP_ZONE, 5).action).toBe("show");
  });

  it("hides after scrolling down far enough and not before", () => {
    const small = nextChromeState(100, 105, 0);
    expect(small.action).toBe("none");
    expect(small.travelled).toBe(5);
    expect(nextChromeState(105, 105 + SCROLL_THRESHOLD, small.travelled).action).toBe("hide");
  });

  it("shows again after scrolling back up far enough", () => {
    let travelled = 0;
    let y = 400;
    let action = "none";
    for (let i = 0; i < 10 && action === "none"; i += 1) {
      const next = nextChromeState(y, y - 4, travelled);
      y -= 4;
      travelled = next.travelled;
      action = next.action;
    }
    expect(action).toBe("show");
  });

  it("restarts the count when direction changes so a wobble does nothing", () => {
    const down = nextChromeState(200, 208, 0);
    const up = nextChromeState(208, 204, down.travelled);
    expect(up.action).toBe("none");
    expect(Math.abs(up.travelled)).toBeLessThan(SCROLL_THRESHOLD);
  });
});
