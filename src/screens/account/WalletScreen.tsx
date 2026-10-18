import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { AppHeader, Button, Card, Chip, Icon, RadioRow, Screen, Sheet, StatusBadge, TextField, useToast } from "@/components";
import { eftBanks } from "@/screens/cart/payment";
import { dateAndTime, formatRand } from "@/data/format";
import { MIN_WITHDRAW_CENTS, withdrawMessages, withdrawProblem } from "@/data/wallet";
import { confirmWithBiometrics } from "@/lib/biometric";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

import { CardSurface, walletCardWidth, walletItems, WalletCarousel, useWalletSelection } from "./WalletCards";
import { parseRandToCents } from "./walletAmount";

const PRESETS = [10000, 20000, 50000];
const MAX_TOP_UP_CENTS = 500_000;

/** Wallet: balance, add funds (demo) and recent transactions. */
export function WalletScreen() {
  const toast = useToast();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const { dispatch, state } = useDemoStore();
  const [open, setOpen] = useState(false);
  const [bankOpen, setBankOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawCard, setWithdrawCard] = useState<string | null>(null);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const items = walletItems({ balanceCents: state.wallet.balanceCents, bank: state.checkout.bank, cards: state.cards });
  const [selected, setSelected] = useWalletSelection(items);
  const current = items[Math.min(selected, items.length - 1)]!;
  const [custom, setCustom] = useState("");
  const [error, setError] = useState<string | null>(null);

  const add = async (amountCents: number | null) => {
    if (amountCents === null || amountCents <= 0) {
      setError("Enter an amount like 150 or 150.50.");
      return;
    }
    if (amountCents > MAX_TOP_UP_CENTS) {
      setError(`The most you can add at once is ${formatRand(MAX_TOP_UP_CENTS)}.`);
      return;
    }
    if (!(await confirmWithBiometrics(state.settings.biometric, "Confirm to add funds"))) {
      setError("Funds weren't added: Face ID or your passcode wasn't confirmed.");
      return;
    }
    dispatch({ amountCents, source: "card", type: "addFunds" });
    setOpen(false);
    setCustom("");
    setError(null);
    toast.show(`${formatRand(amountCents)} added to your wallet`);
  };

  const startWithdraw = () => {
    setWithdrawCard(state.cards.find((item) => item.isDefault)?.id ?? state.cards[0]?.id ?? null);
    setWithdrawAmount("");
    setWithdrawError(null);
    setWithdrawOpen(true);
  };

  const withdraw = async (amountCents: number | null) => {
    const problem = withdrawProblem({ amountCents: amountCents ?? 0, balanceCents: state.wallet.balanceCents, hasCard: Boolean(withdrawCard) });
    if (amountCents === null || problem) {
      setWithdrawError(problem ? withdrawMessages[problem] : "Enter an amount like 150 or 150.50.");
      return;
    }
    if (!(await confirmWithBiometrics(state.settings.biometric, "Confirm your withdrawal"))) {
      setWithdrawError("Withdrawal cancelled. Face ID or your passcode wasn't confirmed.");
      return;
    }
    dispatch({ amountCents, cardId: withdrawCard!, type: "withdraw" });
    setWithdrawOpen(false);
    toast.show(`${formatRand(amountCents)} is on its way to your card`);
  };

  return (
    <Screen>
      <AppHeader back subtitle="Manage your Vossie balance." title="Wallet" />
      <View style={styles.balanceWrap} testID="balance-card">
        <CardSurface colors={["#2A4658", "#16243A"]} width={Math.min(walletCardWidth(screenWidth) + 24, screenWidth - space.lg * 2)}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceBrand}>Vossie Wallet</Text>
            <Text style={styles.balanceTier}>Available balance</Text>
          </View>
          <Text accessibilityLiveRegion="polite" style={styles.balanceValue}>
            {formatRand(state.wallet.balanceCents, { fixed: true })}
          </Text>
          <Text style={styles.balanceName}>{(state.profile?.fullName ?? "").toUpperCase()}</Text>
        </CardSurface>
        <View style={styles.balanceActions}>
          <Button label="Add funds" onPress={() => setOpen(true)} size="sm" />
          <Button icon="arrow-up-right" label="Withdraw" onPress={startWithdraw} size="sm" testID="withdraw" variant="soft" />
        </View>
      </View>
      <Text style={styles.demo}>Demo wallet: no real money moves.</Text>

      <Text style={styles.heading}>Cards and payment options</Text>
      <WalletCarousel items={items} onAdd={() => router.push("/cart/add-card" as Href)} onEditCard={(cardId) => router.push(`/account/card/${cardId}` as Href)} onSelect={setSelected} selected={selected} />
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
          <Card key={tx.id} onPress={() => router.push(`/account/transaction/${tx.id}` as Href)} style={styles.tx} testID={`tx-${tx.id}`} variant="row">
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
            {tx.status === "pending" ? <StatusBadge label="Pending" tone="warning" /> : null}
            <Text style={[styles.amount, { color: tx.amountCents < 0 ? color.danger : color.success }]}>
              {formatRand(tx.amountCents, { signed: true })}
            </Text>
            <Icon color={color.textMuted} name="chevron-right" size={16} />
          </Card>
        ))}
      </View>

      <Sheet onClose={() => setWithdrawOpen(false)} title="Withdraw to a card" visible={withdrawOpen}>
        {state.cards.length === 0 ? (
          <>
            <Text style={text.body}>Add a card first, then you can withdraw to it.</Text>
            <Button fullWidth label="Add a card" onPress={() => { setWithdrawOpen(false); router.push("/cart/add-card" as Href); }} />
          </>
        ) : (
          <>
            <Text style={text.caption}>Available: {formatRand(state.wallet.balanceCents)}. Smallest withdrawal {formatRand(MIN_WITHDRAW_CENTS)}.</Text>
            {state.cards.map((card) => (
              <RadioRow
                key={card.id}
                onPress={() => setWithdrawCard(card.id)}
                selected={withdrawCard === card.id}
                subtitle={`Expires ${card.expiry}`}
                title={`${card.brand === "visa" ? "Visa" : "Mastercard"} ending ${card.last4}`}
              />
            ))}
            <View style={styles.presets}>
              {[10000, 20000].map((cents) => (
                <Chip key={cents} label={formatRand(cents)} onPress={() => void withdraw(cents)} />
              ))}
              <Chip label={`All ${formatRand(state.wallet.balanceCents)}`} onPress={() => void withdraw(state.wallet.balanceCents)} />
            </View>
            <TextField
              error={withdrawError ?? undefined}
              keyboardType="decimal-pad"
              label="Other amount (R)"
              onChangeText={(value) => {
                setWithdrawAmount(value);
                setWithdrawError(null);
              }}
              placeholder="150"
              value={withdrawAmount}
            />
            <Button fullWidth label="Withdraw" onPress={() => void withdraw(parseRandToCents(withdrawAmount))} testID="confirm-withdraw" />
            <Text style={text.caption}>Demo: no money moves. A real withdrawal goes back to your card through the payment provider and takes 1 to 3 working days.</Text>
          </>
        )}
      </Sheet>

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
            <Chip key={cents} label={formatRand(cents)} onPress={() => void add(cents)} />
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
        <Button fullWidth label="Add funds" onPress={() => void add(parseRandToCents(custom))} />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  balanceActions: { flexDirection: "row", gap: space.xs },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginTop: space.sm },
  amount: { fontSize: 14, fontWeight: "700" },
  balanceBrand: { color: color.onPrimary, fontSize: 15, fontWeight: "800", letterSpacing: 0.5 },
  balanceName: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "700", letterSpacing: 1 },
  balanceRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  balanceTier: { color: "rgba(255,255,255,0.8)", fontSize: 12, fontWeight: "600" },
  balanceValue: { color: color.onPrimary, fontSize: 34, fontVariant: ["tabular-nums"], fontWeight: "800" },
  balanceWrap: { alignItems: "center", gap: space.sm, marginTop: space.sm },
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
