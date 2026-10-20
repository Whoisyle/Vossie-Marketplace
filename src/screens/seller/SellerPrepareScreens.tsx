import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { Icon, useToast } from "@/components";
import { formatRand, initials } from "@/data/format";
import type { ParcelSize } from "@/seller/types";

import { SellerField } from "./fields";
import { useSeller } from "./hooks";
import { Confetti } from "./motion";
import { Check, Chips } from "./parts";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar } from "./ui";

const SIZES: { key: ParcelSize; label: string }[] = [
  { key: "small", label: "Small" },
  { key: "medium", label: "Medium" },
  { key: "large", label: "Large" },
];

function Missing({ back }: { back: string }) {
  const router = useRouter();
  return (
    <SellerScreen testID="seller-order-missing">
      <SellerTopBar title="Order" />
      <SellerCard style={styles.missing}>
        <Text style={styles.name}>That order is not here any more.</Text>
        <SellerButton label="Back to orders" onPress={() => router.replace(back as Href)} />
      </SellerCard>
    </SellerScreen>
  );
}

/** Prepare order: the pack list, how big the parcel is and a note for the courier, then Mark ready for pickup. */
export function SellerPrepareScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const view = useSeller();
  const order = view.seller.orders.find((item) => item.id === id);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [size, setSize] = useState<ParcelSize>("small");
  const [note, setNote] = useState("");
  if (!order) return <Missing back="/seller/orders" />;

  const items = [...order.lines.map((line) => ({ key: `${line.title}-${line.optionLabel ?? ""}`, label: `${line.title} × ${line.quantity}` })), { key: "label", label: "Add receipt and order label" }];
  const allPacked = items.every((item) => ticked[item.key]);
  const accepted = order.status !== "new";
  const packing = order.status === "preparing" || order.status === "ready" || Object.values(ticked).some(Boolean);
  const ready = order.status === "ready";

  const markReady = () => {
    view.dispatch({ id: order.id, note: note.trim(), size, type: "sellerSetParcel" });
    view.dispatch({ id: order.id, to: "ready", type: "sellerAdvanceOrder" });
    router.replace(`/seller/orders/handover/${order.id}` as Href);
  };

  return (
    <SellerScreen
      footer={<SellerButton disabled={!allPacked || ready || !view.canTrade} icon="check" label={ready ? "Ready for pickup" : "Mark ready for pickup"} onPress={markReady} size="lg" testID="mark-ready" variant="glass" />}
      testID="seller-prepare"
    >
      <SellerTopBar title="Prepare order" />
      <Text style={styles.sub}>
        {order.number} · {order.status === "new" ? "New" : "Accepted"}
      </Text>

      <SellerCard style={styles.steps} testID="prepare-steps">
        <Step done={accepted} label="Order accepted" />
        <Step active={packing && !ready} done={ready} label="Packing items" note={packing && !ready ? "In progress" : undefined} />
        <Step done={ready} label="Ready for pickup" note={ready ? "Courier is notified" : "Courier is notified"} />
      </SellerCard>

      <SellerHeading>Pack checklist</SellerHeading>
      <SellerCard style={styles.list}>
        {items.map((item) => (
          <Check checked={Boolean(ticked[item.key])} key={item.key} label={item.label} onChange={(value) => setTicked((current) => ({ ...current, [item.key]: value }))} testID={`pack-${item.key}`} />
        ))}
      </SellerCard>

      <SellerHeading>Parcel size</SellerHeading>
      <Chips items={SIZES} onChange={setSize} value={size} />

      <View style={styles.gap}>
        <SellerField icon="edit-2" label="Note for courier" onChangeText={setNote} placeholder="Collect at Res Block B, ring bell" testID="courier-note" value={note} />
      </View>
      <SellerCard style={styles.requested}>
        <Icon color={SELLER.solid} name="truck" size={18} />
        <Text style={styles.hint}>Courier requested · expected in 10 min</Text>
      </SellerCard>
    </SellerScreen>
  );
}

function Step({ active, done, label, note }: { label: string; note?: string; done?: boolean; active?: boolean }) {
  return (
    <View style={styles.step}>
      <View style={[styles.dot, done && styles.dotDone, active && styles.dotActive]}>{done ? <Icon color="#FFFFFF" name="check" size={13} /> : null}</View>
      <View>
        <Text style={[styles.stepLabel, !done && !active && styles.stepOff]}>{label}</Text>
        {note ? <Text style={styles.hint}>{note}</Text> : null}
      </View>
    </View>
  );
}

/** Handover: the four digits the courier must say, confirmed once the parcel is sealed and the label matches. */
export function SellerHandoverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const view = useSeller();
  const order = view.seller.orders.find((item) => item.id === id);
  const [sealed, setSealed] = useState(false);
  const [matches, setMatches] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  if (!order) return <Missing back="/seller/orders" />;

  const courier = order.courier;
  const done = order.status === "done";
  const confirm = () => {
    view.dispatch({ id: order.id, type: "sellerHandToCourier" });
    setCelebrate(true);
    toast.show(`${order.number} is on its way`);
    setTimeout(() => router.replace("/seller/orders" as Href), 1400);
  };

  return (
    <SellerScreen
      footer={<SellerButton disabled={!courier || !sealed || !matches || done} icon="check" label={done ? "Handed over" : "Confirm handover"} onPress={confirm} size="lg" testID="confirm-handover" variant="glass" />}
      testID="seller-handover"
    >
      <SellerTopBar title="Handover" />
      <Text style={styles.sub}>Give the parcel to the courier</Text>

      <SellerCard style={styles.courier} testID="courier-card">
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{courier ? initials(courier.name) : "…"}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={styles.name}>{courier ? courier.name : "Finding a courier"}</Text>
          <Text style={styles.hint}>{courier ? `${courier.vehicle} · ${courier.rating} rating` : "A Vossie courier will take this job shortly"}</Text>
        </View>
        <Pill label={done ? "Collected" : courier ? `Arriving ${courier.arrivesInMin} min` : "Waiting"} tone={done ? "success" : courier ? "warn" : "neutral"} />
      </SellerCard>

      <Animated.View entering={ZoomIn.duration(320)}>
        <SellerCard style={styles.codeCard} testID="handover-code-card">
          <Text style={styles.codeLabel}>HANDOVER CODE</Text>
          <View style={styles.digits}>
            {order.courierCode.split("").map((digit, index) => (
              <View key={index} style={styles.digit}>
                <Text style={styles.digitText}>{digit}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.codeNote}>The courier must say this code before collecting</Text>
        </SellerCard>
      </Animated.View>

      <SellerCard style={styles.scan}>
        <Icon color={SELLER.solid} name="maximize" size={22} />
        <View style={styles.flex}>
          <Text style={styles.name}>Or scan the courier code</Text>
          <Text style={styles.hint}>Scanning arrives with the courier app. For now, check the code.</Text>
        </View>
      </SellerCard>

      <Animated.View entering={FadeInDown.duration(300)} style={styles.checks}>
        <Check checked={sealed} label="Parcel sealed and labelled" onChange={setSealed} testID="check-sealed" />
        <Check checked={matches} label={`Order ${order.number} matches label`} onChange={setMatches} testID="check-matches" />
      </Animated.View>
      <Text style={styles.earn}>You earn {formatRand(order.subtotalCents - order.feeCents, { fixed: true })} when the courier collects.</Text>
      <Confetti coins play={celebrate} />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#5E8696", borderRadius: 22, height: 44, justifyContent: "center", width: 44 },
  avatarText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  checks: { gap: 4, marginTop: 14 },
  codeCard: { alignItems: "center", backgroundColor: SELLER.solid, gap: 12, marginTop: 14, paddingVertical: 20 },
  codeLabel: { color: "rgba(255,255,255,0.85)", fontSize: 12, fontWeight: "800", letterSpacing: 2 },
  codeNote: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center" },
  courier: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 14 },
  digit: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 14, height: 62, justifyContent: "center", width: 52 },
  digitText: { color: SELLER.solid, fontSize: 32, fontWeight: "800" },
  digits: { flexDirection: "row", gap: 10 },
  dot: { alignItems: "center", backgroundColor: "#C3CED3", borderRadius: 11, height: 22, justifyContent: "center", width: 22 },
  dotActive: { backgroundColor: SELLER.solid },
  dotDone: { backgroundColor: SELLER.solid },
  earn: { color: "#FFFFFF", fontSize: 13, marginTop: 12, textAlign: "center" },
  flex: { flex: 1, gap: 1 },
  gap: { marginTop: 14 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  list: { gap: 2 },
  missing: { alignItems: "flex-start", gap: 12, marginTop: 20 },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  requested: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 14 },
  scan: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 14 },
  step: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 40 },
  stepLabel: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  stepOff: { color: SELLER.inkSoft, fontWeight: "600" },
  steps: { gap: 4, marginTop: 14 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
});
