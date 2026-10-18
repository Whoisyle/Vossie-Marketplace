import { LinearGradient } from "expo-linear-gradient";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { Icon } from "@/components";
import { haptic } from "@/lib/haptics";
import { backendEnabled } from "@/services/client";
import { useDemoStore } from "@/state/DemoStore";
import { ease, spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

import { DEMO_CODE, OTP_LENGTH, RESEND_SECONDS, cleanCode, maskEmail } from "./otp";

type Status = "idle" | "checking" | "success" | "error";

/** One-time code step after the email. Demo mode accepts a fixed code; with the backend on it verifies for real. */
export function OtpScreen() {
  const router = useRouter();
  const { dispatch } = useDemoStore();
  const reduced = useReducedMotion();
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const input = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [seconds, setSeconds] = useState(RESEND_SECONDS);
  const [message, setMessage] = useState("");
  const shake = useSharedValue(0);
  const success = useSharedValue(0);
  const ring = useSharedValue(0);
  const resendSpin = useSharedValue(0);

  // the envelope's ripple
  useEffect(() => {
    if (reduced) return;
    ring.set(withRepeat(withTiming(1, { duration: 2_200, easing: ease.out }), -1, false));
    return () => cancelAnimation(ring);
  }, [reduced, ring]);

  useEffect(() => {
    const focus = setTimeout(() => input.current?.focus(), 350);
    return () => clearTimeout(focus);
  }, []);

  useEffect(() => {
    if (seconds <= 0) return;
    const tick = setTimeout(() => setSeconds((value) => value - 1), 1_000);
    return () => clearTimeout(tick);
  }, [seconds]);

  const verify = useCallback(
    async (value: string) => {
      setStatus("checking");
      let ok = false;
      try {
        if (backendEnabled && process.env.EXPO_PUBLIC_USE_BACKEND === "true") {
          const { verifyOtp } = await import("@/services/auth");
          await verifyOtp(email, value);
          ok = true;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 450));
          ok = value === DEMO_CODE;
        }
      } catch {
        ok = false;
      }
      if (!ok) {
        setStatus("error");
        setMessage("That code isn't right. Try again.");
        haptic.error();
        shake.set(
          withSequence(
            withTiming(-10, { duration: 60 }),
            withTiming(9, { duration: 80 }),
            withTiming(-6, { duration: 80 }),
            withTiming(0, { duration: 80 }),
          ),
        );
        setTimeout(() => {
          setCode("");
          setStatus("idle");
          input.current?.focus();
        }, 620);
        return;
      }
      setStatus("success");
      setMessage("");
      haptic.success();
      success.set(withSpring(1, spring.bouncy));
      setTimeout(() => {
        dispatch({ email, type: "signIn" });
        router.replace("/home");
      }, 900);
    },
    [dispatch, email, router, shake, success],
  );

  const onChange = (raw: string) => {
    if (status === "checking" || status === "success") return;
    const next = cleanCode(raw);
    setCode(next);
    if (message) setMessage("");
    if (next.length > code.length) haptic.select();
    if (next.length === OTP_LENGTH) void verify(next);
  };

  const resend = () => {
    if (seconds > 0) return;
    haptic.tap();
    setSeconds(RESEND_SECONDS);
    setMessage("A new code is on its way.");
    resendSpin.set(withSequence(withTiming(1, { duration: 500, easing: ease.out }), withTiming(0, { duration: 0 })));
  };

  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shake.get() }] }));
  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.45 * (1 - ring.get()),
    transform: [{ scale: 1 + ring.get() * 0.9 }],
  }));
  const envelopeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 + success.get() * 0.08 }, { rotate: `${resendSpin.get() * 360}deg` }],
  }));

  return (
    <SafeAreaView style={styles.safe}>
      <LinearGradient colors={["#E3EBEF", "#FFFFFF"]} pointerEvents="none" style={styles.wash} />
      <Pressable
        accessibilityLabel="Back"
        accessibilityRole="button"
        hitSlop={10}
        onPress={() => router.back()}
        style={styles.back}
      >
        <Icon name="chevron-left" size={22} />
      </Pressable>

      <View style={styles.hero}>
        <View style={styles.envelopeWrap}>
          {!reduced ? <Animated.View style={[styles.ring, ringStyle]} /> : null}
          <Animated.View style={[styles.envelope, envelopeStyle]}>
            <LinearGradient colors={gradient.primary} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
            <Icon color={color.onPrimary} name={status === "success" ? "check" : "mail"} size={30} />
          </Animated.View>
        </View>
        <Text accessibilityRole="header" style={styles.title}>
          Check your email
        </Text>
        <Text style={styles.subtitle}>
          We sent a 6 digit code to{"\n"}
          <Text style={styles.email}>{maskEmail(email)}</Text>
        </Text>
      </View>

      <Animated.View style={[styles.boxes, shakeStyle]}>
        {Array.from({ length: OTP_LENGTH }, (_, index) => (
          <DigitBox
            active={status === "idle" && index === Math.min(code.length, OTP_LENGTH - 1)}
            digit={code[index]}
            error={status === "error"}
            index={index}
            key={index}
            success={status === "success"}
          />
        ))}
        <TextInput
          accessibilityHint="Enter the 6 digit code from your email"
          accessibilityLabel="One-time code"
          autoComplete="one-time-code"
          caretHidden
          editable={status === "idle" || status === "error"}
          inputMode="numeric"
          maxLength={OTP_LENGTH}
          onChangeText={onChange}
          ref={input}
          style={styles.hiddenInput}
          textContentType="oneTimeCode"
          value={code}
        />
      </Animated.View>

      <Text accessibilityLiveRegion="polite" style={[styles.message, status === "error" && styles.messageError]}>
        {status === "checking" ? "Checking…" : status === "success" ? "You're in" : message}
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: seconds > 0 }}
        disabled={seconds > 0}
        hitSlop={10}
        onPress={resend}
        style={({ pressed }) => [styles.resend, pressed && styles.pressed]}
      >
        <Text style={[styles.resendText, seconds > 0 && styles.resendWaiting]}>
          {seconds > 0 ? `Resend code in ${seconds}s` : "Resend code"}
        </Text>
      </Pressable>

      {!backendEnabled || process.env.EXPO_PUBLIC_USE_BACKEND !== "true" ? (
        <Text style={styles.demo}>Demo mode · use code {DEMO_CODE}</Text>
      ) : null}
    </SafeAreaView>
  );
}

function DigitBox({
  active,
  digit,
  error,
  index,
  success,
}: {
  active: boolean;
  digit: string | undefined;
  error: boolean;
  index: number;
  success: boolean;
}) {
  const pop = useSharedValue(0);
  const filled = digit !== undefined;

  useEffect(() => {
    if (filled) {
      pop.set(withSequence(withTiming(1, { duration: 90 }), withSpring(0, spring.bouncy)));
    }
  }, [filled, pop]);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: 1 + pop.get() * 0.14 }] }));
  const settle = useSharedValue(0);
  useEffect(() => {
    if (success) settle.set(withDelay(index * 60, withSpring(1, spring.bouncy)));
  }, [index, settle, success]);
  const successStyle = useAnimatedStyle(() => ({ transform: [{ translateY: -8 * settle.get() * (1 - settle.get()) * 4 }] }));

  return (
    <Animated.View style={successStyle}>
      <Animated.View
        style={[
          styles.box,
          active && styles.boxActive,
          filled && styles.boxFilled,
          error && styles.boxError,
          success && styles.boxSuccess,
          style,
        ]}
      >
        <Text style={[styles.digit, (success || error) && styles.digitOnColour]}>{digit ?? ""}</Text>
        {active && !filled ? <View style={styles.caret} /> : null}
      </Animated.View>
    </Animated.View>
  );
}

const BOX = 48;

const styles = StyleSheet.create({
  back: { alignItems: "center", height: 44, justifyContent: "center", marginLeft: space.md, width: 44 },
  box: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.mist,
    borderRadius: corner.md,
    borderWidth: 1.5,
    boxShadow: "4px 4px 10px rgba(30, 42, 56, 0.10), -3px -3px 8px rgba(255, 255, 255, 0.95)",
    height: BOX + 8,
    justifyContent: "center",
    width: BOX,
  },
  boxActive: { borderColor: color.accent },
  boxError: { backgroundColor: color.danger, borderColor: color.danger },
  boxFilled: { borderColor: color.primary },
  boxSuccess: { backgroundColor: color.success, borderColor: color.success },
  boxes: { alignItems: "center", flexDirection: "row", gap: space.xs, justifyContent: "center", marginTop: space.xl },
  caret: { backgroundColor: color.accent, borderRadius: 1, height: 24, position: "absolute", width: 2 },
  demo: { ...{ color: color.textMuted, fontSize: 12 }, marginTop: "auto", paddingBottom: space.lg, textAlign: "center" },
  digit: { color: color.heading, fontSize: 24, fontWeight: "700" },
  digitOnColour: { color: color.onPrimary },
  email: { color: color.heading, fontWeight: "700" },
  envelope: {
    alignItems: "center",
    borderRadius: 36,
    height: 72,
    justifyContent: "center",
    overflow: "hidden",
    width: 72,
  },
  envelopeWrap: { alignItems: "center", height: 110, justifyContent: "center", width: 110 },
  hero: { alignItems: "center", gap: space.xs, marginTop: space.lg },
  hiddenInput: { ...StyleSheet.absoluteFill, color: "transparent", opacity: 0.02 },
  message: { color: color.textSecondary, fontSize: 14, marginTop: space.lg, minHeight: 20, textAlign: "center" },
  messageError: { color: color.danger },
  pressed: { opacity: 0.6 },
  resend: { alignItems: "center", justifyContent: "center", minHeight: 44, marginTop: space.sm },
  resendText: { color: color.link, fontSize: 15, fontWeight: "600" },
  resendWaiting: { color: color.textMuted, fontWeight: "500" },
  ring: { backgroundColor: color.mist, borderRadius: 36, height: 72, position: "absolute", width: 72 },
  safe: { backgroundColor: color.background, flex: 1 },
  subtitle: { color: color.textSecondary, fontSize: 15, lineHeight: 22, textAlign: "center" },
  title: { color: color.heading, fontSize: 26, fontWeight: "700" },
  wash: { ...StyleSheet.absoluteFill, height: 320 },
});

