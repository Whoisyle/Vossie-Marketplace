import * as Clipboard from "expo-clipboard";
import { useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import QRCode from "react-native-qrcode-svg";

import { generateSecret, groupSecret, otpauthUri, verifyTotp } from "@/lib/totp";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

import { Button } from "./Button";
import { Sheet } from "./Sheet";
import { TextField } from "./TextField";
import { useToast } from "./Toast";

/**
 * Two-factor sign-in with an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password and so
 * on). Turning it on shows a QR code and a key, then asks for the 6-digit code the app shows; only a correct
 * code switches it on. Turning it off also asks for a code. In the demo the key lives on this phone; with the
 * backend on it is held by Supabase Auth (see services/auth.ts).
 */
export function TwoFactorSheet({ mode, onClose, visible }: { visible: boolean; mode: "enable" | "disable"; onClose: () => void }) {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  // a new key each time the sheet opens for setup
  const [fresh] = useState(() => generateSecret());
  const secret = mode === "enable" ? fresh : (state.twoFactorSecret ?? "");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const account = state.profile?.email ?? "student";

  const confirm = () => {
    // a phone that turned two-factor on before keys existed has none to check against, so a disable just works
    const ok = mode === "disable" && !secret ? true : verifyTotp(secret, code);
    if (!ok) {
      setError("That code isn't right. Check the code in your authenticator app and try again.");
      return;
    }
    if (mode === "enable") dispatch({ secret, type: "enableTwoFactor" });
    else dispatch({ type: "disableTwoFactor" });
    setCode("");
    setError(null);
    onClose();
    toast.show(mode === "enable" ? "Two-factor sign-in is on" : "Two-factor sign-in is off");
  };

  return (
    <Sheet onClose={onClose} title={mode === "enable" ? "Set up two-factor sign-in" : "Turn off two-factor sign-in"} visible={visible}>
      {mode === "enable" ? (
        <>
          <Text style={text.bodySmall}>
            1. Open an authenticator app and add Vossie by scanning this code, or typing the key. 2. Enter the 6-digit code the app shows.
          </Text>
          <View style={styles.qrWrap} testID="two-factor-qr">
            <View style={styles.qr}>
              <QRCode backgroundColor="#FFFFFF" color="#0B1626" size={150} value={otpauthUri(account, secret)} />
            </View>
          </View>
          <Text accessibilityLabel={`Setup key ${groupSecret(secret)}`} selectable style={styles.key} testID="two-factor-key">
            {groupSecret(secret)}
          </Text>
          <View style={styles.row}>
            <View style={styles.flex}>
              <Button
                fullWidth
                label="Copy key"
                onPress={() => {
                  void Clipboard.setStringAsync(secret);
                  toast.show("Key copied");
                }}
                size="sm"
                variant="soft"
              />
            </View>
            <View style={styles.flex}>
              <Button
                fullWidth
                label="Open authenticator"
                onPress={() => void Linking.openURL(otpauthUri(account, secret)).catch(() => toast.show("No authenticator app found. Type the key instead."))}
                size="sm"
                variant="outline"
              />
            </View>
          </View>
        </>
      ) : (
        <Text style={text.bodySmall}>Enter the 6-digit code from your authenticator app to turn two-factor sign-in off.</Text>
      )}
      <TextField
        error={error ?? undefined}
        keyboardType="number-pad"
        label="6-digit code"
        maxLength={7}
        onChangeText={(value) => {
          setCode(value);
          setError(null);
        }}
        placeholder="123456"
        value={code}
      />
      <Button fullWidth label={mode === "enable" ? "Verify and turn on" : "Turn off"} onPress={confirm} testID="two-factor-confirm" variant={mode === "enable" ? "primary" : "danger"} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  key: { color: color.heading, fontSize: 16, fontVariant: ["tabular-nums"], fontWeight: "700", letterSpacing: 1, textAlign: "center" },
  qr: { backgroundColor: "#FFFFFF", borderColor: color.border, borderRadius: corner.md, borderWidth: 1, padding: space.sm },
  qrWrap: { alignItems: "center", marginVertical: space.sm },
  row: { flexDirection: "row", gap: space.xs },
});
