import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, G, Line, LinearGradient as SvgGradient, Path, Polygon, RadialGradient, Rect, Stop } from "react-native-svg";

import { landscapeHeight } from "@/components/StudentCard";
import type { Issuer } from "@/data/cardBrands";
import type { SavedCard } from "@/data/types";

import { Chip, Contactless, SchemeLogo } from "./CardArt";

/** Bank cards are drawn horizontally at real card size (85.6 x 54 mm). */
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
  zebra: require("../../../assets/banks/investec-zebra2.png"),
};

type Props = {
  card: SavedCard;
  issuer: Issuer;
  width: number;
  /** Instant EFT shows the bank's card with a caption instead of a card number. */
  eft?: boolean;
};

/** Places something on the card by its position as a share of the card's width and height. */
function At({ children, h, w, x, y }: { children: ReactNode; h: number; w: number; x: number; y: number }) {
  return <View style={{ left: w * x, position: "absolute", top: h * y }}>{children}</View>;
}

/** The card number and holder, in the card's own ink, where the real card prints them. */
function Number({ card, eft, ink, size }: { card: SavedCard; eft?: boolean; ink: string; size: number }) {
  return (
    <View>
      <Text style={{ color: ink, fontSize: size, fontVariant: ["tabular-nums"], fontWeight: "500", letterSpacing: size * 0.12 }}>{eft ? "INSTANT EFT" : `••••  ••••  ••••  ${card.last4}`}</Text>
      {!eft ? (
        <Text numberOfLines={1} style={{ color: ink, fontSize: size * 0.78, fontWeight: "500", letterSpacing: 0.6, marginTop: size * 0.4, opacity: 0.9 }}>
          {(card.holder || "Cardholder").toUpperCase()}  {card.expiry}
        </Text>
      ) : null}
    </View>
  );
}

function Frame({ children, h, w }: { children: ReactNode; h: number; w: number }) {
  return (
    <View style={[styles.frame, { borderRadius: w * 0.05, height: h, width: w }]} testID="card-face">
      {children}
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

/** Nedbank Gold debit: champagne metal, "Gold debit" top left, the holographic N in the middle, a chip, Visa bottom right. */
function Nedbank({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#BDB8A0", "#A8A38C", "#92938B"]} end={{ x: 0.9, y: 1 }} pointerEvents="none" start={{ x: 0.05, y: 0 }} style={StyleSheet.absoluteFill} />
      <LinearGradient colors={["rgba(255,255,255,0.28)", "rgba(255,255,255,0)", "rgba(255,255,255,0.12)"]} end={{ x: 1, y: 0.7 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <At h={h} w={w} x={0.06} y={0.08}>
        <Text style={{ color: "#6A664C", fontSize: h * 0.12, fontWeight: "800" }}>Gold</Text>
        <Text style={{ color: "#7A7659", fontSize: h * 0.08, fontWeight: "500", marginTop: -2 }}>debit</Text>
      </At>
      <At h={h} w={w} x={0.08} y={0.4}>
        <Chip colour="#CFC8AB" size={h / 120} />
      </At>
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Defs>
          <SvgGradient id="nb" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#7DF7B8" />
            <Stop offset="0.45" stopColor="#4FC8E8" />
            <Stop offset="0.8" stopColor="#F4EA6E" />
            <Stop offset="1" stopColor="#7DF7B8" />
          </SvgGradient>
        </Defs>
        <G transform={`translate(${w * 0.5}, ${h * 0.5})`}>
          <Polygon fill="url(#nb)" points={hexagon(h * 0.27)} />
          <Polygon fill="#F1EEDD" points={nShape(h * 0.27)} />
        </G>
      </Svg>
      <At h={h} w={w} x={0.06} y={0.78}>
        <Number card={card} eft={eft} ink="#5A563E" size={h * 0.065} />
      </At>
      <At h={h} w={w} x={0.76} y={0.78}>
        <SchemeLogo brand={card.brand} size={h * 0.3} />
      </At>
    </Frame>
  );
}

/** FNB Easy Debit: near-black with soft rings, a gold arc, the gold tree in the middle, "Easy Debit" top left, Visa bottom right. */
function Fnb({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const r = w * 0.5;
  return (
    <Frame h={h} w={w}>
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Defs>
          <RadialGradient cx="0.66" cy="0.5" id="fnbBg" r="0.7">
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
        <Circle cx={w * 0.66} cy={h * 0.5} fill="none" r={w * 0.4} stroke="rgba(255,255,255,0.045)" strokeWidth={w * 0.14} />
        <Circle cx={w * 0.66} cy={h * 0.5} fill="none" r={w * 0.2} stroke="rgba(0,0,0,0.35)" strokeWidth={w * 0.1} />
        <Circle cx={w * 0.14 + r} cy={h * 0.5} fill="none" r={r} stroke="url(#fnbArc)" strokeWidth={w * 0.009} />
      </Svg>
      <At h={h} w={w} x={0.065} y={0.075}>
        <Text style={{ color: "#F4AB09", fontSize: h * 0.1 }}>
          <Text style={{ fontWeight: "700" }}>Easy</Text> Debit
        </Text>
      </At>
      <At h={h} w={w} x={0.03} y={0.39}>
        <Contactless colour="#F4AB09" size={h * 0.1} />
      </At>
      <Image contentFit="contain" source={ART.fnb} style={{ height: w * 0.19, left: w * 0.66 - w * 0.095, position: "absolute", top: h * 0.5 - w * 0.095, width: w * 0.19 }} />
      <At h={h} w={w} x={0.065} y={0.8}>
        <Number card={card} eft={eft} ink="#F4AB09" size={h * 0.06} />
      </At>
      <At h={h} w={w} x={0.75} y={0.8}>
        <SchemeLogo brand={card.brand} size={h * 0.32} />
      </At>
    </Frame>
  );
}

/** Standard Bank debit: deep blue with a lighter sweep, the white shield and name top left, "Debit" top right, chip, number, Mastercard. */
function StandardBank({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#2243A6", "#1F3A9E", "#16297A"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Path d={`M ${w * 0.18} ${h} C ${w * 0.45} ${h * 0.55}, ${w * 0.75} ${h * 0.55}, ${w} ${h * 0.4} L ${w} ${h} Z`} fill="rgba(70,110,215,0.28)" />
        <Path d={`M ${w * 0.3} ${h} C ${w * 0.55} ${h * 0.7}, ${w * 0.8} ${h * 0.68}, ${w} ${h * 0.58} L ${w} ${h} Z`} fill="rgba(20,40,120,0.35)" />
      </Svg>
      <Image contentFit="contain" source={ART.standard} style={{ height: h * 0.2, left: w * 0.05, position: "absolute", top: h * 0.05, width: (h * 0.2 * 608) / 144 }} />
      <At h={h} w={w} x={0.8} y={0.085}>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.1, fontWeight: "600" }}>Debit</Text>
      </At>
      <At h={h} w={w} x={0.1} y={0.38}>
        <Chip colour="#BFC3CF" size={h / 120} />
      </At>
      <At h={h} w={w} x={0.1} y={0.7}>
        <Number card={card} eft={eft} ink="#FFFFFF" size={h * 0.075} />
      </At>
      <At h={h} w={w} x={0.76} y={0.7}>
        <SchemeLogo brand={card.brand} size={h * 0.3} />
      </At>
    </Frame>
  );
}

/** Absa Student Credit: black, the white Absa ring in the middle inside a colourful mosaic ring, chip, "Student Credit" top right, Visa bottom right. */
function Absa({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const cx = w * 0.5;
  const cy = h * 0.52;
  const rings = [0.34, 0.39, 0.44, 0.49];
  const hues = ["#E8222F", "#F0551E", "#F7A21B", "#F2C230", "#E0407F", "#B3207A"];
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#161214", "#0A090A"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        {rings.map((f, ring) =>
          hues.map((hue, i) => (
            <Circle
              cx={cx}
              cy={cy}
              fill="none"
              key={`${ring}-${i}`}
              r={h * f}
              stroke={hue}
              strokeDasharray={`${h * f * 1.1} ${h * f * 5.2}`}
              strokeDashoffset={-(h * f * 6.28 * (i / hues.length + ring * 0.05))}
              strokeOpacity={0.95 - ring * 0.12}
              strokeWidth={h * 0.045}
            />
          )),
        )}
        <Rect fill="#E8222F" height={h * 0.07} rx={1.5} width={w * 0.012} x={w * 0.9} y={0} />
        <Rect fill="#E8222F" height={h * 0.07} rx={1.5} width={w * 0.012} x={w * 0.09} y={h * 0.93} />
      </Svg>
      <Image contentFit="contain" source={ART.absa} style={{ height: h * 0.4, left: cx - h * 0.2, position: "absolute", top: cy - h * 0.2, width: h * 0.4 }} />
      <At h={h} w={w} x={0.07} y={0.1}>
        <Chip colour="#DADADD" size={h / 120} />
      </At>
      <At h={h} w={w} x={0.76} y={0.1}>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.075, fontWeight: "700", lineHeight: h * 0.085 }}>Student{"\n"}Credit</Text>
      </At>
      <At h={h} w={w} x={0.07} y={0.82}>
        <Number card={card} eft={eft} ink="#E9E4E8" size={h * 0.055} />
      </At>
      <At h={h} w={w} x={0.76} y={0.8}>
        <SchemeLogo brand={card.brand} size={h * 0.3} />
      </At>
    </Frame>
  );
}

/** Capitec GlobalOne: black with gold print, "GlobalOne" and the chip top left, the gold Capitec logo, name, "debit" and Mastercard. */
function Capitec({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#1C1C1C", "#101010", "#181818"]} end={{ x: 0.6, y: 1 }} pointerEvents="none" start={{ x: 0.2, y: 0 }} style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        {Array.from({ length: 40 }, (_, i) => (
          <Line key={i} stroke={i % 3 ? "rgba(255,255,255,0.02)" : "rgba(255,255,255,0.045)"} strokeWidth={1} x1={0} x2={w} y1={(i * h) / 40} y2={(i * h) / 40 + (i % 2 ? 1 : 0)} />
        ))}
      </Svg>
      <At h={h} w={w} x={0.06} y={0.1}>
        <Text style={{ color: "#B89A3E", fontSize: h * 0.09, fontWeight: "700", letterSpacing: -0.3 }}>GlobalOne</Text>
      </At>
      <At h={h} w={w} x={0.47} y={0.08}>
        <Chip colour="#C9A94F" size={h / 120} />
      </At>
      <At h={h} w={w} x={0.64} y={0.1}>
        <Contactless colour="#B89A3E" size={h * 0.11} />
      </At>
      <Image contentFit="contain" source={ART.capitec} style={{ height: (w * 0.66 * 106) / 536, left: w * 0.06, position: "absolute", top: h * 0.43, width: w * 0.66 }} />
      <At h={h} w={w} x={0.06} y={0.68}>
        <Text numberOfLines={1} style={{ color: "#B89A3E", fontSize: h * 0.075, fontWeight: "500", letterSpacing: 0.5 }}>
          {eft ? "INSTANT EFT" : (card.holder || "Cardholder").toUpperCase()}
        </Text>
      </At>
      <At h={h} w={w} x={0.06} y={0.86}>
        <Text style={{ color: "#B89A3E", fontSize: h * 0.085, fontWeight: "500" }}>debit</Text>
      </At>
      <At h={h} w={w} x={0.7} y={0.72}>
        <SchemeLogo brand={card.brand} size={h * 0.38} />
      </At>
    </Frame>
  );
}

/** GoTyme Bank: black with fine teal stripes, the GOtyme wordmark and Visa. */
function Tyme({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#0B0F12", "#05070A"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Defs>
          <SvgGradient id="tyme" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor="#22E5CF" stopOpacity="0.05" />
            <Stop offset="1" stopColor="#22E5CF" stopOpacity="1" />
          </SvgGradient>
        </Defs>
        {Array.from({ length: 9 }, (_, i) => (
          <Line key={i} stroke="url(#tyme)" strokeWidth={h * 0.012} x1={w * 0.2} x2={w} y1={h * (0.6 + i * 0.07)} y2={h * (0.1 + i * 0.07)} />
        ))}
      </Svg>
      <At h={h} w={w} x={0.06} y={0.08}>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.18, fontWeight: "800", letterSpacing: -0.5 }}>
          GO<Text style={{ fontWeight: "600" }}>tyme</Text>
        </Text>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.09, marginTop: -2 }}>bank</Text>
      </At>
      <At h={h} w={w} x={0.06} y={0.8}>
        <Number card={card} eft={eft} ink="#CFF7F2" size={h * 0.06} />
      </At>
      <At h={h} w={w} x={0.76} y={0.78}>
        <SchemeLogo brand={card.brand} size={h * 0.34} />
      </At>
    </Frame>
  );
}

/** Discovery Bank Gold: white, the gold logo top left, chip, gold lace emblem, number, Visa Gold bottom right. */
function Discovery({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#FFFFFF", "#F6F4EF"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        {Array.from({ length: 4 }, (_, row) =>
          Array.from({ length: 18 }, (_, col) => <Circle cx={w * (0.05 + col * 0.055)} cy={h * (0.6 + row * 0.1)} fill="#E8E4DA" key={`${row}-${col}`} r={1.2} />),
        )}
      </Svg>
      <Image contentFit="contain" source={ART.discoveryLogo} style={{ height: (w * 0.34 * 120) / 352, left: w * 0.05, position: "absolute", top: h * 0.07, width: w * 0.34 }} />
      <At h={h} w={w} x={0.08} y={0.4}>
        <Chip colour="#D3AE5F" size={h / 120} />
      </At>
      <At h={h} w={w} x={0.9} y={0.07}>
        <Contactless colour="#B08A42" size={h * 0.12} />
      </At>
      <Image contentFit="contain" source={ART.discoveryEmblem} style={{ height: h * 0.62, left: w * 0.58, position: "absolute", top: h * 0.18, width: h * 0.62 }} />
      <At h={h} w={w} x={0.08} y={0.72}>
        <Number card={card} eft={eft} ink="#8A8478" size={h * 0.07} />
      </At>
      <At h={h} w={w} x={0.76} y={0.76}>
        <SchemeLogo brand={card.brand} size={h * 0.36} tone="gold" />
      </At>
    </Frame>
  );
}

/** African Bank: black with a field of grey triangles, the name top left, chip, number and name, Visa bottom right. */
function AfricanBank({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  const cols = 14;
  const rows = 9;
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#161616", "#050505"]} pointerEvents="none" style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        {Array.from({ length: rows * cols }, (_, i) => {
          const col = i % cols;
          const row = Math.floor(i / cols);
          const shade = 22 + Math.round(((Math.abs(Math.sin(i * 12.9898) * 43758.5453) % 1) * 46));
          const x = (col / cols) * w;
          const y = (row / rows) * h;
          const tw = w / cols;
          const th = h / rows;
          const up = (col + row) % 2 === 0;
          const pts = up ? `${x},${y + th} ${x + tw / 2},${y} ${x + tw},${y + th}` : `${x},${y} ${x + tw},${y} ${x + tw / 2},${y + th}`;
          return <Polygon fill={`rgb(${shade},${shade},${shade + 2})`} key={i} opacity={0.35 + (col / cols) * 0.65} points={pts} />;
        })}
      </Svg>
      <At h={h} w={w} x={0.06} y={0.07}>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.1, fontWeight: "700" }}>African Bank</Text>
        <Text style={{ color: "#BDBDBD", fontSize: h * 0.04, fontWeight: "600", letterSpacing: 0.8, marginTop: 1 }}>CREDIT CARD</Text>
      </At>
      <At h={h} w={w} x={0.06} y={0.3}>
        <Chip colour="#CFCFCF" size={h / 120} />
      </At>
      <At h={h} w={w} x={0.3} y={0.34}>
        <Contactless colour="#FFFFFF" size={h * 0.1} />
      </At>
      <At h={h} w={w} x={0.06} y={0.68}>
        <Number card={card} eft={eft} ink="#FFFFFF" size={h * 0.075} />
      </At>
      <At h={h} w={w} x={0.76} y={0.78}>
        <SchemeLogo brand={card.brand} size={h * 0.34} />
      </At>
    </Frame>
  );
}

/** Investec Private Banking: silver-grey left, black with the zebra on the right (diagonal join), chip, number, Visa. */
function Investec({ card, eft, issuer, width }: Props) {
  const { height: h, width: w } = bankCardSize(issuer, width);
  return (
    <Frame h={h} w={w}>
      <LinearGradient colors={["#B0B1B3", "#8A8C8F", "#6E7073"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Polygon fill="#050607" points={`${w * 0.62},0 ${w},0 ${w},${h} ${w * 0.42},${h}`} />
      </Svg>
      <View style={{ bottom: 0, height: h * 0.9, overflow: "hidden", position: "absolute", right: 0, width: w * 0.42 }}>
        <Image contentFit="cover" source={ART.zebra} style={StyleSheet.absoluteFill} />
      </View>
      <Svg height={h} style={StyleSheet.absoluteFill} width={w}>
        <Polygon fill="#050607" points={`${w * 0.62},0 ${w * 0.7},0 ${w * 0.5},${h} ${w * 0.42},${h}`} />
      </Svg>
      <At h={h} w={w} x={0.08} y={0.08}>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.065 }}>Private Banking</Text>
      </At>
      <At h={h} w={w} x={0.08} y={0.17}>
        <Text style={{ color: "#FFFFFF", fontSize: h * 0.11, fontWeight: "500" }}>⊕ Investec</Text>
      </At>
      <At h={h} w={w} x={0.12} y={0.37}>
        <Chip colour="#CFCFD1" size={h / 130} />
      </At>
      <At h={h} w={w} x={0.08} y={0.62}>
        <Number card={card} eft={eft} ink="#FFFFFF" size={h * 0.075} />
      </At>
      <At h={h} w={w} x={0.76} y={0.78}>
        <SchemeLogo brand={card.brand} size={h * 0.34} />
      </At>
    </Frame>
  );
}

const styles = StyleSheet.create({
  frame: { borderCurve: "continuous", boxShadow: "0 12px 28px rgba(15, 20, 30, 0.3)", overflow: "hidden" },
});
