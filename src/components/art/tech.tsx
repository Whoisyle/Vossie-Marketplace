import { Circle, G, Path, Rect } from "react-native-svg";

import { Ground } from "./food";
import type { Fill } from "./kit";

/** A mint 14 inch laptop, open, with a lit screen showing a few app windows. */
export function mintLaptop(f: Fill) {
  return (
    <G>
      <Ground rx={86} />
      <Rect fill={f.g("lid", "#A7E6CB", "#5BB896")} height={96} rx={9} width={128} x={36} y={36} />
      <Rect fill="#16222B" height={84} rx={5} width={116} x={42} y={42} />
      <Rect fill={f.g("scr", "#4E7E8D", "#1F3F4C")} height={78} rx={3} width={110} x={45} y={45} />
      <Rect fill="rgba(255,255,255,0.9)" height={30} rx={4} width={46} x={54} y={54} />
      <Rect fill="#FFD84A" height={7} rx={3} width={30} x={60} y={62} />
      <Rect fill="#9FB6C2" height={5} rx={2} width={34} x={60} y={74} />
      <Rect fill="rgba(255,255,255,0.7)" height={52} rx={4} width={44} x={108} y={60} />
      <Path d="M114 100 L124 86 L132 94 L146 74" fill="none" stroke="#35505C" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} />
      <Path d="M20 140 H180 L172 152 Q170 156 164 156 H36 Q30 156 28 152 Z" fill={f.g("base", "#C9F0DE", "#7CCDAA")} />
      <Rect fill="rgba(0,0,0,0.14)" height={5} rx={2.5} width={34} x={83} y={140} />
      <Path d="M38 130 Q36 90 40 46" fill="none" opacity={0.5} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
    </G>
  );
}

/** A 10 inch tablet leaning on a desk stand, its screen full of app tiles. */
export function tablet(f: Fill) {
  return (
    <G>
      <Ground rx={64} />
      <Path d="M70 170 L100 132 L130 170 Z" fill={f.g("stand", "#C9D3DA", "#8798A4")} />
      <G transform="rotate(-8 100 100)">
        <Rect fill={f.g("tb", "#4A5B68", "#1C2832")} height={112} rx={11} width={140} x={30} y={32} />
        <Rect fill={f.g("ts", "#6FA8C0", "#2F5A67")} height={96} rx={5} width={124} x={38} y={40} />
        {Array.from({ length: 3 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => (
            <Rect fill={["#FFD84A", "#FF8A7A", "#8FD9B8", "#FFFFFF"][(r + c) % 4]} height={16} key={`${r}${c}`} opacity={0.95} rx={5} width={16} x={50 + c * 28} y={52 + r * 26} />
          )),
        )}
        <Circle cx={100} cy={128} fill="rgba(255,255,255,0.7)" r={2.4} />
        <Path d="M36 130 Q34 86 38 44" fill="none" opacity={0.35} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
      </G>
    </G>
  );
}

/** Over-ear wireless study headphones in soft white and teal. */
export function headphones(f: Fill) {
  return (
    <G>
      <Ground rx={60} />
      <Path d="M44 112 C34 40 166 40 156 112" fill="none" stroke={f.g("band", "#EAF0F3", "#B7C4CC")} strokeLinecap="round" strokeWidth={14} />
      <Path d="M52 104 C48 62 152 62 148 104" fill="none" opacity={0.7} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
      {[44, 156].map((x, i) => (
        <G key={i}>
          <Rect fill={f.g(`cup${i}`, "#F4F7F9", "#B9C6CE")} height={66} rx={22} width={38} x={x - 19} y={100} />
          <Rect fill={f.g(`cush${i}`, "#4E7E8D", "#2F5A67")} height={50} rx={16} width={20} x={i ? x - 24 : x + 4} y={108} />
          <Circle cx={x} cy={126} fill="#376371" opacity={0.9} r={6} />
          <Path d={`M${x - 11} 108 Q${x - 14} 126 ${x - 11} 150`} fill="none" opacity={0.7} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
        </G>
      ))}
    </G>
  );
}

/** A 7-in-1 USB-C hub: a slim silver bar with ports along the front and a cable coming out. */
export function usbHub(f: Fill) {
  return (
    <G>
      <Ground cy={170} rx={76} />
      <Path d="M168 112 C196 112 196 150 160 150 C130 150 130 128 150 126" fill="none" stroke="#2D3A44" strokeLinecap="round" strokeWidth={7} />
      <Rect fill={f.g("hub", "#E4EAEE", "#98A8B3")} height={52} rx={16} width={148} x={20} y={90} />
      <Rect fill={f.g("hubt", "#F7FAFB", "#D3DCE2")} height={18} rx={9} width={140} x={24} y={92} />
      {[0, 1, 2].map((i) => (
        <Rect fill="#1F2A33" height={12} key={`a${i}`} rx={3} width={22} x={34 + i * 30} y={106} />
      ))}
      {[0, 1, 2].map((i) => (
        <Rect fill="#3B8DE0" height={5} key={`b${i}`} rx={1} width={14} x={38 + i * 30} y={114} />
      ))}
      <Rect fill="#1F2A33" height={14} rx={4} width={30} x={128} y={105} />
      <Rect fill="#2F5A67" height={8} rx={3} width={22} x={132} y={108} />
      <Circle cx={36} cy={130} fill="#5BE08A" r={2.6} />
    </G>
  );
}
