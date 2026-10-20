import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Chip, Icon, Screen, SegmentedTabs, Sheet, StatusBadge, TextField, useToast, PageHero } from "@/components";
import { tutorSlots, type LostFoundKind } from "@/data/campus";
import { effectivePrice } from "@/data/deals";
import { formatRand, relativeTime } from "@/data/format";
import { getListings, getSeller } from "@/data/repository";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

type Tab = "swap" | "tutors" | "lost";

/** Campus extras: swap textbooks, book a tutor for a time slot, and a lost and found board. */
export function CampusExtrasScreen() {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [tab, setTab] = useState<Tab>("swap");
  const [swapOpen, setSwapOpen] = useState(false);
  const [have, setHave] = useState("");
  const [want, setWant] = useState("");
  const [lostOpen, setLostOpen] = useState(false);
  const [lostKind, setLostKind] = useState<LostFoundKind>("lost");
  const [lostTitle, setLostTitle] = useState("");
  const [lostPlace, setLostPlace] = useState("");
  const [tutor, setTutor] = useState<string | null>(null);
  const [day, setDay] = useState("Today");

  const tutors = getListings({ categoryId: "services" }).filter((listing) => /tutor/i.test(listing.title));
  const slots = tutorSlots();
  const days = [...new Set(slots.map((slot) => slot.day))];
  const activeTutor = tutors.find((listing) => listing.id === tutor);

  return (
    <Screen testID="campus-extras">
      <AppHeader back subtitle="Swap books, book a tutor, find lost things." title="Campus extras" />
      <PageHero
        chips={[{ icon: "repeat", label: "Swap books" }, { icon: "book-open", label: "Book a tutor" }, { icon: "search", label: "Find lost things" }]}
        icon="compass"
        subtitle="Things only students on your campus can do for each other."
        testID="campus-hero"
        title="Make campus work for you"
        tone="mist"
      />
      <SegmentedTabs
        onChange={setTab}
        options={[
          { key: "swap", label: "Book swap" },
          { key: "tutors", label: "Tutors" },
          { key: "lost", label: "Lost & found" },
        ]}
        value={tab}
      />

      {tab === "swap" ? (
        <View style={styles.list} testID="tab-swap">
          <Button fullWidth icon="repeat" label="Offer a swap" onPress={() => setSwapOpen(true)} testID="offer-swap" />
          {state.swaps.map((post) => (
            <Card key={post.id} style={styles.card} testID={`swap-${post.id}`} variant="soft">
              <View style={styles.flex}>
                <Text style={text.caption}>{post.author} · {relativeTime(post.createdAt)}</Text>
                <Text style={text.cardTitle}>Has: {post.have}</Text>
                <Text style={text.bodySmall}>Wants: {post.want}</Text>
              </View>
              {post.mine ? (
                <Button label="Remove" onPress={() => dispatch({ swapId: post.id, type: "removeSwap" })} size="sm" variant="outline" />
              ) : (
                <Button
                  label="Message"
                  onPress={() => {
                    dispatch({ conversationId: `swap-${post.id}`, kind: "buyer", name: post.author, type: "openConversation" });
                    toast.show(`Chat opened with ${post.author}`);
                  }}
                  size="sm"
                />
              )}
            </Card>
          ))}
        </View>
      ) : null}

      {tab === "tutors" ? (
        <View style={styles.list} testID="tab-tutors">
          <Text style={text.bodySmall}>Pick a tutor, then a one-hour slot. Your booking appears in Activity.</Text>
          {tutors.map((listing) => (
            <Card key={listing.id} onPress={() => setTutor(listing.id)} style={styles.card} testID={`tutor-${listing.id}`} variant="soft">
              <View style={styles.flex}>
                <Text style={text.cardTitle}>{listing.title}</Text>
                <Text style={text.caption}>{getSeller(listing.sellerId)?.name} · {listing.location}</Text>
              </View>
              <Text style={styles.price}>{formatRand(effectivePrice(listing))}</Text>
            </Card>
          ))}
          {state.bookings.filter((booking) => booking.status === "upcoming").length > 0 ? (
            <Text style={styles.heading}>Your upcoming bookings</Text>
          ) : null}
          {state.bookings
            .filter((booking) => booking.status === "upcoming")
            .map((booking) => (
              <Card key={booking.id} style={styles.card} variant="row">
                <View style={styles.flex}>
                  <Text style={text.cardTitle}>{booking.title}</Text>
                  <Text style={text.caption}>{booking.provider} · {new Date(booking.startsAt).toLocaleString("en-ZA", { day: "numeric", hour: "2-digit", minute: "2-digit", month: "short" })}</Text>
                </View>
                <StatusBadge label="Booked" tone="success" />
              </Card>
            ))}
        </View>
      ) : null}

      {tab === "lost" ? (
        <View style={styles.list} testID="tab-lost">
          <Button fullWidth icon="plus" label="Post lost or found" onPress={() => setLostOpen(true)} testID="post-lost" />
          {state.lostFound.map((post) => (
            <Card key={post.id} style={[styles.card, post.resolved && styles.resolved]} testID={`lost-${post.id}`} variant="soft">
              <View style={[styles.kind, post.kind === "found" && styles.kindFound]}>
                <Icon color={color.onPrimary} name={post.kind === "found" ? "check" : "search"} size={16} />
              </View>
              <View style={styles.flex}>
                <Text style={text.caption}>
                  {post.kind === "found" ? "Found" : "Lost"} · {post.place || "On campus"} · {relativeTime(post.createdAt)}
                </Text>
                <Text style={text.cardTitle}>{post.title}</Text>
                <Text style={text.caption}>Posted by {post.author}</Text>
              </View>
              {post.resolved ? (
                <StatusBadge label="Resolved" tone="success" />
              ) : (
                <Button label={post.mine ? "Mark resolved" : "That's mine"} onPress={() => dispatch({ postId: post.id, type: "resolveLostFound" })} size="sm" variant="outline" />
              )}
            </Card>
          ))}
        </View>
      ) : null}

      <Sheet onClose={() => setSwapOpen(false)} title="Offer a book swap" visible={swapOpen}>
        <TextField label="I have" onChangeText={setHave} placeholder="Economics 101 (2024 edition)" value={have} />
        <TextField label="I want" onChangeText={setWant} placeholder="Introduction to Statistics" value={want} />
        <Button
          disabled={have.trim().length < 3 || want.trim().length < 3}
          fullWidth
          label="Post swap"
          onPress={() => {
            dispatch({ have, type: "addSwap", want });
            setSwapOpen(false);
            setHave("");
            setWant("");
            toast.show("Swap posted");
          }}
          testID="post-swap"
        />
      </Sheet>

      <Sheet onClose={() => setLostOpen(false)} title="Post lost or found" visible={lostOpen}>
        <View style={styles.chips}>
          <Chip label="I lost something" onPress={() => setLostKind("lost")} selected={lostKind === "lost"} />
          <Chip label="I found something" onPress={() => setLostKind("found")} selected={lostKind === "found"} />
        </View>
        <TextField label="What is it?" onChangeText={setLostTitle} placeholder="Black calculator" value={lostTitle} />
        <TextField label="Where?" onChangeText={setLostPlace} placeholder="Library, level 2" value={lostPlace} />
        <Button
          disabled={lostTitle.trim().length < 3}
          fullWidth
          label="Post"
          onPress={() => {
            dispatch({ kind: lostKind, place: lostPlace, title: lostTitle, type: "addLostFound" });
            setLostOpen(false);
            setLostTitle("");
            setLostPlace("");
            toast.show("Posted on the board");
          }}
          testID="post-lost-submit"
        />
      </Sheet>

      <Sheet onClose={() => setTutor(null)} title={activeTutor ? `Book ${activeTutor.title}` : "Book a tutor"} visible={Boolean(activeTutor)}>
        <View style={styles.chips}>
          {days.map((item) => (
            <Chip key={item} label={item} onPress={() => setDay(item)} selected={day === item} />
          ))}
        </View>
        <View style={styles.chips}>
          {slots
            .filter((slot) => slot.day === day)
            .map((slot) => (
              <Chip
                key={slot.iso}
                label={slot.label}
                onPress={() => {
                  if (!activeTutor) return;
                  dispatch({ listingId: activeTutor.id, startsAt: slot.iso, type: "bookTutor" });
                  setTutor(null);
                  toast.show(`Booked for ${slot.day} ${slot.label}`);
                }}
                testID={`tutor-slot-${slot.label}`}
              />
            ))}
        </View>
        {slots.every((slot) => slot.day !== day) ? <Text style={text.bodySmall}>No slots left that day.</Text> : null}
      </Sheet>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: "center", flexDirection: "row", gap: space.sm },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs, marginBottom: space.sm },
  flex: { flex: 1, gap: 1 },
  heading: { ...text.sectionTitle, marginTop: space.md },
  kind: { alignItems: "center", backgroundColor: color.warning, borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  kindFound: { backgroundColor: color.success },
  list: { gap: space.xs, marginTop: space.sm },
  price: { color: color.heading, fontSize: 15, fontWeight: "800" },
  resolved: { opacity: 0.6 },
});
