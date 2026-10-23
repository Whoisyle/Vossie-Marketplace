import { Image } from "expo-image";

import { storeLogo } from "@/data/mock/storePhotos";

import { Avatar } from "./Avatar";

/** A store's round picture; a store with no picture shows its initials instead. */
export function StoreLogo({ name, sellerId, size = 48 }: { name: string; sellerId: string; size?: number }) {
  const source = storeLogo(sellerId);
  if (!source) return <Avatar name={name} size={size} />;
  return (
    <Image
      accessibilityLabel={`${name} logo`}
      accessibilityRole="image"
      contentFit="cover"
      source={source}
      style={{ borderRadius: size / 2, height: size, width: size }}
    />
  );
}
