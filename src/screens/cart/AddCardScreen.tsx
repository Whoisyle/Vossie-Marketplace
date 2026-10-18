import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Icon, Screen, TextField, useToast } from "@/components";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

import { formatCardNumber, formatExpiry, isValidExpiry } from "./cardFormat";

/** Add a new card. Demo only: the card is kept in memory and never sent anywhere. */
export function AddCardScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [number, setNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvv, setCvv] = useState("");
  const [makeDefault, setMakeDefault] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  const digits = number.replace(/\s/g, "");
  const errors = {
    cvv: /^\d{3,4}$/.test(cvv) ? undefined : "Enter the 3 or 4 digit code.",
    expiry: isValidExpiry(expiry) ? undefined : "Enter a valid future date (MM/YY).",
    number: digits.length === 16 ? undefined : "Enter the 16 digit card number.",
  };
  const valid = !errors.number && !errors.expiry && !errors.cvv;
  const brand = digits.startsWith("5") ? "mastercard" : "visa";

  const submit = () => {
    setSubmitted(true);
    if (!valid) return;
    dispatch({
      card: { brand, expiry, holder: state.profile?.fullName ?? "", last4: digits.slice(-4) },
      makeDefault,
      type: "addCard",
    });
    toast.show("Card added");
    router.back();
  };

  return (
    <Screen
      footer={<Button fullWidth label="Continue" onPress={submit} size="lg" testID="add-card-continue" />}
    >
      <AppHeader back title="Add a New Card" />
      <View style={styles.preview}>
        <Text style={styles.previewNumber}>{number || "•••• •••• •••• ••••"}</Text>
        <View style={styles.previewRow}>
          <Text style={styles.previewMeta}>{state.profile?.fullName.toUpperCase() || "CARDHOLDER"}</Text>
          <Text style={styles.previewMeta}>{expiry || "MM/YY"}</Text>
        </View>
      </View>

      <View style={styles.fields}>
        <TextField
          error={submitted ? errors.number : undefined}
          keyboardType="number-pad"
          label="Card number"
          onChangeText={(value) => setNumber(formatCardNumber(value))}
          placeholder="0000 0000 0000 0000"
          value={number}
        />
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
          <View style={styles.flex}>
            <TextField
              error={submitted ? errors.cvv : undefined}
              keyboardType="number-pad"
              label="CVV"
              maxLength={4}
              onChangeText={(value) => setCvv(value.replace(/\D/g, ""))}
              placeholder="123"
              secureTextEntry
              value={cvv}
            />
          </View>
        </View>
      </View>

      <Pressable
        accessibilityLabel="Set as default payment method"
        accessibilityRole="checkbox"
        accessibilityState={{ checked: makeDefault }}
        onPress={() => setMakeDefault((value) => !value)}
        style={styles.checkRow}
      >
        <View style={[styles.box, makeDefault && styles.boxChecked]}>
          {makeDefault ? <Icon color={color.onPrimary} name="check" size={14} /> : null}
        </View>
        <Text style={text.body}>Set as default payment method</Text>
      </Pressable>

      <Card onPress={() => toast.show("No card offers right now")} style={styles.offers}>
        <View style={styles.flex}>
          <Text style={text.cardTitle}>Check card discounts</Text>
          <Text style={text.caption}>See offers available for your card</Text>
        </View>
        <Icon name="arrow-right" size={18} />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  box: {
    alignItems: "center",
    borderColor: color.borderStrong,
    borderRadius: 4,
    borderWidth: 1.5,
    height: 22,
    justifyContent: "center",
    width: 22,
  },
  boxChecked: { backgroundColor: color.accent, borderColor: color.accent },
  checkRow: { alignItems: "center", flexDirection: "row", gap: space.sm, minHeight: 44, marginTop: space.sm },
  fields: { gap: space.sm, marginTop: space.md },
  flex: { flex: 1 },
  offers: { alignItems: "center", flexDirection: "row", marginTop: space.md },
  preview: {
    backgroundColor: color.primary,
    borderRadius: corner.lg,
    gap: space.lg,
    marginTop: space.sm,
    minHeight: 150,
    justifyContent: "flex-end",
    padding: space.md,
  },
  previewMeta: { color: color.onPrimary, fontSize: 12, fontWeight: "600", letterSpacing: 0.5 },
  previewNumber: { color: color.onPrimary, fontSize: 20, fontWeight: "700", letterSpacing: 1.5 },
  previewRow: { flexDirection: "row", justifyContent: "space-between" },
  row: { flexDirection: "row", gap: space.sm },
});
