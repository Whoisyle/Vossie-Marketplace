import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AppHeader, Button, Card, MenuRow, Screen, Sheet, useToast } from "@/components";
import { dateAndTime } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

type Panel = "password" | "logins" | "delete" | null;

/** Security and settings: password info, two-factor, login activity and account deletion. */
export function SecurityScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const others = state.loginEvents.filter((event) => !event.current).length;

  return (
    <Screen>
      <AppHeader back subtitle="Manage your account safety and privacy." title="Security and Settings" />
      <View style={styles.menu}>
        <MenuRow icon="key" label="Change password" onPress={() => setPanel("password")} />
        <MenuRow
          icon="smartphone"
          label="Two-factor authentication"
          right={
            <Switch
              accessibilityLabel="Two-factor authentication"
              onValueChange={(enabled) => {
                dispatch({ enabled, type: "setTwoFactor" });
                toast.show(`Two-factor authentication ${enabled ? "on" : "off"}`);
              }}
              thumbColor={color.onPrimary}
              trackColor={{ false: color.borderStrong, true: color.primary }}
              value={state.twoFactor}
            />
          }
        />
        <MenuRow icon="monitor" label="Login activity" onPress={() => setPanel("logins")} />
        <MenuRow danger icon="trash-2" label="Delete account" onPress={() => setPanel("delete")} />
      </View>

      <Sheet onClose={close} title="Change password" visible={panel === "password"}>
        <Text style={text.body}>
          Your Vossie password is your Eduvos Microsoft account password. Change it with Eduvos, then sign in again.
        </Text>
        <Button fullWidth label="Got it" onPress={close} />
      </Sheet>

      <Sheet onClose={close} title="Login activity" visible={panel === "logins"}>
        {state.loginEvents.map((event) => (
          <Card key={event.id} variant="row">
            <Text style={text.cardTitle}>
              {event.device}
              {event.current ? " · This device" : ""}
            </Text>
            <Text style={text.caption}>
              {event.location} · {dateAndTime(event.at)}
            </Text>
          </Card>
        ))}
        {others > 0 ? (
          <Button
            fullWidth
            label="Sign out other sessions"
            onPress={() => {
              dispatch({ type: "signOutOtherSessions" });
              toast.show("Other sessions signed out");
            }}
            variant="outline"
          />
        ) : null}
      </Sheet>

      <Sheet onClose={close} title="Delete account?" visible={panel === "delete"}>
        <Text style={text.body}>
          This removes your demo profile, orders and wallet from this device. This can&apos;t be undone.
        </Text>
        <Button
          fullWidth
          label="Delete my account"
          onPress={() => {
            close();
            dispatch({ type: "deleteAccount" });
            router.replace("/sign-in");
          }}
          variant="danger"
        />
        <Button fullWidth label="Keep my account" onPress={close} variant="outline" />
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  menu: { gap: space.xs, marginTop: space.sm },
});
