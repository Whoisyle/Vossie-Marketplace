import { Image } from "expo-image";
import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown, ZoomIn } from "react-native-reanimated";

import { Icon } from "@/components";
import { initials } from "@/data/format";
import { getCampusName } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { CampusPicker } from "@/screens/profile/CampusPicker";
import { haptic } from "@/lib/haptics";
import { DAY_KEYS, DAY_LABELS, type DayKey, type SellerDelivery } from "@/seller/types";
import { color } from "@/theme/tokens";
import { useDemoStore } from "@/state/DemoStore";

import { useSellerDispatch } from "./actions";

import { AttachSheet } from "./attach";
import { SellerField } from "./fields";
import { PlaceCard } from "./SellerPlaceScreen";
import { DELIVERY_LABELS, SetupHeader, StorePreview } from "./SetupParts";
import { SELLER, SellerButton, SellerScreen, SellerTopBar, Text } from "./ui";

/** "08:00" style times only. */
export function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value.trim());
}

/** Step 3 of 3: how buyers will see the store: logo, name, what it sells, where to collect and which days it is open. */
export function SellerStoreScreen({ mode = "setup" }: { mode?: "setup" | "manage" }) {
  const router = useRouter();
  const { state } = useDemoStore();
  const dispatch = useSellerDispatch();
  const [attaching, setAttaching] = useState<"logo" | "banner" | null>(null);
  const saved = state.seller.profile;
  const [logo, setLogo] = useState(saved.logoUri);
  const [banner, setBanner] = useState(saved.bannerUri);
  const [name, setName] = useState(saved.storeName);
  const [description, setDescription] = useState(saved.description);
  const [delivery, setDelivery] = useState<SellerDelivery>(saved.delivery ?? "both");
  const [campusId, setCampusId] = useState<CampusId | undefined>(saved.campusId ?? state.profile?.campusId);
  const [campusOpen, setCampusOpen] = useState(false);
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
    if (!saved.place) found.location = "Choose the place where buyers collect from.";
    if (days.length === 0) found.days = "Pick at least one day you are open.";
    if (!isTime(opens) || !isTime(closes) || opens >= closes) found.hours = "Use times like 08:00 and 17:00, with the opening time first.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    dispatch({ patch: { campusId, closes: closes.trim(), days, delivery, bannerUri: banner, description: description.trim(), logoUri: logo, opens: opens.trim(), storeName: name.trim() }, type: "sellerSaveStore" });
    haptic.success();
    if (mode === "manage") {
      router.back();
      return;
    }
    dispatch({ type: "sellerFinishSetup" });
    router.replace("/seller/home" as Href);
  };

  return (
    <SellerScreen deep={mode === "setup"} footer={<SellerButton label={mode === "manage" ? "Save changes" : "Save & continue"} onPress={save} size="lg" testID="seller-store-save" variant={mode === "manage" ? "glass" : "light"} />} tabs={mode === "manage"} testID="seller-store">
      {mode === "manage" ? (
        <SellerTopBar title="Store profile" />
      ) : (
        <SetupHeader art={2} step={3} subtitle="How buyers will see you" title="Set up your store" />
      )}

      <Animated.View entering={FadeInDown.duration(340)} testID="banner-picker">
        <Pressable accessibilityLabel={banner ? "Change store banner" : "Add a store banner"} accessibilityRole="button" onPress={() => setAttaching("banner")} style={styles.banner} testID="banner-button">
          {banner ? (
            <Animated.View entering={ZoomIn.duration(260)} style={StyleSheet.absoluteFill}>
              <Image accessibilityLabel="Store banner" contentFit="cover" source={{ uri: banner }} style={StyleSheet.absoluteFill} />
            </Animated.View>
          ) : (
            <View style={styles.bannerEmpty}>
              <Icon color="#FFFFFF" name="image" size={26} />
              <Text style={styles.bannerText}>Add a store banner</Text>
              <Text style={styles.bannerHint}>A wide picture at the top of your store page</Text>
            </View>
          )}
        </Pressable>
        {banner ? <SellerButton label="Remove banner" onPress={() => setBanner(undefined)} size="sm" style={styles.bannerRemove} testID="banner-remove" variant="glass" /> : null}
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(60).duration(380)} style={styles.logoRow}>
        <Pressable accessibilityLabel="Change store logo" accessibilityRole="button" onPress={() => setAttaching("logo")} style={styles.logo}>
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
            onPress={() => setAttaching("logo")}
            size="sm"
            testID="logo-button"
            variant="glass"
          />
        </View>
      </Animated.View>

      <View style={styles.fields}>
        <SellerField error={errors.name} icon="shopping-bag" label="Store name" onChangeText={setName} placeholder="CampusBites" testID="store-name" value={name} />
        <SellerField label="Description" multiline onChangeText={setDescription} placeholder="Fast-food joint" testID="store-description" value={description} />
        <View style={styles.hours}>
          <Text style={styles.label}>Collection location</Text>
          <PlaceCard onChoose={() => router.push((mode === "manage" ? "/seller/account/place" : "/seller-setup/place") as Href)} place={saved.place} />
          {errors.location ? <Text style={styles.error}>{errors.location}</Text> : null}
        </View>

        <View style={styles.hours}>
          <Text style={styles.label}>Campus you sell on</Text>
          <Pressable accessibilityHint="Change the campus" accessibilityLabel={`Campus, ${campusId ? getCampusName(campusId) : "not chosen"}`} accessibilityRole="button" onPress={() => setCampusOpen(true)} style={styles.option} testID="store-campus">
            <Icon color={color.sage} name="map-pin" size={20} />
            <View style={styles.optionText}>
              <Text style={styles.optionTitle}>{campusId ? getCampusName(campusId) : "Choose your campus"}</Text>
              <Text style={styles.optionHint}>Buyers on this campus see your store first</Text>
            </View>
            <Icon color="rgba(255,255,255,0.7)" name="chevron-right" size={20} />
          </Pressable>
        </View>

        <View style={styles.hours}>
          <Text style={styles.label}>How do buyers get their order?</Text>
          {(["courier", "collection", "both"] as const).map((option) => {
            const on = delivery === option;
            return (
              <Pressable accessibilityLabel={DELIVERY_LABELS[option]} accessibilityRole="radio" accessibilityState={{ selected: on }} key={option} onPress={() => { haptic.select(); setDelivery(option); }} style={[styles.option, on && styles.optionOn]} testID={`delivery-${option}`}>
                <Icon color={on ? color.slate : color.steelGrey} name={option === "collection" ? "map-pin" : option === "courier" ? "truck" : "package"} size={20} />
                <View style={styles.optionText}>
                  <Text style={[styles.optionTitle, on && styles.optionTitleOn]}>{DELIVERY_LABELS[option]}</Text>
                  <Text style={[styles.optionHint, on && styles.optionHintOn]}>{option === "courier" ? "A campus courier takes it to the student" : option === "collection" ? "Students pick it up where you hand over" : "Let the buyer choose at checkout"}</Text>
                </View>
                {on ? <Icon color={color.slate} name="check-circle" size={20} /> : null}
              </Pressable>
            );
          })}
        </View>

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
      {mode === "setup" ? <StorePreview banner={banner} campusId={saved.campusId} delivery={delivery} kind={saved.kind} logo={logo} name={name} /> : null}
      <CampusPicker
        onClose={() => setCampusOpen(false)}
        onSelect={(next) => {
          setCampusId(next);
          setCampusOpen(false);
        }}
        selected={campusId ?? null}
        visible={campusOpen}
      />
      <AttachSheet
        onClose={() => setAttaching(null)}
        onPicked={(file) => (attaching === "banner" ? setBanner(file.uri) : setLogo(file.uri))}
        sources={["library", "camera"]}
        title={attaching === "banner" ? "Store banner" : "Store logo"}
        visible={attaching !== null}
      />
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: "rgba(255,255,255,0.16)", borderColor: "rgba(255,255,255,0.4)", borderRadius: 20, borderStyle: "dashed", borderWidth: 1.5, height: 130, overflow: "hidden" },
  bannerEmpty: { alignItems: "center", flex: 1, gap: 2, justifyContent: "center" },
  bannerHint: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  bannerRemove: { alignSelf: "flex-start", marginTop: 8 },
  bannerText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  day: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 18, minHeight: 36, minWidth: 48, paddingHorizontal: 12, paddingVertical: 8 },
  dayOn: { backgroundColor: color.sage },
  option: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.18)", borderRadius: 18, borderWidth: 1.5, flexDirection: "row", gap: 12, minHeight: 62, padding: 12 },
  optionHint: { color: "rgba(255,255,255,0.72)", fontSize: 12.5 },
  optionHintOn: { color: color.slate },
  optionOn: { backgroundColor: color.sage, borderColor: color.slate },
  optionText: { flex: 1, gap: 1 },
  optionTitle: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  optionTitleOn: { color: color.charcoal },
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
