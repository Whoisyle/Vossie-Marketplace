import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Chip, Icon, Screen, Sheet, TextField, useToast } from "@/components";
import { eftBanks } from "@/screens/cart/payment";
import { dateAndTime, formatRand } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

import { walletItems, WalletCarousel, useWalletSelection } from "./WalletCards";
import { parseRandToCents } from "./walletAmount";

const PRESETS = [10000, 20000, 50000];
const MAX_TOP_UP_CENTS = 500_000;

/** Wallet: balance, add funds (demo) and recent transactions. */
export function WalletScreen() {
  const toast = useToast();
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const [open, setOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const items = walletItems({ balanceCents: state.wallet.balanceCents, bank: state.checkout.bank, cards: state.cards });
  const [selected, setSelected] = useWalletSelection(items);
  const current = items[Math.min(selected, items.length - 1)]!;
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

      <Text style={styles.heading}>Cards and payment options</Text>
      <WalletCarousel items={items} onAdd={() => router.push("/cart/add-card" as Href)} onSelect={setSelected} selected={selected} />
      <View style={styles.actions} testID="wallet-actions">
        {current.kind === "card" ? (
          <>
            {!current.card.isDefault ? (
              <Button
                label="Make default"
                onPress={() => {
                  dispatch({ cardId: current.card.id, type: "setDefaultCard" });
                  toast.show(`Card ending ${current.card.last4} is now your default`);
                }}
                size="sm"
                variant="soft"
              />
            ) : null}
            <Button
              label="Use at checkout"
              onPress={() => {
                dispatch({ cardId: current.card.id, payment: "card", type: "setPayment" });
                toast.show("Card selected for checkout");
              }}
              size="sm"
            />
            <Button
              label="Remove"
              onPress={() => {
                dispatch({ cardId: current.card.id, type: "removeCard" });
                setSelected(0);
                toast.show("Card removed");
              }}
              size="sm"
              variant="outline"
            />
          </>
        ) : null}
        {current.kind === "apple-pay" || current.kind === "google-pay" ? (
          <Button
            disabled={!current.ready}
            label={current.ready ? "Use at checkout" : "Not available on this phone"}
            onPress={() => {
              dispatch({ payment: current.kind, type: "setPayment" });
              toast.show("Selected for checkout");
            }}
            size="sm"
          />
        ) : null}
        {current.kind === "wallet" ? <Button label="Add funds" onPress={() => setOpen(true)} size="sm" /> : null}
        {current.kind === "eft" ? <Button label={current.bank ? "Change bank" : "Choose bank"} onPress={() => setBankOpen(true)} size="sm" /> : null}
      </View>

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

      <Sheet onClose={() => setBankOpen(false)} title="Choose your bank" visible={bankOpen}>
        <View style={styles.presets}>
          {eftBanks.map((bank) => (
            <Chip
              key={bank}
              label={bank}
              onPress={() => {
                dispatch({ bank, payment: "eft", type: "setPayment" });
                setBankOpen(false);
                toast.show(`${bank} selected for instant EFT`);
              }}
              selected={state.checkout.bank === bank}
            />
          ))}
        </View>
      </Sheet>

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
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
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
