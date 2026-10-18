import Feather from "@expo/vector-icons/Feather";
import type { ComponentProps } from "react";

import { color as palette, size as sizes } from "@/theme/tokens";

export type IconName = ComponentProps<typeof Feather>["name"];

export function Icon({
  color = palette.heading,
  name,
  size = sizes.icon,
}: {
  color?: string;
  name: IconName;
  size?: number;
}) {
  return (
    <Feather
      accessibilityElementsHidden
      color={color}
      importantForAccessibility="no"
      name={name}
      size={size}
    />
  );
}
