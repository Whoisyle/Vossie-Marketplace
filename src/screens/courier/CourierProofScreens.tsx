import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Icon, useToast, type IconName } from "@/components";
import { liveBackend } from "@/backend/mode";
import { rand } from "@/courier/pay";
import { DEMO_WAIT_MS, MAX_ATTEMPTS, WAIT_MS, waitedLongEnough } from "@/courier/state";
import type { FailReason, ProofKind } from "@/courier/types";
import { haptic } from "@/lib/haptics";
import { AttachSheet } from "@/screens/seller/attach";

import { mmss, useCourier, useJob, useNow } from "./hooks";
import { CodeBoxes, SignaturePad } from "./Proof";
import { Button, Card, Chips, CourierPage, COURIER, Empty, Pill, type, useHideTabBar } from "./ui";

const WAIT = liveBackend ? WAIT_MS : DEMO_WAIT_MS;

const PROOFS: { key: ProofKind; icon: IconName; title: string; sub: string }[] = [
  { icon: "lock", key: "otp", sub: "Recommended, faster", title: "Buyer code" },
  { icon: "edit-3", key: "signature", sub: "Buyer signs on your screen", title: "Signature" },
  { icon: "camera", key: "photo", sub: "Only if buyer allows leave-at-door", title: "Photo at door" },
];

/** Confirm delivery: the buyer reads out a code, or signs, or the parcel is left and photographed if they allowed it. */
export function CourierConfirmScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch } = useCourier();
  const job = useJob(id);
  const [proof, setProof] = useState<ProofKind>("otp");
  const [code, setCode] = useState("");
  const [signed, setSigned] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [note, setNote] = useState("");
  useHideTabBar(true);

  if (!job || job.status !== "arrived") {
    return (
      <CourierPage back bar={false} testID="courier-confirm" title="Confirm delivery">
        <Empty detail={job && job.status === "delivered" ? "This delivery is already done." : "Confirm the delivery once you have arrived at the buyer."} icon="map-pin" title="Not at the door yet" />
        {job ? <Button label="Back to the delivery" onPress={() => router.replace(`/courier/active/${job.id}` as Href)} tone="outline" /> : null}
      </CourierPage>
    );
  }
  const full = code.length === 4;
  const match = full && code === job.deliveryCode;
  const ready = proof === "otp" ? match : proof === "signature" ? signed : job.leaveAtDoor && photo !== null;

  const confirm = () => {
    haptic.success();
    dispatch({ code, id: job.id, note, photoUri: photo ?? undefined, proof, signatureDone: signed, type: "courierConfirmDelivery" });
    toast.show(`Delivered. ${rand(job.payoutCents)} added to your earnings.`);
    router.replace(`/courier/active/detail/${job.id}` as Href);
  };

  return (
    <CourierPage
      back
      bar={false}
      footer={
        <View style={styles.footerCol}>
          <Button disabled={!ready} icon="check" label="Confirm delivery" onPress={confirm} testID="confirm-delivery" />
          <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push(`/courier/active/failed/${job.id}` as Href)} testID="cant-deliver">
            <Text style={styles.link}>Can&apos;t deliver? Report a problem</Text>
          </Pressable>
        </View>
      }
      subtitle={`${job.number} · ${job.dropoff.detail}`}
      testID="courier-confirm"
      title="Confirm delivery"
    >
      <Card style={styles.codeCard} tone="soft">
        <Text style={styles.codeTitle}>Ask the buyer for the delivery code</Text>
        <CodeBoxes onChange={(next) => { setCode(next); setProof("otp"); }} state={proof === "otp" && full ? (match ? "ok" : "bad") : "idle"} testID="delivery-code" value={code} />
        {proof === "otp" && full && !match ? <Text style={styles.error}>That is not the buyer&apos;s code. Ask them to open their order in the Vossie app.</Text> : null}
        <Text style={[type.caption, styles.center]}>The code was sent to {job.buyerName} in the Vossie app</Text>
        {job.demoCodes ? <Text style={[type.caption, styles.center]}>Demo job: the buyer&apos;s code is {job.deliveryCode}.</Text> : null}
      </Card>

      <Text style={styles.section}>Other proof options</Text>
      {PROOFS.map((item) => {
        const locked = item.key === "photo" && !job.leaveAtDoor;
        const on = proof === item.key;
        return (
          <Card key={item.key} onPress={locked ? undefined : () => setProof(item.key)} style={[styles.proof, locked && styles.locked]} testID={`proof-${item.key}`} tone={on ? "selected" : "plain"}>
            <View style={styles.proofIcon}>
              <Icon color={COURIER.solid} name={item.icon} size={20} />
            </View>
            <View style={styles.flex}>
              <Text style={type.card}>{item.title}</Text>
              <Text style={type.caption}>{locked ? "The buyer has not allowed leave-at-door" : item.sub}</Text>
            </View>
            <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
          </Card>
        );
      })}
      {proof === "signature" ? <SignaturePad onChange={setSigned} /> : null}
      {proof === "photo" ? (
        <Pressable accessibilityRole="button" onPress={() => setPhotoOpen(true)} style={styles.photo} testID="door-photo">
          {photo ? <Image source={{ uri: photo }} style={styles.photoThumb} /> : <Icon color={COURIER.solid} name="camera" size={22} />}
          <Text style={type.card}>{photo ? "Photo added. Tap to retake" : "Photograph the parcel at the door"}</Text>
        </Pressable>
      ) : null}

      <Text style={styles.section}>Delivery note (optional)</Text>
      <View style={styles.noteBox}>
        <TextInput accessibilityLabel="Delivery note" onChangeText={setNote} placeholder="Handed over at room 214" placeholderTextColor={COURIER.muted} style={styles.noteInput} testID="delivery-note" value={note} />
      </View>
      <AttachSheet onClose={() => setPhotoOpen(false)} onPicked={(file) => { setPhoto(file.uri); setPhotoOpen(false); }} sources={["camera"]} title="Photo at the door" visible={photoOpen} />
    </CourierPage>
  );
}

const REASONS: { key: FailReason; label: string }[] = [
  { key: "unreachable", label: "Buyer unreachable" },
  { key: "address", label: "Wrong or incomplete address" },
  { key: "refused", label: "Buyer refused the parcel" },
  { key: "unsafe", label: "Unsafe drop-off location" },
];

/** Delivery failed: what went wrong, a photo as proof, and the way the parcel goes back to the seller. */
export function CourierFailedScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch } = useCourier();
  const job = useJob(id);
  const now = useNow(1000);
  const [reason, setReason] = useState<FailReason>("unreachable");
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  useHideTabBar(true);

  if (!job || job.status !== "arrived") {
    return (
      <CourierPage back bar={false} testID="courier-failed" title="Delivery failed">
        <Empty detail="You can report a problem once you have arrived at the buyer." icon="alert-circle" title="Not at the door" />
      </CourierPage>
    );
  }
  const attempt = job.attempts.length + 1;
  const last = attempt >= MAX_ATTEMPTS;
  const left = job.waitingSince ? new Date(job.waitingSince).getTime() + WAIT - now : WAIT;
  const waited = waitedLongEnough(job, now, WAIT);
  const blocked = reason === "unreachable" && !waited;

  const submit = () => {
    dispatch({ id: job.id, photoUri: photo ?? undefined, reason, type: "courierFailAttempt" });
    toast.show(last ? "Reported. Take the parcel back to the seller." : "Reported. You can try once more.");
    router.replace(`/courier/active/${job.id}` as Href);
  };

  return (
    <CourierPage
      back
      bar={false}
      footer={<Button disabled={blocked} icon="repeat" label={last ? "Submit & return to seller" : "Submit report"} onPress={submit} testID="submit-failed" />}
      subtitle={`${job.number} · Attempt ${attempt} of ${MAX_ATTEMPTS}`}
      testID="courier-failed"
      title="Delivery failed"
    >
      {reason === "unreachable" ? (
        <Card style={styles.banner} tone="warn" testID="wait-banner">
          <Icon color={COURIER.amber} name="alert-triangle" size={16} />
          <Text style={styles.bannerText}>{waited ? `Buyer unreachable for ${Math.round(WAIT / 60_000) >= 1 ? "10 minutes" : "a while"}` : `Wait at the door ${mmss(left)} more${liveBackend ? "" : " (demo: shortened from 10 minutes)"}`}</Text>
        </Card>
      ) : null}
      <Text style={styles.section}>What went wrong?</Text>
      {REASONS.map((item) => {
        const on = reason === item.key;
        return (
          <Card key={item.key} onPress={() => setReason(item.key)} style={styles.reason} testID={`reason-${item.key}`} tone={on ? "selected" : "plain"}>
            <Text style={[type.card, styles.flex]}>{item.label}</Text>
            <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View>
          </Card>
        );
      })}
      <Pressable accessibilityRole="button" onPress={() => setPhotoOpen(true)} style={styles.photo} testID="attempt-photo">
        {photo ? <Image source={{ uri: photo }} style={styles.photoThumb} /> : <Icon color={COURIER.solid} name="camera" size={22} />}
        <Text style={type.card}>{photo ? "Photo added. Tap to retake" : "Add a photo as proof of attempt"}</Text>
      </Pressable>
      <Card style={styles.route} tone="soft">
        <Text style={type.card}>{last ? "Return route" : "What happens next"}</Text>
        {last ? (
          <>
            <View style={styles.routeRow}>
              <View style={styles.dotDone} />
              <View>
                <Text style={type.card}>Your location</Text>
                <Text style={type.caption}>Now</Text>
              </View>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.dotNext} />
              <View>
                <Text style={type.card}>{job.storeName}</Text>
                <Text style={type.caption}>Return parcel · {job.distanceKm.toFixed(1)} km</Text>
              </View>
            </View>
            <Text style={type.caption}>The buyer is refunded the items; the delivery fee is kept and your trip is paid.</Text>
          </>
        ) : (
          <Text style={type.caption}>The buyer is told. You can try once more: arrive again to start a new wait. After the second failed try the parcel goes back to the seller.</Text>
        )}
      </Card>
      <AttachSheet onClose={() => setPhotoOpen(false)} onPicked={(file) => { setPhoto(file.uri); setPhotoOpen(false); }} sources={["camera", "library"]} title="Photo of the attempt" visible={photoOpen} />
    </CourierPage>
  );
}

/** A short conversation about the delivery, with the buyer or with the seller at pickup. Each is the same thread the other person sees. */
export function CourierChatScreen() {
  const { id, with: who } = useLocalSearchParams<{ id: string; with?: string }>();
  const { dispatch, state } = useCourier();
  const job = useJob(id);
  const [to, setTo] = useState<"buyer" | "seller">(who === "seller" ? "seller" : "buyer");
  const [draft, setDraft] = useState("");
  useHideTabBar(true);
  const threadId = to === "buyer" ? (job?.buyerOrderId ? `courier-${job.buyerOrderId}` : undefined) : job?.sellerOrderId ? `courier-seller-${job.sellerOrderId}` : undefined;
  const thread = threadId ? state.conversations.find((item) => item.id === threadId) : undefined;
  const real = Boolean(threadId);
  const name = to === "buyer" ? job?.buyerName : job?.storeName;
  const send = () => {
    if (!job || !draft.trim()) return;
    dispatch({ body: draft, id: job.id, to, type: "courierSendMessage" });
    setDraft("");
  };
  return (
    <CourierPage back bar={false} scroll={false} subtitle={job ? `About ${job.number}` : undefined} testID="courier-chat" title={name ?? "Chat"}>
      {!job ? (
        <Empty detail="This delivery is no longer on your list." icon="alert-circle" title="Not found" />
      ) : (
        <>
          <Chips
            chips={[
              { key: "buyer", label: "Buyer" },
              { key: "seller", label: "Seller" },
            ]}
            onChange={setTo}
            value={to}
          />
          {!real ? (
            <Empty detail={`This is a demo job, so there is no ${to === "buyer" ? "student" : "seller"} to message. On a real delivery the thread opens here.`} icon="message-circle" title="Demo job" />
          ) : (
            <>
              <ScrollView contentContainerStyle={styles.thread} showsVerticalScrollIndicator={false}>
                {(thread?.messages ?? []).length === 0 ? <Text style={[type.caption, styles.center]}>{to === "buyer" ? "Say hello. Ask for the gate code or tell them you are close." : "Ask about the order, or tell them when you will be there."}</Text> : null}
                {(thread?.messages ?? []).map((message) => (
                  <View key={message.id} style={[styles.bubble, message.fromMe ? styles.theirs : styles.mine]}>
                    <Text style={[type.body, !message.fromMe && { color: "#FFFFFF" }]}>{message.body}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={styles.composer}>
                <TextInput accessibilityLabel="Message" onChangeText={setDraft} onSubmitEditing={send} placeholder={`Write to the ${to}`} placeholderTextColor={COURIER.muted} returnKeyType="send" style={styles.composerInput} testID="chat-input" value={draft} />
                <Button disabled={!draft.trim()} label="Send" onPress={send} size="md" testID="chat-send" />
              </View>
            </>
          )}
        </>
      )}
    </CourierPage>
  );
}

export { Pill };

const styles = StyleSheet.create({
  banner: { alignItems: "center", flexDirection: "row", gap: 8 },
  bannerText: { color: COURIER.amber, flex: 1, fontSize: 13, fontWeight: "700" },
  bubble: { borderRadius: 16, marginBottom: 8, maxWidth: "80%", padding: 10 },
  center: { textAlign: "center" },
  codeCard: { gap: 12 },
  codeTitle: { color: COURIER.ink, fontSize: 14, fontWeight: "700", textAlign: "center" },
  composer: { alignItems: "center", flexDirection: "row", gap: 8, paddingTop: 8 },
  composerInput: { backgroundColor: COURIER.card, borderRadius: 24, color: COURIER.ink, flex: 1, fontSize: 15, minHeight: 48, paddingHorizontal: 16 },
  dotDone: { backgroundColor: "#FFFFFF", borderColor: COURIER.solid, borderRadius: 7, borderWidth: 3, height: 14, width: 14 },
  dotNext: { backgroundColor: COURIER.solid, borderRadius: 7, height: 14, width: 14 },
  error: { color: COURIER.red, fontSize: 12, textAlign: "center" },
  flex: { flex: 1 },
  footerCol: { gap: 8 },
  link: { color: COURIER.solid, fontSize: 13, fontWeight: "700", textAlign: "center" },
  locked: { opacity: 0.5 },
  mine: { alignSelf: "flex-end", backgroundColor: COURIER.solid },
  noteBox: { backgroundColor: COURIER.card, borderRadius: 18, minHeight: 52, paddingHorizontal: 14 },
  noteInput: { color: COURIER.ink, fontSize: 15, paddingVertical: 14 },
  photo: { alignItems: "center", borderColor: COURIER.solid, borderRadius: 18, borderStyle: "dashed", borderWidth: 1.5, flexDirection: "row", gap: 12, marginTop: 14, padding: 14 },
  photoThumb: { borderRadius: 10, height: 44, width: 44 },
  proof: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
  proofIcon: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, height: 44, justifyContent: "center", width: 44 },
  radio: { alignItems: "center", borderColor: COURIER.solid, borderRadius: 12, borderWidth: 2, height: 24, justifyContent: "center", width: 24 },
  radioDot: { backgroundColor: COURIER.solid, borderRadius: 6, height: 12, width: 12 },
  radioOn: { backgroundColor: "#FFFFFF" },
  reason: { alignItems: "center", flexDirection: "row", gap: 12, marginBottom: 10 },
  route: { gap: 10, marginTop: 14 },
  routeRow: { alignItems: "center", flexDirection: "row", gap: 12 },
  section: { color: COURIER.ink, fontSize: 15, fontWeight: "700", marginBottom: 8, marginTop: 16 },
  theirs: { alignSelf: "flex-start", backgroundColor: COURIER.card },
  thread: { paddingBottom: 12 },
});
