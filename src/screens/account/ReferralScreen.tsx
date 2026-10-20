import { LinearGradient } from "expo-linear-gradient";
import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Icon, Screen, StatusBadge, TextField, useToast } from "@/components";
import { inviteStatusLabel, REFERRAL_REWARD_POINTS, referralCodeFor, validateReferralCode } from "@/data/phase4";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, gradient, space, text } from "@/theme/tokens";

/** Refer a friend: your code to share, enter a friend's code, and who you have invited. */
export function ReferralScreen() {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const profile = state.profile;
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  if (!profile) return null;

  const code = referralCodeFor(profile.fullName || profile.email, profile.studentNumber);
  const reward = `${REFERRAL_REWARD_POINTS} points`;
  const earned = state.referral.invited.filter((friend) => friend.status === "rewarded").length * REFERRAL_REWARD_POINTS;

  const share = async () => {
    try {
      await Share.share({
        message: `Join me on Vossie, the campus marketplace. Use my code ${code} when you sign up and we both get ${reward} after your first delivered order.`,
      });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  const apply = () => {
    const problem = validateReferralCode(input, code);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    dispatch({ code: input, type: "applyReferral" });
    setInput("");
    toast.show(`Code applied. You get ${reward} after your first delivered order`);
  };

  return (
    <Screen testID="referral-screen">
      <AppHeader back subtitle={`You and your friend each get ${reward}.`} title="Refer a friend" />

      <View style={styles.codeCard}>
        <LinearGradient colors={gradient.teal} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <View pointerEvents="none" style={styles.bubbleBig} />
        <View pointerEvents="none" style={styles.bubbleSmall} />
        <View style={styles.codeBadge}>
          <Icon color={color.onPrimary} name="users" size={22} />
        </View>
        <Text style={styles.codeLabel}>Your code</Text>
        <Text accessibilityLabel={`Your referral code is ${code}`} selectable style={styles.code}>
          {code}
        </Text>
        <Button icon="share-2" label="Share my code" onPress={() => void share()} testID="share-code" variant="light" />
      </View>
      <Text style={[text.caption, styles.small]}>
        When a friend signs up with your code and their first order is delivered, you both get {reward}, added to your Vossie Points.
      </Text>

      <Text style={styles.heading}>Earned so far</Text>
      <View style={styles.earned}>
        <LinearGradient colors={["#F6D96B", "#CB9A1D"]} end={{ x: 1, y: 1 }} pointerEvents="none" start={{ x: 0, y: 0 }} style={StyleSheet.absoluteFill} />
        <View style={styles.earnedBadge}>
          <Icon color="#4A3606" name="gift" size={24} />
        </View>
        <View>
          <Text style={styles.earnedLabel}>Points from friends</Text>
          <Text style={styles.earnedValue}>{earned} points</Text>
        </View>
      </View>

      <Text style={styles.heading}>Got a friend&apos;s code?</Text>
      {state.referral.referredBy ? (
        <Card style={styles.applied} variant="soft">
          <Icon color={color.success} name="check-circle" size={18} />
          <View style={styles.flex}>
            <Text style={text.cardTitle}>{state.referral.referredBy}</Text>
            <Text style={text.caption}>
              {state.referral.rewardPaid ? `${reward} added to your points` : `You get ${reward} after your first delivered order`}
            </Text>
          </View>
        </Card>
      ) : (
        <View style={styles.enter}>
          <TextField
            autoCapitalize="characters"
            autoCorrect={false}
            error={error ?? undefined}
            label="Friend's code"
            onChangeText={(value) => {
              setInput(value);
              setError(null);
            }}
            placeholder="KAMO-1234"
            value={input}
          />
          <Button disabled={!input.trim()} fullWidth label="Apply code" onPress={apply} testID="apply-referral" />
        </View>
      )}

      <Text style={styles.heading}>Friends you invited</Text>
      <View style={styles.list}>
        {state.referral.invited.map((friend) => (
          <Card key={friend.id} style={styles.friend} variant="row">
            <View style={[styles.initial, { backgroundColor: friend.status === "rewarded" ? "#E6F4EC" : friend.status === "ordered" ? "#FFF4DE" : "#E8F2FA" }]}>
              <Text style={[styles.initialText, { color: friend.status === "rewarded" ? color.success : friend.status === "ordered" ? color.warning : color.info }]}>{friend.name.slice(0, 1)}</Text>
            </View>
            <View style={styles.flex}>
              <Text style={text.cardTitle}>{friend.name}</Text>
              <Text style={text.caption}>{inviteStatusLabel[friend.status]}</Text>
            </View>
            <StatusBadge label={friend.status === "rewarded" ? "Rewarded" : friend.status === "ordered" ? "Ordered" : "Joined"} tone={friend.status === "rewarded" ? "success" : "info"} />
          </Card>
        ))}
      </View>
      <Text style={[text.caption, styles.small]}>Demo list: invites are not connected to real accounts yet.</Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  applied: { alignItems: "center", flexDirection: "row", gap: space.sm },
  code: { color: color.onPrimary, fontSize: 36, fontWeight: "800", letterSpacing: 3 },
  bubbleBig: { backgroundColor: "rgba(255,255,255,0.10)", borderRadius: 100, height: 200, position: "absolute", right: -50, top: -60, width: 200 },
  bubbleSmall: { backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 30, bottom: -14, height: 70, position: "absolute", right: 80, width: 70 },
  codeBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  codeCard: { alignItems: "flex-start", borderCurve: "continuous", borderRadius: corner.xl, boxShadow: "0 10px 24px rgba(30, 42, 56, 0.18)", gap: space.xs, marginTop: space.sm, overflow: "hidden", padding: space.lg },
  codeLabel: { color: color.onPrimary, fontSize: 13, opacity: 0.85 },
  earned: { alignItems: "center", borderCurve: "continuous", borderRadius: corner.xl, flexDirection: "row", gap: space.md, overflow: "hidden", padding: space.md },
  earnedBadge: { alignItems: "center", backgroundColor: "rgba(255,255,255,0.4)", borderRadius: 26, height: 52, justifyContent: "center", width: 52 },
  earnedLabel: { color: "#4A3606", fontSize: 13, fontWeight: "600", opacity: 0.85 },
  earnedValue: { color: "#4A3606", fontSize: 26, fontWeight: "800" },
  enter: { gap: space.xs },
  flex: { flex: 1 },
  friend: { alignItems: "center", flexDirection: "row", gap: space.sm },
  initial: { alignItems: "center", borderRadius: 20, height: 40, justifyContent: "center", width: 40 },
  initialText: { fontSize: 16, fontWeight: "800" },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.lg },
  list: { gap: space.xs },
  small: { borderRadius: corner.sm, marginTop: space.xs },
});
