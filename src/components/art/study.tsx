import { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";

import { Ground } from "./food";
import { type Fill, triples } from "./kit";

/** A hardback seen from the front with its spine on the left and page edges along the bottom. */
function hardback(f: Fill, id: string, x: number, y: number, w: number, h: number, lit: string, shade: string, spine: string) {
  return (
    <G>
      <Rect fill="#F4EEDC" height={h} rx={4} width={w} x={x + 5} y={y + 5} />
      <Rect fill="#E2D9BE" height={5} width={w - 6} x={x + 6} y={y + h} />
      <Rect fill={f.g(id, lit, shade)} height={h} rx={5} width={w} x={x} y={y} />
      <Rect fill={spine} height={h} rx={4} width={11} x={x} y={y} />
      <Path d={`M${x + 16} ${y + 6} V${y + h - 6}`} opacity={0.25} stroke="#FFFFFF" strokeWidth={2} />
    </G>
  );
}

/** Engineering mathematics: a deep blue textbook with a sigma and a graph grid. */
export function engMaths(f: Fill) {
  return (
    <G>
      <Ground rx={64} />
      <G transform="rotate(-5 100 100)">
        {hardback(f, "em", 44, 22, 110, 146, "#3D6FB8", "#1E3F78", "#18305E")}
        {[0, 1, 2, 3].map((i) => (
          <Path d={`M70 ${96 + i * 14} H146`} key={i} opacity={0.18} stroke="#FFFFFF" strokeWidth={1.4} />
        ))}
        {[0, 1, 2, 3, 4].map((i) => (
          <Path d={`M${78 + i * 16} 92 V150`} key={i} opacity={0.18} stroke="#FFFFFF" strokeWidth={1.4} />
        ))}
        <SvgText fill="#FFFFFF" fontSize={54} fontWeight="700" textAnchor="middle" x={104} y={84}>
          Σ
        </SvgText>
        <Path d="M76 142 C92 112 108 150 128 108 S146 112 146 100" fill="none" stroke="#FFD84A" strokeLinecap="round" strokeWidth={3.4} />
        <Rect fill="#FFD84A" height={5} rx={2} width={50} x={70} y={34} />
      </G>
    </G>
  );
}

/** Economics: a warm orange textbook with a rising bar chart. */
export function econBook(f: Fill) {
  return (
    <G>
      <Ground rx={64} />
      <G transform="rotate(4 100 100)">
        {hardback(f, "eb", 46, 22, 108, 146, "#F2A14A", "#C8691E", "#9F4F14")}
        {[28, 44, 62, 84].map((h, i) => (
          <Rect fill="rgba(255,255,255,0.92)" height={h} key={i} rx={3} width={14} x={72 + i * 20} y={140 - h} />
        ))}
        <Path d="M70 100 L98 84 L118 92 L146 56" fill="none" stroke="#1F2F39" strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.4} />
        <Circle cx={146} cy={56} fill="#1F2F39" r={4.4} />
        <Rect fill="rgba(255,255,255,0.9)" height={5} rx={2} width={48} x={70} y={34} />
      </G>
    </G>
  );
}

/** Intro to programming: a dark textbook with a green code glyph and a few lines of code. */
export function progBook(f: Fill) {
  return (
    <G>
      <Ground rx={64} />
      <G transform="rotate(-4 100 100)">
        {hardback(f, "pb", 46, 22, 108, 146, "#2C4150", "#141E28", "#0E1620")}
        <SvgText fill="#5BE08A" fontSize={34} fontWeight="700" textAnchor="middle" x={104} y={86}>
          {"</>"}
        </SvgText>
        {triples([[70, 104, 48], [78, 116, 56], [78, 128, 34], [70, 140, 62]]).map(([x, y, w], i) => (
          <Rect fill={i % 2 ? "#7FB5FF" : "#FFD84A"} height={5} key={i} opacity={0.9} rx={2.5} width={w} x={x} y={y} />
        ))}
        <Rect fill="#5BE08A" height={5} rx={2} width={40} x={70} y={34} />
      </G>
    </G>
  );
}

/** Study planner and notebook set: three notebooks fanned out with a pen. */
export function plannerNotebooks(f: Fill) {
  const nb = (x: number, a: number, id: string, lit: string, shade: string) => (
    <G transform={`rotate(${a} ${x + 36} 160)`}>
      <Rect fill={f.g(id, lit, shade)} height={134} rx={7} width={74} x={x} y={28} />
      <Rect fill="rgba(0,0,0,0.12)" height={134} rx={4} width={10} x={x} y={28} />
      <Rect fill="rgba(255,255,255,0.85)" height={30} rx={4} width={44} x={x + 20} y={46} />
      <Path d={`M${x + 28} 56 H${x + 56} M${x + 28} 66 H${x + 48}`} stroke="#9FB0BA" strokeLinecap="round" strokeWidth={2.4} />
      <Rect fill="rgba(255,255,255,0.35)" height={134} width={6} x={x + 60} y={28} />
    </G>
  );
  return (
    <G>
      <Ground rx={76} />
      {nb(36, -14, "n1", "#B79CE8", "#7A5DC0")}
      {nb(86, 12, "n2", "#8FD9B8", "#3E9C7C")}
      {nb(60, -1, "n3", "#FFE07A", "#E0AE2C")}
      <Rect fill="#2D4652" height={134} rx={2} width={5} x={118} y={28} />
      <G transform="rotate(32 160 120)">
        <Rect fill={f.g("pen", "#2D4652", "#1B2C36")} height={92} rx={4} width={10} x={155} y={74} />
        <Path d="M155 166 L160 180 L165 166 Z" fill="#F2C078" />
        <Rect fill="#FF6B6B" height={12} rx={3} width={10} x={155} y={74} />
      </G>
    </G>
  );
}

/** A4 folder pack: five folders in green tones, fanned with tabs showing. */
export function greenFolders(f: Fill) {
  const tones: readonly (readonly [string, string])[] = [["#CFEBD8", "#8FC7A2"], ["#9AD6B0", "#4FA373"], ["#6FC291", "#2F8458"], ["#4FAE7D", "#1F6E49"], ["#E8F4EC", "#B9DCC6"]];
  return (
    <G>
      <Ground rx={74} />
      {tones.map(([lit, shade], i) => (
        <G key={i} transform={`rotate(${(i - 2) * 6} 100 170)`}>
          <Path d={`M${40 + i * 3} 52 H${70 + i * 8} L${78 + i * 8} 40 H${96 + i * 8} L${104 + i * 8} 52 H${150 - i * 3} Q${156 - i * 3} 52 ${156 - i * 3} 58 V160 Q${156 - i * 3} 166 ${150 - i * 3} 166 H${46 + i * 3} Q${40 + i * 3} 166 ${40 + i * 3} 160 V58 Q${40 + i * 3} 52 ${46 + i * 3} 52 Z`} fill={f.g(`fo${i}`, lit, shade)} />
        </G>
      ))}
      <Path d="M58 66 H128" opacity={0.5} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={4} />
      <Rect fill="rgba(255,255,255,0.9)" height={22} rx={4} width={52} x={74} y={104} />
      <Path d="M82 112 H116 M82 120 H104" stroke="#8FA39A" strokeLinecap="round" strokeWidth={2.4} />
    </G>
  );
}

/** Weekly desk planner: a coral cover with a spiral binding, a grid sticker and a pencil. */
export function deskPlanner(f: Fill) {
  return (
    <G>
      <Ground rx={68} />
      <G transform="rotate(-6 100 100)">
        <Rect fill="#E7DCC4" height={140} rx={8} width={112} x={42} y={28} />
        <Rect fill={f.g("dp", "#FF8A7A", "#D9503F")} height={140} rx={8} width={108} x={40} y={24} />
        {Array.from({ length: 9 }, (_, i) => (
          <Rect fill="#2D4652" height={5} key={i} rx={2.5} width={20} x={30} y={34 + i * 15} />
        ))}
        <Rect fill="rgba(255,255,255,0.95)" height={74} rx={6} width={66} x={62} y={50} />
        {[0, 1, 2, 3, 4].map((r) =>
          [0, 1, 2, 3].map((c) => <Rect fill={(r + c) % 3 === 0 ? "#FFD84A" : "#E8EEF1"} height={9} key={`${r}${c}`} rx={2} width={12} x={66 + c * 15} y={54 + r * 14} />),
        )}
        <Rect fill="rgba(255,255,255,0.9)" height={6} rx={3} width={60} x={62} y={36} />
      </G>
      <G transform="rotate(48 160 110)">
        <Rect fill={f.g("pc", "#FFD84A", "#E0AE2C")} height={96} width={9} x={156} y={62} />
        <Path d="M156 158 L160.5 172 L165 158 Z" fill="#F2C078" />
        <Path d="M159 168 L160.5 172 L162 168 Z" fill="#2D3A44" />
        <Rect fill="#F28B9B" height={10} rx={2} width={9} x={156} y={56} />
      </G>
    </G>
  );
}

/** Pastel highlighter set: three highlighters with caps, lying at angles. */
export function highlighters(f: Fill) {
  const pen = (x: number, a: number, id: string, lit: string, shade: string, cap: string) => (
    <G transform={`rotate(${a} ${x} 110)`}>
      <Rect fill={f.g(id, lit, shade)} height={100} rx={9} width={26} x={x - 13} y={64} />
      <Rect fill={cap} height={34} rx={8} width={26} x={x - 13} y={34} />
      <Rect fill="rgba(255,255,255,0.5)" height={86} rx={2} width={5} x={x - 8} y={70} />
      <Path d={`M${x - 13} 164 L${x - 8} 182 H${x + 8} L${x + 13} 164 Z`} fill={shade} />
      <Rect fill="rgba(255,255,255,0.85)" height={20} rx={3} width={20} x={x - 10} y={104} />
    </G>
  );
  return (
    <G>
      <Ground rx={72} />
      {pen(56, -16, "h1", "#FFB6D0", "#E86C9A", "#C94A7C")}
      {pen(100, 0, "h2", "#B6EBCB", "#58BE88", "#3C9A6A")}
      {pen(146, 16, "h3", "#FFF09A", "#EBC83A", "#C9A21E")}
    </G>
  );
}

/** Scientific calculator: dark body, green screen and a grid of coloured keys. */
export function calculator(f: Fill) {
  return (
    <G>
      <Ground rx={52} />
      <G transform="rotate(-6 100 100)">
        <Rect fill={f.g("cb", "#3A4B58", "#1A2530")} height={148} rx={14} width={92} x={54} y={20} />
        <Rect fill={f.g("sc", "#C9F0B0", "#8BCB78")} height={32} rx={6} width={72} x={64} y={32} />
        <SvgText fill="#2D5A2A" fontSize={20} fontWeight="700" textAnchor="end" x={132} y={56}>
          3.14159
        </SvgText>
        {Array.from({ length: 5 }, (_, r) =>
          Array.from({ length: 4 }, (_, c) => (
            <Rect fill={c === 3 ? "#FF9A3C" : r === 0 ? "#6C8AA0" : "#E8EEF1"} height={14} key={`${r}${c}`} rx={5} width={16} x={65 + c * 18.6} y={78 + r * 17.4} />
          )),
        )}
        <Path d="M58 28 Q56 90 62 150" fill="none" opacity={0.3} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
      </G>
    </G>
  );
}
