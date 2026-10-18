import type { TextStyle, ViewStyle } from "react-native";

/**
 * Vossie Marketplace UI tokens.
 *
 * Colours were sampled from the owner-supplied screens in `design/screens/`
 * (2026-10-18). Spacing, radius and type follow
 * `design/tokens/vossie.ts` where the screens do not contradict it.
 */
export const color = {
  // Brand
  primary: "#35505C", // Pay Now, avatars, toggles, help card, reels canvas
  primaryPressed: "#283E48",
  accent: "#376371", // selected chips, Welcome button, sign-in bubbles
  accentPressed: "#244752",
  onPrimary: "#FFFFFF",

  // Surfaces
  background: "#FFFFFF",
  backgroundMuted: "#F5F7F8",
  surface: "#FFFFFF",
  surfaceSoft: "#DFEAF1", // checkout panels, option tiles
  surfaceIcon: "#E1E9EB", // menu icon circles, unread inbox rows
  surfaceRow: "#ECF1F4", // recent-order rows
  surfacePeach: "#FAF3EA", // "Open orders" summary card
  surfaceBadge: "#D6DFE2", // "Verified student" badge
  placeholder: "#D9D9D9", // image placeholders
  searchField: "#F2F3F4",

  // Text
  text: "#1E2B33",
  heading: "#2D4652",
  textSecondary: "#5F6E76",
  textMuted: "#8A969C",
  textInverse: "#FFFFFF",
  link: "#376371",

  // Lines
  border: "#E6ECEF",
  borderStrong: "#C8D2D8",
  divider: "#EDF1F3",

  // Status
  success: "#2F8A57",
  successSoft: "#E6F4EC",
  warning: "#B7791F",
  warningSoft: "#FFF4DE",
  danger: "#B4544A",
  dangerSoft: "#F3E0DC",
  info: "#2C6E9E",
  infoSoft: "#E8F2FA",

  // Third-party look used only by the demo sign-in card
  microsoftBlue: "#1074CE",
  microsoftText: "#404040",
} as const;

export const space = {
  none: 0,
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
  xxxl: 40,
  huge: 48,
} as const;

export const corner = {
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  pill: 999,
} as const;

export const size = {
  touch: 44,
  control: 48,
  controlLarge: 56,
  icon: 20,
  iconSmall: 16,
  iconLarge: 24,
  avatar: 44,
  tabBar: 64,
  screenGutter: 20,
  contentMax: 520,
} as const;

export const text = {
  pageTitle: { color: color.heading, fontSize: 24, fontWeight: "700", letterSpacing: -0.3 },
  pageSubtitle: { color: color.textMuted, fontSize: 13, lineHeight: 18 },
  sectionTitle: { color: color.heading, fontSize: 17, fontWeight: "700" },
  cardTitle: { color: color.text, fontSize: 15, fontWeight: "600" },
  body: { color: color.text, fontSize: 15, lineHeight: 21 },
  bodySmall: { color: color.textSecondary, fontSize: 13, lineHeight: 18 },
  caption: { color: color.textMuted, fontSize: 12, lineHeight: 16 },
  label: { color: color.textMuted, fontSize: 12, fontWeight: "500" },
  button: { fontSize: 16, fontWeight: "600" },
  price: { color: color.text, fontSize: 22, fontWeight: "700" },
} as const satisfies Record<string, TextStyle>;

export const shadow = {
  card: {
    boxShadow: "0 4px 14px rgba(30, 43, 51, 0.08)",
  },
  raised: {
    boxShadow: "0 10px 28px rgba(30, 43, 51, 0.14)",
  },
} as const satisfies Record<string, ViewStyle>;
