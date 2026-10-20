import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, EmptyState, Icon, Screen, TextField, useToast } from "@/components";
import type { SavedCard } from "@/data/types";
import { formatCardNumber, formatExpiry, isValidExpiry } from "@/screens/cart/cardFormat";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

import { IssuerPicker } from "./CardArt";
import { CardFace } from "./WalletCards";

/** Brand from the first digit: 4 is Visa, 5 is Mastercard; otherwise keep the current brand. */
export function brandFor(digits: string, current: SavedCard["brand"]): SavedCard["brand"] {
  if (digits.startsWith("4")) return "visa";
  if (digits.startsWith("5")) return "mastercard";
  return current;
}

/** What is wrong with the edits, if anything. A blank number keeps the current one. */
export function cardEditErrors(input: { number: string; expiry: string; holder: string }): { number?: string; expiry?: string; holder?: string } {
  const digits = input.number.replace(/\s/g, "");
  return {
    expiry: isValidExpiry(input.expiry) ? undefined : "Enter a valid future date (MM/YY).",
    holder: input.holder.trim().length >= 2 ? undefined : "Enter the name on the card.",
    number: digits.length === 0 || digits.length === 16 ? undefined : "Enter all 16 digits, or leave it blank to keep the current number.",
  };
}

/**
 * Edit a saved card: the number (re-enter it to change it), expiry, name on the card, default and removal.
 * Demo only: only the last four digits are kept, never the full number. A real card change goes through the
 * payment provider, which re-checks the card.
 */
export function CardEditScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const card = state.cards.find((item) => item.id === id);
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState(card?.expiry ?? "");
  const [holder, setHolder] = useState(card?.holder ?? "");
  const [issuer, setIssuer] = useState(card?.issuer);
  const [makeDefault, setMakeDefault] = useState(card?.isDefault ?? false);
  const [submitted, setSubmitted] = useState(false);

  if (!card) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState actionLabel="Back to Wallet" icon="credit-card" onAction={() => router.replace("/account/wallet" as Href)} title="Card not found" />
      </Screen>
    );
  }

  const digits = number.replace(/\s/g, "");
  const errors = cardEditErrors({ expiry, holder, number });
  const valid = !errors.number && !errors.expiry && !errors.holder;
  const brand = brandFor(digits, card.brand);
  const preview: SavedCard = { ...card, brand, issuer, expiry: expiry || card.expiry, holder, last4: digits.length === 16 ? digits.slice(-4) : card.last4 };

  const save = () => {
    setSubmitted(true);
    if (!valid) return;
    dispatch({
      cardId: card.id,
      makeDefault: makeDefault && !card.isDefault,
      patch: { brand, expiry, holder: holder.trim(), issuer, last4: preview.last4 },
      type: "updateCard",
    });
    toast.show("Card updated");
    router.back();
  };

  const remove = () => {
    dispatch({ cardId: card.id, type: "removeCard" });
    toast.show("Card removed");
    router.back();
  };

  return (
    <Screen footer={<Button fullWidth label="Save changes" onPress={save} size="lg" testID="save-card" />} testID="card-edit">
      <AppHeader back subtitle={`${brand === "visa" ? "Visa" : "Mastercard"} ending ${card.last4}`} title="Edit card" />
      <View style={styles.preview}>
        <CardFace card={preview} />
      </View>

      <View style={styles.fields}>
        <Text style={text.label}>Bank</Text>
        <IssuerPicker onChange={setIssuer} value={issuer} />
        <TextField
          error={submitted ? errors.number : undefined}
          keyboardType="number-pad"
          label="Card number"
          onChangeText={(value) => setNumber(formatCardNumber(value))}
          placeholder={`•••• •••• •••• ${card.last4}`}
          value={number}
        />
        <Text style={text.caption}>Leave blank to keep the number you have. Type all 16 digits to replace it.</Text>
        <View style={styles.row}>
          <View style={styles.flex}>
            <TextField
              error={submitted ? errors.expiry : undefined}
              keyboardType="number-pad"
              label="Valid thru (MM/YY)"
              onChangeText={(value) => setExpiry(formatExpiry(value))}
              placeholder="MM/YY"
              value={expiry}
            />
          </View>
        </View>
        <TextField
          autoCapitalize="words"
          error={submitted ? errors.holder : undefined}
          label="Name on card"
          onChangeText={setHolder}
          placeholder="Your name"
          value={holder}
        />
      </View>

      <Pressable
        accessibilityLabel="Make this my default card"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: makeDefault }}
        disabled={card.isDefault}
        onPress={() => setMakeDefault((value) => !value)}
        style={styles.checkRow}
      >
        <View style={[styles.box, makeDefault && styles.boxOn]}>{makeDefault ? <Icon color={color.onPrimary} name="check" size={14} /> : null}</View>
        <Text style={text.body}>{card.isDefault ? "This is your default card" : "Make this my default card"}</Text>
      </Pressable>

      <Button fullWidth icon="trash-2" label="Remove this card" onPress={remove} style={styles.remove} testID="remove-card" variant="outline" />
      <Text style={[text.caption, styles.note]}>Demo: only the last four digits are kept on this device.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: { alignItems: "center", backgroundColor: color.surface, borderColor: color.borderStrong, borderRadius: 6, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  boxOn: { backgroundColor: color.primary, borderColor: color.primary },
  checkRow: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.md, minHeight: 44 },
  fields: { gap: space.xs, marginTop: space.md },
  flex: { flex: 1 },
  note: { marginTop: space.sm, textAlign: "center" },
  preview: { alignItems: "center", marginTop: space.sm },
  remove: { marginTop: space.sm },
  row: { flexDirection: "row", gap: space.sm },
});
