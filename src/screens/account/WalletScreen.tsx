import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Chip, Icon, Screen, Sheet, TextField, useToast } from "@/components";
import { dateAndTime, formatRand } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

import { parseRandToCents } from "./walletAmount";

const PRESETS = [10000, 20000, 50000];
const MAX_TOP_UP_CENTS = 500_000;

/** Wallet: balance, add funds (demo) and recent transactions. */
export function WalletScreen() {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = (amountCents: number | null) => {
    if (amountCents === null || amountCents <= 0) {
      setError("Enter an amount like 150 or 150.50.");
      return;
    }
    if (amountCents > MAX_TOP_UP_CENTS) {
      setError(`The most you can add at once is ${formatRand(MAX_TOP_UP_CENTS)}.`);
      return;
    }
    dispatch({ amountCents, source: "card", type: "addFunds" });
    setOpen(false);
    setCustom("");
    setError(null);
    toast.show(`${formatRand(amountCents)} added to your wallet`);
  };

  return (
    <Screen>
      <AppHeader back subtitle="Manage your Vossie balance." title="Wallet" />
      <Card style={styles.balance} variant="primary">
        <Text style={styles.balanceLabel}>Available balance</Text>
        <Text accessibilityLiveRegion="polite" style={styles.balanceValue}>
          {formatRand(state.wallet.balanceCents, { fixed: true })}
        </Text>
        <Button label="Add funds" onPress={() => setOpen(true)} size="sm" variant="light" />
      </Card>
      <Text style={styles.demo}>Demo wallet: no real money moves.</Text>

      <Text style={styles.heading}>Recent transactions</Text>
      <View style={styles.list}>
        {state.wallet.transactions.map((tx) => (
          <Card key={tx.id} style={styles.tx} variant="row">
            <View style={[styles.txIcon, tx.amountCents < 0 && styles.txIconOut]}>
              <Icon
                color={tx.amountCents < 0 ? color.danger : color.success}
                name={tx.amountCents < 0 ? "arrow-up-right" : "arrow-down-left"}
                size={16}
              />
            </View>
            <View style={styles.flex}>
              <Text numberOfLines={1} style={text.cardTitle}>
                {tx.label}
              </Text>
              <Text style={text.caption}>{dateAndTime(tx.createdAt)}</Text>
            </View>
            <Text style={[styles.amount, { color: tx.amountCents < 0 ? color.danger : color.success }]}>
              {formatRand(tx.amountCents, { signed: true })}
            </Text>
          </Card>
        ))}
      </View>

      <Sheet onClose={() => setOpen(false)} title="Add funds" visible={open}>
        <View style={styles.presets}>
          {PRESETS.map((cents) => (
            <Chip key={cents} label={formatRand(cents)} onPress={() => add(cents)} />
          ))}
        </View>
        <TextField
          error={error ?? undefined}
          keyboardType="decimal-pad"
          label="Other amount (R)"
          onChangeText={(value) => {
            setCustom(value);
            setError(null);
          }}
          placeholder="150"
          value={custom}
        />
        <Button fullWidth label="Add funds" onPress={() => add(parseRandToCents(custom))} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  amount: { fontSize: 14, fontWeight: "700" },
  balance: { gap: space.xs, marginTop: space.sm },
  balanceLabel: { color: color.onPrimary, fontSize: 13, opacity: 0.85 },
  balanceValue: { color: color.onPrimary, fontSize: 32, fontWeight: "700" },
  demo: { ...text.caption, marginTop: space.xs },
  flex: { flex: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  list: { gap: space.xs },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.sm },
  tx: { alignItems: "center", flexDirection: "row", gap: space.sm },
  txIcon: {
    alignItems: "center",
    backgroundColor: color.successSoft,
    borderRadius: 18,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  txIconOut: { backgroundColor: color.dangerSoft },
});
