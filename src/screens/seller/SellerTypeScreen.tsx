import { useRouter, type Href } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

import { Icon, type IconName } from "@/components";
import { getCampusName } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { CampusPicker } from "@/screens/profile/CampusPicker";
import { color } from "@/theme/tokens";
import { haptic } from "@/lib/haptics";
import { useDemoStore } from "@/state/DemoStore";

import { useSellerDispatch } from "./actions";
import { spring } from "@/theme/motion";
import { isValidSouthAfricanPhone } from "@/screens/profile/phone";

import type { SellerKind } from "@/seller/types";

import { SellerField } from "./fields";
import { SetupHeader, StorePreview } from "./SetupParts";
import { SELLER, SellerButton, SellerCard, SellerScreen, Text } from "./ui";

export const KINDS: { kind: SellerKind; title: string; hint: string; icon: IconName }[] = [
  { hint: "Items from your room or dorm", icon: "user", kind: "student", title: "Student seller" },
  { hint: "Food, services or a side hustle", icon: "shopping-bag", kind: "campus-business", title: "Campus business" },
];

/** Step 1 of 3: what kind of seller you are, the name of your store and a number buyers can reach. */
export function SellerTypeScreen() {
  const router = useRouter();
  const { state } = useDemoStore();
  const dispatch = useSellerDispatch();
  const [kind, setKind] = useState<SellerKind | null>(state.seller.profile.kind);
  const [storeName, setStoreName] = useState(state.seller.profile.storeName);
  const [phone, setPhone] = useState(state.seller.profile.phone || state.profile?.phone || "");
  const [campusId, setCampusId] = useState<CampusId | null>(state.seller.profile.campusId ?? state.profile?.campusId ?? null);
  const [campusOpen, setCampusOpen] = useState(false);
  const [errors, setErrors] = useState<{ campus?: string; kind?: string; name?: string; phone?: string }>({});

  const next = () => {
    const found: typeof errors = {};
    if (!kind) found.kind = "Choose what kind of seller you are.";
    if (storeName.trim().length < 2) found.name = "Give your store a name.";
    if (!campusId) found.campus = "Choose the campus you sell on.";
    if (!isValidSouthAfricanPhone(phone)) found.phone = "Enter a South African mobile number, like 082 573 5164.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    dispatch({ kind: kind!, type: "sellerSetKind" });
    dispatch({ campusId: campusId!, phone, storeName, type: "sellerSetBasics" });
    dispatch({ step: 2, type: "sellerGoToStep" });
    router.push("/seller-setup/verify" as Href);
  };

  return (
    <SellerScreen deep footer={<SellerButton label="Continue" onPress={next} size="lg" testID="seller-type-continue" variant="light" />} tabs={false} testID="seller-type">
      <SetupHeader art={0} step={1} subtitle="Sell to students on campus" title="Become a seller" />

      <Text style={styles.question}>What kind of seller are you?</Text>
      <View style={styles.kinds}>
        {KINDS.map((item, index) => (
          <Animated.View entering={FadeInDown.delay(index * 90).duration(380)} key={item.kind}>
            <KindCard onPress={() => setKind(item.kind)} option={item} selected={kind === item.kind} />
          </Animated.View>
        ))}
        {errors.kind ? <Text style={styles.error}>{errors.kind}</Text> : null}
      </View>

      <View style={styles.fields}>
        <SellerField error={errors.name} icon="shopping-bag" label="Store name" onChangeText={setStoreName} placeholder="CampusBites" testID="seller-store-name" value={storeName} />
        <SellerField error={errors.phone} icon="phone" keyboardType="phone-pad" label="Contact number" onChangeText={setPhone} placeholder="082 573 5164" testID="seller-phone" value={phone} />
      </View>

      <Text style={styles.question}>Which campus do you sell on?</Text>
      <SellerCard onPress={() => setCampusOpen(true)} style={styles.campusCard} testID="seller-campus">
        <View style={styles.kindIcon}>
          <Icon color={SELLER.solid} name="map-pin" size={22} />
        </View>
        <View style={styles.kindText}>
          <Text style={styles.kindTitle}>{campusId ? getCampusName(campusId) : "Choose your campus"}</Text>
          <Text style={styles.kindHint}>Buyers on this campus see your store first</Text>
        </View>
        <Icon color={SELLER.inkSoft} name="chevron-right" size={20} />
      </SellerCard>
      {errors.campus ? <Text style={styles.error}>{errors.campus}</Text> : null}

      <StorePreview campusId={campusId ?? undefined} kind={kind} name={storeName} />
      <CampusPicker
        onClose={() => setCampusOpen(false)}
        onSelect={(next) => {
          setCampusId(next);
          setCampusOpen(false);
        }}
        selected={campusId}
        visible={campusOpen}
      />
    </SellerScreen>
  );
}

function KindCard({ onPress, option, selected }: { option: (typeof KINDS)[number]; selected: boolean; onPress: () => void }) {
  const lift = useSharedValue(selected ? 1 : 0);
  // the chosen card rises slightly and its tick pops in
  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + lift.get() * 0.015 }] }));
  useEffect(() => {
    lift.set(withSpring(selected ? 1 : 0, spring.soft));
  }, [lift, selected]);
  return (
    <Animated.View style={style}>
      <SellerCard
        onPress={() => {
          haptic.select();
          onPress();
        }}
        style={[styles.kind, selected && styles.kindOn]}
        testID={`kind-${option.kind}`}
      >
        <View style={[styles.kindIcon, selected && styles.kindIconOn]}>
          <Icon color={selected ? "#FFFFFF" : SELLER.solid} name={option.icon} size={22} />
        </View>
        <View style={styles.kindText}>
          <Text style={styles.kindTitle}>{option.title}</Text>
          <Text style={styles.kindHint}>{option.hint}</Text>
        </View>
        {selected ? (
          <Animated.View entering={FadeInDown.duration(200)}>
            <Icon color={SELLER.solid} name="check-circle" size={22} />
          </Animated.View>
        ) : null}
      </SellerCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  campusCard: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 66, padding: 12 },
  question: { color: "#FFFFFF", fontSize: 17, fontWeight: "800", marginTop: 22 },
  error: { color: "#FFD8D2", fontSize: 13, fontWeight: "600" },
  fields: { gap: 14, marginTop: 22 },
  kind: { alignItems: "center", flexDirection: "row", gap: 12, minHeight: 66, padding: 12 },
  kindHint: { color: SELLER.inkSoft, fontSize: 13 },
  kindIcon: { alignItems: "center", backgroundColor: "#E3ECEF", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  kindIconOn: { backgroundColor: color.slate },
  kindOn: { backgroundColor: color.sage, borderColor: color.slate, borderWidth: 2 },
  kindText: { flex: 1, gap: 1 },
  kindTitle: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  kinds: { gap: 10, marginTop: 16 },
  step: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 8 },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 15 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 10 },
  top: { paddingTop: 8 },
});
