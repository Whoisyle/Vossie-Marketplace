import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Icon, Sheet, TextField } from "@/components";
import { getCampuses } from "@/data/repository";
import type { Campus, CampusId } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { color, corner, gradient, space } from "@/theme/tokens";

/** Campuses whose name or province contains the search text (ignores case); everything for an empty search. */
export function filterCampuses(campuses: Campus[], query: string): Campus[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return campuses;
  return campuses.filter((campus) => `${campus.name} ${campus.region}`.toLowerCase().includes(needle));
}

/** Bottom sheet to change campus: a search box and one card per campus, the chosen one lit with the brand gradient. */
export function CampusPicker({
  onClose,
  onSelect,
  selected,
  visible,
}: {
  visible: boolean;
  selected: CampusId | null;
  onSelect: (campus: CampusId) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const campuses = filterCampuses(getCampuses(), query);

  return (
    <Sheet
      onClose={() => {
        setQuery("");
        onClose();
      }}
      title="Choose your campus"
      visible={visible}
    >
      <TextField
        autoCorrect={false}
        label="Search campuses"
        onChangeText={setQuery}
        placeholder="Try Pretoria or Gauteng"
        right={<Icon color={color.textMuted} name="search" size={16} />}
        value={query}
      />
      <View style={styles.list}>
        {campuses.length === 0 ? <Text style={styles.empty}>No campus matches “{query.trim()}”.</Text> : null}
        {campuses.map((campus) => {
          const isSelected = campus.id === selected;
          return (
            <Pressable
              accessibilityLabel={`${campus.name}, ${campus.region}`}
              accessibilityRole="radio"
              accessibilityState={{ checked: isSelected }}
              key={campus.id}
              onPress={() => {
                haptic.select();
                onSelect(campus.id);
                setQuery("");
                onClose();
              }}
              style={({ pressed }) => [styles.row, isSelected && styles.rowSelected, pressed && styles.pressed]}
              testID={`campus-${campus.id}`}
            >
              {isSelected ? (
                <LinearGradient colors={gradient.primary} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
              ) : null}
              <View style={[styles.pin, isSelected && styles.pinSelected]}>
                <Icon color={isSelected ? color.onPrimary : color.heading} name="map-pin" size={18} />
              </View>
              <View style={styles.texts}>
                <Text style={[styles.name, isSelected && styles.onDark]}>{campus.name}</Text>
                <Text style={[styles.region, isSelected && styles.onDark]}>{campus.region}</Text>
              </View>
              {isSelected ? <Icon color={color.onPrimary} name="check-circle" size={22} /> : null}
            </Pressable>
          );
        })}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  empty: { color: color.textSecondary, fontSize: 14, paddingVertical: space.md, textAlign: "center" },
  list: { gap: space.xs, paddingBottom: space.sm, paddingTop: space.sm },
  name: { color: color.heading, fontSize: 16, fontWeight: "700" },
  onDark: { color: color.onPrimary },
  pin: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  pinSelected: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  pressed: { opacity: 0.8 },
  region: { color: color.textSecondary, fontSize: 12 },
  row: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.mist,
    borderCurve: "continuous",
    borderRadius: corner.md,
    borderWidth: 1,
    flexDirection: "row",
    gap: space.sm,
    minHeight: 60,
    overflow: "hidden",
    paddingHorizontal: space.sm,
  },
  rowSelected: { borderColor: color.primary },
  texts: { flex: 1, gap: 1 },
});
