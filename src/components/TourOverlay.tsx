import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { haptic } from "@/lib/haptics";
import { spring } from "@/theme/motion";
import { color, corner, gradient, space } from "@/theme/tokens";

import { Button } from "./Button";
import { Icon, type IconName } from "./Icon";

export const TOUR_CARDS: { icon: IconName; title: string; body: string }[] = [
  { body: "Food, books, tech, fashion and services from students and stores on your campus.", icon: "compass", title: "Discover your campus" },
  { body: "A campus courier, collection, hub to hub from other campuses, or a third-party courier when you are in a rush.", icon: "truck", title: "Get it your way" },
  { body: "Earn Vossie Points on every order, invite friends for wallet credit and keep your vouchers in one place.", icon: "award", title: "Earn as you go" },
];

/** Three animated cards shown once after the first sign-in. Skip at any time. */
export function TourOverlay({ onDone, visible }: { visible: boolean; onDone: () => void }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const scroller = useRef<ScrollView>(null);
  const [page, setPage] = useState(0);
  const last = page === TOUR_CARDS.length - 1;

  const next = () => {
    if (last) {
      haptic.success();
      onDone();
      return;
    }
    haptic.tap();
    scroller.current?.scrollTo({ animated: true, x: (page + 1) * width });
    setPage(page + 1);
  };

  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / width);
    if (index !== page) {
      haptic.select();
      setPage(index);
    }
  };

  return (
    <Modal animationType="fade" onRequestClose={onDone} statusBarTranslucent transparent visible={visible}>
      <View style={styles.backdrop} testID="tour">
        <LinearGradient colors={gradient.ink} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <Pressable accessibilityLabel="Skip the tour" accessibilityRole="button" hitSlop={10} onPress={onDone} style={[styles.skip, { top: insets.top + space.sm }]} testID="tour-skip">
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
        <ScrollView
          horizontal
          onMomentumScrollEnd={onEnd}
          pagingEnabled
          ref={scroller}
          showsHorizontalScrollIndicator={false}
          style={{ height: height * 0.62, marginTop: insets.top + 80 }}
        >
          {TOUR_CARDS.map((card, index) => (
            <TourCard active={index === page} card={card} key={card.title} width={width} />
          ))}
        </ScrollView>
        <View style={styles.dots}>
          {TOUR_CARDS.map((card, index) => (
            <View key={card.title} style={[styles.dot, index === page && styles.dotOn]} />
          ))}
        </View>
        <View style={[styles.footer, { paddingBottom: insets.bottom + space.lg }]}>
          <Button fullWidth label={last ? "Get started" : "Next"} onPress={next} size="lg" testID="tour-next" variant="light" />
        </View>
      </View>
    </Modal>
  );
}

function TourCard({ active, card, width }: { card: (typeof TOUR_CARDS)[number]; active: boolean; width: number }) {
  const reduced = useReducedMotion();
  const pop = useSharedValue(active ? 1 : 0);
  useEffect(() => {
    pop.set(reduced ? (active ? 1 : 0) : withSpring(active ? 1 : 0, spring.bouncy));
  }, [active, pop, reduced]);
  const iconStyle = useAnimatedStyle(() => ({ opacity: 0.4 + pop.get() * 0.6, transform: [{ scale: 0.7 + pop.get() * 0.3 }] }));
  const textStyle = useAnimatedStyle(() => ({ opacity: pop.get(), transform: [{ translateY: (1 - pop.get()) * 14 }] }));
  return (
    <View style={[styles.card, { width }]}>
      <Animated.View style={[styles.iconWrap, iconStyle]}>
        <Icon color={color.ink} name={card.icon} size={64} />
      </Animated.View>
      <Animated.View style={[styles.texts, textStyle]}>
        <Text accessibilityRole="header" style={styles.title}>
          {card.title}
        </Text>
        <Text style={styles.body}>{card.body}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: color.ink, flex: 1 },
  body: { color: "rgba(255,255,255,0.86)", fontSize: 16, lineHeight: 24, textAlign: "center" },
  card: { alignItems: "center", gap: space.xl, justifyContent: "center", paddingHorizontal: space.xl },
  dot: { backgroundColor: "rgba(255,255,255,0.3)", borderRadius: 4, height: 8, width: 8 },
  dotOn: { backgroundColor: color.onPrimary, width: 24 },
  dots: { alignItems: "center", flexDirection: "row", gap: 6, justifyContent: "center", marginTop: space.md },
  footer: { marginTop: "auto", paddingHorizontal: space.lg },
  iconWrap: { alignItems: "center", backgroundColor: color.mist, borderRadius: corner.xl * 2, height: 150, justifyContent: "center", width: 150 },
  skip: { position: "absolute", right: space.lg, zIndex: 5 },
  skipText: { color: color.mist, fontSize: 15, fontWeight: "700" },
  texts: { alignItems: "center", gap: space.sm },
  title: { color: color.onPrimary, fontSize: 28, fontWeight: "800", textAlign: "center" },
});
