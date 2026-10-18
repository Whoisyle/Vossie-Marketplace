import { Image } from "expo-image";

const WORDMARK = require("../../assets/branding/vossie-wordmark.svg");
const WHITE_WORDMARK = require("../screens/intro/assets/vossie-wordmark-white.svg");
const ASPECT = 1647 / 569;

/** The approved Vossie Marketplace wordmark, always rendered as artwork. */
export function Wordmark({ tone = "brand", width }: { tone?: "brand" | "white"; width: number }) {
  return (
    <Image
      accessibilityLabel="Vossie Marketplace"
      accessibilityRole="image"
      contentFit="contain"
      source={tone === "white" ? WHITE_WORDMARK : WORDMARK}
      style={{ height: width / ASPECT, width }}
    />
  );
}
