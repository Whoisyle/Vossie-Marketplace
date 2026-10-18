import type { AppSettings } from "./types";

/** What a new student starts with in Security and Settings. */
export const DEFAULT_SETTINGS: AppSettings = {
  biometric: false,
  haptics: true,
  notifyAlerts: true,
  notifyMessages: true,
  notifyOrders: true,
  notifyPromos: false,
  personalised: true,
  profileVisibility: "campus",
  shareTracking: true,
  showCampus: true,
  sounds: false,
};
