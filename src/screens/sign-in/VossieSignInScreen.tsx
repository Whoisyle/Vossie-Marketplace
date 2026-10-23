import { useFocusEffect, useRouter } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Button, Sheet } from "@/components";
import { useDemoStore } from "@/state/DemoStore";
import { haptic } from "@/lib/haptics";
import { duration, ease, spring } from "@/theme/motion";
import { color, space } from "@/theme/tokens";

import { FloatingBubbles } from "./FloatingBubbles";
import { signInDirect, signInLimited } from "./realLogin";
import { isValidEmail } from "./validation";

const MICROSOFT_SQUARES = ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"] as const;

function MicrosoftLogo() {
  return (
    <View accessibilityLabel="Microsoft" accessibilityRole="image" style={styles.logoRow}>
      <View style={styles.squares}>
        {MICROSOFT_SQUARES.map((fill) => (
          <View key={fill} style={[styles.square, { backgroundColor: fill }]} />
        ))}
      </View>
      <Text style={styles.logoText}>Microsoft</Text>
    </View>
  );
}

export function VossieSignInScreen() {
  const router = useRouter();
  const { dispatch, state } = useDemoStore();
  const { height, width } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cardWidth = Math.min(width * 0.82, 440);
  const pulse = useSharedValue(0);
  const burst = useSharedValue(0);
  const touchX = useSharedValue(width / 2);
  const touchY = useSharedValue(height / 2);
  const touchActive = useSharedValue(0);

  const followFinger = (event: { nativeEvent: { pageX: number; pageY: number } }) => {
    touchX.set(withSpring(event.nativeEvent.pageX, spring.follow));
    touchY.set(withSpring(event.nativeEvent.pageY, spring.follow));
    touchActive.set(withTiming(1, { duration: duration.fast }));
  };
  const releaseFinger = () => touchActive.set(withTiming(0, { duration: duration.slow }));

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  useFocusEffect(
    useCallback(
      () => () => {
        setSubmitting(false);
        setError("");
      },
      [],
    ),
  );

  const submit = () => {
    Keyboard.dismiss();
    const value = email;
    if (!value.trim()) {
      setError("Enter your email, phone or Skype name.");
      haptic.error();
      return;
    }
    if (!isValidEmail(value)) {
      setError("Enter a valid email address, like eduv123456@vossie.net.");
      haptic.error();
      return;
    }
    setError("");
    setSubmitting(true);
    haptic.press();
    burst.set(withTiming(1, { duration: 620, easing: ease.out }));
    const clean = value.trim().toLowerCase();
    // someone who already has a Vossie profile signs straight in; a new student is verified and set up first
    const returning = state.knownProfiles.some((profile) => profile.email.toLowerCase() === clean);
    // a real account on the server's direct-login list is signed in from the database
    const direct = signInDirect(clean);
    timer.current = setTimeout(async () => {
      const profile = await direct;
      if (profile) {
        dispatch({ profile, type: "signInAs" });
        router.replace("/home");
      } else if (signInLimited()) {
        // against the real backend only approved accounts get in
        burst.set(withTiming(0, { duration: 420, easing: ease.out }));
        setSubmitting(false);
        setError("This account doesn’t have access to Vossie yet.");
        haptic.error();
      } else if (returning) {
        dispatch({ email: clean, type: "signIn" });
        router.replace("/home");
      } else {
        router.push({ params: { email: clean }, pathname: "/verified" });
      }
    }, 700);
  };

  return (
    <SafeAreaView
      edges={["left", "right"]}
      onPointerCancel={Platform.OS === "web" ? releaseFinger : undefined}
      onPointerLeave={Platform.OS === "web" ? releaseFinger : undefined}
      onPointerMove={Platform.OS === "web" ? followFinger : undefined}
      onTouchCancel={releaseFinger}
      onTouchEnd={releaseFinger}
      onTouchMove={followFinger}
      onTouchStart={followFinger}
      style={styles.safeArea}
    >
      <View
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        pointerEvents="none"
        style={StyleSheet.absoluteFill}
      >
        <FloatingBubbles
          burst={burst}
          height={height}
          pulse={pulse}
          touchActive={touchActive}
          touchX={touchX}
          touchY={touchY}
          width={width}
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.flex}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.card, { width: cardWidth }]} testID="sign-in-card">
            <MicrosoftLogo />
            <Text accessibilityRole="header" style={styles.title}>
              Sign In
            </Text>
            <TextInput
              accessibilityHint="Your Eduvos Microsoft account email"
              accessibilityLabel="Email, phone or Skype"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              editable={!submitting}
              keyboardType="email-address"
              onFocus={() => {
                haptic.tap();
                pulse.set(withSequence(withTiming(1, { duration: 320, easing: ease.out }), withTiming(0, { duration: 900, easing: ease.inOut })));
              }}
              onChangeText={(value) => {
                setEmail(value);
                if (error) setError("");
              }}
              onSubmitEditing={() => submit()}
              placeholder="Email, phone or Skype"
              placeholderTextColor="#8A8A8A"
              returnKeyType="next"
              selectionColor={color.microsoftBlue}
              style={[styles.input, error ? styles.inputError : null]}
              textContentType="username"
              value={email}
            />
            {error ? (
              <Text accessibilityLiveRegion="polite" style={styles.error}>
                {error}
              </Text>
            ) : null}
            <Pressable
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setHelpOpen(true)}
              style={({ pressed }) => [styles.linkButton, pressed && styles.pressed]}
            >
              <Text style={styles.link}>Can’t access your account?</Text>
            </Pressable>
            <View style={styles.actions}>
              <Pressable
                accessibilityLabel="Next"
                accessibilityRole="button"
                accessibilityState={{ busy: submitting, disabled: submitting }}
                disabled={submitting}
                onPress={() => submit()}
                style={({ pressed }) => [styles.next, pressed && styles.nextPressed]}
                testID="sign-in-next"
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.nextText}>Next</Text>
                )}
              </Pressable>
            </View>
            <Text style={styles.demoNote}>Vossie demo · no password is requested</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Sheet onClose={() => setHelpOpen(false)} title="Can’t access your account?" visible={helpOpen}>
        <View style={styles.helpBody}>
          <Text style={styles.helpText}>
            Your Vossie sign-in uses your Eduvos Microsoft account. To reset your
            password or unlock your account, contact Eduvos IT support or use the
            Microsoft account recovery page.
          </Text>
          <Text style={styles.helpText}>Vossie will never ask for your password.</Text>
          <Button label="Got it" onPress={() => setHelpOpen(false)} fullWidth />
        </View>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  actions: { alignItems: "flex-end", marginTop: space.lg },
  card: {
    alignSelf: "center",
    backgroundColor: "#FFFFFF",
    borderCurve: "continuous",
    borderRadius: 20,
    boxShadow: "0 10px 30px rgba(16, 33, 40, 0.18)",
    paddingHorizontal: 28,
    paddingVertical: 30,
  },
  demoNote: { color: "#9AA1A6", fontSize: 11, marginTop: space.md },
  error: { color: "#C42B1C", fontSize: 13, marginTop: space.xs },
  flex: { flex: 1 },
  helpBody: { gap: space.md, paddingBottom: space.md },
  helpText: { color: color.text, fontSize: 15, lineHeight: 22 },
  input: {
    borderBottomColor: "#7FA7E6",
    borderBottomWidth: 1.5,
    color: "#1B1B1B",
    fontSize: 15,
    marginTop: space.lg,
    minHeight: 44,
    paddingVertical: space.xs,
  },
  inputError: { borderBottomColor: "#C42B1C" },
  link: { color: "#0067B8", fontSize: 12 },
  linkButton: { alignSelf: "flex-start", justifyContent: "center", minHeight: 36, marginTop: space.xs },
  logoRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  logoText: { color: "#737373", fontSize: 22, fontWeight: "600", letterSpacing: -0.2 },
  next: {
    alignItems: "center",
    backgroundColor: color.microsoftBlue,
    borderRadius: 4,
    justifyContent: "center",
    minHeight: 40,
    minWidth: 118,
    paddingHorizontal: space.lg,
  },
  nextPressed: { backgroundColor: "#0B5CA6" },
  nextText: { color: "#FFFFFF", fontSize: 15, fontWeight: "600" },
  pressed: { opacity: 0.6 },
  safeArea: { backgroundColor: "#FFFFFF", flex: 1 },
  scrollContent: { flexGrow: 1, justifyContent: "center", paddingVertical: space.xxl },
  square: { height: 11, width: 11 },
  squares: { flexDirection: "row", flexWrap: "wrap", gap: 1.5, width: 23.5 },
  title: { color: "#1B1B1B", fontSize: 26, fontWeight: "700", marginTop: space.lg },
});
