import { StyleSheet, Text, View } from "react-native";

export default function EmptyCanvas() {
  return (
    <View style={styles.canvas}>
      <Text style={styles.label}>Vossie screen canvas</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    flex: 1,
    justifyContent: "center",
  },
  label: {
    color: "#29475B",
    fontSize: 16,
  },
});
