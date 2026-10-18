import { type ReactNode, useEffect, useRef, useState } from "react";
import {
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from "react-native-reanimated";

import { FilterChips, type FilterOption } from "@/components";
import { haptic } from "@/lib/haptics";
import { duration, ease } from "@/theme/motion";
import { space } from "@/theme/tokens";

/**
 * Category chips on top, and the listings below as pages you can swipe left and right. The page area grows or
 * shrinks to the height of the page you are on, so the whole screen still scrolls up and down normally.
 */
export function CategoryPager<T extends string>({
  onChange,
  options,
  pageWidth,
  renderPage,
  value,
}: {
  options: FilterOption<T>[];
  value: T;
  onChange: (key: T) => void;
  pageWidth: number;
  renderPage: (key: T) => ReactNode;
}) {
  const scroller = useRef<ScrollView>(null);
  const index = Math.max(0, options.findIndex((option) => option.key === value));
  const [heights, setHeights] = useState<Record<string, number>>({});
  const height = useSharedValue(0);
  const settled = useRef(index);

  const pageHeight = heights[value];
  useEffect(() => {
    if (pageHeight === undefined) return;
    height.set(height.get() === 0 ? pageHeight : withTiming(pageHeight, { duration: duration.base, easing: ease.out }));
  }, [height, pageHeight]);

  // a tap on a chip slides the pager to that page
  useEffect(() => {
    if (settled.current !== index) {
      scroller.current?.scrollTo({ animated: true, x: index * pageWidth });
      settled.current = index;
    }
  }, [index, pageWidth]);

  const onEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.min(options.length - 1, Math.max(0, Math.round(event.nativeEvent.contentOffset.x / pageWidth)));
    settled.current = next;
    const option = options[next];
    if (option && option.key !== value) {
      haptic.select();
      onChange(option.key);
    }
  };

  const frame = useAnimatedStyle(() => (height.get() > 0 ? { height: height.get() } : {}));

  return (
    <View>
      <FilterChips onChange={onChange} options={options} value={value} />
      <Animated.View style={[styles.frame, frame]}>
        <ScrollView
          decelerationRate="fast"
          horizontal
          nestedScrollEnabled
          onMomentumScrollEnd={onEnd}
          pagingEnabled
          ref={scroller}
          showsHorizontalScrollIndicator={false}
          style={{ marginHorizontal: -space.lg }}
          testID="category-pager"
        >
          {options.map((option) => (
            <View
              key={option.key}
              onLayout={(event) => {
                const next = Math.ceil(event.nativeEvent.layout.height);
                setHeights((current) => (current[option.key] === next ? current : { ...current, [option.key]: next }));
              }}
              style={[styles.page, { paddingHorizontal: space.lg, width: pageWidth }]}
            >
              {renderPage(option.key)}
            </View>
          ))}
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // pages are measured at their natural height, but only the active page's height is shown
  frame: { overflow: "hidden" },
  page: { alignSelf: "flex-start" },
});
