import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { Button, Chip, Sheet, StarRating, TextField, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { parseTip, TIP_PRESETS_CENTS } from "@/data/phase4";
import type { Order } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { space, text } from "@/theme/tokens";

/** After delivery: rate the courier from 1 to 5 and, if you like, leave a tip (R5, R10, R20 or your own amount). */
export function CourierRatingSheet({ onClose, order, visible }: { order: Order; visible: boolean; onClose: () => void }) {
  const toast = useToast();
  const { dispatch } = useDemoStore();
  const [rating, setRating] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [preset, setPreset] = useState<number | null>(null);
  const [custom, setCustom] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const courier = order.courier?.name ?? "your courier";
  const customCents = custom.trim() ? parseTip(custom) : null;
  const tipCents = custom.trim() ? (customCents ?? 0) : (preset ?? 0);

  const submit = () => {
    if (!rating) {
      setError("Tap a star to rate your courier.");
      return;
    }
    if (custom.trim() && customCents === null) {
      setError("Enter a tip like 15 or 15.50.");
      return;
    }
    dispatch({ comment: comment.trim() || undefined, orderId: order.id, rating, tipCents, type: "rateCourier" });
    onClose();
    toast.show(tipCents > 0 ? `Thanks! ${formatRand(tipCents)} tip sent to ${courier}` : "Thanks for rating your courier");
  };

  return (
    <Sheet onClose={onClose} title={`How was ${courier}?`} visible={visible}>
      <View style={styles.stars} testID="courier-stars">
        <StarRating onChange={(value) => { setRating(value); setError(null); }} size={36} value={rating ?? 0} />
      </View>
      <TextField label="Say a few words (optional)" maxLength={200} onChangeText={setComment} placeholder="Fast, polite and kept me updated" value={comment} />
      <Text style={text.cardTitle}>Add a tip (optional)</Text>
      <View style={styles.chips}>
        <Chip
          label="No tip"
          onPress={() => {
            setPreset(null);
            setCustom("");
          }}
          selected={!custom.trim() && preset === null}
        />
        {TIP_PRESETS_CENTS.map((cents) => (
          <Chip
            key={cents}
            label={formatRand(cents)}
            onPress={() => {
              setPreset(cents);
              setCustom("");
              setError(null);
            }}
            selected={!custom.trim() && preset === cents}
            testID={`tip-${cents}`}
          />
        ))}
      </View>
      <TextField
        error={error ?? undefined}
        keyboardType="decimal-pad"
        label="Other amount (R)"
        onChangeText={(value) => {
          setCustom(value);
          setPreset(null);
          setError(null);
        }}
        placeholder="15"
        value={custom}
      />
      <Text style={text.caption}>100% of your tip goes to the courier.</Text>
      <Button fullWidth label={tipCents > 0 ? `Send rating and ${formatRand(tipCents)} tip` : "Send rating"} onPress={submit} testID="send-rating" />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.xs, marginTop: space.xs },
  stars: { alignItems: "center", paddingVertical: space.sm },
});
