import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { timeOfDay } from "@/data/format";
import { docHints, docTitles } from "@/seller/state";
import type { DocStatus, SellerDocument } from "@/seller/types";
import { useDemoStore } from "@/state/DemoStore";

import { usePickImage } from "./fields";
import { Confetti, StepBar } from "./motion";
import { Pill, type PillTone, SELLER, SellerButton, SellerCard, SellerScreen, SellerTopBar } from "./ui";

const DOC_LABEL: Record<DocStatus, { label: string; tone: PillTone }> = {
  "in-review": { label: "In review", tone: "warn" },
  rejected: { label: "Rejected", tone: "danger" },
  required: { label: "Required", tone: "danger" },
  uploaded: { label: "Uploaded", tone: "info" },
  verified: { label: "Verified", tone: "success" },
};

/** Step 2 of 3: the documents buyers need to trust a seller, what Vossie Operations has done with them, and where review is up to. */
export function SellerVerifyScreen({ mode = "setup" }: { mode?: "setup" | "manage" }) {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const pick = usePickImage();
  const seller = state.seller;
  const received = seller.documents.filter((doc) => doc.status !== "required" && doc.status !== "rejected").length;
  const missing = seller.documents.length - received;
  const submitted = seller.status === "pending" || seller.status === "approved";
  const approved = seller.status === "approved";

  // confetti plays once, the moment review finishes while this page is open
  const [seenApproved, setSeenApproved] = useState(approved);
  const [celebrate, setCelebrate] = useState(false);
  if (approved && !seenApproved) {
    setSeenApproved(true);
    setCelebrate(true);
  }

  const upload = async (doc: SellerDocument) => {
    if (submitted || doc.status === "verified") return;
    const picked = await pick(false);
    if (picked) dispatch({ fileName: picked.name, kind: doc.kind, type: "sellerUploadDocument" });
  };

  const headline = approved ? { label: "Approved", tone: "success" as const } : submitted ? { label: "Pending", tone: "warn" as const } : missing > 0 ? { label: "Incomplete", tone: "danger" as const } : { label: "Ready", tone: "info" as const };

  return (
    <SellerScreen
      footer={
        mode === "manage" ? (
          submitted ? undefined : (
            <SellerButton disabled={missing > 0} label="Submit for review" onPress={() => dispatch({ type: "sellerSubmitVerification" })} size="lg" testID="seller-submit-review" variant="glass" />
          )
        ) : submitted ? (
          <SellerButton label="Continue" onPress={() => { dispatch({ step: 3, type: "sellerGoToStep" }); router.push("/seller-setup/store" as Href); }} size="lg" testID="seller-verify-continue" variant="glass" />
        ) : (
          <SellerButton disabled={missing > 0} label="Submit for review" onPress={() => dispatch({ type: "sellerSubmitVerification" })} size="lg" testID="seller-submit-review" variant="glass" />
        )
      }
      tabs={mode === "manage"}
      testID="seller-verify"
    >
      {mode === "manage" ? (
        <SellerTopBar title="Documents" />
      ) : (
        <View style={styles.top}>
          <StepBar step={2} />
          <Text style={styles.step}>Step 2 of 3</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Verify your account
          </Text>
          <Text style={styles.subtitle}>Buyers trust verified sellers</Text>
        </View>
      )}

      <View style={styles.list}>
        <Animated.View entering={FadeInDown.duration(360)}>
          <SellerCard style={styles.row} testID="verification-status">
            <View style={styles.rowText}>
              <Text style={styles.rowTitle}>Verification status</Text>
              <Text style={styles.rowHint}>
                {received} of {seller.documents.length} documents received
              </Text>
            </View>
            <Pill label={headline.label} tone={headline.tone} />
          </SellerCard>
        </Animated.View>
        {seller.documents.map((doc, index) => {
          const look = DOC_LABEL[doc.status];
          return (
            <Animated.View entering={FadeInDown.delay(80 * (index + 1)).duration(360)} key={doc.kind}>
              <SellerCard onPress={doc.status === "required" || doc.status === "rejected" ? () => void upload(doc) : undefined} style={styles.row} testID={`doc-${doc.kind}`}>
                <View style={styles.rowText}>
                  <Text style={styles.rowTitle}>{docTitles[doc.kind]}</Text>
                  <Text numberOfLines={1} style={styles.rowHint}>
                    {doc.status === "required" || doc.status === "rejected" ? docHints[doc.kind] : doc.kind === "student-card" ? "Eduvos · checked today" : doc.fileName ?? "Uploaded"}
                  </Text>
                </View>
                <Pill label={look.label} tone={look.tone} />
              </SellerCard>
            </Animated.View>
          );
        })}
      </View>

      <Animated.View entering={FadeInDown.delay(420).duration(380)}>
        <SellerCard style={styles.timeline} testID="review-timeline">
          <TimelineRow
            detail={seller.submittedAt ? `Today, ${timeOfDay(seller.submittedAt)}` : "Not yet"}
            done={submitted}
            title="Documents submitted"
          />
          <TimelineRow active={submitted && !approved} detail="Usually 1 to 2 days (a few seconds in this demo)" done={approved} title="Review by Vossie Operations" />
          <TimelineRow detail="You can start listing" done={approved} title="Seller approved" />
        </SellerCard>
      </Animated.View>
      <Confetti play={celebrate} />
    </SellerScreen>
  );
}

function TimelineRow({ active = false, detail, done, title }: { title: string; detail: string; done: boolean; active?: boolean }) {
  return (
    <View style={styles.tl}>
      <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]} />
      <View style={styles.tlText}>
        <Text style={[styles.tlTitle, !done && !active && styles.tlMuted]}>{title}</Text>
        <Text style={[styles.tlDetail, !done && !active && styles.tlMuted]}>{detail}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { backgroundColor: "#C5D0D5", borderRadius: 6, height: 12, marginTop: 5, width: 12 },
  dotActive: { backgroundColor: "#F2A14A" },
  dotDone: { backgroundColor: "#2F8A57" },
  list: { gap: 10, marginTop: 16 },
  row: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 64, paddingVertical: 12 },
  rowHint: { color: SELLER.inkSoft, fontSize: 13 },
  rowText: { flex: 1, gap: 1 },
  rowTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  step: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 8 },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 15 },
  timeline: { gap: 14, marginTop: 20 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 10 },
  tl: { flexDirection: "row", gap: 12 },
  tlDetail: { color: SELLER.inkSoft, fontSize: 13 },
  tlMuted: { opacity: 0.55 },
  tlText: { flex: 1, gap: 1 },
  tlTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  top: { paddingTop: 8 },
});
