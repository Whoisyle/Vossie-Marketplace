import { Circle, G, Path, Rect, Text as SvgText } from "react-native-svg";

import { Ground } from "./food";
import { type Fill, pairs } from "./kit";

/** The shared silhouette of a jacket: shoulders, sleeves hanging down and a straight hem. */
const JACKET = "M62 50 L86 40 L100 54 L114 40 L138 50 L152 66 L164 140 L148 146 L142 108 L140 168 Q100 176 60 168 L58 108 L52 146 L36 140 L48 66 Z";

/** Vintage denim jacket: washed blue, pointed collar, flap pockets and gold stitching. */
export function denimJacket(f: Fill) {
  return (
    <G>
      <Ground rx={70} />
      <Path d={JACKET} fill={f.g("dj", "#6F9BD0", "#2F5A98")} />
      <Path d="M58 108 L60 168 M142 108 L140 168" opacity={0.35} stroke="#17305A" strokeWidth={2} />
      <Path d="M86 40 L100 76 L114 40 L124 44 L100 90 L76 44 Z" fill={f.g("dc", "#8FB4E0", "#3F69A6")} />
      <Path d="M100 76 V172" stroke="#17305A" strokeWidth={2} />
      {[96, 112, 128, 144].map((y) => (
        <Circle cx={100} cy={y} fill="#E8B64A" key={y} r={3.2} />
      ))}
      {pairs([[68, 86], [118, 86]]).map(([x, y], i) => (
        <G key={i}>
          <Rect fill={f.g(`dp${i}`, "#7BA5D8", "#365F9E")} height={30} rx={3} stroke="#E8B64A" strokeDasharray="3 3" strokeWidth={1.4} width={30} x={x} y={y} />
          <Path d={`M${x} ${y + 12} H${x + 30}`} stroke="#E8B64A" strokeDasharray="3 3" strokeWidth={1.2} />
          <Circle cx={x + 15} cy={y + 12} fill="#E8B64A" r={2.6} />
        </G>
      ))}
      <Path d="M40 140 L52 146" stroke="#E8B64A" strokeDasharray="3 3" strokeWidth={1.4} />
      <Path d="M64 56 L52 70 M136 56 L148 70" opacity={0.5} stroke="#C9DDF4" strokeLinecap="round" strokeWidth={3} />
    </G>
  );
}

/** Retro bomber jacket: olive nylon with ribbed collar, cuffs and hem in warm orange. */
export function bomberJacket(f: Fill) {
  return (
    <G>
      <Ground rx={70} />
      <Path d={JACKET} fill={f.g("bj", "#7E9A5A", "#3F5A2A")} />
      <Rect fill={f.g("hem", "#F2A14A", "#C8691E")} height={14} rx={5} width={96} x={52} y={158} />
      <Rect fill={f.g("cuffl", "#F2A14A", "#C8691E")} height={14} rx={4} transform="rotate(-14 44 140)" width={20} x={34} y={134} />
      <Rect fill={f.g("cuffr", "#F2A14A", "#C8691E")} height={14} rx={4} transform="rotate(14 156 140)" width={20} x={146} y={134} />
      <Path d="M82 42 Q100 62 118 42 L124 48 Q100 76 76 48 Z" fill={f.g("bcol", "#F2A14A", "#C8691E")} />
      <Path d="M100 66 V160" stroke="#2A3F1A" strokeWidth={2.4} />
      {[78, 100, 122].map((y) => (
        <Circle cx={100} cy={y} fill="#C9D3DA" key={y} r={3} />
      ))}
      <Rect fill="#FFFFFF" height={5} opacity={0.85} rx={2} width={26} x={114} y={84} />
      <Path d="M64 58 L50 74 M134 58 L148 74" opacity={0.4} stroke="#DDEBC8" strokeLinecap="round" strokeWidth={4} />
    </G>
  );
}

/** Sage campus hoodie: soft green with a hood, drawstrings and a kangaroo pocket. */
export function hoodie(f: Fill) {
  return (
    <G>
      <Ground rx={70} />
      <Path d="M70 56 Q100 8 130 56 Q100 70 70 56 Z" fill={f.g("hd", "#9DBB9A", "#5E8460")} />
      <Path d={JACKET} fill={f.g("hb", "#B7D3B0", "#6E9970")} />
      <Path d="M76 52 Q100 78 124 52 Q100 30 76 52 Z" fill={f.g("hin", "#4F7550", "#2F4F31")} />
      <Path d="M92 66 V96 M108 66 V96" stroke="#F4F7F1" strokeLinecap="round" strokeWidth={3} />
      <Circle cx={92} cy={98} fill="#F4F7F1" r={3} />
      <Circle cx={108} cy={98} fill="#F4F7F1" r={3} />
      <Path d="M66 124 H134 L128 154 H72 Z" fill={f.g("hp", "#A5C69F", "#5F8962")} />
      <Path d="M66 124 L58 108 M134 124 L142 108" opacity={0.4} stroke="#2F4F31" strokeWidth={2} />
      <Rect fill="#8DB287" height={12} rx={5} width={96} x={52} y={162} />
      <Rect fill="#8DB287" height={12} rx={4} transform="rotate(-14 44 142)" width={20} x={34} y={136} />
      <Rect fill="#8DB287" height={12} rx={4} transform="rotate(14 156 142)" width={20} x={146} y={136} />
      <Path d="M64 58 L52 72" opacity={0.5} stroke="#E8F4E4" strokeLinecap="round" strokeWidth={4} />
      <SvgText fill="rgba(255,255,255,0.9)" fontSize={11} fontWeight="700" textAnchor="middle" x={100} y={118}>
        CAMPUS
      </SvgText>
    </G>
  );
}

/** Canvas tote bag: natural cotton with rope-stitched handles and a printed Vossie badge. */
export function toteBag(f: Fill) {
  return (
    <G>
      <Ground rx={60} />
      <Path d="M70 70 C70 18 130 18 130 70" fill="none" stroke={f.g("th", "#E8D7B4", "#B89D6A")} strokeLinecap="round" strokeWidth={9} />
      <Path d="M44 66 H156 L148 168 Q147 174 140 174 H60 Q53 174 52 168 Z" fill={f.g("tb", "#F6E9CC", "#D2B67E")} />
      <Path d="M44 66 H156 L154 80 H46 Z" fill="rgba(0,0,0,0.08)" />
      <Path d="M52 168 L46 80" opacity={0.5} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
      <Circle cx={100} cy={122} fill={f.g("tbadge", "#40677A", "#2F5A67")} r={30} />
      <Circle cx={100} cy={122} fill="none" opacity={0.8} r={24} stroke="#FFFFFF" strokeDasharray="2 5" strokeWidth={2} />
      <SvgText fill="#FFFFFF" fontSize={34} fontWeight="800" textAnchor="middle" x={100} y={134}>
        V
      </SvgText>
    </G>
  );
}
