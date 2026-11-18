import { StyleSheet, View } from "react-native";

import { Icon } from "@/components";
import { shortDate } from "@/data/format";
import { AGREEMENT_PROMISES, AGREEMENT_VERSION } from "@/seller/agreement";
import { useDemoStore } from "@/state/DemoStore";
import { color } from "@/theme/tokens";

import { SignatureView } from "./SignaturePad";
import { Pill, SellerCard, SellerScreen, SellerTopBar, Text } from "./ui";

/** The agreement the seller signed: who signed, when, the signature and the promises, to read again at any time. */
export function SellerAgreementScreen() {
  const { state } = useDemoStore();
  const agreement = state.seller.agreement;
  const signed = agreement?.version === AGREEMENT_VERSION;
  return (
    <SellerScreen testID="seller-agreement" tone="white">
      <SellerTopBar title="Seller agreement" />
      <SellerCard testID="agreement-status">
        <View style={styles.head}>
          <View style={styles.headText}>
            <Text style={styles.title}>{signed ? "Signed" : "Not signed yet"}</Text>
            <Text style={styles.hint}>{signed && agreement ? `${agreement.signedName} · ${shortDate(agreement.signedAt)}` : "You sign this once Vossie Operations has accepted your documents."}</Text>
            {signed && agreement ? <Text style={styles.hint}>ID number ending {agreement.idLast4} · version {agreement.version}</Text> : null}
          </View>
          <Pill label={signed ? "Signed" : "Waiting"} tone={signed ? "success" : "warn"} />
        </View>
        {signed && agreement ? (
          <View style={styles.signature} testID="agreement-signature">
            <SignatureView path={agreement.signature} />
          </View>
        ) : null}
      </SellerCard>

      <Text style={styles.heading}>What I promised</Text>
      <SellerCard>
        {AGREEMENT_PROMISES.map((promise, index) => (
          <View key={promise.title} style={[styles.promise, index > 0 && styles.promiseLine]}>
            <Icon color={color.accent} name="check-circle" size={18} />
            <View style={styles.promiseText}>
              <Text style={styles.promiseTitle}>{promise.title}</Text>
              <Text style={styles.hint}>{promise.text}</Text>
            </View>
          </View>
        ))}
      </SellerCard>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  head: { alignItems: "center", flexDirection: "row", gap: 10 },
  headText: { flex: 1, gap: 2 },
  heading: { color: "#1E2B33", fontSize: 17, fontWeight: "800", marginTop: 18 },
  hint: { color: "#5F6E76", fontSize: 13, lineHeight: 18 },
  promise: { flexDirection: "row", gap: 10, paddingVertical: 10 },
  promiseLine: { borderTopColor: "#E8ECEE", borderTopWidth: 1 },
  promiseText: { flex: 1, gap: 2 },
  promiseTitle: { color: "#1E2B33", fontSize: 15, fontWeight: "800" },
  signature: { alignItems: "center", backgroundColor: "#FFFFFF", borderColor: "#E1E6E8", borderRadius: 14, borderWidth: 1, marginTop: 12, paddingVertical: 8 },
  title: { color: "#1E2B33", fontSize: 18, fontWeight: "800" },
});
