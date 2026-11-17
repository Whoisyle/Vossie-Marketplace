import Svg, { Circle, Ellipse, G, Path, Polygon, Text as SvgText } from "react-native-svg";

const NAVY = "#2A3490";
const SANS = "Arial, Helvetica, sans-serif";
const TOP = "#ECE8E7";
const FRONT = "#DAD6D8";
const SIDE = "#BDB7BB";
const FACET = "#AEBBC8";
const INSIDE = "#8E98A3";

/** The closed Vossie box: pale faces cut by blue-grey angles, with the wordmark on the front. */
function ClosedBox() {
  return (
    <G>
      <Polygon fill={TOP} points="40,140 200,160 262,128 102,110" />
      <Polygon fill={FRONT} points="40,140 200,160 200,238 40,214" />
      <Polygon fill={SIDE} points="200,160 200,238 262,204 262,128" />
      <Polygon fill={FACET} opacity={0.9} points="40,140 96,147 40,192" />
      <Polygon fill={FACET} opacity={0.75} points="200,160 150,154 200,204" />
      <Polygon fill="#9FAEBE" opacity={0.7} points="200,160 262,128 262,168" />
      <Polygon fill="rgba(25,27,29,0.14)" points="70,126 232,144 236,148 74,130" />
      <G transform="rotate(7.1 118 190)">
        <SvgText fill={NAVY} fontFamily={SANS} fontSize={32} fontWeight="700" letterSpacing={-1} textAnchor="middle" x={118} y={196}>
          vossie
        </SvgText>
        <SvgText fill={NAVY} fontFamily={SANS} fontSize={6.5} fontWeight="700" letterSpacing={2.4} textAnchor="middle" x={118} y={208}>
          MARKETPLACE
        </SvgText>
      </G>
    </G>
  );
}

/** The open Vossie box: flaps up, the double-S mark on its side. */
function OpenBox() {
  return (
    <G>
      <Polygon fill="#F2EFEF" points="112,144 262,160 252,92 122,88" />
      <Polygon fill="#D3D6DB" points="60,170 112,144 80,102 30,128" />
      <Polygon fill={INSIDE} points="60,170 210,186 262,160 112,144" />
      <Polygon fill={FRONT} points="60,170 210,186 210,244 60,226" />
      <Polygon fill={SIDE} points="210,186 210,244 262,214 262,160" />
      <Polygon fill={FACET} opacity={0.85} points="60,170 104,175 60,208" />
      <Polygon fill="#9FAEBE" opacity={0.7} points="210,186 262,160 262,190" />
      <G transform="skewY(-26.6)">
        <SvgText fill={NAVY} fontFamily={SANS} fontSize={26} fontWeight="900" textAnchor="middle" x={236} y={326}>
          SS
        </SvgText>
      </G>
    </G>
  );
}

/**
 * The drawn objects of the seller pages, taken from Vossie's own shipping boxes: a closed box with the wordmark, an open
 * box with a tick for an order that came in, and both together for the shop. `scale` shrinks it for the setup headers.
 */
export function Hero({ index, scale = 1 }: { index: number; scale?: number }) {
  return (
    <Svg height={350 * scale} viewBox="0 0 300 290" width={362 * scale}>
      <Ellipse cx={150} cy={256} fill="rgba(0,0,0,0.24)" rx={122} ry={15} />
      {index === 0 ? (
        <G transform="translate(8 12)">
          <ClosedBox />
        </G>
      ) : null}
      {index === 1 ? (
        <G>
          <G transform="translate(2 4)">
            <OpenBox />
          </G>
          <Circle cx={60} cy={104} fill="#DFE2DC" r={25} />
          <Path d="M49 104 L57 112 L72 95" fill="none" stroke="#14292F" strokeLinecap="round" strokeLinejoin="round" strokeWidth={6.5} />
        </G>
      ) : null}
      {index === 2 ? (
        <G>
          <G transform="translate(104 4) scale(0.74)">
            <OpenBox />
          </G>
          <G transform="translate(-14 44) scale(0.88)">
            <ClosedBox />
          </G>
        </G>
      ) : null}
    </Svg>
  );
}
