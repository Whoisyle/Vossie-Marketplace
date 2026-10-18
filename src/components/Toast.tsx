import { createContext, use, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { color, corner, space } from "@/theme/tokens";

import { Icon } from "./Icon";

type ToastContextValue = { show: (message: string) => void };

const ToastContext = createContext<ToastContextValue>({ show: () => undefined });

/** Short confirmation messages such as "Added to cart". */
export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 2200);
  }, []);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return (
    <ToastContext value={{ show }}>
      {children}
      {message ? (
        <View
          accessibilityLiveRegion="polite"
          pointerEvents="none"
          style={[styles.toast, { bottom: insets.bottom + 96 }]}
        >
          <Icon name="check-circle" size={18} color={color.onPrimary} />
          <Text style={styles.text}>{message}</Text>
        </View>
      ) : null}
    </ToastContext>
  );
}

export function useToast() {
  return use(ToastContext);
}

const styles = StyleSheet.create({
  text: { color: color.onPrimary, flexShrink: 1, fontSize: 14, fontWeight: "600" },
  toast: {
    alignItems: "center",
    alignSelf: "center",
    backgroundColor: color.primary,
    borderRadius: corner.pill,
    flexDirection: "row",
    gap: space.xs,
    maxWidth: 360,
    paddingHorizontal: space.lg,
    paddingVertical: space.sm,
    position: "absolute",
  },
});
