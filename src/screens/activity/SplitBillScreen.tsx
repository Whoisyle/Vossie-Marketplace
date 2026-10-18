import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, EmptyState, Screen, StatusBadge, TextField, useToast } from "@/components";
import { splitShares } from "@/data/campus";
import { formatRand } from "@/data/format";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/**
 * Split the bill: you paid for the order, your friends pay you back their share. Shares are equal and always add
 * up to the total. Friends pay into your Vossie wallet; in the demo you mark each share paid yourself.
 */
export function SplitBillScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [names, setNames] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const order = state.orders.find((item) => item.id === id);
  const split = state.splits.find((item) => item.orderId === id);

  if (!order) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState actionLabel="My Orders" icon="users" onAction={() => router.replace("/activity/orders" as Href)} title="Order not found" />
      </Screen>
    );
  }

  const people = (split ? split.members.length : names.length) + 1;
  const shares = splitShares(order.totalCents, people);
  const owed = split ? split.members.filter((member) => member.status === "pending").reduce((sum, member) => sum + member.shareCents, 0) : 0;

  const add = () => {
    const name = draft.trim();
    if (name.length < 2 || names.length >= 9) return;
    setNames((current) => [...current, name]);
    setDraft("");
  };

  const remind = async (name: string, shareCents: number) => {
    try {
      await Share.share({ message: `Hi ${name}, your share of our Vossie order ${order.number} is ${formatRand(shareCents)}. Please pay it back to me.` });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  return (
    <Screen testID="split-screen">
      <AppHeader back subtitle={`Order ${order.number} · ${formatRand(order.totalCents, { fixed: true })}`} title="Split the bill" />

      {split ? (
        <>
          <Card style={styles.summary} variant="soft">
            <Text style={text.caption}>Still to collect</Text>
            <Text style={styles.owed}>{formatRand(owed, { fixed: true })}</Text>
            <Text style={text.caption}>Your share: {formatRand(shares[0]!, { fixed: true })}</Text>
          </Card>
          <View style={styles.list}>
            {split.members.map((member) => (
              <Card key={member.id} style={styles.row} testID={`member-${member.name}`} variant="soft">
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>{member.name}</Text>
                  <Text style={text.caption}>{formatRand(member.shareCents, { fixed: true })}</Text>
                </View>
                {member.status === "paid" ? (
                  <StatusBadge icon="check-circle" label="Paid" tone="success" />
                ) : (
                  <View style={styles.actions}>
                    <Button label="Remind" onPress={() => void remind(member.name, member.shareCents)} size="sm" variant="soft" />
                    <Button
                      label="Mark paid"
                      onPress={() => {
                        dispatch({ memberId: member.id, splitId: split.id, type: "markSplitPaid" });
                        toast.show(`${formatRand(member.shareCents)} added to your wallet`);
                      }}
                      size="sm"
                      testID={`paid-${member.name}`}
                    />
                  </View>
                )}
              </Card>
            ))}
          </View>
          <Text style={[text.caption, styles.note]}>Demo: payments from friends are marked by you and land in your Vossie wallet.</Text>
        </>
      ) : (
        <>
          <Text style={styles.heading}>Who is sharing?</Text>
          <View style={styles.list}>
            <Card style={styles.row} variant="soft">
              <View style={styles.flex}>
                <Text style={text.cardTitle}>You</Text>
                <Text style={text.caption}>{formatRand(shares[0]!, { fixed: true })}</Text>
              </View>
            </Card>
            {names.map((name, index) => (
              <Card key={`${name}-${index}`} style={styles.row} variant="soft">
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>{name}</Text>
                  <Text style={text.caption}>{formatRand(shares[index + 1]!, { fixed: true })}</Text>
                </View>
                <Button label="Remove" onPress={() => setNames((current) => current.filter((_, i) => i !== index))} size="sm" variant="outline" />
              </Card>
            ))}
          </View>
          <TextField autoCapitalize="words" label="Add a friend" onChangeText={setDraft} onSubmitEditing={add} placeholder="Friend's name" value={draft} />
          <Button disabled={draft.trim().length < 2} fullWidth label="Add friend" onPress={add} testID="add-friend" variant="soft" />
          <Button
            disabled={names.length === 0}
            fullWidth
            label={names.length === 0 ? "Add at least one friend" : `Split between ${people} people`}
            onPress={() => dispatch({ names, orderId: order.id, type: "createSplit" })}
            style={styles.cta}
            testID="create-split"
          />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  actions: { gap: 6 },
  cta: { marginTop: space.md },
  flex: { flex: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  list: { gap: space.xs, marginBottom: space.sm, marginTop: space.sm },
  note: { marginTop: space.md, textAlign: "center" },
  owed: { color: color.heading, fontSize: 32, fontWeight: "800" },
  row: { alignItems: "center", flexDirection: "row", gap: space.sm },
  summary: { gap: 2, marginTop: space.sm },
});
