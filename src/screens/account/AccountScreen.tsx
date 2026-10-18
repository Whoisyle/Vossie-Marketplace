import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Avatar,
  Button,
  Card,
  Icon,
  MenuRow,
  RadioRow,
  Screen,
  Sheet,
  StatusBadge,
  useToast,
} from "@/components";
import { getCampusName } from "@/data/repository";
import type { Role } from "@/data/types";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

export const roleLabels: Record<Role, string> = {
  buyer: "Buyer",
  seller: "Seller",
  service_provider: "Service provider",
};

/** Account tab: profile summary and entry points to the account sub-screens. */
export function AccountScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [roleOpen, setRoleOpen] = useState(false);
  const profile = state.profile;
  if (!profile) return null;

  const go = (path: string) => router.push(path as Href);
  const unread = state.conversations.filter((item) => item.unread).length;

  return (
    <Screen testID="account-screen">
      <AppHeader title="Your account" />
      <Card style={styles.profile} variant="soft">
        <Avatar name={profile.fullName} size={56} uri={profile.avatarUri} />
        <View style={styles.flex}>
          <Text numberOfLines={1} style={text.pageTitle}>
            {profile.fullName}
          </Text>
          {profile.isVerifiedStudent ? (
            <StatusBadge icon="shield" label="Verified Student" tone="neutral" />
          ) : null}
        </View>
      </Card>

      <Card style={styles.facts}>
        <Fact label="Current campus" value={getCampusName(profile.campusId)} />
        <Fact label="Active workspace" value={roleLabels[profile.role]} />
      </Card>

      <View style={styles.menu}>
        <MenuRow icon="repeat" label="Switch role" onPress={() => setRoleOpen(true)} />
        <MenuRow icon="edit-2" label="Edit Profile" onPress={() => go("/account/edit-profile")} />
        <MenuRow icon="credit-card" label="Wallet" onPress={() => go("/account/wallet")} />
        <MenuRow
          icon="mail"
          label="Inbox"
          onPress={() => go("/account/inbox")}
          value={unread ? `${unread} new` : undefined}
        />
        <MenuRow icon="shield" label="Security and Settings" onPress={() => go("/account/security")} />
        <MenuRow icon="help-circle" label="Help" onPress={() => go("/account/help")} />
      </View>

      <View style={styles.signOut}>
        <Button
          fullWidth
          icon="log-out"
          label="Sign out"
          onPress={() => {
            dispatch({ type: "signOut" });
            router.replace("/sign-in");
          }}
          variant="outline"
        />
      </View>

      <Sheet onClose={() => setRoleOpen(false)} title="Switch role" visible={roleOpen}>
        {(Object.keys(roleLabels) as Role[]).map((role) => (
          <RadioRow
            key={role}
            onPress={() => {
              dispatch({ role, type: "switchRole" });
              setRoleOpen(false);
              toast.show(`Switched to ${roleLabels[role]}`);
            }}
            selected={profile.role === role}
            subtitle={role === "buyer" ? "Browse and buy on campus" : "Selling tools arrive in a later release"}
            title={roleLabels[role]}
          />
        ))}
        <View style={styles.sheetNote}>
          <Icon name="info" size={14} />
          <Text style={text.caption}>Roles change this demo account only.</Text>
        </View>
      </Sheet>
    </Screen>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.fact}>
      <Text style={text.bodySmall}>{label}</Text>
      <Text numberOfLines={1} style={styles.factValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fact: { flexDirection: "row", gap: space.sm, justifyContent: "space-between", paddingVertical: 6 },
  factValue: { color: color.heading, flexShrink: 1, fontSize: 14, fontWeight: "600" },
  facts: { marginTop: space.sm },
  flex: { flex: 1, gap: 4 },
  menu: { gap: space.xs, marginTop: space.md },
  profile: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.sm },
  sheetNote: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.sm },
  signOut: { marginTop: space.lg },
});
