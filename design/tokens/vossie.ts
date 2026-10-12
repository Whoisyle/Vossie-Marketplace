export const vossieTokens = {
  color: {
    background: { canvas: "#FFFFFF", subtle: "#FAFBFC", brandSoft: "#E9F2F5", warm: "#F8F0E5" },
    surface: { default: "#FFFFFF", selected: "#E9F2F5", disabled: "#F5F7F8", inverse: "#24394C" },
    text: { primary: "#24394C", secondary: "#526674", muted: "#74838C", inverse: "#FFFFFF", link: "#2E5561" },
    action: { primary: "#376371", hover: "#2E5561", pressed: "#244752", destructive: "#B23A48", disabled: "#E8EDF0" },
    border: { default: "#C8D2D8", subtle: "#E8EDF0", strong: "#9DAEB8", focus: "#376371", danger: "#B23A48" },
    semantic: {
      success: "#26734D", successBackground: "#E8F4ED",
      warning: "#8A5A0A", warningBackground: "#FFF4D8",
      danger: "#982E3B", dangerBackground: "#FDECEF",
      info: "#2C6E9E", infoBackground: "#E8F2FA",
    },
  },
  font: {
    family: {
      display: "Canto",
      displayFallback: "Georgia",
      interface: "Minimalist",
      interfaceFallback: "System",
    },
    size: { micro: 11, label: 12, body: 14, cardTitle: 15, section: 19, page: 27, display: 32 },
    lineHeight: { micro: 15, label: 17, body: 21, cardTitle: 21, section: 26, page: 34, display: 38 },
    weight: { regular: "400", medium: "500", semibold: "600", bold: "700" },
  },
  spacing: { none: 0, xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 48, section: 64 },
  radius: { micro: 8, field: 12, card: 16, hero: 20, sheet: 24, pill: 999 },
  size: { touchMinimum: 44, controlSmall: 40, controlDefault: 48, controlLarge: 56, iconSmall: 16, iconDefault: 20, iconLarge: 24 },
  motion: { instant: 0, fast: 120, standard: 180, view: 260, slow: 320 },
  breakpoint: { compact: 0, medium: 600, expanded: 1024, wide: 1440 },
  layout: { phoneMargin: 16, phoneWideMargin: 20, tabletMargin: 24, desktopMargin: 32, contentMax: 1200, readingMax: 720 },
} as const;

export type VossieTokens = typeof vossieTokens;
