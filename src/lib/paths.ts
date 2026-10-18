import { usePathname, type Href } from "expo-router";

/**
 * Detail screens (listing, store, reviews) live inside whichever tab you opened them from, so the tab bar keeps
 * showing where you are. This picks that tab from the current URL.
 */
const TABS_WITH_DETAILS = ["home", "explore", "reels", "activity", "cart", "account"] as const;
type Base = (typeof TABS_WITH_DETAILS)[number];

export function baseFromPath(pathname: string | null | undefined): Base {
  const first = (pathname ?? "").split("/").filter(Boolean)[0];
  return (TABS_WITH_DETAILS as readonly string[]).includes(first ?? "") ? (first as Base) : "home";
}

export type DetailKind = "listing" | "store" | "review";

export function detailHref(pathname: string | null | undefined, kind: DetailKind, id: string): Href {
  return `/${baseFromPath(pathname)}/${kind}/${id}` as Href;
}

/** `const open = useDetail(); open("store", id)` */
export function useDetail(): (kind: DetailKind, id: string) => Href {
  const pathname = usePathname();
  return (kind, id) => detailHref(pathname, kind, id);
}
