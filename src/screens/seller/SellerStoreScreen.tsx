import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { initials } from "@/data/format";
import { haptic } from "@/lib/haptics";
import { DAY_KEYS, DAY_LABELS, type DayKey } from "@/seller/types";
import { useDemoStore } from "@/state/DemoStore";

import { SellerField, usePickImage } from "./fields";
import { StepBar } from "./motion";
import { SELLER, SellerButton, SellerScreen, SellerTopBar } from "./ui";

/** "08:00" style times only. */
export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/** Step 3 of 3: how buyers will see the store: logo, name, what it sells, where to collect and which days it is open. */
export function SellerStoreScreen({ mode = "setup" }: { mode?: "setup" | "manage" }) {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const pick = usePickImage();
  const saved = state.seller.profile;
  const [logo, setLogo] = useState(saved.logoUri);
  const [name, setName] = useState(saved.storeName);
  const [description, setDescription] = useState(saved.description);
  const [location, setLocation] = useState(saved.location);
  const [days, setDays] = useState<DayKey[]>(saved.days);
  const [opens, setOpens] = useState(saved.opens);
  const [closes, setCloses] = useState(saved.closes);
  const [errors, setErrors] = useState<{ name?: string; location?: string; days?: string; hours?: string }>({});

  const toggle = (day: DayKey) => {
    haptic.select();
    setDays((current) => (current.includes(day) ? current.filter((item) => item !== day) : DAY_KEYS.filter((key) => key === day || current.includes(key))));
  };

  const save = () => {
    const found: typeof errors = {};
    if (name.trim().length < 2) found.name = "Give your store a name.";
    if (location.trim().length < 3) found.location = "Say where buyers collect from.";
    if (days.length === 0) found.days = "Pick at least one day you are open.";
    if (!isTime(opens) || !isTime(closes) || opens >= closes) found.hours = "Use times like 08:00 and 17:00, with the opening time first.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    dispatch({ patch: { closes: closes.trim(), days, description: description.trim(), location: location.trim(), logoUri: logo, opens: opens.trim(), storeName: name.trim() }, type: "sellerSaveStore" });
    haptic.success();
    if (mode === "manage") {
      router.back();
      return;
    }
    dispatch({ type: "sellerFinishSetup" });
    router.replace("/seller/home" as Href);
  };

  return (
    <SellerScreen footer={<SellerButton label={mode === "manage" ? "Save changes" : "Save & continue"} onPress={save} size="lg" testID="seller-store-save" variant="glass" />} tabs={mode === "manage"} testID="seller-store">
      {mode === "manage" ? (
        <SellerTopBar title="Store profile" />
      ) : (
        <View style={styles.top}>
          <StepBar step={3} />
          <Text style={styles.step}>Step 3 of 3</Text>
          <Text accessibilityRole="header" style={styles.title}>
            Set up your store
          </Text>
          <Text style={styles.subtitle}>How buyers will see you</Text>
        </View>
      )}

      <Animated.View entering={FadeInDown.duration(380)} style={styles.logoRow}>
        <Pressable
          accessibilityLabel="Change store logo"
          accessibilityRole="button"
          onPress={async () => {
            const picked = await pick(true);
            if (picked) setLogo(picked.uri);
          }}
          style={styles.logo}
        >
          {logo ? (
            <Animated.View entering={ZoomIn.duration(260)} style={StyleSheet.absoluteFill}>
              <Image accessibilityLabel="Store logo" contentFit="cover" source={{ uri: logo }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          ) : (
            <Text style={styles.logoText}>{initials(name || "Store")}</Text>
          )}
        </Pressable>
        <View style={styles.logoSide}>
          <Text style={styles.logoLabel}>Store Logo</Text>
          <SellerButton
            label={logo ? "Change photo" : "Add photo"}
            onPress={async () => {
              const picked = await pick(true);
              if (picked) setLogo(picked.uri);
            }}
            size="sm"
            variant="glass"
          />
        </View>
      </Animated.View>

      <View style={styles.fields}>
        <SellerField error={errors.name} icon="shopping-bag" label="Store name" onChangeText={setName} placeholder="CampusBites" testID="store-name" value={name} />
        <SellerField label="Description" multiline onChangeText={setDescription} placeholder="Fast-food joint" testID="store-description" value={description} />
        <SellerField error={errors.location} icon="map-pin" label="Collection location" onChangeText={setLocation} placeholder="Eduvos Potchefstroom, Res Block B" testID="store-location" value={location} />

        <View style={styles.hours}>
          <Text style={styles.label}>Operation hours</Text>
          <View style={styles.days}>
            {DAY_KEYS.map((day) => {
              const on = days.includes(day);
              return (
                <Pressable accessibilityLabel={DAY_LABELS[day]} accessibilityRole="checkbox" accessibilityState={{ checked: on }} key={day} onPress={() => toggle(day)} style={[styles.day, on && styles.dayOn]} testID={`day-${day}`}>
                  <Text style={[styles.dayText, on && styles.dayTextOn]}>{DAY_LABELS[day]}</Text>
                </Pressable>
              );
            })}
          </View>
          {errors.days ? <Text style={styles.error}>{errors.days}</Text> : null}
          <View style={styles.times}>
            <View style={styles.time}>
              <SellerField label="Opens" onChangeText={setOpens} placeholder="08:00" testID="store-opens" value={opens} />
            </View>
            <View style={styles.time}>
              <SellerField label="Closes" onChangeText={setCloses} placeholder="17:00" testID="store-closes" value={closes} />
            </View>
          </View>
          {errors.hours ? <Text style={styles.error}>{errors.hours}</Text> : null}
        </View>
      </View>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  day: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, minHeight: 36, minWidth: 48, paddingHorizontal: 12, paddingVertical: 8 },
  dayOn: { backgroundColor: "#FFFFFF" },
  dayText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700", textAlign: "center" },
  dayTextOn: { color: SELLER.solid },
  days: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  error: { color: "#FFD8D2", fontSize: 13, fontWeight: "600" },
  fields: { gap: 14, marginTop: 6 },
  hours: { gap: 8 },
  label: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  logo: { alignItems: "center", backgroundColor: "#D5DDE1", borderRadius: 48, height: 96, justifyContent: "center", overflow: "hidden", width: 96 },
  logoLabel: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  logoRow: { alignItems: "center", flexDirection: "row", gap: 16, marginVertical: 14 },
  logoSide: { alignItems: "flex-start", gap: 8 },
  logoText: { color: "#5F6E76", fontSize: 30, fontWeight: "700" },
  step: { color: "#FFFFFF", fontSize: 13, fontWeight: "600", marginTop: 8 },
  subtitle: { color: "rgba(255,255,255,0.9)", fontSize: 15 },
  time: { flex: 1 },
  times: { flexDirection: "row", gap: 12 },
  title: { color: "#FFFFFF", fontSize: 24, fontWeight: "800", marginTop: 10 },
  top: { paddingTop: 8 },
});
