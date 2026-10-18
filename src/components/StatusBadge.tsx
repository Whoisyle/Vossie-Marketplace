import { StyleSheet, Text, View } from "react-native";

import { color, corner } from "@/theme/tokens";

import { Icon, type IconName } from "./Icon";

type Tone = "success" | "info" | "warning" | "danger" | "neutral";

const tones: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: color.successSoft, fg: color.success },
  info: { bg: color.infoSoft, fg: color.info },
  warning: { bg: color.warningSoft, fg: color.warning },
  danger: { bg: color.dangerSoft, fg: color.danger },
  neutral: { bg: color.surfaceBadge, fg: color.heading },
};

export function StatusBadge({ icon, label, tone = "neutral" }: { label: string; tone?: Tone; icon?: IconName }) {
  const palette = tones[tone];
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      {icon ? <Icon name={icon} size={11} color={palette.fg} /> : null}
      <Text style={[styles.label, { color: palette.fg }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignItems: "center",
    alignSelf: "flex-start",
    borderRadius: corner.pill,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  label: { fontSize: 11, fontWeight: "600" },
});
