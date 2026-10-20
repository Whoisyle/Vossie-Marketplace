import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Icon, Sheet, TextField, useToast, type IconName } from "@/components";
import { formatRand, relativeTime } from "@/data/format";
import { sellerId } from "@/seller/state";
import type { PromotionKind, SellerPromotion } from "@/seller/types";
import { space, text } from "@/theme/tokens";

import { useSeller } from "./hooks";
import { Chips, SettingRow, StatTile } from "./parts";
import { Pill, SELLER, SellerButton, SellerCard, SellerScreen, SellerTopBar } from "./ui";

const PROMO_ICON: Record<PromotionKind, IconName> = { bundle: "tag", "free-delivery": "truck", percent: "percent" };

const TEMPLATES: Omit<SellerPromotion, "id" | "active" | "redemptions">[] = [
  { code: "SAVE15", detail: "Code SAVE15 · this week", kind: "percent", title: "15% off this week" },
  { detail: "Applies to campus orders", kind: "free-delivery", title: "Free delivery over R100" },
  { detail: "Buy two, save R30 · 2 products", kind: "bundle", title: "Two for R30 off" },
];

/** Promotions: offers for buyers that can be switched on and off, and new ones made from a short list. */
export function SellerPromotionsScreen() {
  const view = useSeller();
  const toast = useToast();
  const [tab, setTab] = useState<"active" | "scheduled" | "ended">("active");
  const [creating, setCreating] = useState(false);
  const all = view.seller.promotions;
  const shown = all.filter((item) => (tab === "active" ? item.active : tab === "scheduled" ? !item.active && item.scheduled : Boolean(item.ended) || (!item.active && !item.scheduled)));
  const redemptions = all.reduce((sum, item) => sum + item.redemptions, 0);

  return (
    <SellerScreen
      footer={<SellerButton icon="plus" label="Create promotion" onPress={() => setCreating(true)} size="lg" testID="create-promotion" variant="glass" />}
      testID="seller-promotions"
    >
      <SellerTopBar title="Promotions" />
      <Text style={styles.sub}>Offers for your buyers</Text>
      <Chips items={[{ key: "active", label: `Active ${all.filter((item) => item.active).length}` }, { key: "scheduled", label: "Scheduled" }, { key: "ended", label: "Ended" }]} onChange={setTab} value={tab} />
      <View style={styles.tiles}>
        <StatTile label="Redemptions" value={redemptions} />
        <StatTile label="Sales lift" tone="success" value="+18%" />
      </View>
      <View style={styles.stack}>
        {shown.length === 0 ? (
          <SellerCard testID="promotions-empty">
            <Text style={styles.hint}>Nothing here yet.</Text>
          </SellerCard>
        ) : (
          shown.map((item, index) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} key={item.id}>
              <SettingRow hint={item.detail} icon={PROMO_ICON[item.kind]} label={item.title} onToggle={(value) => view.dispatch({ active: value, id: item.id, type: "sellerTogglePromotion" })} testID={`promo-${item.id}`} toggle={item.active} />
            </Animated.View>
          ))
        )}
      </View>
      <SellerCard style={styles.tip}>
        <Icon color={SELLER.solid} name="star" size={18} />
        <Text style={styles.tipText}>Tip: free delivery lifts orders for sellers like you</Text>
      </SellerCard>
      <Sheet onClose={() => setCreating(false)} title="Create promotion" visible={creating}>
        <Text style={text.body}>Pick an offer to start with. It goes live straight away.</Text>
        <View style={styles.sheetList}>
          {TEMPLATES.map((template) => (
            <Button
              fullWidth
              key={template.title}
              label={template.title}
              onPress={() => {
                view.dispatch({ promotion: { ...template, active: true, id: sellerId("pr"), redemptions: 0 }, type: "sellerCreatePromotion" });
                toast.show(`${template.title} is live`);
                setCreating(false);
                setTab("active");
              }}
              testID={`template-${template.kind}`}
              variant="soft"
            />
          ))}
        </View>
      </Sheet>
    </SellerScreen>
  );
}

/** Returns and disputes: refund requests to approve or decline, and disputes to answer. */
export function SellerCasesScreen() {
  const view = useSeller();
  const toast = useToast();
  const [tab, setTab] = useState<"open" | "resolved" | "all">("open");
  const cases = view.seller.cases;
  const shown = cases.filter((item) => tab === "all" || item.status === tab);
  const open = cases.filter((item) => item.status === "open").length;

  return (
    <SellerScreen testID="seller-cases">
      <SellerTopBar title="Returns & disputes" />
      <Text style={styles.sub}>{open} open {open === 1 ? "case" : "cases"}</Text>
      <Chips items={[{ key: "open", label: `Open ${open}` }, { key: "resolved", label: "Resolved" }, { key: "all", label: "All" }]} onChange={setTab} value={tab} />
      <View style={styles.stack}>
        {shown.length === 0 ? (
          <SellerCard testID="cases-empty">
            <Text style={styles.hint}>No cases here. Good news.</Text>
          </SellerCard>
        ) : (
          shown.map((item, index) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(300)} key={item.id}>
              <SellerCard style={styles.case} testID={`case-${item.id}`}>
                <View style={styles.between}>
                  <Text style={styles.name}>
                    {item.orderNumber} · {item.title}
                  </Text>
                  <Pill label={item.status === "resolved" ? "Resolved" : item.kind === "return" ? "Return" : "Dispute"} tone={item.status === "resolved" ? "success" : item.kind === "return" ? "warn" : "danger"} />
                </View>
                <Text style={styles.body}>{item.reason}</Text>
                {item.photos > 0 ? (
                  <View style={styles.photos}>
                    {Array.from({ length: item.photos }, (_, n) => (
                      <View key={n} style={styles.photo}>
                        <Icon color="#FFFFFF" name="image" size={20} />
                      </View>
                    ))}
                  </View>
                ) : null}
                {item.resolution ? <Text style={styles.resolution}>{item.resolution}</Text> : null}
                <Text style={styles.hint}>
                  {relativeTime(item.createdAt)} · {formatRand(item.amountCents)}
                </Text>
                {item.status === "open" && item.kind === "return" ? (
                  <View style={styles.actions}>
                    <SellerButton label="Decline" onPress={() => view.dispatch({ decision: "decline", id: item.id, type: "sellerResolveCase" })} style={styles.flex} testID={`decline-${item.id}`} variant="outline" />
                    <SellerButton label="Approve refund" onPress={() => view.dispatch({ decision: "approve", id: item.id, type: "sellerResolveCase" })} style={styles.flex} testID={`approve-${item.id}`} variant="solid" />
                  </View>
                ) : null}
                {item.status === "open" && item.kind === "dispute" ? (
                  <View style={styles.actions}>
                    <SellerButton label="Respond" onPress={() => view.dispatch({ decision: "respond", id: item.id, text: "You replied. Waiting for Vossie support.", type: "sellerResolveCase" })} style={styles.flex} testID={`respond-${item.id}`} variant="outline" />
                    <SellerButton label="Contact support" onPress={() => toast.show("Vossie support will reply within one working day.")} style={styles.flex} testID={`support-${item.id}`} variant="light" />
                  </View>
                ) : null}
              </SellerCard>
            </Animated.View>
          ))
        )}
      </View>
    </SellerScreen>
  );
}

/** Team members: who else can pack orders for the store, and a way to invite someone. */
export function SellerTeamScreen() {
  const view = useSeller();
  const toast = useToast();
  const [inviting, setInviting] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const valid = /^\S+@\S+\.\S+$/.test(email.trim());

  return (
    <SellerScreen
      footer={<SellerButton icon="user-plus" label="Invite someone" onPress={() => setInviting(true)} size="lg" testID="invite-team" variant="glass" />}
      testID="seller-team"
    >
      <SellerTopBar title="Team members" />
      <Text style={styles.sub}>{view.seller.team.length} people</Text>
      <View style={styles.stack}>
        {view.seller.team.map((member) => (
          <SellerCard key={member.id} style={styles.between} testID={`member-${member.id}`}>
            <View style={styles.flex}>
              <Text style={styles.name}>{member.name}</Text>
              <Text style={styles.hint}>{member.email}</Text>
            </View>
            {member.role === "owner" ? (
              <Pill label="Owner" tone="info" />
            ) : (
              <SellerButton label="Remove" onPress={() => view.dispatch({ id: member.id, type: "sellerRemoveTeam" })} size="sm" testID={`remove-${member.id}`} variant="outline" />
            )}
          </SellerCard>
        ))}
      </View>
      <Text style={styles.note}>Invites are saved here. Emailing the invite arrives with the real backend.</Text>
      <Sheet onClose={() => setInviting(false)} title="Invite someone" visible={inviting}>
        <View style={styles.sheetList}>
          <TextField label="Name" onChangeText={setName} value={name} />
          <TextField autoCapitalize="none" keyboardType="email-address" label="Email" onChangeText={setEmail} value={email} />
          <Button
            disabled={!valid}
            fullWidth
            label="Send invite"
            onPress={() => {
              view.dispatch({ email, name, type: "sellerInviteTeam" });
              toast.show("Added to your team");
              setName("");
              setEmail("");
              setInviting(false);
            }}
            testID="send-invite"
          />
        </View>
      </Sheet>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  actions: { flexDirection: "row", gap: 10, marginTop: 4 },
  between: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  body: { color: SELLER.ink, fontSize: 14, lineHeight: 20 },
  case: { gap: 8 },
  flex: { flex: 1 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  name: { color: SELLER.ink, flex: 1, fontSize: 15, fontWeight: "800" },
  note: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 14, textAlign: "center" },
  photo: { alignItems: "center", backgroundColor: "#7FA3B2", borderRadius: 12, height: 54, justifyContent: "center", width: 54 },
  photos: { flexDirection: "row", gap: 8 },
  resolution: { color: "#2F8A57", fontSize: 13, fontWeight: "700" },
  sheetList: { gap: space.sm, marginTop: space.sm },
  stack: { gap: 10, marginTop: 12 },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  tiles: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  tip: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 12 },
  tipText: { color: SELLER.ink, flex: 1, fontSize: 14 },
});
