import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Share, StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Icon, Screen, Sheet, TextField, useToast } from "@/components";
import { effectivePrice } from "@/data/deals";
import { formatRand } from "@/data/format";
import { MAX_GROUP_MEMBERS } from "@/data/group";
import { isSoldOut } from "@/data/phase4";
import { getListing, getListings } from "@/data/repository";
import { unitPrice, useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/**
 * Group order: build one basket with your housemates, then check out together. Everyone pays for what they
 * added; delivery and discounts are shared. In the demo friends are added by name; you collect their share
 * afterwards in Split the bill.
 */
export function GroupOrderScreen() {
  const router = useRouter();
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const group = state.group;
  const [name, setName] = useState("");
  const [friend, setFriend] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const choices = useMemo(() => {
    const campusId = state.profile?.campusId ?? null;
    const needle = query.trim().toLowerCase();
    return getListings({ campusId })
      .filter((listing) => !isSoldOut(listing.id) && (!needle || listing.title.toLowerCase().includes(needle)))
      .slice(0, 12);
  }, [query, state.profile?.campusId]);

  if (!group || group.status === "placed") {
    return (
      <Screen testID="group-screen">
        <AppHeader back subtitle="Order together and split the bill." title="Group order" />
        {group?.status === "placed" ? (
          <Card style={styles.done} variant="soft">
            <Icon color={color.success} name="check-circle" size={22} />
            <View style={styles.flex}>
              <Text style={text.cardTitle}>{group.name} was ordered</Text>
              <Text style={text.caption}>Collect your friends&apos; shares in Split the bill.</Text>
            </View>
            <Button label="Open" onPress={() => router.push(`/activity/split/${group.orderId}` as Href)} size="sm" />
          </Card>
        ) : null}
        <Text style={styles.heading}>Start a group order</Text>
        <Text style={text.bodySmall}>Give your group a name, add your friends, and each person picks what they want. One checkout, split by what everyone added.</Text>
        <TextField label="Group name" onChangeText={setName} placeholder="Flat 4B Friday dinner" value={name} />
        <Button
          disabled={name.trim().length < 2}
          fullWidth
          label="Start group"
          onPress={() => {
            dispatch({ name, type: "startGroup" });
            setName("");
          }}
          style={styles.gap}
          testID="start-group"
        />
      </Screen>
    );
  }

  const memberCents = (memberId: string) =>
    group.lines.filter((line) => line.memberId === memberId).reduce((sum, line) => sum + unitPrice(line) * line.quantity, 0);
  const total = group.members.reduce((sum, member) => sum + memberCents(member.id), 0);
  const open = group.status === "open";

  const share = async () => {
    try {
      await Share.share({ message: `Join my Vossie group order "${group.name}". Code: ${group.code}. Pick what you want and we'll split the bill by what each person added.` });
    } catch {
      toast.show("Sharing isn't available here");
    }
  };

  return (
    <Screen
      footer={
        <Button
          disabled={group.lines.length === 0}
          fullWidth
          iconRight="arrow-right"
          label={group.lines.length === 0 ? "Add items to check out" : `Check out together · ${formatRand(total)}`}
          onPress={() => {
            dispatch({ type: "groupCheckout" });
            router.push("/cart/checkout" as Href);
          }}
          size="lg"
          testID="group-checkout"
        />
      }
      testID="group-screen"
    >
      <AppHeader back subtitle={`${group.members.length} ${group.members.length === 1 ? "person" : "people"}`} title={group.name} />
      <Card style={styles.code} variant="soft">
        <View style={styles.flex}>
          <Text style={text.caption}>Invite code</Text>
          <Text style={styles.codeText} testID="group-code">
            {group.code}
          </Text>
        </View>
        <Button icon="share-2" label="Share" onPress={() => void share()} size="sm" testID="share-group" />
      </Card>
      {!open ? <Text style={[text.caption, styles.gap]}>Checkout started. Finish paying to place the order, or cancel to edit the group.</Text> : null}

      {group.members.map((member) => (
        <View key={member.id} style={styles.member} testID={`group-member-${member.name}`}>
          <View style={styles.memberHead}>
            <View style={styles.flex}>
              <Text style={text.cardTitle}>
                {member.name}
                {member.isHost ? " (you)" : ""}
              </Text>
              <Text style={text.caption}>{formatRand(memberCents(member.id))}</Text>
            </View>
            {open ? <Button icon="plus" label="Add item" onPress={() => setPicking(member.id)} size="sm" testID={`add-item-${member.name}`} variant="soft" /> : null}
            {open && !member.isHost ? <Button label="Remove" onPress={() => dispatch({ memberId: member.id, type: "removeGroupMember" })} size="sm" variant="outline" /> : null}
          </View>
          {group.lines
            .filter((line) => line.memberId === member.id)
            .map((line) => {
              const listing = getListing(line.listingId);
              return (
                <View key={line.id} style={styles.line}>
                  <Text numberOfLines={1} style={[text.body, styles.flex]}>
                    {line.quantity} × {listing?.title ?? "Item"}
                  </Text>
                  <Text style={styles.price}>{formatRand(unitPrice(line) * line.quantity)}</Text>
                  {open ? <Button label="Remove" onPress={() => dispatch({ lineId: line.id, type: "removeGroupItem" })} size="sm" variant="outline" /> : null}
                </View>
              );
            })}
        </View>
      ))}

      {open && group.members.length < MAX_GROUP_MEMBERS ? (
        <View style={styles.add}>
          <TextField autoCapitalize="words" label="Add a friend" onChangeText={setFriend} onSubmitEditing={() => { dispatch({ name: friend, type: "addGroupMember" }); setFriend(""); }} placeholder="Friend's name" value={friend} />
          <Button
            disabled={friend.trim().length < 2}
            fullWidth
            label="Add friend"
            onPress={() => {
              dispatch({ name: friend, type: "addGroupMember" });
              setFriend("");
            }}
            testID="add-group-friend"
            variant="soft"
          />
        </View>
      ) : null}
      <Button fullWidth label={open ? "Cancel group order" : "Cancel and edit"} onPress={() => dispatch({ type: "cancelGroup" })} style={styles.gap} testID="cancel-group" variant="outline" />
      <Text style={[text.caption, styles.note]}>Demo: friends are added by name on this phone. Delivery and discounts are shared equally.</Text>

      <Sheet onClose={() => setPicking(null)} title="Add an item" visible={Boolean(picking)}>
        <TextField label="Search" onChangeText={setQuery} placeholder="Burger, coffee, notebook" value={query} />
        <View style={styles.choices}>
          {choices.map((listing) => (
            <Card
              key={listing.id}
              onPress={() => {
                if (!picking) return;
                dispatch({ listingId: listing.id, memberId: picking, optionId: listing.options[0]?.id, type: "addGroupItem" });
                setPicking(null);
              }}
              style={styles.choice}
              testID={`choose-${listing.id}`}
              variant="row"
            >
              <Text numberOfLines={1} style={[text.cardTitle, styles.flex]}>
                {listing.title}
              </Text>
              <Text style={styles.price}>{formatRand(effectivePrice(listing, listing.options[0]?.priceCents ?? listing.priceCents))}</Text>
            </Card>
          ))}
        </View>
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  add: { gap: space.xs, marginTop: space.md },
  choice: { alignItems: "center", flexDirection: "row", gap: space.sm },
  choices: { gap: space.xs, marginTop: space.sm },
  code: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.sm },
  codeText: { color: color.heading, fontSize: 20, fontWeight: "800", letterSpacing: 1.5 },
  done: { alignItems: "center", flexDirection: "row", gap: space.sm, marginTop: space.sm },
  flex: { flex: 1 },
  gap: { marginTop: space.sm },
  heading: { ...text.sectionTitle, marginTop: space.lg },
  line: { alignItems: "center", flexDirection: "row", gap: space.xs, paddingLeft: space.sm },
  member: { backgroundColor: color.surfaceSoft, borderRadius: 16, gap: space.xs, marginTop: space.sm, padding: space.sm },
  memberHead: { alignItems: "center", flexDirection: "row", gap: space.xs },
  note: { marginTop: space.sm, textAlign: "center" },
  price: { color: color.text, fontSize: 14, fontWeight: "700" },
});
