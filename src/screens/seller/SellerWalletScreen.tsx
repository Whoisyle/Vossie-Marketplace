import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View, useWindowDimensions } from "react-native";

import { formatRand } from "@/data/format";
import { feesPaidCents, pendingCents } from "@/seller/selectors";
import { walletCardWidth, walletItems, WalletBalanceFlip, WalletCarousel, useWalletSelection } from "@/screens/account/WalletCards";
import { useDemoStore } from "@/state/DemoStore";

import { useSeller } from "./hooks";
import { Confetti } from "./motion";
import { StatTile } from "./parts";
import { TxRow } from "./SellerMoneyScreens";
import { SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";
import { WithdrawSheet } from "./WithdrawSheet";

/**
 * The seller's wallet, laid out like the buyer's: the Vossie card that turns over, with the earnings balance on it, the
 * cards and bank you can be paid out to, and the recent money in and out. Where the buyer adds funds, the seller
 * requests a payout.
 */
export function SellerWalletScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { state } = useDemoStore();
  const view = useSeller();
  const [withdrawing, setWithdrawing] = useState(false);
  const [coins, setCoins] = useState(false);
  const bank = view.seller.profile.bank;
  // Apple Pay and Google Pay pay for things; they are not somewhere a payout can go
  const items = walletItems({ balanceCents: view.available, bank: bank?.bankName ?? null, cards: state.cards }).filter((item) => item.kind !== "apple-pay" && item.kind !== "google-pay");
  const [selected, setSelected] = useWalletSelection(items);
  const current = items[Math.min(selected, items.length - 1)]!;
  const recent = view.seller.ledger.slice(0, 5);

  return (
    <SellerScreen testID="seller-wallet">
      <SellerTopBar title="Wallet" />
      <Text style={styles.sub}>Your earnings, and where they are paid out.</Text>

      <View style={styles.balanceWrap} testID="seller-balance-card">
        <WalletBalanceFlip balanceCents={view.available} width={walletCardWidth(width)} />
        <View style={styles.actions}>
          <SellerButton icon="arrow-up-right" label="Request payout" onPress={() => setWithdrawing(true)} size="sm" testID="wallet-payout" variant="light" />
          <SellerButton icon="file-text" label="Statements" onPress={() => router.push("/seller/payouts/statements" as Href)} size="sm" testID="wallet-statements" variant="glass" />
        </View>
      </View>
      <Text style={styles.demo}>Demo wallet: no real money moves.</Text>

      <View style={styles.tiles}>
        <StatTile label="Pending" testID="wallet-pending" value={formatRand(pendingCents(view.seller.orders))} />
        <StatTile label="Fees paid" testID="wallet-fees" value={formatRand(feesPaidCents(view.seller.ledger))} />
      </View>

      <SellerHeading>Cards and payout options</SellerHeading>
      <WalletCarousel items={items} onAdd={() => router.push("/cart/add-card" as Href)} onSelect={setSelected} selected={selected} />
      <View style={styles.contextActions} testID="seller-wallet-actions">
        {current.kind === "card" ? <SellerButton label="Pay out to this card" onPress={() => setWithdrawing(true)} size="sm" testID="payout-to-card" variant="light" /> : null}
        {current.kind === "wallet" ? <SellerButton label="Request payout" onPress={() => setWithdrawing(true)} size="sm" variant="light" /> : null}
        {current.kind === "eft" ? <SellerButton label={bank ? "Pay out by instant EFT" : "Add a bank account"} onPress={() => setWithdrawing(true)} size="sm" testID="payout-eft" variant="light" /> : null}
      </View>
      <Text style={styles.hint}>
        {bank ? `Payouts go to ${bank.bankName} ending ${bank.last4}.` : "You add a bank account the first time you request a payout."}
      </Text>

      <View style={styles.headRow}>
        <SellerHeading style={styles.headFlat}>Recent transactions</SellerHeading>
        <Pressable accessibilityRole="button" onPress={() => router.push("/seller/payouts/transactions" as Href)} testID="wallet-see-all">
          <Text style={styles.seeAll}>See all</Text>
        </Pressable>
      </View>
      <View style={styles.list}>
        {recent.length === 0 ? (
          <SellerCard>
            <Text style={styles.hint}>Sales and payouts show here.</Text>
          </SellerCard>
        ) : (
          recent.map((entry) => <TxRow entry={entry} key={entry.id} onPress={() => router.push(`/seller/payouts/receipt/${entry.id}` as Href)} />)
        )}
      </View>

      <WithdrawSheet availableCents={view.available} onClose={() => setWithdrawing(false)} onPaid={() => setCoins(true)} visible={withdrawing} />
      <Confetti coins count={26} play={coins} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10 },
  balanceWrap: { alignItems: "center", gap: 14, marginTop: 14 },
  contextActions: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 10 },
  demo: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 8, textAlign: "center" },
  headFlat: { marginBottom: 0, marginTop: 0 },
  headRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 20 },
  hint: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 8 },
  list: { gap: 10 },
  seeAll: { color: "#FFFFFF", fontSize: 14, fontWeight: "800" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 14 },
});
