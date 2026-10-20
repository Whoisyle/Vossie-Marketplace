import { useEffect, useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { Icon } from "@/components";
import { formatRand } from "@/data/format";
import { haptic } from "@/lib/haptics";

export type EftStage = "redirect" | "login" | "approve" | "authorising" | "done";

/** How long each automatic step of the demo takes. */
export const EFT_REDIRECT_MS = 1600;
export const EFT_AUTHORISE_MS = 2000;
export const EFT_DONE_MS = 1800;

/** Each bank's own colours for its demo sign-in page. The real pages belong to the banks; these only echo them. */
const BANK_LOOK: Record<string, { bar: string; ink: string; soft: string; tagline: string }> = {
  Absa: { bar: "#AF144B", ink: "#FFFFFF", soft: "#FBE9EF", tagline: "Absa Online Banking" },
  Capitec: { bar: "#0A4E9B", ink: "#FFFFFF", soft: "#E6EFFA", tagline: "Capitec Online Banking" },
  "Discovery Bank": { bar: "#1B1B1B", ink: "#D8B25A", soft: "#F5EFE1", tagline: "Discovery Bank Online" },
  FNB: { bar: "#009AA6", ink: "#FFFFFF", soft: "#E3F5F6", tagline: "FNB Online Banking" },
  Investec: { bar: "#0B2545", ink: "#FFFFFF", soft: "#E7ECF3", tagline: "Investec Online" },
  Nedbank: { bar: "#00833E", ink: "#FFFFFF", soft: "#E3F3EA", tagline: "Nedbank Money" },
  "Standard Bank": { bar: "#0033A0", ink: "#FFFFFF", soft: "#E5EBF8", tagline: "Standard Bank Online Banking" },
  TymeBank: { bar: "#0B0F12", ink: "#22E5CF", soft: "#E4F8F5", tagline: "GoTyme Bank" },
};
const DEFAULT_LOOK = { bar: "#2B3A4A", ink: "#FFFFFF", soft: "#EEF2F5", tagline: "Online Banking" };

/** A payment reference in the form banks show, so the student can match it to the order. */
export function eftReference(seed: number = Date.now()): string {
  return `VOS${String(Math.abs(Math.floor(seed)) % 100000000).padStart(8, "0")}`;
}

/**
 * Demo of how an instant EFT works: Vossie hands the student to their bank, the student signs in there, checks the
 * payment request (who, how much, which reference, from which account), approves it, the bank confirms and the student
 * lands back in Vossie with a reference. No bank is contacted and no money moves.
 */
export function EftPay({
  amountCents,
  bank,
  merchant,
  onCancel,
  onDone,
  visible,
}: {
  visible: boolean;
  bank: string;
  amountCents: number;
  merchant: string;
  onCancel: () => void;
  onDone: () => void;
}) {
  return (
    <Modal animationType="slide" onRequestClose={onCancel} transparent={false} visible={visible}>
      {/* remounted each time it opens so the flow always starts at the redirect */}
      <EftFlow amountCents={amountCents} bank={bank} key={`${bank}-${visible}`} merchant={merchant} onCancel={onCancel} onDone={onDone} visible={visible} />
    </Modal>
  );
}

const ACCOUNTS = [
  { id: "cheque", label: "Cheque account", last4: "4417" },
  { id: "savings", label: "Savings account", last4: "9082" },
];

function EftFlow({ amountCents, bank, merchant, onCancel, onDone, visible }: Parameters<typeof EftPay>[0]) {
  const look = BANK_LOOK[bank] ?? DEFAULT_LOOK;
  const [stage, setStage] = useState<EftStage>("redirect");
  const [account, setAccount] = useState(ACCOUNTS[0]!.id);
  const [reference] = useState(() => eftReference());

  useEffect(() => {
    if (!visible) return;
    if (stage === "redirect") {
      const timer = setTimeout(() => setStage("login"), EFT_REDIRECT_MS);
      return () => clearTimeout(timer);
    }
    if (stage === "authorising") {
      const timer = setTimeout(() => {
        haptic.success();
        setStage("done");
      }, EFT_AUTHORISE_MS);
      return () => clearTimeout(timer);
    }
    if (stage === "done") {
      const timer = setTimeout(onDone, EFT_DONE_MS);
      return () => clearTimeout(timer);
    }
  }, [onDone, stage, visible]);

  if (stage === "redirect") {
    return (
      <View style={styles.redirect} testID="eft-redirect">
        <View style={styles.hops}>
          <View style={styles.vossieDot}>
            <Text style={styles.vossieLetter}>V</Text>
          </View>
          <View style={styles.hopLine} />
          <View style={[styles.bankDot, { backgroundColor: look.bar }]}>
            <Text style={[styles.bankLetter, { color: look.ink }]}>{bank[0]}</Text>
          </View>
        </View>
        <ActivityIndicator color="#5B6B7A" style={styles.spinner} />
        <Text style={styles.redirectTitle}>Taking you to {bank}</Text>
        <Text style={styles.redirectNote}>You will sign in and approve the payment on your bank&apos;s own page. Vossie never sees your banking password.</Text>
        <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel} style={styles.linkButton}>
          <Text style={styles.link}>Cancel</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.page}>
      <View style={[styles.bar, { backgroundColor: look.bar }]}>
        <Text style={[styles.barTitle, { color: look.ink }]}>{look.tagline}</Text>
        <View style={styles.secure}>
          <Icon color={look.ink} name="lock" size={12} />
          <Text style={[styles.secureText, { color: look.ink }]}>Secure</Text>
        </View>
      </View>

      {stage === "login" ? (
        <ScrollView contentContainerStyle={styles.body} testID="eft-login">
          <Text style={styles.heading}>Sign in to continue your payment</Text>
          <Text style={styles.sub}>{merchant} asked you to pay {formatRand(amountCents)} from your {bank} account.</Text>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Username</Text>
            <Text style={styles.fieldValue}>vumisa•••••</Text>
          </View>
          <View style={styles.field}>
            <Text style={styles.fieldLabel}>Password</Text>
            <Text style={styles.fieldValue}>••••••••••</Text>
          </View>
          <Pressable accessibilityRole="button" onPress={() => setStage("approve")} style={[styles.primary, { backgroundColor: look.bar }]} testID="eft-signin">
            <Text style={[styles.primaryText, { color: look.ink }]}>Sign in</Text>
          </Pressable>
          <Text style={styles.demo}>Demo: your details are pre-filled and nothing is sent to {bank}.</Text>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel} style={styles.linkButton}>
            <Text style={styles.link}>Cancel and go back to Vossie</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {stage === "approve" ? (
        <ScrollView contentContainerStyle={styles.body} testID="eft-approve">
          <Text style={styles.heading}>Approve this payment</Text>
          <View style={[styles.summary, { backgroundColor: look.soft }]}>
            <Text style={styles.sumLabel}>Pay to</Text>
            <Text style={styles.sumValue}>{merchant}</Text>
            <Text style={styles.sumLabel}>Amount</Text>
            <Text style={styles.sumAmount}>{formatRand(amountCents)}</Text>
            <Text style={styles.sumLabel}>Reference</Text>
            <Text style={styles.sumValue} testID="eft-reference">
              {reference}
            </Text>
          </View>
          <Text style={styles.fieldLabel}>Pay from</Text>
          {ACCOUNTS.map((item) => (
            <Pressable accessibilityRole="radio" accessibilityState={{ checked: account === item.id }} key={item.id} onPress={() => setAccount(item.id)} style={[styles.account, account === item.id && { borderColor: look.bar }]}>
              <View style={[styles.radio, account === item.id && { borderColor: look.bar }]}>{account === item.id ? <View style={[styles.radioDot, { backgroundColor: look.bar }]} /> : null}</View>
              <View>
                <Text style={styles.accountName}>{item.label}</Text>
                <Text style={styles.accountSub}>•••• {item.last4}</Text>
              </View>
            </Pressable>
          ))}
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              haptic.select();
              setStage("authorising");
            }}
            style={[styles.primary, { backgroundColor: look.bar }]}
            testID="eft-approve-button"
          >
            <Text style={[styles.primaryText, { color: look.ink }]}>Approve payment</Text>
          </Pressable>
          <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel} style={styles.linkButton} testID="eft-decline">
            <Text style={styles.link}>Decline</Text>
          </Pressable>
        </ScrollView>
      ) : null}

      {stage === "authorising" ? (
        <View style={styles.centre} testID="eft-authorising">
          <ActivityIndicator color={look.bar} size="large" />
          <Text style={styles.redirectTitle}>Confirming with {bank}</Text>
          <Text style={styles.redirectNote}>Please wait, do not close this page.</Text>
        </View>
      ) : null}

      {stage === "done" ? (
        <View style={styles.centre} testID="eft-done">
          <View style={[styles.tick, { backgroundColor: look.bar }]}>
            <Icon color={look.ink} name="check" size={34} />
          </View>
          <Text style={styles.redirectTitle}>Payment approved</Text>
          <Text style={styles.redirectNote}>
            {formatRand(amountCents)} to {merchant}. Reference {reference}. Taking you back to Vossie.
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  account: { alignItems: "center", borderColor: "#D5DBE0", borderRadius: 12, borderWidth: 1.5, flexDirection: "row", gap: 12, padding: 14 },
  accountName: { color: "#1C2630", fontSize: 15, fontWeight: "600" },
  accountSub: { color: "#6B7783", fontSize: 13 },
  bankDot: { alignItems: "center", borderRadius: 32, height: 64, justifyContent: "center", width: 64 },
  bankLetter: { fontSize: 28, fontWeight: "800" },
  bar: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingBottom: 14, paddingHorizontal: 20, paddingTop: 54 },
  barTitle: { fontSize: 17, fontWeight: "700" },
  body: { gap: 14, padding: 22 },
  centre: { alignItems: "center", flex: 1, gap: 12, justifyContent: "center", padding: 32 },
  demo: { color: "#8A95A0", fontSize: 12, textAlign: "center" },
  field: { borderBottomColor: "#C9D1D8", borderBottomWidth: 1, gap: 2, paddingVertical: 8 },
  fieldLabel: { color: "#6B7783", fontSize: 13, fontWeight: "600" },
  fieldValue: { color: "#1C2630", fontSize: 17 },
  heading: { color: "#1C2630", fontSize: 21, fontWeight: "700" },
  hopLine: { backgroundColor: "#C9D1D8", height: 2, width: 40 },
  hops: { alignItems: "center", flexDirection: "row", gap: 10 },
  link: { color: "#5B6B7A", fontSize: 14, fontWeight: "600" },
  linkButton: { alignItems: "center", paddingVertical: 10 },
  page: { backgroundColor: "#FFFFFF", flex: 1 },
  primary: { alignItems: "center", borderRadius: 10, marginTop: 6, paddingVertical: 15 },
  primaryText: { fontSize: 16, fontWeight: "700" },
  radio: { alignItems: "center", borderColor: "#B5BEC6", borderRadius: 10, borderWidth: 2, height: 20, justifyContent: "center", width: 20 },
  radioDot: { borderRadius: 5, height: 10, width: 10 },
  redirect: { alignItems: "center", backgroundColor: "#F4F6F8", flex: 1, gap: 14, justifyContent: "center", padding: 32 },
  redirectNote: { color: "#5B6B7A", fontSize: 14, lineHeight: 20, textAlign: "center" },
  redirectTitle: { color: "#1C2630", fontSize: 20, fontWeight: "700", textAlign: "center" },
  secure: { alignItems: "center", flexDirection: "row", gap: 4 },
  secureText: { fontSize: 12, fontWeight: "600" },
  spinner: { marginTop: 8 },
  sub: { color: "#5B6B7A", fontSize: 14, lineHeight: 20 },
  sumAmount: { color: "#1C2630", fontSize: 30, fontWeight: "800" },
  sumLabel: { color: "#6B7783", fontSize: 12, fontWeight: "600", marginTop: 6, textTransform: "uppercase" },
  sumValue: { color: "#1C2630", fontSize: 16, fontWeight: "600" },
  summary: { borderRadius: 14, gap: 2, padding: 16 },
  tick: { alignItems: "center", borderRadius: 40, height: 80, justifyContent: "center", width: 80 },
  vossieDot: { alignItems: "center", backgroundColor: "#2B3A4A", borderRadius: 32, height: 64, justifyContent: "center", width: 64 },
  vossieLetter: { color: "#FFFFFF", fontSize: 28, fontWeight: "800" },
});
