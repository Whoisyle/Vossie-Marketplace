import { Circle, G, Path, Polygon, Rect, Text as SvgText } from "react-native-svg";

import { Ground } from "./food";
import type { Fill } from "./kit";

/** A tutor: a whiteboard with workings and a friendly person beside it. */
function tutor(f: Fill, id: string, board: React.ReactNode, skin: string, shirt: [string, string]) {
  return (
    <G>
      <Ground rx={80} />
      <Rect fill="#B7C4CC" height={6} rx={3} width={110} x={22} y={146} />
      <Rect fill={f.g(`${id}wb`, "#FFFFFF", "#E1E9EE")} height={96} rx={8} stroke="#B7C4CC" strokeWidth={4} width={112} x={20} y={40} />
      {board}
      <Path d="M46 146 L40 172 M96 146 L102 172" stroke="#8799A5" strokeLinecap="round" strokeWidth={4} />
      <G transform="translate(0 4)">
        <Path d="M136 176 V132 Q136 112 156 112 H174 Q194 112 194 132 V176 Z" fill={f.g(`${id}sh`, shirt[0], shirt[1])} />
        <Rect fill={skin} height={14} rx={5} width={14} x={158} y={100} />
        <Circle cx={166} cy={88} fill={skin} r={20} />
        <Path d="M146 86 Q146 64 166 64 Q188 64 186 86 Q178 74 166 76 Q154 74 146 86 Z" fill="#2B2320" />
        <Circle cx={159} cy={90} fill="#2B2320" r={2} />
        <Circle cx={173} cy={90} fill="#2B2320" r={2} />
        <Path d="M160 98 Q166 103 172 98" fill="none" stroke="#7A3B2E" strokeLinecap="round" strokeWidth={2} />
        <Path d="M138 132 L124 108" stroke={skin} strokeLinecap="round" strokeWidth={9} />
      </G>
    </G>
  );
}

/** Maths tutoring: equations on the whiteboard. */
export function mathsTutoring(f: Fill) {
  return tutor(
    f,
    "mt",
    <G>
      <SvgText fill="#2F5A67" fontSize={20} fontWeight="700" x={30} y={70}>
        x² + 4x = 12
      </SvgText>
      <SvgText fill="#D9503F" fontSize={17} fontWeight="700" x={30} y={96}>
        (x + 6)(x − 2)
      </SvgText>
      <SvgText fill="#2F5A67" fontSize={17} fontWeight="700" x={30} y={120}>
        x = 2
      </SvgText>
      <Path d="M92 112 L100 122 L116 100" fill="none" stroke="#3FA66A" strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} />
    </G>,
    "#F1C9A5",
    ["#5B8CCB", "#2F5A98"],
  );
}

/** Statistics tutoring: a bell curve and bars on the whiteboard. */
export function statsTutoring(f: Fill) {
  return tutor(
    f,
    "st",
    <G>
      <Path d="M30 118 C46 118 52 62 76 62 C100 62 106 118 122 118" fill="rgba(91,140,203,0.2)" stroke="#2F5A98" strokeLinecap="round" strokeWidth={3.4} />
      <Path d="M76 62 V118" stroke="#D9503F" strokeDasharray="4 4" strokeWidth={2.4} />
      {[18, 30, 42].map((h, i) => (
        <Rect fill={["#F2A14A", "#8FD9B8", "#B79CE8"][i]!} height={h} key={i} rx={2} width={10} x={34 + i * 14} y={52 - h + 20} />
      ))}
      <SvgText fill="#2F5A67" fontSize={13} fontWeight="700" x={90} y={52}>
        μ
      </SvgText>
    </G>,
    "#E0B08A",
    ["#8FD9B8", "#3E9C7C"],
  );
}

/** A private study room: desk, lamp, books and a chair. */
export function studyRoom(f: Fill) {
  return (
    <G>
      <Ground rx={84} />
      <Path d="M40 100 L40 172 M160 100 L160 172" stroke="#8B6A44" strokeLinecap="round" strokeWidth={7} />
      <Rect fill={f.g("desk", "#D9A86A", "#A87A3C")} height={14} rx={5} width={140} x={30} y={92} />
      <Rect fill="#7A5A34" height={30} rx={3} width={56} x={52} y={106} />
      <Rect fill={f.g("b1", "#5B8CCB", "#2F5A98")} height={14} rx={2} width={44} x={52} y={78} />
      <Rect fill={f.g("b2", "#FF8A7A", "#D9503F")} height={12} rx={2} width={40} x={56} y={66} />
      <Rect fill={f.g("b3", "#FFD84A", "#E0AE2C")} height={11} rx={2} width={46} x={50} y={55} />
      <Path d="M138 92 L126 52 L146 30" fill="none" stroke="#2D4652" strokeLinecap="round" strokeLinejoin="round" strokeWidth={5} />
      <Path d="M138 30 L158 36 L150 52 L132 44 Z" fill={f.g("lamp", "#FFE9A8", "#F2B93A")} />
      <Path d="M132 48 L100 86 L160 86 L148 54 Z" fill="rgba(255,233,168,0.28)" />
      <Rect fill="#2D4652" height={6} rx={3} width={30} x={124} y={88} />
      <Rect fill={f.g("seat", "#40677A", "#2F5A67")} height={14} rx={6} width={52} x={70} y={134} />
      <Path d="M76 148 L70 172 M114 148 L120 172" stroke="#2D4652" strokeLinecap="round" strokeWidth={5} />
      <Rect fill={f.g("back", "#4E7E8D", "#2F5A67")} height={34} rx={8} width={12} x={68} y={102} />
      <Circle cx={164} cy={60} fill="rgba(255,255,255,0.0)" r={1} />
    </G>
  );
}

/** Laptop cleanup and repair: an open laptop with a wrench and screwdriver crossed in front. */
export function laptopRepair(f: Fill) {
  return (
    <G>
      <Ground rx={82} />
      <Rect fill={f.g("llid", "#C9D3DA", "#8798A4")} height={86} rx={8} width={116} x={42} y={38} />
      <Rect fill="#16222B" height={74} rx={4} width={104} x={48} y={44} />
      <Rect fill={f.g("lscr", "#4E7E8D", "#1F3F4C")} height={68} rx={3} width={98} x={51} y={47} />
      <Path d="M70 76 L82 88 L106 62" fill="none" stroke="#5BE08A" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6} />
      <Path d="M28 128 H172 L164 142 Q162 146 156 146 H44 Q38 146 36 142 Z" fill={f.g("lbase", "#DDE5EA", "#9FB0BA")} />
      <G transform="rotate(-38 140 130)">
        <Rect fill={f.g("wr", "#E8EDF1", "#98A8B3")} height={74} rx={4} width={11} x={134} y={96} />
        <Path d="M128 100 Q128 80 140 80 Q152 80 152 100 L146 100 L146 92 L134 92 L134 100 Z" fill={f.g("wr2", "#E8EDF1", "#98A8B3")} />
      </G>
      <G transform="rotate(34 60 140)">
        <Rect fill="#F2A14A" height={46} rx={6} width={13} x={54} y={118} />
        <Rect fill={f.g("sd", "#E8EDF1", "#98A8B3")} height={32} width={4} x={58.5} y={86} />
        <Polygon fill="#98A8B3" points="56,86 62,86 59,80" />
      </G>
    </G>
  );
}

/** Print and bind: a printer with paper coming out and a ring-bound booklet. */
export function printing(f: Fill) {
  return (
    <G>
      <Ground rx={80} />
      <Rect fill="#FFFFFF" height={52} rx={3} stroke="#D7DEE3" strokeWidth={2} width={56} x={36} y={26} />
      <Path d="M44 38 H80 M44 48 H72 M44 58 H78" stroke="#B7C4CC" strokeLinecap="round" strokeWidth={3} />
      <Rect fill={f.g("pr", "#EEF2F5", "#B7C4CC")} height={50} rx={12} width={118} x={26} y={74} />
      <Rect fill="#40677A" height={14} rx={4} width={80} x={40} y={84} />
      <Circle cx={118} cy={91} fill="#5BE08A" r={4} />
      <Rect fill="#2D4652" height={10} rx={3} width={76} x={44} y={112} />
      <Rect fill="#FFFFFF" height={28} stroke="#D7DEE3" strokeWidth={2} width={64} x={42} y={118} />
      <Path d="M50 126 H92 M50 134 H80" stroke="#B7C4CC" strokeLinecap="round" strokeWidth={2.4} />
      <G transform="rotate(8 156 130)">
        <Rect fill={f.g("bk", "#FF8A7A", "#D9503F")} height={78} rx={5} width={50} x={132} y={96} />
        <Rect fill="rgba(255,255,255,0.9)" height={22} rx={3} width={30} x={142} y={108} />
        {Array.from({ length: 6 }, (_, i) => (
          <Rect fill="#2D4652" height={9} key={i} rx={4.5} width={12} x={125} y={102 + i * 11} />
        ))}
      </G>
    </G>
  );
}
