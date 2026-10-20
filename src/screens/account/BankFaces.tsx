import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";

import { landscapeHeight } from "@/components/StudentCard";
import type { Issuer } from "@/data/cardBrands";
import type { SavedCard } from "@/data/types";

import { Chip, Contactless, SchemeLogo } from "./CardArt";

/**
 * Every bank card is drawn on an ISO card, 85.6 x 54 mm, laid flat. Positions and sizes below are in millimetres,
 * measured from the owner's reference photos, and `u` turns a millimetre into pixels for the width being drawn.
 * Nedbank, Capitec, Absa, GoTyme and Discovery are upright cards in real life; they are shown turned a quarter turn
 * anticlockwise, so the chip sits on the left like every flat card, and the logos stay upright and readable.
 */
export const CARD_MM = { chipHeight: 8.6, chipWidth: 11.2, corner: 3.18, height: 54, width: 85.6 } as const;

export function bankCardSize(_issuer: Issuer, width: number): { height: number; width: number } {
  return { height: landscapeHeight(width), width };
}

const ART = {
  absa: require("../../../assets/banks/absa-mark.png"),
  capitec: require("../../../assets/banks/capitec-gold.png"),
  discoveryEmblem: require("../../../assets/banks/discovery-emblem.png"),
  discoveryLogo: require("../../../assets/banks/discovery-logo.png"),
  fnb: require("../../../assets/banks/fnb-tree.png"),
  standard: require("../../../assets/banks/standard-logo.png"),
  zebra: require("../../../assets/banks/investec-zebra3.png"),
};

type Props = {
  card: SavedCard;
  issuer: Issuer;
  width: number;
  /** Instant EFT shows the bank's card with a caption instead of a card number. */
  eft?: boolean;
};

/** Places something at a millimetre position from the left (or the right edge, with `r`) and top of the card. */
function At({ b, children, r, u, x = 0, y = 0 }: { b?: number; children: ReactNode; r?: number; u: number; x?: number; y?: number }) {
  const vertical = b !== undefined ? { bottom: b * u } : { top: y * u };
  return <View style={r !== undefined ? { alignItems: "flex-end", position: "absolute", right: r * u, ...vertical } : { left: x * u, position: "absolute", ...vertical }}>{children}</View>;
}

/** A line of print: `mm` is the font size in millimetres. */
function Print({ colour, letterSpacing, mm, u, weight = "500", children, italic }: { colour: string; mm: number; u: number; letterSpacing?: number; weight?: "300" | "400" | "500" | "600" | "700" | "800"; children: ReactNode; italic?: boolean }) {
  return (
    <Text numberOfLines={1} style={{ color: colour, fontSize: mm * u, fontStyle: italic ? "italic" : "normal", fontWeight: weight, letterSpacing: (letterSpacing ?? 0) * u }}>
      {children}
    </Text>
  );
}

/** The card number as printed, four groups with the last four digits real. */
function numberText(card: SavedCard): string {
  return `••••  ••••  ••••  ${card.last4}`;
}

/** What a card says in the place where an instant EFT card would show its bank. */
function Caption({ colour, eft, u, x, y }: { colour: string; eft?: boolean; u: number; x: number; y: number }) {
  if (!eft) return null;
  return (
    <At u={u} x={x} y={y}>
      <Print colour={colour} letterSpacing={0.3} mm={3} u={u} weight="600">
        INSTANT EFT
      </Print>
    </At>
  );
}

function Frame({ children, h, w }: { children: ReactNode; h: number; w: number }) {
  return (
    <View style={[styles.frame, { borderRadius: (CARD_MM.corner * w) / CARD_MM.width, height: h, width: w }]} testID="card-face">
      {children}
    </View>
  );
}

/** The contact pad at its real size, with its top left at the given millimetre position. */
function Pad({ colour, u, x, y }: { colour: string; u: number; x: number; y: number }) {
  return (
    <At u={u} x={x} y={y}>
      <Chip colour={colour} width={CARD_MM.chipWidth * u} />
    </At>
  );
}

/**
 * Draws an upright card (54 x 85.6 mm), exactly as printed, and turns the whole card a quarter turn anticlockwise onto
 * a flat frame. The logos and print turn with the card, as they would if you laid the real card on its side.
 */
function Turned({ children, h, w }: { children: ReactNode; h: number; w: number }) {
  const u = w / CARD_MM.width;
  return (
    <Frame h={h} w={w}>
      <View style={{ height: 85.6 * u, left: (w - 54 * u) / 2, position: "absolute", top: (h - 85.6 * u) / 2, transform: [{ rotate: "-90deg" }], width: 54 * u }}>{children}</View>
    </Frame>
  );
}

/** The contact pad on an upright card: it is printed turned, so it is taller than it is wide. Centre in millimetres. */
function UprightPad({ colour, cx, cy, u }: { colour: string; cx: number; cy: number; u: number }) {
  const w = CARD_MM.chipWidth * u;
  const h = (w * 29) / 38;
  return (
    <View style={{ left: cx * u - w / 2, position: "absolute", top: cy * u - h / 2, transform: [{ rotate: "90deg" }] }}>
      <Chip colour={colour} width={w} />
    </View>
  );
}

/** Draws the card for the given bank, matching the real card. */
export function BankFace(props: Props) {
  switch (props.issuer.id) {
    case "nedbank":
      return <Nedbank {...props} />;
    case "fnb":
      return <Fnb {...props} />;
    case "standard-bank":
      return <StandardBank {...props} />;
    case "absa":
      return <Absa {...props} />;
    case "capitec":
      return <Capitec {...props} />;
    case "tymebank":
      return <Tyme {...props} />;
    case "discovery":
      return <Discovery {...props} />;
    case "african-bank":
      return <AfricanBank {...props} />;
    default:
      return <Investec {...props} />;
  }
}

function hexagon(r: number): string {
  return [0, 1, 2, 3, 4, 5].map((i) => `${r * Math.cos(Math.PI / 6 + (i * Math.PI) / 3)},${r * Math.sin(Math.PI / 6 + (i * Math.PI) / 3)}`).join(" ");
}

/** The N of the Nedbank mark, cut out of the hexagon. */
function nShape(r: number): string {
  const a = r * 0.52;
  const b = r * 0.2;
  return [
    [-a, a], [-a, -a], [-a + b * 1.1, -a], [a - b * 1.1, a - b * 2.1], [a - b * 1.1, -a], [a, -a], [a, a], [a - b * 1.1, a], [-a + b * 1.1, -a + b * 2.1], [-a + b * 1.1, a],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

/** Nedbank Gold debit, drawn upright as printed: "Gold debit" top left, the chip, the holographic N (22 mm) in the middle, Visa bottom right. */
function Nedbank({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  return (
    <Turned h={h} w={w}>
      <LinearGradient colors={["#C4BDA5", "#B0AA92", "#9C9C8F"]} end={{ x: 0.9, y: 1 }} pointerEvents="none" start={{ x: 0.05, y: 0 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(255,255,255,0.3)", "rgba(255,255,255,0)", "rgba(255,255,255,0.12)"]} end={{ x: 1, y: 0.7 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <At u={u} x={3.6} y={3.8}>
        <Print colour="#8A8568" mm={4.7} u={u} weight="700">
          Gold
        </Print>
        <Print colour="#9A9579" mm={2.7} u={u}>
          debit
        </Print>
      </At>
      <UprightPad colour="#EEEBDD" cx={32} cy={16.05} u={u} />
      <Svg height={85.6 * u} style={StyleSheet.absoluteFill} width={54 * u}>
        <Defs>
          <SvgGradient id="nb" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#7DF7B8" />
            <Stop offset="0.45" stopColor="#4FC8E8" />
            <Stop offset="0.8" stopColor="#F4EA6E" />
            <Stop offset="1" stopColor="#7DF7B8" />
          </SvgGradient>
        </Defs>
        <G transform={`translate(${27.8 * u}, ${44.4 * u})`}>
          <Polygon fill="url(#nb)" points={hexagon(11.4 * u)} />
          <Polygon fill="#F1EEDD" points={nShape(11.4 * u)} />
        </G>
      </Svg>
      <At b={3} r={2.7} u={u}>
        <SchemeLogo brand={card.brand} width={18 * u} />
      </At>
      <At b={3.6} u={u} x={4}>
        <Print colour="#7E7960" letterSpacing={0.3} mm={2.6} u={u}>
          {eft ? "INSTANT EFT" : (card.holder || "Name").toUpperCase()}
        </Print>
      </At>
    </Turned>
  );
}

/** FNB Easy Debit: near-black with soft rings, a gold arc, the gold tree (20 mm) right of centre, Visa bottom right. */
function Fnb({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  const cx = 58.6 * u;
  const cy = 26.5 * u;
  const arc = 56.7 * u;
  return (
    <Frame h={h} w={w}>
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Defs>
          <RadialGradient cx={cx} cy={cy} gradientUnits="userSpaceOnUse" id="fnbBg" r={w * 0.62}>
            <Stop offset="0" stopColor="#2D3235" />
            <Stop offset="1" stopColor="#0C0D0E" />
          </RadialGradient>
          <SvgGradient id="fnbArc" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#F4AB09" stopOpacity="0.95" />
            <Stop offset="0.5" stopColor="#F4AB09" stopOpacity="0.08" />
            <Stop offset="1" stopColor="#F4AB09" stopOpacity="1" />
          </SvgGradient>
        </Defs>
        <Rect fill="url(#fnbBg)" height={h} width={w} x={0} y={0} />
        <Circle cx={cx} cy={cy} fill="none" r={36 * u} stroke="rgba(255,255,255,0.04)" strokeWidth={12 * u} />
        <Circle cx={cx} cy={cy} fill="none" r={17 * u} stroke="rgba(0,0,0,0.38)" strokeWidth={9 * u} />
        <Circle cx={8.6 * u + arc} cy={cy} fill="none" r={arc} stroke="url(#fnbArc)" strokeWidth={0.7 * u} />
      </Svg>
      <At u={u} x={5.6} y={3.5}>
        <Text style={{ color: "#F5B21A", fontSize: 4.7 * u }}>
          <Text style={{ fontWeight: "700" }}>Easy</Text> Debit
        </Text>
      </At>
      <At u={u} x={2.6} y={19.6}>
        <Contactless colour="#F5B21A" size={5.4 * u} />
      </At>
      <Image contentFit="contain" source={ART.fnb} style={{ height: 20.1 * u, left: cx - 10.05 * u, position: "absolute", top: cy - 10.05 * u, width: 20.1 * u }} />
      <At b={3} r={3} u={u}>
        <SchemeLogo brand={card.brand} width={19.3 * u} />
      </At>
      <Caption colour="#F5B21A" eft={eft} u={u} x={5.6} y={46.5} />
    </Frame>
  );
}

/** Standard Bank debit: deep blue with a lighter sweep, shield and name top left, "Debit" top right, chip, number, name. */
function StandardBank({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#0F1C6E", "#15267F", "#1B3092"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Defs>
          <RadialGradient cx={60 * u} cy={26 * u} gradientUnits="userSpaceOnUse" id="stdSweep" r={40 * u}>
            <Stop offset="0" stopColor="#4766C0" stopOpacity="0.55" />
            <Stop offset="1" stopColor="#4766C0" stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect fill="url(#stdSweep)" height={h} width={w} x={0} y={0} />
        <Path d={`M ${6 * u} ${54 * u} C ${25 * u} ${40 * u}, ${55 * u} ${44 * u}, ${85.6 * u} ${30 * u} L ${85.6 * u} ${54 * u} Z`} fill="rgba(10,20,90,0.35)" />
      </Svg>
      <Image contentFit="contain" source={ART.standard} style={{ height: 8.5 * u, left: 3.7 * u, position: "absolute", top: 3.7 * u, width: 36 * u }} />
      <At r={4.3} u={u} y={3.9}>
        <Print colour="#FFFFFF" mm={5.4} u={u} weight="600">
          Debit
        </Print>
      </At>
      <Pad colour="#C4C7D1" u={u} x={7.2} y={19.7} />
      <At u={u} x={4.3} y={38.4}>
        <Print colour="#FFFFFF" letterSpacing={0.25} mm={3.5} u={u}>
          {eft ? "INSTANT EFT" : numberText(card)}
        </Print>
      </At>
      <At u={u} x={4.3} y={43.9}>
        <Print colour="#FFFFFF" mm={3.6} u={u}>
          {eft ? "" : card.holder || "Cardholder"}
        </Print>
      </At>
      {eft ? null : (
        <At u={u} x={41} y={44.6}>
          <Print colour="#E6EAFB" mm={2.3} u={u}>
            VALID THRU {card.expiry || "--/--"}
          </Print>
        </At>
      )}
      <At b={4.6} r={4.6} u={u}>
        <SchemeLogo brand={card.brand} width={16.6 * u} />
      </At>
    </Frame>
  );
}

/** Absa Student Credit, drawn upright as printed: "Student Credit" and the chip at the top, the Absa ring (20 mm) inside a mosaic ring (41 mm), Visa bottom right. */
function Absa({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  const cx = 27 * u;
  const cy = 44.2 * u;
  const rings = [12.4, 13.8, 15.2, 16.6, 18, 19.4];
  const hues = ["#E8222F", "#F0551E", "#F7A21B", "#F2C230", "#E0407F", "#B3207A"];
  return (
    <Turned h={h} w={w}>
      <LinearGradient colors={["#161214", "#0A090A"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={85.6 * u} style={StyleSheet.absoluteFill} width={54 * u}>
        {rings.map((mmr, ring) =>
          [0, 1, 2].map((slot) => {
            const r = mmr * u;
            const seg = r * 0.13;
            const hue = hues[(ring * 2 + slot * 2 + (ring % 2)) % hues.length]!;
            return (
              <Circle
                cx={cx}
                cy={cy}
                fill="none"
                key={`${ring}-${slot}`}
                r={r}
                stroke={hue}
                strokeDasharray={`${seg} ${seg * 2.4}`}
                strokeDashoffset={-(seg * slot + ring * seg * 0.6)}
                strokeOpacity={0.9 - ring * 0.13}
                strokeWidth={1.05 * u}
              />
            );
          }),
        )}
        <Rect fill="#E8222F" height={4.4 * u} rx={1 * u} width={2.1 * u} x={48.1 * u} y={0} />
        <Rect fill="#E8222F" height={3.6 * u} rx={0.8 * u} width={1.7 * u} x={3.8 * u} y={82 * u} />
      </Svg>
      <Image contentFit="contain" source={ART.absa} style={{ height: 21 * u, left: cx - 10.5 * u, position: "absolute", top: cy - 10.5 * u, width: 21 * u }} />
      <At u={u} x={39.8} y={6.9}>
        <Text style={{ color: "#FFFFFF", fontSize: 2.8 * u, fontWeight: "700", lineHeight: 3 * u }}>Student{"\n"}Credit</Text>
      </At>
      <UprightPad colour="#DADADD" cx={31.45} cy={15.25} u={u} />
      <At u={u} x={45.4} y={14.8}>
        <Contactless colour="#FFFFFF" size={5.4 * u} />
      </At>
      <At b={2.2} r={3.8} u={u}>
        <SchemeLogo brand={card.brand} width={17.6 * u} />
      </At>
      <Caption colour="#E9E4E8" eft={eft} u={u} x={5} y={80} />
    </Turned>
  );
}

/** Capitec GlobalOne, drawn upright as printed: "GlobalOne", the chip and contactless in a row, the gold Capitec logo, the name, "debit" and Mastercard. */
function Capitec({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  const gold = "#B89A3E";
  const logoH = (42.6 * 106) / 536;
  return (
    <Turned h={h} w={w}>
      <LinearGradient colors={["#1C1C1C", "#101010", "#181818"]} end={{ x: 0.6, y: 1 }} pointerEvents="none" start={{ x: 0.2, y: 0 }} style={StyleSheet.absoluteFill} />
      <Svg height={85.6 * u} style={StyleSheet.absoluteFill} width={54 * u}>
        {Array.from({ length: 120 }, (_, i) => (
          <Line key={i} stroke={i % 3 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.05)"} strokeWidth={1} x1={0} x2={54 * u} y1={(i * 85.6 * u) / 120} y2={(i * 85.6 * u) / 120 + (i % 2 ? 1 : 0)} />
        ))}
      </Svg>
      <At u={u} x={5.7} y={11}>
        <Print colour={gold} letterSpacing={-0.1} mm={3.8} u={u} weight="700">
          GlobalOne
        </Print>
      </At>
      <UprightPad colour="#CFB25E" cx={31.15} cy={14.45} u={u} />
      <At u={u} x={41.1} y={9.9}>
        <Contactless colour={gold} size={6.2 * u} />
      </At>
      <Image contentFit="contain" source={ART.capitec} style={{ height: logoH * u, left: 5.5 * u, position: "absolute", top: (37.6 - logoH / 2) * u, width: 42.6 * u }} />
      <At u={u} x={5.5} y={58.4}>
        <Print colour={gold} letterSpacing={0.2} mm={3.4} u={u}>
          {eft ? "INSTANT EFT" : (card.holder || "Cardholder").toUpperCase()}
        </Print>
      </At>
      <At u={u} x={5.1} y={73.6}>
        <Print colour={gold} mm={4.3} u={u}>
          debit
        </Print>
      </At>
      <At r={2.6} u={u} y={70.6}>
        <SchemeLogo brand={card.brand} width={18.2 * u} />
      </At>
    </Turned>
  );
}

/** GoTyme Bank, drawn upright as printed: Visa and contactless at the top, fine teal stripes, the GOtyme wordmark bottom right. */
function Tyme({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  return (
    <Turned h={h} w={w}>
      <LinearGradient colors={["#14181C", "#07090C"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={85.6 * u} style={StyleSheet.absoluteFill} width={54 * u}>
        <Defs>
          <SvgGradient id="tyme" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor="#22E5CF" stopOpacity="0.04" />
            <Stop offset="1" stopColor="#22E5CF" stopOpacity="1" />
          </SvgGradient>
        </Defs>
        {Array.from({ length: 10 }, (_, i) => (
          <Line key={i} stroke="url(#tyme)" strokeWidth={0.45 * u} x1={0} x2={54 * u} y1={(63 - i * 4.7) * u} y2={(59.5 - i * 4.7) * u} />
        ))}
      </Svg>
      <At u={u} x={3.9} y={3.4}>
        <SchemeLogo brand={card.brand} width={18.4 * u} />
      </At>
      <At u={u} x={46} y={4}>
        <Contactless colour="#C5CBD0" size={5.6 * u} />
      </At>
      <UprightPad colour="#4B5058" cx={35} cy={19} u={u} />
      <At r={3.8} u={u} y={70.8}>
        <Print colour="#FFFFFF" letterSpacing={-0.3} mm={8} u={u} weight="800">
          GO<Text style={{ fontWeight: "600" }}>tyme</Text>
        </Print>
      </At>
      <At r={3.8} u={u} y={79}>
        <Print colour="#C9CED2" mm={3.3} u={u}>
          bank
        </Print>
      </At>
      <At u={u} x={4} y={79}>
        <Print colour="#8F969B" mm={2.4} u={u}>
          {eft ? "INSTANT EFT" : (card.holder || "Cardholder").toUpperCase()}
        </Print>
      </At>
    </Turned>
  );
}

/** Discovery Bank Gold, drawn upright as printed: logo and contactless, the chip, the gold lace emblem (24 mm), number, expiry, name, account, Visa Gold. */
function Discovery({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  const grey = "#B2B1B1";
  return (
    <Turned h={h} w={w}>
      <LinearGradient colors={["#FFFFFF", "#F7F5F0"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={85.6 * u} style={StyleSheet.absoluteFill} width={54 * u}>
        {Array.from({ length: 14 }, (_, row) =>
          Array.from({ length: 17 }, (_, col) => <Circle cx={(3 + col * 3.1) * u} cy={(22 + row * 4.4) * u} fill="#ECE8DF" key={`${row}-${col}`} r={0.35 * u} />),
        )}
      </Svg>
      <Image contentFit="contain" source={ART.discoveryLogo} style={{ height: ((24.5 * 120) / 352) * u, left: 2.9 * u, position: "absolute", top: 3.6 * u, width: 24.5 * u }} />
      <At u={u} x={44.9} y={3}>
        <Contactless colour="#B39555" size={6.2 * u} />
      </At>
      <UprightPad colour="#D3AE5F" cx={31.25} cy={14.95} u={u} />
      <Image contentFit="contain" source={ART.discoveryEmblem} style={{ height: 24 * u, left: 15 * u, position: "absolute", top: 23.1 * u, width: 24 * u }} />
      <At u={u} x={5.3} y={49.4}>
        <Print colour={grey} letterSpacing={0.1} mm={4.3} u={u}>
          {eft ? "INSTANT EFT" : numberText(card).replace(/  /g, " ")}
        </Print>
      </At>
      {eft ? null : (
        <>
          <At u={u} x={5.3} y={55.4}>
            <Print colour={grey} mm={3.3} u={u}>
              <Text style={{ fontSize: 1.8 * u }}>EXP END  </Text>
              {card.expiry || "--/--"}
            </Print>
          </At>
          <At u={u} x={5.3} y={60.2}>
            <Print colour={grey} mm={3.3} u={u}>
              {(card.holder || "Cardholder").toUpperCase()}
            </Print>
          </At>
          <At u={u} x={5.3} y={65}>
            <Print colour={grey} mm={3.2} u={u}>
              <Text style={{ fontSize: 1.8 * u }}>ACC NO.  </Text>
              ••••••{card.last4}
            </Print>
          </At>
        </>
      )}
      <At r={3.8} u={u} y={71.4}>
        <SchemeLogo brand={card.brand} tone="gold" width={18.4 * u} />
      </At>
      <At r={3.8} u={u} y={79.4}>
        <Print colour="#B39555" mm={2.7} u={u}>
          Gold
        </Print>
      </At>
    </Turned>
  );
}

/** African Bank: black with a field of grey triangles on the right, the name top left, chip, contactless, number, name, Visa. */
function AfricanBank({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  const cols = 12;
  const rows = 8;
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#171717", "#060606"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const x0 = 42 * u;
          const tw = (w - x0) / cols;
          const th = h / rows;
          const shade = 22 + Math.round((Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1) * 46);
          const x = x0 + col * tw;
          const y = row * th;
          const up = (col + row) % 2 === 0;
          const pts = up ? `${x},${y + th} ${x + tw / 2},${y} ${x + tw},${y + th}` : `${x},${y} ${x + tw},${y} ${x + tw / 2},${y + th}`;
          return <Polygon fill={`rgb(${shade},${shade},${shade + 3})`} key={i} opacity={0.2 + (col / cols) * 0.75} points={pts} />;
        })}
        <Circle cx={9.2 * u} cy={8.4 * u} fill="none" r={2.7 * u} stroke="#FFFFFF" strokeDasharray={`${2.7 * u * 4.4} ${2.7 * u * 2}`} strokeWidth={1.1 * u} />
        <Circle cx={11 * u} cy={5.9 * u} fill="#7AC143" r={0.9 * u} />
      </Svg>
      <At u={u} x={13.3} y={4.6}>
        <Print colour="#FFFFFF" letterSpacing={-0.2} mm={5.6} u={u} weight="600">
          African Bank
        </Print>
      </At>
      <At u={u} x={29.7} y={11.6}>
        <Print colour="#9A9A9A" letterSpacing={0.4} mm={2.3} u={u}>
          CREDIT CARD
        </Print>
      </At>
      <Pad colour="#D4D4D6" u={u} x={7.2} y={18.8} />
      <At u={u} x={22.9} y={20.6}>
        <Contactless colour="#FFFFFF" size={5.6 * u} />
      </At>
      <At u={u} x={7.6} y={30.8}>
        <Print colour="#D8D8D8" letterSpacing={0.35} mm={5} u={u}>
          {eft ? "INSTANT EFT" : numberText(card).replace(/  /g, " ")}
        </Print>
      </At>
      <At u={u} x={8.4} y={41.2}>
        <Print colour="#CFCFCF" letterSpacing={0.3} mm={4.1} u={u}>
          {eft ? "" : (card.holder || "Cardholder").toUpperCase()}
        </Print>
      </At>
      <At b={4.4} r={5.5} u={u}>
        <SchemeLogo brand={card.brand} width={17.8 * u} />
      </At>
    </Frame>
  );
}

/** Investec Private Banking: silver-grey left, black with the zebra on the right (diagonal join), chip, number, name, Visa. */
function Investec({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const u = w / CARD_MM.width;
  const edge = `${53.6 * u},0 ${27.2 * u},${47.3 * u} ${23 * u},${h}`;
  return (
    <Frame h={h} w={w}>
      <View style={{ backgroundColor: "#050607", bottom: 0, left: 0, position: "absolute", right: 0, top: 0 }} />
      <View style={{ height: 32 * u, left: 46 * u, overflow: "hidden", position: "absolute", right: 0, top: 0 }}>
        <Image contentFit="cover" contentPosition="right top" source={ART.zebra} style={StyleSheet.absoluteFill} />
        <LinearGradient colors={["rgba(5,6,7,0)", "#050607"]} pointerEvents="none" style={{ bottom: 0, height: 10 * u, left: 0, position: "absolute", right: 0 }} />
      </View>
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Defs>
          <SvgGradient id="invGrey" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#9A9B9E" />
            <Stop offset="1" stopColor="#808184" />
          </SvgGradient>
        </Defs>
        <Polygon fill="url(#invGrey)" points={`0,0 ${edge} 0,${h}`} />
        <Path d={`M ${53.6 * u} 0 L ${27.2 * u} ${47.3 * u} L ${23 * u} ${h}`} fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth={0.6 * u} />
      </Svg>
      <At u={u} x={7.3} y={2.9}>
        <Print colour="#F2F2F2" mm={3.5} u={u} weight="300">
          Private Banking
        </Print>
      </At>
      <At u={u} x={7.3} y={8}>
        <Print colour="#FFFFFF" letterSpacing={0.3} mm={6.6} u={u} weight="300">
          ⊕ Investec
        </Print>
      </At>
      <Pad colour="#A9AAAD" u={u} x={9.7} y={18.4} />
      <At u={u} x={7.3} y={30.2}>
        <Print colour="#F4F4F4" letterSpacing={1.0} mm={3.4} u={u} weight="400">
          {eft ? "INSTANT EFT" : numberText(card).replace(/  /g, " ")}
        </Print>
      </At>
      {eft ? null : (
        <>
          <At u={u} x={33} y={39.8}>
            <Print colour="#F4F4F4" mm={3} u={u}>
              {card.expiry || "--/--"}
            </Print>
          </At>
          <At u={u} x={7.3} y={43.7}>
            <Print colour="#F4F4F4" letterSpacing={0.9} mm={2.9} u={u}>
              {(card.holder || "Cardholder").toUpperCase()}
            </Print>
          </At>
        </>
      )}
      <At b={3.6} r={3.6} u={u}>
        <SchemeLogo brand={card.brand} width={18.6 * u} />
      </At>
      <At r={3.3} u={u} y={2.2}>
        <Contactless colour="#FFFFFF" size={6.6 * u} />
      </At>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { borderCurve: "continuous", boxShadow: "0 12px 28px rgba(15, 20, 30, 0.3)", overflow: "hidden" },
});
