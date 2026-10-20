import { useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Icon } from "@/components";
import { initials, relativeTime } from "@/data/format";

import { useBuyerMessages } from "./hooks";
import { SELLER, SellerCard, SellerScreen, SellerTopBar } from "./ui";

/** Seller Messages: the buyers who have written, newest first, with an unread dot. Opens the conversation. */
export function SellerMessagesScreen() {
  const router = useRouter();
  const messages = useBuyerMessages();
  return (
    <SellerScreen testID="seller-messages">
      <SellerTopBar title="Messages" />
      {messages.length === 0 ? (
        <SellerCard style={styles.empty}>
          <Icon color={SELLER.solid} name="message-circle" size={28} />
          <Text style={styles.name}>No messages yet</Text>
          <Text style={styles.preview}>Buyers can ask about your listings and orders here.</Text>
        </SellerCard>
      ) : (
        <View style={styles.list}>
          {messages.map((item, index) => (
            <Animated.View entering={FadeInDown.delay(index * 60).duration(340)} key={item.id}>
              <SellerCard onPress={() => router.push(`/seller/home/messages/${item.id}` as Href)} style={styles.row} testID={`message-${item.id}`}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(item.name)}</Text>
                </View>
                <View style={styles.text}>
                  <Text style={[styles.name, item.unread && styles.unreadName]}>{item.name}</Text>
                  <Text numberOfLines={1} style={styles.preview}>
                    {item.preview}
                  </Text>
                </View>
                <View style={styles.meta}>
                  <Text style={styles.when}>{item.at ? relativeTime(item.at) : ""}</Text>
                  {item.unread ? <View style={styles.dot} /> : null}
                </View>
              </SellerCard>
            </Animated.View>
          ))}
        </View>
      )}
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: "center", backgroundColor: "#5E8696", borderRadius: 24, height: 48, justifyContent: "center", width: 48 },
  avatarText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  dot: { backgroundColor: SELLER.solid, borderRadius: 5, height: 10, width: 10 },
  empty: { alignItems: "center", gap: 6, marginTop: 20, paddingVertical: 28 },
  list: { gap: 10, marginTop: 16 },
  meta: { alignItems: "flex-end", gap: 6 },
  name: { color: SELLER.ink, fontSize: 16, fontWeight: "600" },
  preview: { color: SELLER.inkSoft, fontSize: 13 },
  row: { alignItems: "center", flexDirection: "row", gap: 12 },
  text: { flex: 1, gap: 1 },
  unreadName: { fontWeight: "900" },
  when: { color: SELLER.inkSoft, fontSize: 12 },
});
