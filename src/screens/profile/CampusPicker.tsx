import { StyleSheet, View } from "react-native";

import { RadioRow, Sheet } from "@/components";
import { getCampuses } from "@/data/repository";
import type { CampusId } from "@/data/types";

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
  return (
    <Sheet onClose={onClose} title="Choose your campus" visible={visible}>
      <View style={styles.list}>
        {getCampuses().map((campus) => (
          <RadioRow
            key={campus.id}
            onPress={() => {
              onSelect(campus.id);
              onClose();
            }}
            selected={campus.id === selected}
            testID={`campus-${campus.id}`}
            title={campus.name}
          />
        ))}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { paddingBottom: 8 },
});
