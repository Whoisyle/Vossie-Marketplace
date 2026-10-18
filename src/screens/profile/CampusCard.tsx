import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { Icon } from "@/components";
import { getCampusName } from "@/data/repository";
import type { CampusId } from "@/data/types";
import { haptic } from "@/lib/haptics";
import { duration, ease, spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

/**
 * The "choose your campus" card. Unselected, a soft ring pulses around the pin to invite a tap. When a campus
 * is chosen the pin drops in with a bounce, the card lights up with the brand gradient and the name slides up.
 */
export function CampusCard({
  campusId,
  error,
  onPress,
  testID,
}: {
  campusId: CampusId | null;
  error?: string;
  onPress: () => void;
  testID?: string;
}) {
  const reduced = useReducedMotion();
  const selected = useSharedValue(campusId ? 1 : 0);
  const pin = useSharedValue(0);
  const invite = useSharedValue(0);
  const press = useSharedValue(0);

  useEffect(() => {
    selected.set(withTiming(campusId ? 1 : 0, { duration: duration.slow, easing: ease.out }));
    if (campusId && !reduced) {
      pin.set(withSequence(withTiming(-14, { duration: 120 }), withSpring(0, spring.bouncy)));
    }
  }, [campusId, pin, reduced, selected]);

  useEffect(() => {
    if (campusId || reduced) {
      cancelAnimation(invite);
      invite.set(0);
      return;
    }
    invite.set(withRepeat(withTiming(1, { duration: 1_800, easing: ease.out }), -1, false));
    return () => cancelAnimation(invite);
  }, [campusId, invite, reduced]);

  const cardStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.get() * 0.025 }] }));
  const litStyle = useAnimatedStyle(() => ({ opacity: selected.get() }));
  const pinStyle = useAnimatedStyle(() => ({ transform: [{ translateY: pin.get() }] }));
  const inviteStyle = useAnimatedStyle(() => ({
    opacity: 0.5 * (1 - invite.get()),
    transform: [{ scale: 1 + invite.get() * 0.8 }],
  }));

  return (
    <View style={styles.wrapper}>
      <Pressable
        accessibilityHint="Opens the list of campuses"
        accessibilityLabel={campusId ? `Campus, ${getCampusName(campusId)}` : "Choose your campus"}
        accessibilityRole="button"
        onPress={() => {
          haptic.tap();
          onPress();
        }}
        onPressIn={() => press.set(withTiming(1, { duration: 90 }))}
        onPressOut={() => press.set(withTiming(0, { duration: 180 }))}
        testID={testID}
      >
        <Animated.View style={[styles.card, error ? styles.cardError : null, cardStyle]}>
          <Animated.View style={[StyleSheet.absoluteFill, litStyle]}>
            <LinearGradient colors={gradient.primary} end={{ x: 1, y: 1 }} start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
          </Animated.View>
          <View style={styles.pinWrap}>
            {!campusId && !reduced ? <Animated.View style={[styles.invite, inviteStyle]} /> : null}
            <Animated.View style={[styles.pin, campusId ? styles.pinSelected : null, pinStyle]}>
              <Icon color={campusId ? color.onPrimary : color.heading} name="map-pin" size={20} />
            </Animated.View>
          </View>
          <View style={styles.texts}>
            <Text style={[styles.label, campusId ? styles.onDark : null]}>
              {campusId ? "Your campus · from your student record" : "Your campus"}
            </Text>
            <Text numberOfLines={1} style={[styles.value, campusId ? styles.onDark : styles.placeholder]}>
              {campusId ? getCampusName(campusId) : "Tap to choose"}
            </Text>
          </View>
          <View style={[styles.change, campusId ? styles.changeOnDark : null]}>
            <Text style={[styles.changeText, campusId ? styles.onDark : null]}>{campusId ? "Change" : "Choose"}</Text>
          </View>
        </Animated.View>
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: "center",
    backgroundColor: color.surface,
    borderColor: color.mist,
    borderCurve: "continuous",
    borderRadius: corner.lg,
    borderWidth: 1.5,
    boxShadow: "6px 6px 14px rgba(30, 42, 56, 0.10), -5px -5px 12px rgba(255, 255, 255, 0.95)",
    flexDirection: "row",
    gap: space.md,
    minHeight: 72,
    overflow: "hidden",
    paddingHorizontal: space.md,
  },
  cardError: { borderColor: color.danger },
  change: { alignItems: "center", backgroundColor: color.surfaceIcon, borderRadius: corner.pill, justifyContent: "center", minHeight: 32, paddingHorizontal: space.sm },
  changeOnDark: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  changeText: { color: color.heading, fontSize: 13, fontWeight: "700" },
  error: { color: color.danger, fontSize: 12, marginLeft: space.xxs },
  invite: { backgroundColor: color.mist, borderRadius: 22, height: 44, position: "absolute", width: 44 },
  label: { color: color.textMuted, fontSize: 11 },
  onDark: { color: color.onPrimary },
  pin: {
    alignItems: "center",
    backgroundColor: color.surfaceIcon,
    borderRadius: 22,
    height: 44,
    justifyContent: "center",
    width: 44,
  },
  pinSelected: { backgroundColor: "rgba(255, 255, 255, 0.2)" },
  pinWrap: { alignItems: "center", height: 44, justifyContent: "center", width: 44 },
  placeholder: { color: color.textSecondary, fontWeight: "500" },
  texts: { flex: 1, gap: 2 },
  value: { color: color.heading, fontSize: 17, fontWeight: "700" },
  wrapper: { gap: space.xxs },
});
