import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Icon, Screen, StatusBadge, TextField, useToast } from "@/components";
import { inviteStatusLabel, REFERRAL_REWARD_POINTS, referralCodeFor, validateReferralCode } from "@/data/phase4";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

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

      <Card style={styles.codeCard} variant="primary">
        <Text style={styles.codeLabel}>Your code</Text>
        <Text accessibilityLabel={`Your referral code is ${code}`} selectable style={styles.code}>
          {code}
        </Text>
        <Button icon="share-2" label="Share my code" onPress={() => void share()} testID="share-code" variant="light" />
      </Card>
      <Text style={[text.caption, styles.small]}>
        When a friend signs up with your code and their first order is delivered, you both get {reward}, added to your Vossie Points.
      </Text>

      <Text style={styles.heading}>Earned so far</Text>
      <Card style={styles.earned} variant="soft">
        <Icon color={color.heading} name="gift" size={22} />
        <Text style={styles.earnedValue}>{earned} points</Text>
      </Card>

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
  codeCard: { alignItems: "flex-start", gap: space.xs, marginTop: space.sm },
  codeLabel: { color: color.onPrimary, fontSize: 13, opacity: 0.85 },
  earned: { alignItems: "center", flexDirection: "row", gap: space.sm },
  earnedValue: { color: color.heading, fontSize: 26, fontWeight: "800" },
  enter: { gap: space.xs },
  flex: { flex: 1 },
  friend: { alignItems: "center", flexDirection: "row", gap: space.sm },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.lg },
  list: { gap: space.xs },
  small: { borderRadius: corner.sm, marginTop: space.xs },
});
