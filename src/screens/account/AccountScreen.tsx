import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import {
  AppHeader,
  Button,
  Card,
  Icon,
  MenuRow,
  RadioRow,
  Screen,
  Sheet,
  StudentCard,
  useToast,
} from "@/components";
import { deliveryLabels, deliveryOption, type DeliveryMode } from "@/data/delivery";
import { formatRand } from "@/data/format";
import { nextTier, pointsBalance, pointsValueCents, tierFor } from "@/data/points";
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
  const [deliveryOpen, setDeliveryOpen] = useState(false);
  const [now] = useState(() => Date.now());
  const profile = state.profile;
  if (!profile) return null;

  const go = (path: string) => router.push(path as Href);
  const unread = state.conversations.filter((item) => item.unread).length;
  const points = pointsBalance(state.orders, state.pointsLedger);
  const tier = tierFor(points);
  const upcoming = nextTier(points);

  return (
    <Screen testID="account-screen">
      <AppHeader title="Your account" />
      <View style={styles.cardGap}>
        <StudentCard
          campusName={getCampusName(profile.campusId)}
          name={profile.fullName}
          studentNumber={profile.studentNumber}
          verified={profile.isVerifiedStudent}
          width={220}
        />
      </View>

      <Card onPress={() => go("/account/points")} style={styles.points} testID="points-card" variant="soft">
        <View style={styles.pointsTop}>
          <View style={styles.flex}>
            <Text style={text.caption}>Vossie Points · {tier.label}</Text>
            <Text style={styles.pointsValue}>{points.toLocaleString("en-ZA")} pts</Text>
            <Text style={text.caption}>Worth {formatRand(pointsValueCents(points))} in wallet credit</Text>
          </View>
          <View style={styles.tierBadge}>
            <Icon color={color.ink} name="award" size={14} />
            <Text style={styles.tierText}>{tier.label}</Text>
          </View>
        </View>
        {upcoming ? (
          <View style={styles.progressBlock}>
            <View accessibilityLabel={`${Math.round(upcoming.progress * 100)} percent of the way to ${upcoming.tier.label}`} accessibilityRole="progressbar" style={styles.bar}>
              <View style={[styles.barFill, { width: `${Math.max(4, Math.round(upcoming.progress * 100))}%` }]} />
            </View>
            <Text style={text.caption}>
              {upcoming.remaining} more points to {upcoming.tier.label}
            </Text>
          </View>
        ) : (
          <Text style={text.caption}>You are at the top tier.</Text>
        )}
        <Text style={text.caption}>Earn 1 point for every R10 you spend. Tap to redeem or see your history.</Text>
      </Card>

      <Card style={styles.facts}>
        <Fact label="Current campus" value={getCampusName(profile.campusId)} />
        <Fact label="Active workspace" value={roleLabels[profile.role]} />
        <Fact label="Delivery" value={state.preferredDelivery ? deliveryLabels[state.preferredDelivery] : "Auto-pick"} />
      </Card>

      <View style={styles.menu}>
        <MenuRow icon="repeat" label="Switch role" onPress={() => setRoleOpen(true)} />
        <MenuRow icon="truck" label="Delivery preferences" onPress={() => setDeliveryOpen(true)} value={state.preferredDelivery ? deliveryLabels[state.preferredDelivery] : "Auto-pick"} />
        <MenuRow icon="edit-2" label="Edit Profile" onPress={() => go("/account/edit-profile")} />
        <MenuRow icon="credit-card" label="Wallet" onPress={() => go("/account/wallet")} />
        <MenuRow icon="award" label="Vossie Points" onPress={() => go("/account/points")} value={`${points.toLocaleString("en-ZA")} pts`} />
        <MenuRow icon="tag" label="Coupons and offers" onPress={() => go("/account/vouchers")} value={`${state.userVouchers.filter((item) => new Date(item.expiresAt).getTime() >= now).length} active`} />
        <MenuRow icon="gift" label="Refer friends" onPress={() => go("/account/referral")} value="Earn 200 pts" />
        <MenuRow icon="star" label="Subscriptions" onPress={() => go("/account/subscriptions")} value={`${state.subscriptions.filter((item) => new Date(item.renewsAt).getTime() >= now).length} active`} />
        <MenuRow
          icon="mail"
          label="Inbox"
          onPress={() => go("/account/inbox")}
          value={unread ? `${unread} new` : undefined}
        />
        <MenuRow icon="bookmark" label="Wishlist and saved searches" onPress={() => go("/account/wishlist")} />
        <MenuRow icon="compass" label="Campus extras" onPress={() => go("/account/campus")} value="Swap, tutors, lost and found" />
        <MenuRow icon="heart" label="Safety" onPress={() => go("/account/safety")} value="Check-up" />
        <MenuRow icon="shield" label="Security and Settings" onPress={() => go("/account/security")} />
        <MenuRow icon="help-circle" label="Help" onPress={() => go("/account/help")} />
        <MenuRow icon="file-text" label="Terms and conditions" onPress={() => go("/account/legal")} />
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

      <Sheet onClose={() => setDeliveryOpen(false)} title="Delivery preferences" visible={deliveryOpen}>
        <Text style={[text.bodySmall, styles.sheetIntro]}>
          Checkout picks the best option for each order and you can always change it there. Choose what you would like it to pick first.
        </Text>
        <RadioRow
          onPress={() => {
            dispatch({ mode: null, type: "setPreferredDelivery" });
            setDeliveryOpen(false);
          }}
          selected={state.preferredDelivery === null}
          subtitle="Vossie picks the fastest option that is available"
          title="Auto-pick"
        />
        {(["campus-courier", "collection", "third-party"] as DeliveryMode[]).map((mode) => {
          const option = deliveryOption(mode);
          return (
            <RadioRow
              key={mode}
              onPress={() => {
                dispatch({ mode, type: "setPreferredDelivery" });
                setDeliveryOpen(false);
                toast.show(`${option.label} saved`);
              }}
              selected={state.preferredDelivery === mode}
              subtitle={`${option.eta} · ${option.feeCents ? formatRand(option.feeCents) : "Free"} · ${option.detail}`}
              title={option.label}
            />
          );
        })}
        <View style={styles.sheetNote}>
          <Icon name="info" size={14} />
          <Text style={text.caption}>
            Items from another campus always go hub to hub (you can switch to a third-party courier at checkout). A third-party courier is also offered when no Vossie courier is free.
          </Text>
        </View>
      </Sheet>

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
  bar: { backgroundColor: color.mist, borderRadius: 4, height: 8, overflow: "hidden" },
  barFill: { backgroundColor: color.primary, borderRadius: 4, height: 8 },
  cardGap: { alignItems: "center", marginTop: space.sm },
  points: { gap: space.sm, marginTop: space.sm },
  pointsTop: { alignItems: "center", flexDirection: "row", gap: space.sm },
  pointsValue: { color: color.heading, fontSize: 26, fontWeight: "800" },
  progressBlock: { gap: 4 },
  sheetIntro: { marginBottom: space.xs },
  tierBadge: { alignItems: "center", backgroundColor: color.mist, borderRadius: 14, flexDirection: "row", gap: 4, paddingHorizontal: 10, paddingVertical: 5 },
  tierText: { color: color.ink, fontSize: 12, fontWeight: "800" },
  fact: { flexDirection: "row", gap: space.sm, justifyContent: "space-between", paddingVertical: 6 },
  factValue: { color: color.heading, flexShrink: 1, fontSize: 14, fontWeight: "600" },
  facts: { marginTop: space.sm },
  flex: { flex: 1, gap: 4 },
  menu: { gap: space.xs, marginTop: space.md },
  profile: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.sm },
  sheetNote: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.sm },
  signOut: { marginTop: space.lg },
});
