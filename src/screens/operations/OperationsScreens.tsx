import { useRouter } from "expo-router";
import { useState, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import type { IconName } from "@/components";
import { Icon } from "@/components";
import { FOUNDERS, HUB_ITEMS, HUBS, LOG, STAGE_LABEL, TRANSFERS, type HubItemStatus, type LogKind, type TransferStage } from "@/operations/data";
import { Chips, PageTitle, StatTile } from "@/screens/seller/parts";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeader, SellerHeading, SellerScreen, Text, type PillTone } from "@/screens/seller/ui";

export const OPERATIONS_TABS: { name: string; label: string; icon: IconName }[] = [
  { icon: "map-pin", label: "Hub", name: "hub" },
  { icon: "repeat", label: "Transfers", name: "transfers" },
  { icon: "trending-up", label: "Incubation", name: "incubation" },
  { icon: "list", label: "Log", name: "log" },
];

function Page({ children, subtitle, testID, title, tone = "white" }: { children: ReactNode; title: string; subtitle: string; testID: string; tone?: "blue" | "white" }) {
  const router = useRouter();
  return (
    <SellerScreen testID={testID} tone={tone}>
      <SellerHeader mode="Operations mode" right={<SellerButton icon="log-out" label="Leave" onPress={() => router.replace("/account")} size="sm" variant="outline" />} />
      <PageTitle subtitle={subtitle} title={title} />
      {children}
    </SellerScreen>
  );
}

const ITEM_PILL: Record<HubItemStatus, { label: string; tone: PillTone }> = {
  collected: { label: "Collected", tone: "neutral" },
  ready: { label: "Ready to collect", tone: "success" },
  waiting: { label: "Waiting for a courier", tone: "warn" },
};

/** Campus Hub: what is sitting at each hub, and who is coming for it. */
export function OperationsHubScreen() {
  const [hub, setHub] = useState<string>("all");
  const [done, setDone] = useState<string[]>([]);
  const items = HUB_ITEMS.filter((item) => hub === "all" || item.hub === hub);
  const open = HUB_ITEMS.filter((item) => item.status !== "collected" && !done.includes(item.id)).length;
  return (
    <Page subtitle="What is at each campus hub right now" testID="operations-hub" title="Campus Hub" tone="blue">
      <View style={styles.tiles}>
        <StatTile label="At the hubs" value={open} />
        <StatTile label="Ready to collect" tone="success" value={HUB_ITEMS.filter((item) => item.status === "ready" && !done.includes(item.id)).length} />
      </View>
      <Chips items={[{ key: "all", label: "All hubs" }, ...HUBS.map((name) => ({ key: name, label: name }))]} onChange={setHub} prefix="hub" value={hub} />
      {items.map((item) => {
        const collected = item.status === "collected" || done.includes(item.id);
        const pill = collected ? ITEM_PILL.collected : ITEM_PILL[item.status];
        return (
          <SellerCard key={item.id} testID={`hub-item-${item.id}`}>
            <View style={styles.row}>
              <Text style={styles.title}>{item.item}</Text>
              <Pill label={pill.label} tone={pill.tone} />
            </View>
            <Text style={styles.caption}>{item.hub} · {item.since}</Text>
            <Text style={styles.caption}>From {item.seller} to {item.buyer}</Text>
            {!collected && item.status === "ready" ? <SellerButton icon="check" label={`Hand over, code ${item.code}`} onPress={() => setDone((list) => [...list, item.id])} size="sm" style={styles.action} /> : null}
          </SellerCard>
        );
      })}
    </Page>
  );
}

const STAGE_TONE: Record<TransferStage, PillTone> = { at_hub: "info", delivered: "success", issue: "danger", listed: "neutral", with_courier: "warn" };

/** Transfers: every item moving between seller, hub, courier and buyer. */
export function OperationsTransfersScreen() {
  const [filter, setFilter] = useState<"all" | TransferStage>("all");
  const list = TRANSFERS.filter((transfer) => filter === "all" || transfer.stage === filter);
  const stages = Object.keys(STAGE_LABEL) as TransferStage[];
  return (
    <Page subtitle="From the seller to the buyer, step by step" testID="operations-transfers" title="Transfers">
      <Chips
        items={[{ count: TRANSFERS.length, key: "all", label: "All" }, ...stages.map((key) => ({ count: TRANSFERS.filter((t) => t.stage === key).length, key, label: STAGE_LABEL[key] }))]}
        onChange={setFilter}
        prefix="transfer"
        value={filter}
      />
      {list.map((transfer) => (
        <SellerCard key={transfer.id} testID={`transfer-${transfer.id}`}>
          <View style={styles.row}>
            <Text style={styles.title}>{transfer.item}</Text>
            <Pill label={STAGE_LABEL[transfer.stage]} tone={STAGE_TONE[transfer.stage]} />
          </View>
          <View style={styles.route}>
            <Text style={styles.caption}>{transfer.from}</Text>
            <Icon name="arrow-right" size={14} />
            <Text style={styles.caption}>Hub</Text>
            <Icon name="arrow-right" size={14} />
            <Text style={styles.caption}>{transfer.courier}</Text>
            <Icon name="arrow-right" size={14} />
            <Text style={styles.caption}>{transfer.to}</Text>
          </View>
          <Text style={styles.caption}>{transfer.when}</Text>
        </SellerCard>
      ))}
    </Page>
  );
}

const STAGE_PILL: Record<"building" | "idea" | "selling", { label: string; tone: PillTone }> = {
  building: { label: "Building", tone: "info" },
  idea: { label: "Idea", tone: "neutral" },
  selling: { label: "Selling", tone: "success" },
};

/** Incubation: the student businesses Vossie is helping to grow. */
export function OperationsIncubationScreen() {
  return (
    <Page subtitle="Student businesses we are helping to grow" testID="operations-incubation" title="Incubation">
      <View style={styles.tiles}>
        <StatTile label="Businesses" value={FOUNDERS.length} />
        <StatTile label="Selling" tone="success" value={FOUNDERS.filter((f) => f.stage === "selling").length} />
      </View>
      {FOUNDERS.map((founder) => (
        <SellerCard key={founder.id} testID={`founder-${founder.id}`}>
          <View style={styles.row}>
            <Text style={styles.title}>{founder.business}</Text>
            <Pill label={STAGE_PILL[founder.stage].label} tone={STAGE_PILL[founder.stage].tone} />
          </View>
          <Text style={styles.caption}>{founder.name} · Mentor: {founder.mentor}</Text>
          <View accessibilityLabel={`${Math.round(founder.progress * 100)} percent`} style={styles.track}>
            <View style={[styles.fill, { width: `${founder.progress * 100}%` }]} />
          </View>
          <Text style={styles.caption}>Next: {founder.next}</Text>
        </SellerCard>
      ))}
    </Page>
  );
}

const KIND_ICON: Record<LogKind, IconName> = { approval: "check-circle", support: "life-buoy", system: "cpu", transfer: "repeat" };
const KINDS: { key: "all" | LogKind; label: string }[] = [
  { key: "all", label: "All" },
  { key: "approval", label: "Approvals" },
  { key: "transfer", label: "Transfers" },
  { key: "support", label: "Support" },
  { key: "system", label: "System" },
];

/** The activity log: what staff and the system did today. */
export function OperationsLogScreen() {
  const [kind, setKind] = useState<"all" | LogKind>("all");
  return (
    <Page subtitle="Everything staff and the system did today" testID="operations-log" title="Activity log">
      <Chips items={KINDS} onChange={setKind} prefix="log" value={kind} />
      <SellerHeading>Today</SellerHeading>
      {LOG.filter((entry) => kind === "all" || entry.kind === kind).map((entry) => (
        <SellerCard key={entry.id} testID={`log-${entry.id}`}>
          <View style={styles.logRow}>
            <Icon name={KIND_ICON[entry.kind]} size={18} />
            <View style={styles.logText}>
              <Text style={styles.body}>{entry.text}</Text>
              <Text style={styles.caption}>{entry.by} · {entry.when}</Text>
            </View>
          </View>
        </SellerCard>
      ))}
    </Page>
  );
}

const styles = StyleSheet.create({
  action: { alignSelf: "flex-start", marginTop: 10 },
  body: { color: SELLER.ink, fontSize: 14, lineHeight: 20 },
  caption: { color: SELLER.inkSoft, fontSize: 12, marginTop: 2 },
  fill: { backgroundColor: SELLER.solid, borderRadius: 4, height: 8 },
  logRow: { alignItems: "flex-start", flexDirection: "row", gap: 12 },
  logText: { flex: 1 },
  route: { alignItems: "center", flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 6 },
  row: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  tiles: { flexDirection: "row", gap: 10 },
  title: { color: SELLER.ink, flex: 1, fontSize: 15, fontWeight: "700" },
  track: { backgroundColor: "#E4EAED", borderRadius: 4, height: 8, marginTop: 10, overflow: "hidden" },
});
