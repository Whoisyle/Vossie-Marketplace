import { ScrollView, StyleSheet, Text, View } from "react-native";

import { ART_IDS, ArtTile, ProductArt } from "@/components/art/ProductArt";

/** Temporary preview of every product drawing, as a tile and on its own. */
export default function ArtGallery() {
  return (
    <ScrollView contentContainerStyle={styles.grid} style={styles.page}>
      {ART_IDS.map((id) => (
        <View key={id} style={styles.cell}>
          <View style={styles.tile}>
            <ArtTile id={id} />
          </View>
          <ProductArt id={id} size={120} />
          <Text style={styles.label}>{id}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  cell: { alignItems: "center", gap: 6, width: 170 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 16, padding: 16 },
  label: { color: "#2D4652", fontSize: 11 },
  page: { backgroundColor: "#FFFFFF" },
  tile: { borderRadius: 16, height: 150, overflow: "hidden", width: 150 },
});
