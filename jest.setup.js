// The native animation modules do not exist in the Jest environment, so give every test a small,
// synchronous stand-in. A test can still replace this with its own jest.mock for finer control.
jest.mock("react-native-worklets", () => ({
  scheduleOnRN: jest.fn(),
  scheduleOnUI: jest.fn(),
}));

jest.mock("react-native-reanimated", () => {
  const React = require("react");
  const { View, Text, ScrollView, Image } = require("react-native");
  const shared = (initial) => {
    const ref = { current: initial };
    return {
      get value() { return ref.current; },
      set value(next) { ref.current = next; },
      get: () => ref.current,
      set: (next) => { ref.current = typeof next === "function" ? next(ref.current) : next; },
    };
  };
  // entering/exiting/layout animations are chainable builders: FadeInDown.delay(80).springify()
  const layoutAnimation = () => {
    const chain = new Proxy(function () {}, { get: () => chain, apply: () => chain });
    return chain;
  };
  const identity = (value) => value;
  const easing = () => (t) => t;
  const Easing = {
    bezier: () => ({ factory: () => (t) => t }),
    linear: (t) => t, ease: (t) => t, quad: (t) => t, cubic: (t) => t, sin: (t) => t,
    in: (fn) => fn, out: (fn) => fn, inOut: (fn) => fn, exp: (t) => t, back: easing, elastic: easing, bounce: (t) => t,
  };
  const create = (Component) => React.forwardRef((props, ref) => React.createElement(Component, { ...props, ref }));
  return {
    __esModule: true,
    default: { View: create(View), Text: create(Text), ScrollView: create(ScrollView), Image: create(Image), createAnimatedComponent: (C) => C },
    Easing,
    FadeIn: layoutAnimation(),
    FadeInDown: layoutAnimation(),
    FadeInUp: layoutAnimation(),
    FadeOut: layoutAnimation(),
    FadeOutUp: layoutAnimation(),
    LinearTransition: layoutAnimation(),
    Extrapolation: { CLAMP: "clamp", EXTEND: "extend", IDENTITY: "identity" },
    interpolate: (value, input, output) => {
      if (value <= input[0]) return output[0];
      for (let i = 1; i < input.length; i += 1) {
        if (value <= input[i]) {
          const t = (value - input[i - 1]) / (input[i] - input[i - 1] || 1);
          return output[i - 1] + (output[i] - output[i - 1]) * t;
        }
      }
      return output[output.length - 1];
    },
    interpolateColor: (_value, _input, output) => output[0],
    useSharedValue: (initial) => React.useRef(shared(initial)).current,
    useDerivedValue: (fn) => shared(fn()),
    useAnimatedStyle: (fn) => { try { return fn(); } catch { return {}; } },
    useAnimatedProps: (fn) => { try { return fn(); } catch { return {}; } },
    useAnimatedReaction: () => undefined,
    useAnimatedScrollHandler: () => () => undefined,
    useReducedMotion: () => false,
    useAnimatedRef: () => React.useRef(null),
    withTiming: (to) => to,
    withSpring: (to) => to,
    withDelay: (_ms, animation) => animation,
    withRepeat: (animation) => animation,
    withSequence: (...animations) => animations[animations.length - 1],
    withDecay: () => 0,
    cancelAnimation: () => undefined,
    runOnJS: identity,
    runOnUI: identity,
    createAnimatedComponent: identity,
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" },
}));
