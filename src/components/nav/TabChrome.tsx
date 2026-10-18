import {
  type ReactNode,
  createContext,
  use,
  useCallback,
  useMemo,
  useRef,
} from "react";
import type { NativeScrollEvent, NativeSyntheticEvent } from "react-native";
import { type SharedValue, useSharedValue, withTiming } from "react-native-reanimated";

import { ease } from "@/theme/motion";

/**
 * The floating tab bar's visibility, shared with the screens inside the tabs.
 *  - scrolling down the page (swiping up) slowly lets the bar slide away; scrolling back up brings it back
 *  - a screen can lock it hidden (Reels) and reveal it for a moment on request
 * `hidden` is 0 when the bar is showing and 1 when it is away, so it can drive any animation.
 */
export type TabChromeValue = {
  hidden: SharedValue<number>;
  /** Pass to a ScrollView's onScroll (with scrollEventThrottle 16). */
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  /** Keeps the bar away until released; used by Reels. */
  lock: (locked: boolean) => void;
  /** Shows the bar for a few seconds even while locked, then puts it away again. */
  peek: (ms?: number) => void;
  show: () => void;
  hide: () => void;
};

const TabChromeContext = createContext<TabChromeValue | null>(null);

/** Distance scrolled in one direction before the bar reacts, so small wobbles do nothing. */
export const SCROLL_THRESHOLD = 14;
/** Near the top of a page the bar always shows. */
export const TOP_ZONE = 32;
const SLOW_MS = 520;

/** Height of the floating bar block (bar plus padding) without the bottom safe area. */
export const TAB_BAR_HEIGHT = 74;

/** Decides what a scroll movement means. Pure so it can be tested. */
export function nextChromeState(
  previousY: number,
  y: number,
  travelled: number,
): { travelled: number; action: "show" | "hide" | "none" } {
  if (y <= TOP_ZONE) return { travelled: 0, action: "show" };
  const delta = y - previousY;
  // a change of direction restarts the count
  const same = travelled === 0 || Math.sign(delta) === Math.sign(travelled);
  const total = (same ? travelled : 0) + delta;
  if (total > SCROLL_THRESHOLD) return { travelled: 0, action: "hide" };
  if (total < -SCROLL_THRESHOLD) return { travelled: 0, action: "show" };
  return { travelled: total, action: "none" };
}

export function TabChromeProvider({ children }: { children: ReactNode }) {
  const hidden = useSharedValue(0);
  const lastY = useRef(0);
  const travelled = useRef(0);
  const locked = useRef(false);
  const peekTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const animate = useCallback(
    (to: 0 | 1, duration = SLOW_MS) => hidden.set(withTiming(to, { duration, easing: ease.inOut })),
    [hidden],
  );

  const show = useCallback(() => {
    if (!locked.current) animate(0);
  }, [animate]);
  const hide = useCallback(() => animate(1), [animate]);

  const lock = useCallback(
    (next: boolean) => {
      locked.current = next;
      if (peekTimer.current) clearTimeout(peekTimer.current);
      animate(next ? 1 : 0, next ? 380 : SLOW_MS);
    },
    [animate],
  );

  const peek = useCallback(
    (ms = 3_500) => {
      if (peekTimer.current) clearTimeout(peekTimer.current);
      animate(0, 380);
      peekTimer.current = setTimeout(() => {
        if (locked.current) animate(1, SLOW_MS);
      }, ms);
    },
    [animate],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (locked.current) return;
      const y = Math.max(0, event.nativeEvent.contentOffset.y);
      const result = nextChromeState(lastY.current, y, travelled.current);
      lastY.current = y;
      travelled.current = result.travelled;
      if (result.action === "hide") animate(1);
      else if (result.action === "show") animate(0);
    },
    [animate],
  );

  const value = useMemo(
    () => ({ hidden, hide, lock, onScroll, peek, show }),
    [hidden, hide, lock, onScroll, peek, show],
  );
  return <TabChromeContext value={value}>{children}</TabChromeContext>;
}

/** Null outside the tabs (sign-in, profile setup), where there is no bar to hide. */
export function useTabChrome(): TabChromeValue | null {
  return use(TabChromeContext);
}
