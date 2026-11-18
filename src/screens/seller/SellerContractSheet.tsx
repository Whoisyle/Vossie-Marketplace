import * as Crypto from "expo-crypto";
import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from "react-native";
import Animated, { Easing, FadeIn, FadeInDown, useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { formatStudentNumber } from "@/data/studentRecord";
import { getCampusName } from "@/data/repository";
import { AGREEMENT_PROMISES, AGREEMENT_VERSION, agreementIntro, agreementTemplateText, sameName, type AgreementDetails } from "@/seller/agreement";
import { cleanIdNumber, formatIdNumber, isValidSouthAfricanId } from "@/seller/idNumber";
import { useDemoStore } from "@/state/DemoStore";
import { color } from "@/theme/tokens";

import { useSellerDispatch } from "./actions";
import { SignaturePad } from "./SignaturePad";

/** Today as people write it, added to the agreement automatically. */
export function todayLabel(): string {
  return new Date().toLocaleDateString("en-ZA", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * The seller agreement. After Vossie Operations has accepted every document and the seller has seen the verified screen, this
 * slides up from the bottom, like a notification, and stays until it is signed: the dashboard behind it cannot be used. Two
 * pages: who the seller is (their details are filled in and cannot be changed, and they type their ID number), then what they
 * promise, with a tick, their typed name, a drawn signature and the date, which is added for them. With the live backend the
 * database checks everything again and will not let an unsigned seller publish or take orders.
 */
export function SellerContractSheet({ due }: { due: boolean }) {
  const { state } = useDemoStore();
  const dispatch = useSellerDispatch();
  const insets = useSafeAreaInsets();
  const profile = state.profile;
  const seller = state.seller;
  const [page, setPage] = useState<1 | 2>(1);
  const [idNumber, setIdNumber] = useState("");
  const [typedName, setTypedName] = useState("");
  const [agree, setAgree] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [errors, setErrors] = useState<{ id?: string; name?: string; agree?: string; signature?: string }>({});
  const [submitted, setSubmitted] = useState(false);
  const [closed, setClosed] = useState(false);
  const signed = seller.agreement?.version === AGREEMENT_VERSION;
  const visible = due || (submitted && signed && !closed);
  // the panel rises from the bottom of the screen when it opens
  const { height: screenHeight } = useWindowDimensions();
  const rise = useSharedValue(1);
  useEffect(() => {
    if (visible) rise.set(withTiming(0, { duration: 620, easing: Easing.out(Easing.cubic) }));
  }, [rise, visible]);
  const slide = useAnimatedStyle(() => ({ transform: [{ translateY: rise.get() * screenHeight }] }));

  // once it is signed, the success message stays for a moment and then the sheet goes
  useEffect(() => {
    if (!submitted || !signed) return;
    const timer = setTimeout(() => setClosed(true), 1800);
    return () => clearTimeout(timer);
  }, [signed, submitted]);

  if (!visible || !profile) return null;

  const details: AgreementDetails = {
    campus: getCampusName(profile.campusId),
    date: todayLabel(),
    email: profile.email,
    fullName: profile.fullName,
    idNumber: formatIdNumber(idNumber),
    kind: seller.profile.kind,
    storeName: seller.profile.storeName,
    studentNumber: profile.studentNumber ? formatStudentNumber(profile.studentNumber) : "not available",
  };

  const next = () => {
    if (!isValidSouthAfricanId(idNumber)) {
      setErrors({ id: "Enter your 13-digit South African ID number, like 800101 5009 087." });
      return;
    }
    setErrors({});
    setPage(2);
  };

  const sign = async () => {
    const found: typeof errors = {};
    if (!sameName(typedName, profile.fullName)) found.name = `Type your full name and surname exactly as on your account: ${profile.fullName}.`;
    if (!agree) found.agree = "Tick the box to say you have read and agree.";
    if (!signature) found.signature = "Draw your signature in the box.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const hash = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, agreementTemplateText());
    dispatch({ idNumber: cleanIdNumber(idNumber), signature: signature!, signedName: typedName.trim(), textHash: hash, type: "sellerSignAgreement", version: AGREEMENT_VERSION });
    setSubmitted(true);
  };

  return (
    <View accessibilityViewIsModal pointerEvents="auto" style={styles.root} testID="seller-contract">
      <Animated.View entering={FadeIn.duration(260)} style={styles.backdrop} />
      <Animated.View style={[styles.panel, { paddingBottom: Math.max(insets.bottom, 12) }, slide]}>
        <View style={styles.handle} />
        {submitted && signed ? (
          <Animated.View entering={FadeIn.duration(300)} style={styles.done} testID="contract-signed">
            <View style={styles.doneTick}>
              <Icon color="#FFFFFF" name="check" size={40} />
            </View>
            <Text accessibilityRole="header" style={styles.title}>
              Agreement signed
            </Text>
            <Text style={styles.sub}>Thank you, {profile.fullName.split(" ")[0]}. You can now list and sell on Vossie. Your signed copy is in Account.</Text>
          </Animated.View>
        ) : (
          <>
            <View style={styles.top}>
              <View style={styles.steps} accessibilityLabel={`Page ${page} of 2`}>
                <View style={[styles.dot, styles.dotOn]} />
                <View style={[styles.dot, page === 2 && styles.dotOn]} />
              </View>
              <Text style={styles.pageCount}>{page} of 2</Text>
            </View>
            <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} style={styles.scroll}>
              {page === 1 ? (
                <Animated.View entering={FadeInDown.duration(320)} key="p1">
                  <Text accessibilityRole="header" style={styles.title}>
                    Seller agreement
                  </Text>
                  <Text style={styles.sub}>You are approved. Before you list or sell, read and sign this. It takes about two minutes.</Text>

                  <View style={styles.card} testID="contract-details">
                    <Row label="Full name" value={details.fullName} />
                    <Row label="Student number" value={details.studentNumber} />
                    <Row label="Email" value={details.email} />
                    <Row label="Campus" value={details.campus} />
                    <Row label="Store" value={details.storeName || "Your store"} />
                    <Row label="Date" last value={details.date} />
                  </View>
                  <Text style={styles.note}>These come from your account and your Eduvos record, so they cannot be changed here.</Text>

                  <Text style={styles.label}>Your ID number</Text>
                  <TextInput
                    accessibilityLabel="ID number"
                    autoCorrect={false}
                    keyboardType="number-pad"
                    maxLength={15}
                    onChangeText={(value) => setIdNumber(formatIdNumber(value))}
                    placeholder="800101 5009 087"
                    placeholderTextColor={color.steelGrey}
                    style={[styles.input, errors.id ? styles.inputError : null]}
                    testID="contract-id-number"
                    value={idNumber}
                  />
                  {errors.id ? <Text style={styles.error}>{errors.id}</Text> : <Text style={styles.note}>Type it once, the same as on the ID you sent in. Vossie Operations checks it against that ID.</Text>}

                  <Text style={styles.intro}>{agreementIntro({ ...details, idNumber: details.idNumber || "(your ID number)" })}</Text>
                </Animated.View>
              ) : (
                <Animated.View entering={FadeInDown.duration(320)} key="p2">
                  <Text accessibilityRole="header" style={styles.title}>
                    What I promise
                  </Text>
                  <View style={styles.promises}>
                    {AGREEMENT_PROMISES.map((promise, index) => (
                      <View key={promise.title} style={styles.promise}>
                        <View style={styles.promiseNumber}>
                          <Text style={styles.promiseNumberText}>{index + 1}</Text>
                        </View>
                        <View style={styles.promiseText}>
                          <Text style={styles.promiseTitle}>{promise.title}</Text>
                          <Text style={styles.promiseBody}>{promise.text}</Text>
                        </View>
                      </View>
                    ))}
                  </View>

                  <Pressable accessibilityLabel="I have read and agree to everything above" accessibilityRole="checkbox" accessibilityState={{ checked: agree }} onPress={() => setAgree(!agree)} style={styles.agree} testID="contract-agree">
                    <View style={[styles.box, agree && styles.boxOn]}>{agree ? <Icon color="#FFFFFF" name="check" size={15} /> : null}</View>
                    <Text style={styles.agreeText}>I have read and agree to everything above.</Text>
                  </Pressable>
                  {errors.agree ? <Text style={styles.error}>{errors.agree}</Text> : null}

                  <Text style={styles.label}>Type your full name and surname</Text>
                  <TextInput
                    accessibilityLabel="Your full name and surname"
                    autoCapitalize="words"
                    autoCorrect={false}
                    onChangeText={setTypedName}
                    placeholder={profile.fullName}
                    placeholderTextColor={color.steelGrey}
                    style={[styles.input, errors.name ? styles.inputError : null]}
                    testID="contract-name"
                    value={typedName}
                  />
                  {errors.name ? <Text style={styles.error}>{errors.name}</Text> : null}

                  <Text style={styles.label}>Sign here</Text>
                  <SignaturePad onChange={setSignature} />
                  {errors.signature ? <Text style={styles.error}>{errors.signature}</Text> : null}
                  <Text style={styles.note}>Signed on {details.date}. The date is added for you.</Text>
                </Animated.View>
              )}
            </ScrollView>

            <View style={styles.footer}>
              {page === 2 ? (
                <Pressable accessibilityLabel="Back to page 1" accessibilityRole="button" onPress={() => setPage(1)} style={({ pressed }) => [styles.back, pressed && styles.pressed]} testID="contract-back">
                  <Icon color={color.slate} name="arrow-left" size={20} />
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" onPress={page === 1 ? next : () => void sign()} style={({ pressed }) => [styles.cta, pressed && styles.pressed]} testID={page === 1 ? "contract-next" : "contract-sign"}>
                <Text style={styles.ctaText}>{page === 1 ? "Next" : "Sign agreement"}</Text>
                <Icon color="#FFFFFF" name={page === 1 ? "arrow-right" : "edit-3"} size={20} />
              </Pressable>
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );
}

function Row({ label, last = false, value }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowLine]}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text numberOfLines={2} style={styles.rowValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  agree: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 18, minHeight: 44 },
  agreeText: { color: color.charcoal, flex: 1, fontSize: 15, fontWeight: "600" },
  back: { alignItems: "center", backgroundColor: color.cloudGrey, borderRadius: 30, height: 60, justifyContent: "center", width: 60 },
  backdrop: { backgroundColor: "rgba(10,20,26,0.62)", ...StyleSheet.absoluteFill },
  body: { paddingBottom: 16, paddingHorizontal: 22, paddingTop: 6 },
  box: { alignItems: "center", borderColor: color.steelGrey, borderRadius: 8, borderWidth: 2, height: 26, justifyContent: "center", width: 26 },
  boxOn: { backgroundColor: color.accent, borderColor: color.accent },
  card: { backgroundColor: "#FFFFFF", borderColor: "#E1E6E8", borderRadius: 18, borderWidth: 1, marginTop: 16, paddingHorizontal: 16 },
  cta: { alignItems: "center", backgroundColor: color.accent, borderRadius: 30, flex: 1, flexDirection: "row", gap: 10, height: 60, justifyContent: "center" },
  ctaText: { color: "#FFFFFF", fontSize: 17, fontWeight: "800" },
  done: { alignItems: "center", flex: 1, gap: 14, justifyContent: "center", paddingHorizontal: 30 },
  doneTick: { alignItems: "center", backgroundColor: color.accent, borderRadius: 40, height: 80, justifyContent: "center", width: 80 },
  dot: { backgroundColor: "#CBD3D6", borderRadius: 4, height: 8, width: 26 },
  dotOn: { backgroundColor: color.accent },
  error: { color: color.danger, fontSize: 13, fontWeight: "600", marginTop: 6 },
  footer: { flexDirection: "row", gap: 10, paddingHorizontal: 22, paddingTop: 10 },
  handle: { alignSelf: "center", backgroundColor: "#CBD3D6", borderRadius: 3, height: 5, marginTop: 10, width: 44 },
  input: { backgroundColor: "#FFFFFF", borderColor: "#D6DDE0", borderRadius: 14, borderWidth: 1.5, color: color.charcoal, fontSize: 16, height: 52, marginTop: 8, paddingHorizontal: 14 },
  inputError: { borderColor: color.danger },
  intro: { color: color.charcoal, fontSize: 15, lineHeight: 22, marginTop: 20 },
  label: { color: color.charcoal, fontSize: 15, fontWeight: "800", marginTop: 20 },
  note: { color: color.slate, fontSize: 13, lineHeight: 18, marginTop: 8 },
  pageCount: { color: color.slate, fontSize: 13, fontWeight: "700" },
  panel: { backgroundColor: "#F7F8F6", borderTopLeftRadius: 30, borderTopRightRadius: 30, bottom: 0, overflow: "hidden", boxShadow: "0 -10px 30px rgba(0,0,0,0.25)", height: "93%", left: 0, position: "absolute", right: 0 },
  pressed: { opacity: 0.85, transform: [{ scale: 0.985 }] },
  promise: { flexDirection: "row", gap: 12 },
  promiseBody: { color: color.slate, fontSize: 14, lineHeight: 20, marginTop: 2 },
  promiseNumber: { alignItems: "center", backgroundColor: color.sage, borderRadius: 14, height: 28, justifyContent: "center", marginTop: 1, width: 28 },
  promiseNumberText: { color: color.accent, fontSize: 13, fontWeight: "800" },
  promiseText: { flex: 1 },
  promiseTitle: { color: color.charcoal, fontSize: 15, fontWeight: "800" },
  promises: { gap: 14, marginTop: 14 },
  scroll: { flex: 1 },
  root: { ...StyleSheet.absoluteFill, zIndex: 60 },
  row: { alignItems: "center", flexDirection: "row", gap: 12, justifyContent: "space-between", minHeight: 46, paddingVertical: 8 },
  rowLabel: { color: color.slate, fontSize: 14 },
  rowLine: { borderBottomColor: "#E8ECEE", borderBottomWidth: 1 },
  rowValue: { color: color.charcoal, flexShrink: 1, fontSize: 15, fontWeight: "700", textAlign: "right" },
  steps: { flexDirection: "row", gap: 6 },
  sub: { color: color.slate, fontSize: 15, lineHeight: 21, marginTop: 6, textAlign: "left" },
  title: { color: color.charcoal, fontSize: 26, fontWeight: "800", letterSpacing: -0.4, marginTop: 6 },
  top: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 22, paddingTop: 14 },
});
