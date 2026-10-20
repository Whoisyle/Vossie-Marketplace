import type { ReactNode } from "react";
import { Defs, LinearGradient, RadialGradient, Stop } from "react-native-svg";

/**
 * Drawing kit for the product illustrations. Every product is drawn in a 200 x 200 box with the light coming from
 * the top left: a lighter step on the lit side, a deeper step on the shaded side, and a soft shadow on the ground.
 * Gradient ids are made unique per drawing, because SVG ids are shared across the whole page on the web.
 */
export type Fill = {
  /** A diagonal gradient from a lit to a shaded colour; returns the `url(#id)` to use as a fill. */
  g: (name: string, lit: string, shade: string, vertical?: boolean) => string;
  /** A radial gradient, brighter in the middle. */
  r: (name: string, centre: string, edge: string) => string;
};

let counter = 0;

/** Makes the fill helpers for one drawing and the `<Defs>` that holds what they registered. */
export function makeKit(): { fill: Fill; defs: () => ReactNode } {
  const prefix = `pa${++counter}`;
  const items: ReactNode[] = [];
  const seen = new Set<string>();
  const fill: Fill = {
    g: (name, lit, shade, vertical = false) => {
      const id = `${prefix}${name}`;
      if (!seen.has(id)) {
        seen.add(id);
      items.push(
        <LinearGradient id={id} key={id} x1="0" x2={vertical ? "0" : "1"} y1="0" y2="1">
          <Stop offset="0" stopColor={lit} />
          <Stop offset="1" stopColor={shade} />
        </LinearGradient>,
      );
      }
      return `url(#${id})`;
    },
    r: (name, centre, edge) => {
      const id = `${prefix}${name}`;
      if (!seen.has(id)) {
        seen.add(id);
      items.push(
        <RadialGradient cx="0.4" cy="0.35" id={id} key={id} r="0.8">
          <Stop offset="0" stopColor={centre} />
          <Stop offset="1" stopColor={edge} />
        </RadialGradient>,
      );
      }
      return `url(#${id})`;
    },
  };
  return { defs: () => <Defs>{items}</Defs>, fill };
}

/** Typed coordinate lists, so destructuring `[x, y]` gives numbers rather than possibly-undefined values. */
export const pairs = (list: [number, number][]) => list;
export const triples = (list: [number, number, number][]) => list;
