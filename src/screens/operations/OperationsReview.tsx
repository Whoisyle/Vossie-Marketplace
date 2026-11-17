import { Image } from "expo-image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Linking, Modal, Pressable, StyleSheet, View } from "react-native";

import { Icon } from "@/components";
import { getCampusName } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { reviewDesk } from "@/seller/reviewDesk";
import { docTitles } from "@/seller/state";
import type { DocKind } from "@/seller/types";
import * as staff from "@/services/staff";
import { backendEnabled } from "@/services/client";
import { useDemoStore } from "@/state/DemoStore";
import { color } from "@/theme/tokens";
import { Pill, SellerButton, SellerCard, Text } from "@/screens/seller/ui";

import { OperationsPage } from "./OperationsScreens";

/** What the reviewer ticks before accepting a document. Every box has to be ticked. */
const CHECKS: Record<DocKind, string[]> = {
  address: ["The whole page is shown and readable", "The name matches the seller", "It is dated in the last 3 months"],
  cipc: ["The company name matches the store", "The registration is active"],
  id: ["The photo is clear and every word is readable", "The name matches the seller", "The ID is valid and has not expired"],
  "student-card": ["It matches the Eduvos record"],
};

/** Reasons a seller can read when a document is turned down. */
const REASONS = ["The photo is blurry. Take it again in good light.", "The details do not match your account.", "The document has expired.", "That is the wrong document.", "Part of the document is cut off."];

const DB_TO_KIND: Record<string, DocKind> = { address: "address", cipc: "cipc", id: "id", student_card: "student-card" };

type ReviewItem = {
  id: string;
  kind: DocKind;
  sellerName: string;
  sellerKind: string;
  phone: string;
  campus: string;
  fileName: string;
  /** Where the front (or only) picture can be seen, and the back when there is one. */
  frontUrl: string | null;
  backUrl: string | null;
  isPdf: boolean;
  /** The student card matched to the Eduvos record has no file at all. */
  eduvosRecord: boolean;
  submitted: string;
};

const SELLER_KIND: Record<string, string> = { campus_business: "Campus business", registered: "Registered business", student: "Student seller" };

async function loadLive(): Promise<ReviewItem[]> {
  const rows = await staff.listDocumentsInReview();
  return Promise.all(
    rows.map(async (row) => {
      const [frontUrl, backUrl] = await Promise.all([staff.signedDocumentUrl(row.storage_path).catch(() => null), staff.signedDocumentUrl(row.back_storage_path).catch(() => null)]);
      return {
        backUrl,
        campus: row.sellers ? getCampusName(row.sellers.campus_id as CampusId) : "",
        eduvosRecord: row.storage_path === "eduvos-record",
        fileName: row.file_name ?? "",
        frontUrl,
        id: row.id,
        isPdf: /\.pdf$/i.test(row.file_name ?? ""),
        kind: DB_TO_KIND[row.kind] ?? "id",
        phone: row.sellers?.contact_phone ?? "",
        sellerKind: SELLER_KIND[row.sellers?.kind ?? ""] ?? "Seller",
        sellerName: row.sellers?.display_name ?? "A seller",
        submitted: row.updated_at,
      } satisfies ReviewItem;
    }),
  );
}

function when(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("en-ZA", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" });
}

/**
 * Seller documents waiting for a person at Vossie Operations. Each shows who sent it, the pictures (front and back of an ID)
 * to look at full size, a checklist that has to be ticked all the way down, and Accept or Turn down with a reason the seller
 * will read. With the live backend this reads the private documents with short-lived links and calls the review function;
 * in the demo it reviews the demo seller's own documents.
 */
export function OperationsReviewScreen() {
  const { dispatch, state } = useDemoStore();
  const [live, setLive] = useState<ReviewItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);

  // bumping `round` reads the queue again
  const [round, setRound] = useState(0);
  const reload = useCallback(() => setRound((value) => value + 1), []);
  useEffect(() => {
    if (!backendEnabled) return;
    let alive = true;
    loadLive()
      .then((items) => {
        if (!alive) return;
        setLive(items);
        setError(null);
      })
      .catch(() => {
        if (!alive) return;
        setError("Could not load the documents. You need to be signed in as staff.");
        setLive([]);
      });
    return () => {
      alive = false;
    };
  }, [round]);
  useEffect(() => {
    reviewDesk.enter();
    return () => reviewDesk.leave();
  }, []);

  const seller = state.seller;
  const demo = useMemo<ReviewItem[]>(
    () =>
      backendEnabled
        ? []
        : seller.documents
            .filter((doc) => doc.status === "in-review")
            .map((doc) => ({
              backUrl: doc.backUri ?? null,
              campus: seller.profile.campusId ? getCampusName(seller.profile.campusId) : "",
              eduvosRecord: doc.kind === "student-card" && !doc.uri,
              fileName: doc.fileName ?? "",
              frontUrl: doc.uri ?? null,
              id: doc.kind,
              isPdf: doc.fileKind === "pdf",
              kind: doc.kind,
              phone: seller.profile.phone,
              sellerKind: seller.profile.kind === "student" ? "Student seller" : seller.profile.kind === "campus-business" ? "Campus business" : "Registered business",
              sellerName: seller.profile.storeName || "A seller",
              submitted: doc.uploadedAt ?? "",
            })),
    [seller],
  );
  const items = (backendEnabled ? (live ?? []) : demo).filter((item) => !done.includes(item.id));

  const decide = async (item: ReviewItem, decision: "verified" | "rejected", note?: string) => {
    if (backendEnabled) {
      try {
        await staff.reviewSellerDocument(item.id, decision, note);
        setDone((list) => [...list, item.id]);
        reload();
      } catch {
        setError("That could not be saved. Someone else may have reviewed it already.");
        reload();
      }
      return;
    }
    dispatch({ decision, kind: item.kind, note, type: "sellerStaffReview" });
  };

  return (
    <OperationsPage subtitle="Documents sellers have sent in, waiting for a person" testID="operations-review" title="Review documents" tone="white">
      {error ? (
        <Text accessibilityLiveRegion="polite" style={styles.error}>
          {error}
        </Text>
      ) : null}
      {!backendEnabled ? <Text style={styles.note}>Demo: this shows the demo seller&apos;s documents. With the live backend it shows every seller waiting for review.</Text> : null}
      {items.length === 0 ? (
        <SellerCard testID="review-empty">
          <View style={styles.empty}>
            <Icon color={color.slate} name="check-circle" size={34} />
            <Text style={styles.title}>Nothing is waiting</Text>
            <Text style={styles.caption}>New documents show up here the moment a seller sends them in.</Text>
          </View>
        </SellerCard>
      ) : (
        items.map((item) => <ReviewCard item={item} key={item.id} onDecide={(decision, note) => void decide(item, decision, note)} onZoom={setZoom} />)
      )}
      <Modal animationType="fade" onRequestClose={() => setZoom(null)} transparent visible={zoom !== null}>
        <Pressable accessibilityLabel="Close the picture" accessibilityRole="button" onPress={() => setZoom(null)} style={styles.zoom} testID="review-zoom">
          {zoom ? <Image contentFit="contain" source={{ uri: zoom }} style={StyleSheet.absoluteFill} /> : null}
        </Pressable>
      </Modal>
    </OperationsPage>
  );
}

function ReviewCard({ item, onDecide, onZoom }: { item: ReviewItem; onDecide: (decision: "verified" | "rejected", note?: string) => void; onZoom: (url: string) => void }) {
  const checks = CHECKS[item.kind];
  const [ticked, setTicked] = useState<number[]>([]);
  const [rejecting, setRejecting] = useState(false);
  const missingBack = item.kind === "id" && !item.backUrl && !item.eduvosRecord;
  const ready = ticked.length === checks.length;
  return (
    <SellerCard testID={`review-${item.kind}`}>
      <View style={styles.row}>
        <Text style={styles.title}>{docTitles[item.kind]}</Text>
        <Pill label="In review" tone="warn" />
      </View>
      <Text style={styles.caption}>
        {item.sellerName} · {item.sellerKind}
        {item.campus ? ` · ${item.campus}` : ""}
      </Text>
      <Text style={styles.caption}>
        {item.phone ? `${item.phone} · ` : ""}
        {item.submitted ? `Sent ${when(item.submitted)}` : ""}
      </Text>

      {item.eduvosRecord ? (
        <View style={styles.record}>
          <Icon color={color.slate} name="shield" size={18} />
          <Text style={styles.caption}>Matched to the Eduvos record. There is no picture to look at.</Text>
        </View>
      ) : (
        <View style={styles.shots}>
          <Shot label={item.kind === "id" ? "Front" : "Document"} onZoom={onZoom} pdf={item.isPdf} url={item.frontUrl} name={item.fileName} />
          {item.kind === "id" ? <Shot label="Back" onZoom={onZoom} pdf={false} url={item.backUrl} name="" /> : null}
        </View>
      )}
      {missingBack ? (
        <View style={styles.warn} testID="review-no-back">
          <Icon color="#8A5A0B" name="alert-triangle" size={16} />
          <Text style={styles.warnText}>No back of the ID was sent. Turn it down and ask for the back, or accept only if the front is enough.</Text>
        </View>
      ) : null}

      <View style={styles.checks}>
        {checks.map((label, index) => {
          const on = ticked.includes(index);
          return (
            <Pressable accessibilityLabel={label} accessibilityRole="checkbox" accessibilityState={{ checked: on }} key={label} onPress={() => setTicked((list) => (on ? list.filter((value) => value !== index) : [...list, index]))} style={styles.check} testID={`check-${item.kind}-${index}`}>
              <View style={[styles.box, on && styles.boxOn]}>{on ? <Icon color="#FFFFFF" name="check" size={14} /> : null}</View>
              <Text style={styles.checkText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {rejecting ? (
        <View style={styles.reasons} testID="review-reasons">
          <Text style={styles.caption}>Pick the reason the seller will read:</Text>
          {REASONS.map((reason) => (
            <Pressable accessibilityRole="button" key={reason} onPress={() => onDecide("rejected", reason)} style={styles.reason}>
              <Text style={styles.reasonText}>{reason}</Text>
            </Pressable>
          ))}
          <SellerButton label="Back" onPress={() => setRejecting(false)} size="sm" variant="outline" />
        </View>
      ) : (
        <View style={styles.actions}>
          <SellerButton disabled={!ready} icon="check" label="Accept" onPress={() => onDecide("verified")} size="md" testID={`accept-${item.kind}`} />
          <SellerButton icon="x" label="Turn down" onPress={() => setRejecting(true)} size="md" testID={`reject-${item.kind}`} variant="outline" />
        </View>
      )}
    </SellerCard>
  );
}

function Shot({ label, name, onZoom, pdf, url }: { label: string; url: string | null; pdf: boolean; name: string; onZoom: (url: string) => void }) {
  return (
    <View style={styles.shot}>
      <Text style={styles.shotLabel}>{label}</Text>
      {url && !pdf ? (
        <Pressable accessibilityLabel={`Look at the ${label.toLowerCase()} full size`} accessibilityRole="button" onPress={() => onZoom(url)} style={styles.thumb} testID={`shot-${label.toLowerCase()}`}>
          <Image contentFit="cover" source={{ uri: url }} style={StyleSheet.absoluteFill} />
        </Pressable>
      ) : url && pdf ? (
        <Pressable accessibilityRole="button" onPress={() => void Linking.openURL(url)} style={[styles.thumb, styles.empty, styles.missing]}>
          <Icon color={color.slate} name="file-text" size={26} />
          <Text style={styles.caption}>{name || "Open the PDF"}</Text>
        </Pressable>
      ) : (
        <View style={[styles.thumb, styles.empty, styles.missing]}>
          <Icon color={color.steelGrey} name="image" size={24} />
          <Text style={styles.caption}>Not sent</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginTop: 14 },
  box: { alignItems: "center", borderColor: color.steelGrey, borderRadius: 6, borderWidth: 2, height: 22, justifyContent: "center", width: 22 },
  boxOn: { backgroundColor: color.slate, borderColor: color.slate },
  caption: { color: "#5F6E76", fontSize: 13 },
  check: { alignItems: "center", flexDirection: "row", gap: 10, minHeight: 36 },
  checkText: { color: "#1E2B33", flex: 1, fontSize: 14 },
  checks: { gap: 2, marginTop: 12 },
  empty: { alignItems: "center", gap: 6, justifyContent: "center", padding: 10 },
  error: { color: color.danger, fontSize: 14, fontWeight: "600" },
  missing: { backgroundColor: color.cloudGrey },
  note: { color: "#5F6E76", fontSize: 13 },
  reason: { backgroundColor: color.sage, borderRadius: 14, padding: 12 },
  reasonText: { color: "#1E2B33", fontSize: 14, fontWeight: "600" },
  reasons: { gap: 8, marginTop: 14 },
  record: { alignItems: "center", backgroundColor: color.sage, borderRadius: 14, flexDirection: "row", gap: 8, marginTop: 12, padding: 12 },
  row: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  shot: { flex: 1, gap: 6 },
  shotLabel: { color: "#1E2B33", fontSize: 13, fontWeight: "700" },
  shots: { flexDirection: "row", gap: 10, marginTop: 12 },
  thumb: { aspectRatio: 1.4, backgroundColor: "#0B1A1F", borderRadius: 12, overflow: "hidden" },
  title: { color: "#1E2B33", fontSize: 17, fontWeight: "800" },
  warn: { alignItems: "center", backgroundColor: "#FFF4DE", borderRadius: 12, flexDirection: "row", gap: 8, marginTop: 10, padding: 10 },
  warnText: { color: "#8A5A0B", flex: 1, fontSize: 13, fontWeight: "600" },
  zoom: { backgroundColor: "rgba(0,0,0,0.94)", flex: 1 },
});
