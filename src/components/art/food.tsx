import { Circle, Ellipse, G, Path, Polygon, Rect } from "react-native-svg";

import { type Fill, pairs, triples } from "./kit";

/** A soft shadow on the ground, drawn as three nested ellipses so it needs no blur. */
export function Ground({ cx = 100, cy = 176, rx = 64, ry = 9 }: { cx?: number; cy?: number; rx?: number; ry?: number }) {
  return (
    <G>
      <Ellipse cx={cx} cy={cy} fill="rgba(18,30,42,0.07)" rx={rx} ry={ry} />
      <Ellipse cx={cx} cy={cy} fill="rgba(18,30,42,0.10)" rx={rx * 0.8} ry={ry * 0.75} />
      <Ellipse cx={cx} cy={cy} fill="rgba(18,30,42,0.14)" rx={rx * 0.55} ry={ry * 0.5} />
    </G>
  );
}

const SEEDS: readonly (readonly [number, number, number])[] = [[58, 84, -20], [74, 74, 10], [92, 70, -8], [110, 76, 18], [124, 86, 30], [84, 90, 6], [102, 88, -14]];

/** Burger with chips: sesame bun, lettuce, tomato, cheese and patty in front of a red box of fries. */
export function burgerChips(f: Fill) {
  return (
    <G>
      <Ground cx={100} rx={78} />
      <G transform="rotate(8 150 120)">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <Rect fill={f.g(`fry${i % 2}`, "#FFD65A", "#E8A92A")} height={52} key={i} rx={3} width={9} x={128 + i * 10} y={64 + (i % 3) * 5} />
        ))}
        <Polygon fill={f.g("box", "#E8483B", "#B52A2A")} points="124,98 184,98 176,172 132,172" />
        <Path d="M124 98 H184 L182 108 H126 Z" fill="#F7D13A" />
        <Circle cx={154} cy={136} fill="rgba(255,255,255,0.9)" r={11} />
        <Path d="M148 136 Q154 126 160 136 Q154 146 148 136 Z" fill="#E8483B" />
      </G>
      <G transform="translate(-8 4)">
        <Rect fill={f.g("bunb", "#E9B25E", "#C98A36")} height={20} rx={10} width={108} x={26} y={140} />
        <Rect fill={f.g("patty", "#7A4A2C", "#4A2A18")} height={20} rx={9} width={116} x={22} y={124} />
        <Polygon fill={f.g("cheese", "#FFD84A", "#F0A81C")} points="26,122 134,122 122,134 100,126 82,140 62,127 40,136" />
        <Rect fill={f.g("tom", "#F0584A", "#C23030")} height={13} rx={6} width={106} x={27} y={112} />
        <Path d="M24 116 q9 -11 18 0 t18 0 t18 0 t18 0 t18 0 t18 0 v9 H24 z" fill={f.g("let", "#7FD16A", "#3F9A3F")} />
        <Path d="M24 112 C22 56 138 56 136 112 Z" fill={f.g("bunt", "#F2BD6C", "#CC8A38")} />
        <Path d="M40 86 C48 66 70 58 92 58" fill="none" opacity={0.5} stroke="#FFF1D2" strokeLinecap="round" strokeWidth={5} />
        {SEEDS.map(([x, y, a], i) => (
          <Ellipse cx={x - 10} cy={y - 4} fill="#FFF3D8" key={i} rx={4.2} ry={2} transform={`rotate(${a} ${x - 10} ${y - 4})`} />
        ))}
      </G>
    </G>
  );
}

/** Iced latte: tall glass with ice, milk over coffee and a striped straw. */
export function icedLatte(f: Fill) {
  return (
    <G>
      <Ground rx={46} />
      <Path d="M112 18 L98 120" stroke={f.g("straw", "#FF5A5A", "#C93030")} strokeLinecap="round" strokeWidth={7} />
      <Path d="M110.5 26 L108.5 40 M106 54 L104 68 M101.5 82 L99.6 96" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={7} />
      <Path d="M64 44 H136 L128 168 Q127 176 118 176 H82 Q73 176 72 168 Z" fill="rgba(255,255,255,0.35)" stroke="rgba(255,255,255,0.8)" strokeWidth={2} />
      <Path d="M71 124 H129 L127.5 168 Q127 174 118 174 H82 Q73 174 72.5 168 Z" fill={f.g("coffee", "#7B4A2C", "#3D2314", true)} />
      <Path d="M67 84 H133 L129.4 124 H70.6 Z" fill={f.g("milk", "#FFF6E6", "#EBD3AE", true)} />
      <Path d="M70.6 124 q7 -7 14 0 t14 0 t14 0 t14 0" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={3} />
      <G opacity={0.85}>
        <Rect fill="rgba(255,255,255,0.7)" height={26} rx={5} transform="rotate(-12 80 66)" width={26} x={68} y={50} />
        <Rect fill="rgba(255,255,255,0.6)" height={26} rx={5} transform="rotate(10 114 62)" width={26} x={102} y={48} />
        <Rect fill="rgba(255,255,255,0.65)" height={24} rx={5} transform="rotate(4 96 90)" width={24} x={84} y={78} />
      </G>
      <Path d="M74 52 L79 164" opacity={0.7} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
    </G>
  );
}

/** Flat white: a cup of coffee with a heart in the foam on a saucer, with steam. */
export function flatWhite(f: Fill) {
  return (
    <G>
      <Ground rx={72} />
      <Ellipse cx={100} cy={152} fill={f.g("saucer", "#FFFFFF", "#D5DDE3")} rx={68} ry={17} />
      <Ellipse cx={100} cy={149} fill="#F3F6F8" rx={46} ry={10} />
      <Path d="M138 96 q30 -4 26 22 q-4 20 -30 18" fill="none" stroke={f.g("handle", "#FFFFFF", "#CBD4DB")} strokeLinecap="round" strokeWidth={9} />
      <Path d="M52 88 H148 Q148 150 100 152 Q52 150 52 88 Z" fill={f.g("cup", "#FFFFFF", "#CFD8DE")} />
      <Ellipse cx={100} cy={88} fill={f.r("rim", "#FFFFFF", "#E3E9ED")} rx={48} ry={13} />
      <Ellipse cx={100} cy={89} fill={f.g("flat", "#8A5632", "#5A361C", true)} rx={42} ry={10} />
      <Path d="M100 96 C80 88 86 79 94 82 C98 83 100 87 100 87 C100 87 102 83 106 82 C114 79 120 88 100 96 Z" fill="#F7E8D1" />
      <G opacity={0.55}>
        <Path d="M84 66 q-8 -12 0 -22 q8 -10 0 -22" fill="none" stroke="#B7C4CC" strokeLinecap="round" strokeWidth={5} />
        <Path d="M104 62 q-8 -12 0 -22 q8 -10 0 -22" fill="none" stroke="#B7C4CC" strokeLinecap="round" strokeWidth={5} />
        <Path d="M124 66 q-8 -12 0 -22 q8 -10 0 -22" fill="none" stroke="#B7C4CC" strokeLinecap="round" strokeWidth={5} />
      </G>
    </G>
  );
}

/** Matcha and avocado toast: two slices with avocado fans and a green matcha glass. */
export function matchaAvo(f: Fill) {
  const slice = (x: number, y: number, a: number) => (
    <G transform={`rotate(${a} ${x + 36} ${y + 34})`}>
      <Rect fill={f.g("toast", "#E8B66B", "#B97E34")} height={66} rx={14} width={72} x={x} y={y} />
      <Rect fill={f.g("crumb", "#F7DDA6", "#E2B466")} height={54} rx={10} width={60} x={x + 6} y={y + 6} />
      <Path d={`M${x + 12} ${y + 40} C${x + 18} ${y + 14} ${x + 54} ${y + 14} ${x + 60} ${y + 40} C${x + 54} ${y + 56} ${x + 18} ${y + 56} ${x + 12} ${y + 40} Z`} fill={f.g("avo", "#B8D76B", "#6FA03A")} />
      <Ellipse cx={x + 36} cy={y + 38} fill="#D9E9A0" rx={12} ry={8} />
    </G>
  );
  return (
    <G>
      <Ground rx={78} />
      <Ellipse cx={86} cy={140} fill={f.g("plate", "#FFFFFF", "#D0D9DF")} rx={72} ry={26} />
      {slice(34, 84, -8)}
      {slice(62, 96, 7)}
      <Path d="M132 70 H174 L170 150 Q169 158 160 158 H146 Q137 158 136 150 Z" fill="rgba(255,255,255,0.4)" stroke="rgba(255,255,255,0.9)" strokeWidth={2} />
      <Path d="M135.5 98 H170.5 L169.5 150 Q169 156 160 156 H146 Q137 156 136.5 150 Z" fill={f.g("matcha", "#9BD16B", "#4E8F34", true)} />
      <Path d="M138 76 L141 150" opacity={0.7} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
    </G>
  );
}

/** Chocolate-dipped strawberries. */
export function strawberries(f: Fill) {
  const berry = (x: number, y: number, s: number, a: number, i: number) => (
    <G key={i} transform={`translate(${x} ${y}) rotate(${a}) scale(${s})`}>
      <Path d="M0 -34 C-26 -38 -34 -8 -20 20 C-10 40 10 40 20 20 C34 -8 26 -38 0 -34 Z" fill={f.g(`sb${i}`, "#FF6B6B", "#C42B3A")} />
      <Path d="M-31 -10 C-26 -34 26 -34 31 -10 Q24 -2 18 -8 Q12 2 6 -6 Q0 4 -6 -6 Q-12 2 -18 -8 Q-24 -2 -31 -10 Z" fill={f.g(`ch${i}`, "#7A4A2C", "#3B2113")} />
      <Path d="M-14 -22 Q-6 -30 4 -28" fill="none" opacity={0.5} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
      {pairs([[-8, 10], [6, 14], [-14, 22], [12, 26], [0, 28], [-4, 18]]).map(([sx, sy], k) => (
        <Ellipse cx={sx} cy={sy} fill="#FFE29B" key={k} rx={1.6} ry={2.4} />
      ))}
      <Path d="M-14 -34 L0 -44 L14 -34 L6 -38 L0 -30 L-6 -38 Z" fill="#4FA03F" />
    </G>
  );
  return (
    <G>
      <Ground rx={74} />
      {berry(52, 118, 1.15, -14, 0)}
      {berry(104, 98, 1.3, 8, 1)}
      {berry(148, 126, 1.05, 22, 2)}
      {berry(98, 148, 1.0, -4, 3)}
    </G>
  );
}

/** Zinger meal: crispy chicken burger and a cola cup. */
export function zingerMeal(f: Fill) {
  return (
    <G>
      <Ground rx={82} />
      <Path d="M130 68 H178 L170 168 Q169 174 162 174 H146 Q139 174 138 168 Z" fill={f.g("cup", "#E8483B", "#A52424")} />
      <Rect fill="#FFFFFF" height={26} transform="skewX(-3)" width={46} x={133} y={104} />
      <Circle cx={156} cy={117} fill="#E8483B" r={8} />
      <Rect fill="#2D3A44" height={10} rx={4} width={56} x={126} y={60} />
      <Path d="M156 60 L164 22" stroke="#FFFFFF" strokeLinecap="round" strokeWidth={6} />
      <G transform="translate(-6 6)">
        <Rect fill={f.g("zb", "#E9B25E", "#C98A36")} height={20} rx={10} width={104} x={22} y={138} />
        <Path d="M22 130 q10 -12 20 0 t20 0 t20 0 t20 0 t20 0 v8 H22 z" fill={f.g("zl", "#7FD16A", "#3F9A3F")} />
        <Path d="M16 126 Q14 100 30 98 Q40 88 56 98 Q72 90 86 98 Q104 92 118 100 Q136 104 128 126 Q124 134 110 132 Q64 140 24 132 Q16 132 16 126 Z" fill={f.g("chk", "#F2A33A", "#C46A17")} />
        <Path d="M30 108 q6 -4 12 0 M60 106 q6 -4 12 0 M90 108 q6 -4 12 0" fill="none" opacity={0.55} stroke="#FFD58A" strokeLinecap="round" strokeWidth={3} />
        <Path d="M22 98 C20 46 128 46 126 98 Z" fill={f.g("zt", "#F2BD6C", "#CC8A38")} />
        {pairs([[44, 70], [66, 62], [90, 64], [108, 76], [78, 78]]).map(([x, y], i) => (
          <Ellipse cx={x} cy={y} fill="#FFF3D8" key={i} rx={4} ry={2} transform={`rotate(${i * 25} ${x} ${y})`} />
        ))}
      </G>
    </G>
  );
}

/** Kota: a quarter loaf stuffed with chips, polony, cheese and sauce. */
export function kota(f: Fill) {
  return (
    <G>
      <Ground rx={76} />
      <Path d="M28 96 Q28 64 66 62 H134 Q172 64 172 96 V148 Q172 170 148 170 H52 Q28 170 28 148 Z" fill={f.g("loaf", "#E9B25E", "#B87A2E")} />
      <Path d="M36 98 Q36 74 68 72 H132 Q164 74 164 98 Z" fill={f.g("crust", "#F2C078", "#D79A44")} />
      {[0, 1, 2, 3, 4, 5, 6].map((i) => (
        <Rect fill={f.g(`kfry${i % 2}`, "#FFD65A", "#E8A92A")} height={44} key={i} rx={3} transform={`rotate(${(i - 3) * 9} ${52 + i * 16} 80)`} width={10} x={46 + i * 16} y={38 + (i % 2) * 6} />
      ))}
      <Ellipse cx={72} cy={90} fill={f.g("pol", "#F59A8E", "#D4655A")} rx={26} ry={8} />
      <Ellipse cx={128} cy={92} fill={f.g("pol2", "#F59A8E", "#D4655A")} rx={24} ry={7} />
      <Polygon fill={f.g("kch", "#FFD84A", "#F0A81C")} points="40,98 110,98 98,112 72,102 52,112" />
      <Path d="M44 86 q16 -12 32 0 t32 0 t32 0" fill="none" stroke="#C0392B" strokeLinecap="round" strokeWidth={6} />
      <Path d="M40 116 Q40 140 60 150" fill="none" opacity={0.45} stroke="#FFF1D2" strokeLinecap="round" strokeWidth={5} />
    </G>
  );
}

/** Almond croissant with flaked almonds and icing sugar. */
export function croissant(f: Fill) {
  const seg = [
    [38, 126, 22, 14, -62],
    [58, 106, 26, 17, -48],
    [84, 92, 30, 20, -20],
    [114, 92, 30, 20, 18],
    [140, 106, 26, 17, 46],
    [160, 126, 22, 14, 60],
  ] as const;
  return (
    <G>
      <Ground rx={76} />
      {seg.map(([cx, cy, rx, ry, a], i) => (
        <Ellipse cx={cx} cy={cy + 8} fill={f.g(`cr${i}`, "#E0A04A", "#A9661E")} key={i} rx={rx} ry={ry} transform={`rotate(${a} ${cx} ${cy + 8})`} />
      ))}
      {seg.map(([cx, cy, rx, ry, a], i) => (
        <Ellipse cx={cx} cy={cy} fill={f.g(`cs${i}`, "#F7CB78", "#D4903A")} key={`t${i}`} rx={rx} ry={ry} transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      {seg.map(([cx, cy, , , a], i) => (
        <Path d={`M${cx - 14} ${cy} Q${cx} ${cy - 8} ${cx + 14} ${cy}`} fill="none" key={`l${i}`} opacity={0.35} stroke="#8B521A" strokeLinecap="round" strokeWidth={2.4} transform={`rotate(${a} ${cx} ${cy})`} />
      ))}
      {triples([[70, 84, 20], [96, 76, -10], [122, 78, 14], [148, 96, 40], [52, 104, -30], [100, 96, 6]]).map(([x, y, a], i) => (
        <Ellipse cx={x} cy={y} fill="#FFF3DA" key={i} rx={8} ry={3.4} stroke="#E8C48A" strokeWidth={1} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <Path d="M62 74 Q100 58 140 78" fill="none" opacity={0.7} stroke="#FFFFFF" strokeLinecap="round" strokeDasharray="2 7" strokeWidth={3} />
    </G>
  );
}

/** Grilled chicken wrap: a foil-wrapped tortilla roll, cut to show the filling. */
export function chickenWrap(f: Fill) {
  return (
    <G>
      <Ground rx={78} />
      <G transform="rotate(-22 100 110)">
        <Rect fill={f.g("tort", "#F4DDB0", "#D9B173")} height={52} rx={26} width={132} x={34} y={72} />
        <Path d="M34 98 Q50 70 86 74 V120 Q50 124 34 98 Z" fill={f.g("foil", "#E8EDF1", "#AAB6BF")} opacity={0.0} />
        <Rect fill={f.g("foil2", "#F1F5F8", "#A9B5BE")} height={48} rx={14} width={64} x={34} y={84} />
        <Path d="M40 90 L52 118 M54 88 L64 118 M68 88 L76 118" opacity={0.5} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
        <Ellipse cx={166} cy={98} fill={f.g("cut", "#FBEBC8", "#E8C88A")} rx={14} ry={26} />
        <Ellipse cx={166} cy={98} fill="#F5C77A" rx={9} ry={19} />
        <Circle cx={165} cy={88} fill="#6FB04A" r={5} />
        <Circle cx={168} cy={102} fill="#E8483B" r={4.5} />
        <Circle cx={164} cy={110} fill="#FFF1D2" r={4} />
        <Path d="M60 78 Q96 70 134 78" fill="none" opacity={0.6} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={4} />
        <Path d="M102 80 L102 118 M116 80 L116 118" opacity={0.35} stroke="#B07A3A" strokeLinecap="round" strokeWidth={2} />
      </G>
    </G>
  );
}

function bowl(f: Fill, id: string, rim: string, body: string) {
  return (
    <G>
      <Path d="M24 96 H176 Q172 160 100 166 Q28 160 24 96 Z" fill={f.g(`${id}b`, rim, body)} />
      <Ellipse cx={100} cy={96} fill={f.g(`${id}r`, "#FFFFFF", "#DDE5EA")} rx={78} ry={19} />
    </G>
  );
}

/** Salmon poke bowl. */
export function pokeBowl(f: Fill) {
  return (
    <G>
      <Ground rx={78} />
      {bowl(f, "pk", "#4E7E8D", "#2F5A67")}
      <Ellipse cx={100} cy={96} fill="#F6EBD2" rx={68} ry={14} />
      {pairs([[62, 92], [82, 86], [104, 90]]).map(([x, y], i) => (
        <Rect fill={f.g(`sal${i}`, "#FF9A62", "#E4602C")} height={12} key={i} rx={4} transform={`rotate(${i * 14 - 10} ${x} ${y})`} width={18} x={x - 9} y={y - 8} />
      ))}
      {pairs([[130, 90], [142, 98], [120, 100]]).map(([x, y], i) => (
        <Path d={`M${x - 10} ${y} Q${x} ${y - 12} ${x + 10} ${y} Q${x} ${y + 6} ${x - 10} ${y} Z`} fill={f.g(`avo${i}`, "#C5E07A", "#7FAA3C")} key={i} />
      ))}
      {pairs([[76, 102], [90, 100], [116, 88], [96, 82], [150, 94]]).map(([x, y], i) => (
        <Circle cx={x} cy={y} fill="#7CC04C" key={i} r={3.4} />
      ))}
      <Ellipse cx={58} cy={100} fill="#5BAE58" rx={8} ry={4} />
      <Ellipse cx={132} cy={104} fill="#5BAE58" rx={8} ry={4} />
      {pairs([[70, 88], [100, 92], [124, 94], [88, 98]]).map(([x, y], i) => (
        <Ellipse cx={x} cy={y} fill="#222B33" key={i} rx={1.8} ry={1} />
      ))}
    </G>
  );
}

/** Roasted veg power bowl. */
export function vegBowl(f: Fill) {
  return (
    <G>
      <Ground rx={78} />
      {bowl(f, "vb", "#D39A5C", "#A86A2E")}
      <Ellipse cx={100} cy={96} fill="#F4E6C8" rx={68} ry={14} />
      {pairs([[60, 94], [74, 90], [86, 98], [66, 100]]).map(([x, y], i) => (
        <Circle cx={x} cy={y} fill={f.r(`ch${i}`, "#F5D27A", "#D9A53A")} key={i} r={6} />
      ))}
      {pairs([[104, 88], [118, 92], [132, 86]]).map(([x, y], i) => (
        <G key={i}>
          <Rect fill="#7BAE4A" height={8} rx={3} width={5} x={x - 2.5} y={y} />
          <Circle cx={x} cy={y - 2} fill={f.r(`br${i}`, "#7FCB5A", "#3E8F37")} r={9} />
        </G>
      ))}
      {pairs([[92, 100], [112, 102], [140, 98]]).map(([x, y], i) => (
        <Ellipse cx={x} cy={y} fill="#F08A32" key={i} rx={8} ry={4} />
      ))}
      {pairs([[78, 82], [124, 98], [52, 98]]).map(([x, y], i) => (
        <Rect fill={f.g(`sp${i}`, "#F2A14A", "#C8691E")} height={9} key={i} rx={2} transform={`rotate(${i * 20} ${x} ${y})`} width={10} x={x - 5} y={y - 5} />
      ))}
      <Path d="M86 88 q14 -6 28 0" fill="none" opacity={0.8} stroke="#FFFFFF" strokeLinecap="round" strokeWidth={3} />
    </G>
  );
}
