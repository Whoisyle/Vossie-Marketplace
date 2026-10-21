import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View, useWindowDimensions } from "react-native";

import { Button as AppButton, Chip, Icon, Sheet, TextField, useToast } from "@/components";
import { rand } from "@/courier/pay";
import { balanceCents, MIN_CASH_OUT_CENTS } from "@/courier/state";
import type { CourierState } from "@/courier/types";
import { formatRand } from "@/data/format";
import { withdrawMessages, withdrawProblem } from "@/data/wallet";
import { confirmWithBiometrics } from "@/lib/biometric";
import { parseRandToCents } from "@/screens/account/walletAmount";
import { walletCardWidth, walletItems, WalletBalanceFlip, WalletCarousel, useWalletSelection } from "@/screens/account/WalletCards";
import { eftBanks } from "@/screens/cart/payment";
import { Confetti } from "@/screens/seller/motion";
import { useDemoStore } from "@/state/DemoStore";

import { shortDate, useCourier } from "./hooks";
import { Button, Card, CourierPage, COURIER, Empty, Heading, Muted, Rise, Stat, type } from "./ui";

export type WalletRow = { id: string; label: string; note: string; cents: number; at: string; out?: boolean };

/** Money in (deliveries, tips, return trips) and out (withdrawals), newest first, for the wallet's list. */
export function walletRows(courier: Pick<CourierState, "earnings" | "payouts">): WalletRow[] {
  const money: WalletRow[] = courier.earnings.map((entry) => ({ at: entry.at, cents: entry.cents, id: entry.id, label: entry.kind === "tip" ? `Tip · ${entry.number}` : entry.kind === "return-trip" ? `Return trip · ${entry.number}` : `Delivery ${entry.number}`, note: entry.kind === "tip" ? "100% yours" : entry.kind === "return-trip" ? "Parcel taken back" : "Paid by the buyer" }));
  const out: WalletRow[] = courier.payouts.map((item) => ({ at: item.on, cents: item.cents, id: item.id, label: item.label, note: "Withdrawn", out: true }));
  return [...money, ...out].sort((a, b) => b.at.localeCompare(a.at));
}

/** Withdraw to the bank account: pick or type an amount, set the account the first time, confirm with Face ID. Nothing is paid out in the demo. */
export function CourierWithdrawSheet({ availableCents, onClose, onPaid, visible }: { visible: boolean; availableCents: number; onClose: () => void; onPaid: (amountCents: number) => void }) {
  const toast = useToast();
  const { state } = useDemoStore();
  const { courier, dispatch } = useCourier();
  const bank = courier.bank;
  const [amount, setAmount] = useState("");
  const [bankName, setBankName] = useState<string>(bank?.bankName ?? "");
  const [holder, setHolder] = useState(bank?.accountHolder ?? state.profile?.fullName ?? "");
  const [account, setAccount] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (override?: number) => {
    const cents = override ?? parseRandToCents(amount);
    const needsBank = !bank;
    if (needsBank && (!bankName || holder.trim().length < 2 || !/^\d{6,12}$/.test(account.replace(/\s/g, "")))) {
      setError("Choose your bank and enter the account holder and a 6 to 12 digit account number.");
      return;
    }
    const problem = withdrawProblem({ amountCents: cents ?? 0, balanceCents: availableCents, hasCard: true });
    if (cents === null || problem) {
      setError(problem ? withdrawMessages[problem].replace("wallet balance", "available balance") : "Enter an amount like 150 or 150.50.");
      return;
    }
    setBusy(true);
    const ok = await confirmWithBiometrics(state.settings.biometric, "Confirm your withdrawal");
    setBusy(false);
    if (!ok) {
      setError("Withdrawal cancelled. Face ID or your passcode wasn't confirmed.");
      return;
    }
    if (needsBank) dispatch({ bank: { accountHolder: holder.trim(), bankName, last4: account.replace(/\s/g, "").slice(-4) }, type: "courierSaveBank" });
    // the bank is saved in the same turn, so the withdrawal is sent after it
    setTimeout(() => dispatch({ amountCents: cents, type: "courierWithdraw" }), 0);
    toast.show(`${formatRand(cents)} is on its way to ${bank?.bankName ?? bankName}`);
    setAmount("");
    setError(null);
    onPaid(cents);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Withdraw to bank" visible={visible}>
      <Text style={type.caption}>
        Available: {formatRand(availableCents)}. Smallest withdrawal {formatRand(MIN_CASH_OUT_CENTS)}.
      </Text>
      {bank ? (
        <View style={styles.bank} testID="saved-bank">
          <Text style={type.card}>{bank.bankName}</Text>
          <Text style={type.caption}>
            {bank.accountHolder} · account ending {bank.last4}
          </Text>
        </View>
      ) : (
        <View style={styles.bankForm}>
          <Text style={type.label}>Bank</Text>
          <View style={styles.banks}>
            {eftBanks.map((item) => (
              <Chip key={item} label={item} onPress={() => setBankName(item)} selected={bankName === item} />
            ))}
          </View>
          <TextField label="Account holder" onChangeText={setHolder} value={holder} />
          <TextField keyboardType="number-pad" label="Account number" onChangeText={setAccount} testID="bank-account" value={account} />
        </View>
      )}
      <View style={styles.presets}>
        {[10000, 20000].filter((cents) => cents <= availableCents).map((cents) => (
          <Chip key={cents} label={formatRand(cents)} onPress={() => void submit(cents)} />
        ))}
        {availableCents >= MIN_CASH_OUT_CENTS ? <Chip label={`All ${formatRand(availableCents)}`} onPress={() => void submit(availableCents)} testID="withdraw-all" /> : null}
      </View>
      <TextField
        error={error ?? undefined}
        keyboardType="decimal-pad"
        label="Other amount (R)"
        onChangeText={(value) => {
          setAmount(value);
          setError(null);
        }}
        testID="withdraw-amount"
        value={amount}
      />
      <AppButton fullWidth label="Withdraw" loading={busy} onPress={() => void submit()} testID="withdraw-confirm" />
      <Text style={[type.caption, styles.note]}>Demo: no money moves. Real payouts need a payment provider.</Text>
    </Sheet>
  );
}

/**
 * The courier's wallet, laid out like the buyer's and the seller's: the Vossie card that turns over, with what you have earned
 * on it, the cards and bank you can be paid out to, and the money in and out. Where the buyer adds funds, the courier withdraws.
 */
export function CourierWalletScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state } = useDemoStore();
  const { courier } = useCourier();
  const [withdrawing, setWithdrawing] = useState(false);
  const [coins, setCoins] = useState(false);
  const balance = balanceCents(courier);
  const bank = courier.bank;
  const items = walletItems({ balanceCents: balance, bank: bank?.bankName ?? null, cards: state.cards }).filter((item) => item.kind !== "apple-pay" && item.kind !== "google-pay");
  const [selected, setSelected] = useWalletSelection(items);
  const current = items[Math.min(selected, items.length - 1)]!;
  const rows = walletRows(courier);
  const earned = courier.earnings.reduce((sum, entry) => sum + entry.cents, 0);
  const paid = courier.payouts.reduce((sum, item) => sum + item.cents, 0);

  return (
    <CourierPage back subtitle="Your earnings, and where they are paid out" testID="courier-wallet" title="Wallet" tone="blue">
      <Rise>
        <View style={styles.balanceWrap} testID="courier-balance-card">
          <WalletBalanceFlip balanceCents={balance} width={walletCardWidth(width) - 36} />
          <View style={styles.actions}>
            <View style={styles.flex}>
              <Button icon="arrow-up-right" label="Withdraw" onPress={() => setWithdrawing(true)} testID="wallet-withdraw" />
            </View>
            <View style={styles.flex}>
              <Button icon="bar-chart-2" label="Earnings" onPress={() => router.push("/courier/earnings" as Href)} testID="wallet-earnings" tone="outline" />
            </View>
          </View>
        </View>
      </Rise>
      <Muted style={styles.demo}>Demo wallet: no real money moves.</Muted>
      <View style={styles.tiles}>
        <Stat icon="trending-up" label="Earned" testID="wallet-earned" value={rand(earned)} />
        <Stat icon="arrow-up-right" label="Withdrawn" testID="wallet-paid" value={rand(paid)} />
      </View>

      <Heading>Cards and payout options</Heading>
      <WalletCarousel items={items} onAdd={() => router.push("/cart/add-card" as Href)} onSelect={setSelected} selected={selected} />
      <View style={styles.context} testID="courier-wallet-actions">
        {current.kind === "card" ? <Button label="Pay out to this card" onPress={() => setWithdrawing(true)} testID="payout-to-card" tone="light" /> : null}
        {current.kind === "wallet" ? <Button label="Withdraw" onPress={() => setWithdrawing(true)} tone="light" /> : null}
        {current.kind === "eft" ? <Button label={bank ? "Pay out by instant EFT" : "Add a bank account"} onPress={() => setWithdrawing(true)} testID="payout-eft" tone="light" /> : null}
      </View>
      <Muted style={styles.hint}>{bank ? `Payouts go to ${bank.bankName} ending ${bank.last4}.` : "You add a bank account the first time you withdraw."}</Muted>

      <Heading>Recent transactions</Heading>
      {rows.length === 0 ? (
        <Empty detail="Finish a delivery and what you earn shows here, with every withdrawal." icon="credit-card" title="No transactions yet" />
      ) : (
        rows.slice(0, 12).map((row, index) => (
          <Rise index={index} key={row.id}>
            <Card style={styles.row} testID={`tx-${row.id}`}>
              <View style={[styles.rowIcon, { backgroundColor: row.out ? COURIER.amberSoft : COURIER.greenSoft }]}>
                <Icon color={row.out ? COURIER.amber : COURIER.green} name={row.out ? "arrow-up-right" : "arrow-down-left"} size={18} />
              </View>
              <View style={styles.flex}>
                <Text style={type.card}>{row.label}</Text>
                <Text style={type.caption}>
                  {shortDate(row.at)} · {row.note}
                </Text>
              </View>
              <Text style={[styles.amount, { color: row.out ? COURIER.ink : COURIER.green }]}>
                {row.out ? "-" : "+"}
                {rand(row.cents)}
              </Text>
            </Card>
          </Rise>
        ))
      )}
      <CourierWithdrawSheet availableCents={balance} onClose={() => setWithdrawing(false)} onPaid={() => setCoins(true)} visible={withdrawing} />
      <Confetti coins play={coins} />
    </CourierPage>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  amount: { fontSize: 15, fontWeight: "800" },
  balanceWrap: { alignItems: "center" },
  bank: { backgroundColor: "#E4EAED", borderRadius: 12, gap: 2, padding: 12 },
  bankForm: { gap: 8 },
  banks: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  context: { marginTop: 10 },
  demo: { marginTop: 8, textAlign: "center" },
  flex: { flex: 1 },
  hint: { marginTop: 8 },
  note: { textAlign: "center" },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  row: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
  rowIcon: { alignItems: "center", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  tiles: { flexDirection: "row", gap: 10, marginTop: 12 },
});
