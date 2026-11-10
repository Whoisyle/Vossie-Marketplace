import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, Chip, EmptyState, Icon, Media, RadioRow, Screen, SearchBar, Sheet, useToast } from "@/components";
import { formatRand } from "@/data/format";
import { NOTES_CAMPUSES, notesCampusName, notesOutline, searchNotes } from "@/data/notes";
import { getListing, getListings, getSeller } from "@/data/repository";
import type { CampusId, Listing, PaymentMethod } from "@/data/types";
import { useDetail } from "@/lib/paths";
import { useDemoStore } from "@/state/DemoStore";
import { color, corner, space, text } from "@/theme/tokens";

/** One pack as a row: the module code, what it covers, where, how many pages and the price. */
export function NotesRow({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const notes = listing.notes!;
  const seller = getSeller(listing.sellerId);
  return (
    <Card onPress={onPress} testID={`notes-row-${listing.id}`} variant="soft">
      <View style={styles.rowTop}>
        <View style={styles.thumb}>
          <Media radius={corner.sm} source={listing.images[0]} style={styles.thumbImage} />
        </View>
        <View style={styles.flex}>
          <Text style={styles.rowCode}>{notes.moduleCode}</Text>
          <Text numberOfLines={2} style={text.cardTitle}>{notes.moduleName}</Text>
          <Text numberOfLines={1} style={text.caption}>{notesCampusName(notes.campusId)} · Year {notes.year} · {notes.pages} pages</Text>
        </View>
        <Text style={styles.price}>{formatRand(listing.priceCents)}</Text>
      </View>
      <View style={styles.rowBottom}>
        <Icon color={color.textMuted} name="user" size={13} />
        <Text numberOfLines={1} style={[text.caption, styles.flex]}>{seller?.name ?? "Student seller"} · {listing.rating.toFixed(1)} ({listing.ratingCount})</Text>
        <Text style={styles.instant}>Instant PDF</Text>
      </View>
    </Card>
  );
}

/** Study notes: search by module name or code, then narrow to a campus. */
export function NotesBrowseScreen() {
  const router = useRouter();
  const open = useDetail();
  const [query, setQuery] = useState("");
  const [campus, setCampus] = useState<CampusId | "all">("all");
  const results = useMemo(() => searchNotes(getListings({}), query, campus), [query, campus]);
  return (
    <Screen testID="notes-browse">
      <AppHeader back subtitle="Notes from students who passed the module" title="Study notes" />
      <SearchBar onChangeText={setQuery} placeholder="Search a module name or code, like ITMA101" value={query} />
      <View style={styles.chips}>
        <Chip label="All campuses" onPress={() => setCampus("all")} selected={campus === "all"} testID="notes-campus-all" />
        {NOTES_CAMPUSES.map((item) => (
          <Chip key={item.id} label={item.name} onPress={() => setCampus(item.id)} selected={campus === item.id} testID={`notes-campus-${item.id}`} />
        ))}
      </View>
      <View style={styles.banner}>
        <Icon color={color.accent} name="zap" size={16} />
        <Text style={styles.bannerText}>No delivery and no waiting: pay, and your PDF opens straight away.</Text>
      </View>
      <Text style={text.sectionTitle}>{results.length} {results.length === 1 ? "pack" : "packs"}</Text>
      {results.length === 0 ? (
        <EmptyState icon="search" message="Try a module code like ITPR101, or pick all campuses." title="No notes found" />
      ) : (
        <View style={styles.list}>
          {results.map((listing) => (
            <NotesRow key={listing.id} listing={listing} onPress={() => router.push(open("listing", listing.id))} />
          ))}
        </View>
      )}
    </Screen>
  );
}

const PAY: { key: PaymentMethod; title: string; subtitle: string }[] = [
  { key: "card", subtitle: "Visa or Mastercard ending 4242", title: "Card" },
  { key: "apple-pay", subtitle: "Pay with Face ID", title: "Apple Pay" },
  { key: "wallet", subtitle: "Your Vossie Wallet balance", title: "Vossie Wallet" },
];

/** The pay sheet for a pack: pick how to pay, and the notes open as soon as it goes through. */
export function NotesBuySheet({ listing, onClose, onBought, visible }: { listing: Listing; visible: boolean; onClose: () => void; onBought: () => void }) {
  const { dispatch, state } = useDemoStore();
  const toast = useToast();
  const [method, setMethod] = useState<PaymentMethod>("card");
  const notes = listing.notes!;
  const short = method === "wallet" && state.wallet.balanceCents < listing.priceCents;
  return (
    <Sheet onClose={onClose} title="Buy these notes" visible={visible}>
      <View style={styles.sheet}>
        <Text style={text.cardTitle}>{notes.moduleCode} · {notes.moduleName}</Text>
        <Text style={text.bodySmall}>{notesCampusName(notes.campusId)} · {notes.pages} pages · PDF</Text>
        <View style={styles.totalRow}>
          <Text style={text.body}>Total</Text>
          <Text style={styles.total} testID="notes-total">{formatRand(listing.priceCents)}</Text>
        </View>
        {PAY.map((item) => (
          <RadioRow key={item.key} onPress={() => setMethod(item.key)} selected={method === item.key} subtitle={item.key === "wallet" ? `${formatRand(state.wallet.balanceCents)} available` : item.subtitle} testID={`notes-pay-${item.key}`} title={item.title} />
        ))}
        {short ? <Text style={styles.warn}>Not enough in your wallet. Pick another way to pay.</Text> : null}
        <Button
          disabled={short}
          fullWidth
          icon="lock"
          label={`Pay ${formatRand(listing.priceCents)}`}
          onPress={() => {
            dispatch({ payment: method, type: "setPayment" });
            dispatch({ listingId: listing.id, type: "buyNotes" });
            toast.show("Payment received. Your notes are ready.");
            onBought();
          }}
          testID="notes-pay"
        />
        <Text style={text.caption}>Demo: no real payment is taken.</Text>
      </View>
    </Sheet>
  );
}

/** The demo reader: sample pages of a pack. Anyone can read the preview pages; the rest unlock after buying. */
export function NotesReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { state } = useDemoStore();
  const listing = getListing(id);
  const [page, setPage] = useState(0);
  const notes = listing?.notes;
  if (!listing || !notes) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState icon="alert-circle" message="These notes may have been removed." onAction={() => router.replace("/home")} actionLabel="Back to Home" title="Notes not found" />
      </Screen>
    );
  }
  const owned = state.notesLibrary.includes(listing.id);
  const outline = notesOutline(notes.moduleCode);
  const locked = !owned && page >= notes.previewPages;
  const current = outline[Math.min(page, outline.length - 1)]!;
  return (
    <Screen testID="notes-reader">
      <AppHeader back subtitle={`${notes.moduleCode} · ${notesCampusName(notes.campusId)}`} title={notes.moduleName} />
      <View style={styles.paper}>
        <View style={styles.paperHead}>
          <Text style={styles.paperMeta}>{notes.fileName}</Text>
          <Text style={styles.paperMeta} testID="notes-page-label">Page {page + 1} of {outline.length}</Text>
        </View>
        {locked ? (
          <View style={styles.locked} testID="notes-locked">
            <Icon color={color.accent} name="lock" size={28} />
            <Text style={text.cardTitle}>Buy to read the rest</Text>
            <Text style={[text.bodySmall, styles.center]}>The first {notes.previewPages} pages are free to read. Buy the pack to unlock all {notes.pages} pages.</Text>
            <Button label={`Buy for ${formatRand(listing.priceCents)}`} onPress={() => router.replace(`/home/listing/${listing.id}` as Href)} size="sm" testID="notes-unlock" />
          </View>
        ) : (
          <View style={styles.pageBody} testID="notes-page">
            <Text accessibilityRole="header" style={styles.pageHeading}>{current.heading}</Text>
            {current.points.map((point) => (
              <View key={point} style={styles.point}>
                <View style={styles.dot} />
                <Text style={[text.body, styles.flex]}>{point}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
      <View style={styles.pager}>
        <Button disabled={page === 0} icon="chevron-left" label="Previous" onPress={() => setPage((value) => Math.max(0, value - 1))} size="sm" testID="notes-prev" variant="outline" />
        <Button disabled={page >= outline.length - 1} label="Next" onPress={() => setPage((value) => Math.min(outline.length - 1, value + 1))} size="sm" testID="notes-next" />
      </View>
      <Text style={text.caption}>Demo reader: {outline.length} sample pages of {notes.pages}. Real files are downloaded as PDFs.</Text>
    </Screen>
  );
}

/** My study notes: every pack this student has bought, to open any time. */
export function MyNotesScreen() {
  const router = useRouter();
  const { state } = useDemoStore();
  const owned = state.notesLibrary.map((id) => getListing(id)).filter((item): item is Listing => Boolean(item?.notes));
  return (
    <Screen testID="my-notes">
      <AppHeader back subtitle="Yours to keep" title="My study notes" />
      {owned.length === 0 ? (
        <EmptyState actionLabel="Find notes" icon="book-open" message="Notes you buy show up here, ready to open." onAction={() => router.push("/home/notes" as Href)} title="No notes yet" />
      ) : (
        <View style={styles.list}>
          {owned.map((listing) => (
            <NotesRow key={listing.id} listing={listing} onPress={() => router.push(`/account/notes-read/${listing.id}` as Href)} />
          ))}
        </View>
      )}
    </Screen>
  );
}

/** The try-before-you-buy block of a notes page: the module in one line and the free preview. The facts sit in the normal details below. */
export function NotesFacts({ listing, onPreview }: { listing: Listing; onPreview: () => void }) {
  const notes = listing.notes!;
  return (
    <View style={styles.facts} testID="notes-facts">
      <View style={styles.instantRow}>
        <View style={styles.code}>
          <Text style={styles.codeText}>{notes.moduleCode}</Text>
        </View>
        <View style={styles.flex}>
          <Text style={text.cardTitle}>{notes.moduleName}</Text>
          <Text style={text.caption}>{notesCampusName(notes.campusId)} · Year {notes.year} · {notes.pages} pages</Text>
        </View>
      </View>
      <View style={styles.instantRow}>
        <Icon color={color.accent} name="zap" size={16} />
        <Text style={[text.bodySmall, styles.flex]}>Instant download. No delivery, no waiting.</Text>
      </View>
      <Button icon="eye" label={`Read the first ${notes.previewPages} pages free`} onPress={onPreview} size="sm" testID="notes-preview" variant="outline" />
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { alignItems: "center", backgroundColor: color.surfaceSoft, borderRadius: corner.md, flexDirection: "row", gap: space.xs, padding: space.sm },
  bannerText: { color: color.heading, flex: 1, fontSize: 13 },
  center: { textAlign: "center" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: space.xs },
  code: { alignItems: "center", backgroundColor: color.accent, borderRadius: corner.sm, justifyContent: "center", minWidth: 68, paddingHorizontal: space.xs, paddingVertical: space.sm },
  codeText: { color: color.onPrimary, fontSize: 13, fontWeight: "800", letterSpacing: 0.3 },
  dot: { backgroundColor: color.accent, borderRadius: 3, height: 6, marginTop: 8, width: 6 },
  fact: { flexDirection: "row", justifyContent: "space-between" },
  factValue: { color: color.heading, fontSize: 14, fontWeight: "600" },
  facts: { gap: space.xs },
  flex: { flex: 1 },
  instant: { color: color.accent, fontSize: 12, fontWeight: "700" },
  instantRow: { alignItems: "center", flexDirection: "row", gap: space.xs, marginVertical: space.xxs },
  list: { gap: space.sm },
  locked: { alignItems: "center", gap: space.sm, paddingVertical: space.xxl },
  pageBody: { gap: space.sm, minHeight: 220 },
  pageHeading: { color: color.heading, fontSize: 20, fontWeight: "800" },
  pager: { flexDirection: "row", gap: space.sm, justifyContent: "space-between" },
  paper: { backgroundColor: "#FFFFFF", borderColor: "#D9E3E7", borderRadius: corner.md, borderWidth: 1, gap: space.md, padding: space.lg },
  paperHead: { borderBottomColor: "#E6EDF0", borderBottomWidth: 1, flexDirection: "row", justifyContent: "space-between", paddingBottom: space.xs },
  paperMeta: { color: color.textMuted, fontSize: 12 },
  point: { flexDirection: "row", gap: space.xs },
  price: { color: color.heading, fontSize: 17, fontWeight: "800" },
  rowCode: { color: color.accent, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  thumb: { borderRadius: corner.sm, height: 76, overflow: "hidden", width: 76 },
  thumbImage: { height: 76, width: 76 },
  rowBottom: { alignItems: "center", flexDirection: "row", gap: space.xs, marginTop: space.xs },
  rowTop: { alignItems: "center", flexDirection: "row", gap: space.sm },
  sheet: { gap: space.sm },
  total: { color: color.heading, fontSize: 22, fontWeight: "800" },
  totalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  warn: { color: color.warning, fontSize: 13 },
});
