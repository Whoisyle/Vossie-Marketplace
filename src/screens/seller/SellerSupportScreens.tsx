import { Image } from "expo-image";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon, useToast } from "@/components";
import { dateAndTime, relativeTime } from "@/data/format";
import { sellerId } from "@/seller/state";
import { TICKET_TOPICS, type SupportTicket, type TicketAttachment, type TicketTopic } from "@/seller/types";

import { AttachSheet } from "./attach";
import { SellerField } from "./fields";
import { useSeller } from "./hooks";
import { Chips } from "./parts";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

const STATUS = { "in-progress": { label: "In progress", tone: "warn" }, open: { label: "Open", tone: "info" }, resolved: { label: "Resolved", tone: "success" } } as const;

const CONTACT = [
  { key: "chat", label: "In-app chat" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone call" },
] as const;

const TIMES = [
  { key: "anytime", label: "Any time" },
  { key: "morning", label: "Morning" },
  { key: "afternoon", label: "Afternoon" },
  { key: "evening", label: "Evening" },
] as const;

/** Help and support: ways to reach Vossie, and every request the seller has sent with where it is up to. */
export function SellerSupportScreen() {
  const router = useRouter();
  const view = useSeller();
  const tickets = view.seller.tickets;
  const open = tickets.filter((item) => item.status !== "resolved").length;
  return (
    <SellerScreen
      footer={<SellerButton icon="plus" label="New request" onPress={() => router.push("/seller/account/support/new" as Href)} size="lg" testID="new-ticket" variant="glass" />}
      tone="white"
      testID="seller-support"
    >
      <SellerTopBar title="Help and support" />
      <Text style={styles.sub}>Tell us what is wrong and we will get back to you.</Text>

      <View style={styles.channels}>
        <Channel hint="Replies here" icon="message-circle" label="Chat" onPress={() => router.push("/seller/account/support/new" as Href)} testID="channel-chat" />
        <Channel hint="seller@vossie.net" icon="mail" label="Email" onPress={() => void Linking.openURL("mailto:seller@vossie.net?subject=Vossie%20seller%20support")} testID="channel-email" />
        <Channel hint="Mon to Fri, 8 to 5" icon="phone" label="Call" onPress={() => void Linking.openURL("tel:+27180000000")} testID="channel-call" />
      </View>
      <Text style={styles.note}>Contact details are placeholders until Vossie has its support line.</Text>

      <SellerHeading>Your requests {open > 0 ? `· ${open} open` : ""}</SellerHeading>
      <View style={styles.stack}>
        {tickets.length === 0 ? (
          <SellerCard testID="tickets-empty">
            <Text style={styles.hint}>No requests yet.</Text>
          </SellerCard>
        ) : (
          tickets.map((ticket, index) => (
            <Animated.View entering={FadeInDown.delay(Math.min(index, 6) * 50).duration(300)} key={ticket.id}>
              <SellerCard onPress={() => router.push(`/seller/account/support/${ticket.id}` as Href)} style={styles.ticket} testID={`ticket-${ticket.id}`}>
                <View style={styles.between}>
                  <Text style={styles.ref}>{ticket.ref}</Text>
                  <Pill label={STATUS[ticket.status].label} tone={STATUS[ticket.status].tone} />
                </View>
                <Text numberOfLines={1} style={styles.name}>
                  {ticket.subject}
                </Text>
                <Text style={styles.hint}>
                  {TICKET_TOPICS.find((item) => item.key === ticket.topic)?.label} · {relativeTime(ticket.createdAt)}
                  {ticket.urgency === "urgent" ? " · Urgent" : ""}
                </Text>
              </SellerCard>
            </Animated.View>
          ))
        )}
      </View>
    </SellerScreen>
  );
}

function Channel({ hint, icon, label, onPress, testID }: { icon: "message-circle" | "mail" | "phone"; label: string; hint: string; onPress: () => void; testID: string }) {
  return (
    <SellerCard onPress={onPress} style={styles.channel} testID={testID}>
      <View style={styles.channelIcon}>
        <Icon color={SELLER.solid} name={icon} size={20} />
      </View>
      <Text style={styles.name}>{label}</Text>
      <Text numberOfLines={1} style={styles.hintSmall}>
        {hint}
      </Text>
    </SellerCard>
  );
}

/** A new request: what it is about, the order it concerns, the details, any photos or files, and how and when to reach the seller. */
export function SellerSupportFormScreen() {
  const router = useRouter();
  const toast = useToast();
  const view = useSeller();
  const [topic, setTopic] = useState<TicketTopic>("order");
  const [orderNumber, setOrderNumber] = useState<string | undefined>();
  const [subject, setSubject] = useState("");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<TicketAttachment[]>([]);
  const [attaching, setAttaching] = useState(false);
  const [contact, setContact] = useState<SupportTicket["contact"]>("chat");
  const [phone, setPhone] = useState(view.seller.profile.phone);
  const [bestTime, setBestTime] = useState<SupportTicket["bestTime"]>("anytime");
  const [urgent, setUrgent] = useState(false);
  const [errors, setErrors] = useState<{ subject?: string; details?: string; phone?: string }>({});
  const orders = view.seller.orders.slice(0, 6);

  const send = () => {
    const found: typeof errors = {};
    if (subject.trim().length < 4) found.subject = "Give the request a short subject.";
    if (details.trim().length < 15) found.details = "Tell us a little more, at least a sentence.";
    if (contact === "phone" && !/^[0-9 +()-]{9,}$/.test(phone.trim())) found.phone = "Add the number we should call.";
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    const id = sellerId("tk");
    const at = new Date().toISOString();
    view.dispatch({
      ticket: { attachments: files, bestTime, contact, createdAt: at, details: details.trim(), id, messages: [{ at, body: details.trim(), from: "you", id: sellerId("tm") }], orderNumber, phone: contact === "phone" ? phone.trim() : undefined, ref: "", status: "open", subject: subject.trim(), topic, urgency: urgent ? "urgent" : "normal" },
      type: "sellerCreateTicket",
    });
    toast.show("Request sent");
    router.replace(`/seller/account/support/${id}` as Href);
  };

  return (
    <SellerScreen footer={<SellerButton icon="send" label="Send request" onPress={send} size="lg" testID="send-ticket" variant="glass" />} tone="white" testID="seller-support-form">
      <SellerTopBar title="New request" />
      <View style={styles.form}>
        <View style={styles.block}>
          <Text style={styles.label}>What is it about?</Text>
          <Chips items={TICKET_TOPICS} onChange={setTopic} prefix="topic" value={topic} />
        </View>

        {orders.length > 0 && (topic === "order" || topic === "payout") ? (
          <View style={styles.block}>
            <Text style={styles.label}>Which order? (optional)</Text>
            <Chips items={[{ key: "none", label: "None" }, ...orders.map((item) => ({ key: item.number, label: item.number }))]} onChange={(key) => setOrderNumber(key === "none" ? undefined : key)} prefix="order" value={orderNumber ?? "none"} />
          </View>
        ) : null}

        <SellerField error={errors.subject} label="Subject" onChangeText={setSubject} placeholder="A payout is missing" testID="ticket-subject" value={subject} />
        <SellerField error={errors.details} label="Details" multiline onChangeText={setDetails} placeholder="What happened, and what did you expect?" testID="ticket-details" value={details} />

        <View style={styles.block}>
          <Text style={styles.label}>Photos or files (optional)</Text>
          <View style={styles.files}>
            {files.map((file, index) => (
              <View key={`${file.name}-${index}`} style={styles.file} testID={`attachment-${index}`}>
                {file.kind === "image" && file.uri ? <Image contentFit="cover" source={{ uri: file.uri }} style={StyleSheet.absoluteFill} /> : <Icon color={SELLER.solid} name={file.kind === "pdf" ? "file-text" : "file"} size={22} />}
                <Pressable accessibilityLabel={`Remove ${file.name}`} accessibilityRole="button" hitSlop={6} onPress={() => setFiles((current) => current.filter((_, i) => i !== index))} style={styles.remove} testID={`remove-attachment-${index}`}>
                  <Icon color="#FFFFFF" name="x" size={12} />
                </Pressable>
              </View>
            ))}
            {files.length < 5 ? (
              <Pressable accessibilityLabel="Add a photo or file" accessibilityRole="button" onPress={() => setAttaching(true)} style={[styles.file, styles.add]} testID="add-attachment">
                <Icon color={SELLER.solid} name="paperclip" size={20} />
              </Pressable>
            ) : null}
          </View>
        </View>

        <View style={styles.block}>
          <Text style={styles.label}>How should we reach you?</Text>
          <Chips items={CONTACT.map((item) => ({ key: item.key, label: item.label }))} onChange={setContact} prefix="contact" value={contact} />
          {contact === "phone" ? <SellerField error={errors.phone} icon="phone" keyboardType="phone-pad" label="Phone number" onChangeText={setPhone} placeholder="083 465 6668" testID="ticket-phone" value={phone} /> : null}
          {contact !== "chat" ? (
            <>
              <Text style={styles.label}>Best time</Text>
              <Chips items={TIMES.map((item) => ({ key: item.key, label: item.label }))} onChange={setBestTime} prefix="time" value={bestTime} />
            </>
          ) : null}
        </View>

        <SellerCard style={styles.urgent}>
          <View style={styles.flex}>
            <Text style={styles.name}>Mark as urgent</Text>
            <Text style={styles.hint}>For money that is stuck or a safety problem</Text>
          </View>
          <Pressable accessibilityLabel="Urgent" accessibilityRole="switch" accessibilityState={{ checked: urgent }} onPress={() => setUrgent((value) => !value)} style={[styles.toggle, urgent && styles.toggleOn]} testID="ticket-urgent">
            <View style={[styles.knob, urgent && styles.knobOn]} />
          </Pressable>
        </SellerCard>
      </View>
      <AttachSheet onClose={() => setAttaching(false)} onPicked={(file) => setFiles((current) => [...current, { kind: file.kind, name: file.name, uri: file.uri }])} title="Add a photo or file" visible={attaching} />
    </SellerScreen>
  );
}

/** One request: what was sent, where it is up to and the replies, with a box to write back until it is resolved. */
export function SellerTicketScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const view = useSeller();
  const [reply, setReply] = useState("");
  const ticket = view.seller.tickets.find((item) => item.id === id);
  if (!ticket) {
    return (
      <SellerScreen tone="white" testID="seller-ticket-missing">
        <SellerTopBar title="Request" />
        <SellerCard style={styles.missing}>
          <Text style={styles.name}>That request is not here any more.</Text>
        </SellerCard>
      </SellerScreen>
    );
  }
  const look = STATUS[ticket.status];
  const closed = ticket.status === "resolved";

  return (
    <SellerScreen tone="white" testID="seller-ticket">
      <SellerTopBar title={ticket.ref} />
      <SellerCard style={styles.head} testID="ticket-head">
        <View style={styles.between}>
          <Text style={styles.name}>{ticket.subject}</Text>
          <Pill label={look.label} tone={look.tone} />
        </View>
        <Text style={styles.hint}>
          {TICKET_TOPICS.find((item) => item.key === ticket.topic)?.label}
          {ticket.orderNumber ? ` · ${ticket.orderNumber}` : ""}
          {ticket.urgency === "urgent" ? " · Urgent" : ""}
        </Text>
        <Text style={styles.hint}>
          Reach you by {ticket.contact === "chat" ? "chat" : ticket.contact === "email" ? "email" : `phone on ${ticket.phone ?? ""}`}
          {ticket.contact !== "chat" && ticket.bestTime !== "anytime" ? `, ${ticket.bestTime}` : ""}
        </Text>
        {ticket.attachments.length > 0 ? (
          <View style={styles.files}>
            {ticket.attachments.map((file, index) => (
              <View key={`${file.name}-${index}`} style={styles.file}>
                {file.kind === "image" && file.uri ? <Image contentFit="cover" source={{ uri: file.uri }} style={StyleSheet.absoluteFill} /> : <Icon color={SELLER.solid} name={file.kind === "pdf" ? "file-text" : "file"} size={22} />}
              </View>
            ))}
          </View>
        ) : null}
      </SellerCard>

      <View style={styles.thread} testID="ticket-thread">
        {ticket.messages.map((message, index) => (
          <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 60).duration(280)} key={message.id} style={[styles.bubbleRow, message.from === "you" && styles.bubbleRowMine]}>
            <View style={[styles.bubble, message.from === "you" ? styles.bubbleMine : styles.bubbleTheirs]}>
              <Text style={[styles.bubbleText, message.from === "you" && styles.bubbleTextMine]}>{message.body}</Text>
              <Text style={[styles.bubbleTime, message.from === "you" && styles.bubbleTimeMine]}>
                {message.from === "you" ? "You" : "Vossie support"} · {dateAndTime(message.at)}
              </Text>
            </View>
          </Animated.View>
        ))}
        {ticket.status === "open" ? <Text style={styles.waiting}>Waiting for Vossie support…</Text> : null}
      </View>

      {closed ? (
        <Text style={styles.note}>This request is resolved. Start a new one if you still need help.</Text>
      ) : (
        <View style={styles.replyBox}>
          <SellerField label="Reply" multiline onChangeText={setReply} placeholder="Write a message" testID="ticket-reply" value={reply} />
          <View style={styles.replyActions}>
            <SellerButton
              disabled={reply.trim().length === 0}
              icon="send"
              label="Send"
              onPress={() => {
                view.dispatch({ body: reply, id: ticket.id, type: "sellerReplyTicket" });
                setReply("");
              }}
              size="sm"
              testID="ticket-send-reply"
              variant="solid"
            />
            <SellerButton label="Mark resolved" onPress={() => view.dispatch({ id: ticket.id, type: "sellerResolveTicket" })} size="sm" testID="ticket-resolve" variant="outline" />
          </View>
        </View>
      )}
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  add: { borderColor: "#B5C4CB", borderStyle: "dashed", borderWidth: 1.5 },
  between: { alignItems: "center", flexDirection: "row", gap: 8, justifyContent: "space-between" },
  block: { gap: 8 },
  bubble: { borderRadius: 18, gap: 4, maxWidth: "86%", padding: 12 },
  bubbleMine: { backgroundColor: SELLER.solid },
  bubbleRow: { flexDirection: "row" },
  bubbleRowMine: { justifyContent: "flex-end" },
  bubbleText: { color: SELLER.ink, fontSize: 14, lineHeight: 20 },
  bubbleTextMine: { color: "#FFFFFF" },
  bubbleTheirs: { backgroundColor: "#DCE6EA" },
  bubbleTime: { color: SELLER.inkSoft, fontSize: 11 },
  bubbleTimeMine: { color: "rgba(255,255,255,0.8)" },
  channel: { alignItems: "center", flexBasis: "30%", flexGrow: 1, gap: 4, padding: 12 },
  channelIcon: { alignItems: "center", backgroundColor: "#DCE6EA", borderRadius: 18, height: 36, justifyContent: "center", width: 36 },
  channels: { flexDirection: "row", gap: 10, marginTop: 12 },
  file: { alignItems: "center", backgroundColor: "#DCE6EA", borderRadius: 12, height: 56, justifyContent: "center", overflow: "hidden", width: 56 },
  files: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  flex: { flex: 1, gap: 2 },
  form: { gap: 16, marginTop: 12 },
  head: { gap: 6, marginTop: 12 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  hintSmall: { color: SELLER.inkSoft, fontSize: 11 },
  knob: { backgroundColor: "#FFFFFF", borderRadius: 11, height: 22, width: 22 },
  knobOn: { alignSelf: "flex-end" },
  label: { color: SELLER.ink, fontSize: 14, fontWeight: "800" },
  missing: { marginTop: 20 },
  name: { color: SELLER.ink, flex: 1, fontSize: 15, fontWeight: "800" },
  note: { color: SELLER.inkSoft, fontSize: 12, marginTop: 14, textAlign: "center" },
  ref: { color: SELLER.solid, fontSize: 13, fontWeight: "800" },
  remove: { alignItems: "center", backgroundColor: "rgba(20,35,44,0.7)", borderRadius: 9, height: 18, justifyContent: "center", position: "absolute", right: 3, top: 3, width: 18 },
  replyActions: { flexDirection: "row", gap: 10 },
  replyBox: { gap: 10, marginTop: 14 },
  stack: { gap: 10 },
  sub: { color: SELLER.inkSoft, fontSize: 14, marginTop: 8 },
  thread: { gap: 10, marginTop: 14 },
  ticket: { gap: 4 },
  toggle: { backgroundColor: "#C3CED3", borderRadius: 15, height: 30, justifyContent: "center", paddingHorizontal: 4, width: 52 },
  toggleOn: { backgroundColor: SELLER.solid },
  urgent: { alignItems: "center", flexDirection: "row", gap: 12 },
  waiting: { color: SELLER.inkSoft, fontSize: 13, textAlign: "center" },
});
