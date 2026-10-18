import { useRouter } from "expo-router";
import { type ReactNode, useState } from "react";
import { StyleSheet, Switch, Text, View } from "react-native";

import { AppHeader, Button, Card, Icon, MenuRow, RadioRow, Screen, Sheet, useToast } from "@/components";
import { dateAndTime } from "@/data/format";
import type { AppSettings, ProfileVisibility } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

type Panel = "password" | "logins" | "delete" | "visibility" | "blocked" | "data" | null;

const VISIBILITY: { id: ProfileVisibility; title: string; detail: string }[] = [
  { detail: "Anyone on your campus can see your profile and listings", id: "campus", title: "Everyone on campus" },
  { detail: "Only people who follow you", id: "followers", title: "Followers only" },
  { detail: "Only you. Sellers still see your name on orders", id: "private", title: "Only me" },
];

/** How strong the account protection is: one point each for the protections the student has switched on. */
export function securityScore(input: { twoFactor: boolean; biometric: boolean; otherSessions: number }): { score: number; total: number } {
  const checks = [input.twoFactor, input.biometric, input.otherSessions === 0];
  return { score: checks.filter(Boolean).length, total: checks.length };
}

/** Security and settings: account protection, privacy, notifications, app preferences and your data. */
export function SecurityScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [panel, setPanel] = useState<Panel>(null);
  const close = () => setPanel(null);
  const others = state.loginEvents.filter((event) => !event.current).length;
  const { settings } = state;
  const check = securityScore({ biometric: settings.biometric, otherSessions: others, twoFactor: state.twoFactor });

  const set = <K extends keyof AppSettings>(key: K, value: AppSettings[K], message?: string) => {
    dispatch({ key, type: "setSetting", value });
    if (message) toast.show(message);
  };
  const toggle = (key: keyof AppSettings, label: string, hint?: string) => (
    <MenuRow
      hint={hint}
      label={label}
      right={
        <Switch
          accessibilityLabel={label}
          onValueChange={(value) => set(key, value as AppSettings[typeof key], `${label} ${value ? "on" : "off"}`)}
          thumbColor={color.onPrimary}
          trackColor={{ false: color.borderStrong, true: color.primary }}
          value={Boolean(settings[key])}
        />
      }
    />
  );

  return (
    <Screen>
      <AppHeader back subtitle="Protect your account and choose how Vossie works for you." title="Security and Settings" />

      <Card style={styles.check} testID="security-check" variant="soft">
        <View style={styles.checkTop}>
          <View style={[styles.shield, check.score === check.total && styles.shieldGood]}>
            <Icon color={color.onPrimary} name={check.score === check.total ? "shield" : "alert-triangle"} size={20} />
          </View>
          <View style={styles.flex}>
            <Text style={text.cardTitle}>
              {check.score === check.total ? "Your account is well protected" : `${check.score} of ${check.total} protections on`}
            </Text>
            <Text style={text.caption}>Two-factor, Face ID or Touch ID, and no other signed-in devices.</Text>
          </View>
        </View>
        <View style={styles.meter}>
          {Array.from({ length: check.total }, (_, index) => (
            <View key={index} style={[styles.meterBit, index < check.score && styles.meterOn]} />
          ))}
        </View>
      </Card>

      <Group title="Sign in and security">
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
        {toggle("biometric", "Face ID or Touch ID", "Ask before payments and wallet actions")}
        <MenuRow icon="monitor" label="Login activity" onPress={() => setPanel("logins")} value={others > 0 ? `${others} other` : undefined} />
      </Group>

      <Group title="Privacy">
        <MenuRow
          icon="eye"
          label="Who can see my profile"
          onPress={() => setPanel("visibility")}
          value={VISIBILITY.find((item) => item.id === settings.profileVisibility)?.title}
        />
        {toggle("showCampus", "Show my campus on my profile")}
        {toggle("personalised", "Personalised recommendations", "Use what you view and buy to pick things for you")}
        {toggle("shareTracking", "Let others follow my order tracking", "Only people you send the link to")}
        <MenuRow icon="slash" label="Blocked people" onPress={() => setPanel("blocked")} value={state.blocked.length ? String(state.blocked.length) : "None"} />
      </Group>

      <Group title="Notifications">
        {toggle("notifyOrders", "Order updates")}
        {toggle("notifyMessages", "Messages")}
        {toggle("notifyAlerts", "Price drops and back in stock")}
        {toggle("notifyPromos", "Promotions and deals")}
      </Group>

      <Group title="App">
        {toggle("haptics", "Haptic feedback", "Soft taps when you like, pay or switch")}
        {toggle("sounds", "Sounds", "Short sounds on success. Off in silent mode")}
        <MenuRow icon="globe" label="Language" value="English" />
      </Group>

      <Group title="Your data">
        <MenuRow icon="download" label="Download my data" onPress={() => setPanel("data")} />
        <MenuRow
          icon="clock"
          label="Clear search history"
          onPress={() => {
            dispatch({ type: "clearSearches" });
            toast.show("Search history cleared");
          }}
        />
        <MenuRow danger icon="trash-2" label="Delete account" onPress={() => setPanel("delete")} />
      </Group>

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

      <Sheet onClose={close} title="Who can see my profile" visible={panel === "visibility"}>
        {VISIBILITY.map((item) => (
          <RadioRow
            key={item.id}
            onPress={() => {
              set("profileVisibility", item.id, `Profile: ${item.title.toLowerCase()}`);
              close();
            }}
            selected={settings.profileVisibility === item.id}
            subtitle={item.detail}
            title={item.title}
          />
        ))}
      </Sheet>

      <Sheet onClose={close} title="Blocked people" visible={panel === "blocked"}>
        {state.blocked.length === 0 ? (
          <Text style={text.bodySmall}>You haven&apos;t blocked anyone. You can block someone from their profile or a conversation.</Text>
        ) : (
          state.blocked.map((person) => (
            <Card key={person.id} style={styles.blockedRow} variant="row">
              <View style={styles.flex}>
                <Text style={text.cardTitle}>{person.name}</Text>
                <Text style={text.caption}>Blocked {dateAndTime(person.blockedAt)}</Text>
              </View>
              <Button
                label="Unblock"
                onPress={() => {
                  dispatch({ type: "unblockUser", userId: person.id });
                  toast.show(`${person.name} unblocked`);
                }}
                size="sm"
                variant="outline"
              />
            </Card>
          ))
        )}
      </Sheet>

      <Sheet onClose={close} title="Download my data" visible={panel === "data"}>
        <Text style={text.body}>
          You will be able to request a copy of your profile, orders, messages and wallet history here. In this demo nothing is exported.
        </Text>
        <Button fullWidth label="Got it" onPress={close} />
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

function Group({ children, title }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.group}>
      <Text accessibilityRole="header" style={styles.groupTitle}>
        {title}
      </Text>
      <View style={styles.menu}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  blockedRow: { alignItems: "center", flexDirection: "row", gap: space.sm },
  check: { gap: space.sm, marginTop: space.sm },
  checkTop: { alignItems: "center", flexDirection: "row", gap: space.sm },
  flex: { flex: 1 },
  group: { marginTop: space.md },
  groupTitle: { ...text.sectionTitle, marginBottom: space.xs },
  menu: { gap: space.xs },
  meter: { flexDirection: "row", gap: 6 },
  meterBit: { backgroundColor: color.mist, borderRadius: 3, flex: 1, height: 6 },
  meterOn: { backgroundColor: color.success },
  shield: { alignItems: "center", backgroundColor: color.warning, borderRadius: corner.pill, height: 40, justifyContent: "center", width: 40 },
  shieldGood: { backgroundColor: color.success },
});
