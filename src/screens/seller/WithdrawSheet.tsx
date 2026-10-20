import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { Button, Chip, Sheet, TextField, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { MIN_WITHDRAW_CENTS, withdrawMessages, withdrawProblem } from "@/data/wallet";
import { confirmWithBiometrics } from "@/lib/biometric";
import { parseRandToCents } from "@/screens/account/walletAmount";
import { eftBanks } from "@/screens/cart/payment";
import { useDemoStore } from "@/state/DemoStore";

import { useSellerDispatch } from "./actions";
import { color, space, text } from "@/theme/tokens";
import { Text } from "./ui";

/**
 * Withdraw earnings to the seller's bank account: pick or type an amount, choose the bank the first time, confirm with
 * Face ID. Takes the smallest withdrawal and the balance into account. Nothing is paid out in the demo.
 */
export function WithdrawSheet({ availableCents, onClose, onPaid, visible }: { visible: boolean; availableCents: number; onClose: () => void; onPaid: (amountCents: number) => void }) {
  const toast = useToast();
  const { state } = useDemoStore();
  const dispatch = useSellerDispatch();
  const bank = state.seller.profile.bank;
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
    if (needsBank) dispatch({ bank: { accountHolder: holder.trim(), bankName, last4: account.replace(/\s/g, "").slice(-4) }, type: "sellerSaveBank" });
    dispatch({ amountCents: cents, type: "sellerWithdraw" });
    toast.show(`${formatRand(cents)} is on its way to ${bank?.bankName ?? bankName}`);
    setAmount("");
    setError(null);
    onPaid(cents);
    onClose();
  };

  return (
    <Sheet onClose={onClose} title="Withdraw to bank" visible={visible}>
      <Text style={text.caption}>
        Available: {formatRand(availableCents)}. Smallest withdrawal {formatRand(MIN_WITHDRAW_CENTS)}.
      </Text>
      {bank ? (
        <View style={styles.bank} testID="saved-bank">
          <Text style={text.cardTitle}>{bank.bankName}</Text>
          <Text style={text.caption}>
            {bank.accountHolder} · account ending {bank.last4}
          </Text>
        </View>
      ) : (
        <View style={styles.bankForm}>
          <Text style={text.label}>Bank</Text>
          <View style={styles.banks}>
            {eftBanks.map((item) => (
              <Chip key={item} label={item} onPress={() => setBankName(item)} selected={bankName === item} />
            ))}
          </View>
          <TextField label="Account holder" onChangeText={setHolder} value={holder} />
          <TextField keyboardType="number-pad" label="Account number" onChangeText={setAccount} value={account} />
        </View>
      )}
      <View style={styles.presets}>
        {[10000, 20000].filter((cents) => cents <= availableCents).map((cents) => (
          <Chip key={cents} label={formatRand(cents)} onPress={() => void submit(cents)} />
        ))}
        {availableCents >= MIN_WITHDRAW_CENTS ? <Chip label={`All ${formatRand(availableCents)}`} onPress={() => void submit(availableCents)} /> : null}
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
      <Button fullWidth label="Withdraw" loading={busy} onPress={() => void submit()} testID="withdraw-confirm" />
      <Text style={[text.caption, styles.note]}>Demo: no money moves. Real payouts need a payment provider.</Text>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  bank: { backgroundColor: color.surfaceSoft, borderRadius: 12, gap: 2, padding: space.sm },
  bankForm: { gap: space.xs },
  banks: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  note: { textAlign: "center" },
  presets: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
});
