import { useRouter, type Href } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppHeader, Button, Card, EmptyState, Icon, Screen, SearchBar, PageHero } from "@/components";
import { getFaqs } from "@/data/repository";
import { useDemoStore } from "@/state/DemoStore";
import { color, space, text } from "@/theme/tokens";

/** Help: searchable FAQ accordion and a route to support chat. */
export function HelpScreen() {
  const router = useRouter();
  const { dispatch } = useDemoStore();
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);

  const faqs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return getFaqs().filter((faq) => !needle || `${faq.question} ${faq.answer}`.toLowerCase().includes(needle));
  }, [query]);

  const chat = () => {
    dispatch({ conversationId: "conv-support", kind: "support", name: "Vossie Support", type: "openConversation" });
    router.push("/account/inbox/conv-support" as Href);
  };

  return (
    <Screen>
      <AppHeader back subtitle="Find answers or get in touch with us." title="Help" />
      <PageHero
        chips={[{ icon: "book-open", label: `${faqs.length} ${faqs.length === 1 ? "answer" : "answers"}` }, { icon: "message-circle", label: "Chat with Support" }]}
        icon="life-buoy"
        subtitle="Search the answers below, or chat with Vossie Support."
        testID="help-hero"
        title="How can we help?"
        tone="ink"
      />
      <View style={styles.search}>
        <SearchBar compact onChangeText={setQuery} placeholder="Search for help articles" value={query} />
      </View>
      <Text style={styles.heading}>Frequently asked</Text>
      {faqs.length === 0 ? (
        <EmptyState icon="search" message="Try a different word, or chat with support." title="No matching articles" />
      ) : (
        <Card padded={false}>
          {faqs.map((faq, index) => {
            const open = faq.id === openId;
            return (
              <View key={faq.id} style={index > 0 && styles.divider}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open }}
                  onPress={() => setOpenId(open ? null : faq.id)}
                  style={styles.question}
                >
                  <Text style={[text.cardTitle, styles.flex]}>{faq.question}</Text>
                  <Icon name={open ? "chevron-up" : "chevron-right"} size={18} />
                </Pressable>
                {open ? <Text style={styles.answer}>{faq.answer}</Text> : null}
              </View>
            );
          })}
        </Card>
      )}
      <Card style={styles.support} variant="primary">
        <Icon color={color.onPrimary} name="message-circle" size={22} />
        <Text style={styles.supportTitle}>Still need help?</Text>
        <Text style={styles.supportBody}>Our team usually replies within a few hours.</Text>
        <Button label="Chat with support" onPress={chat} size="sm" variant="light" />
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  answer: { ...text.bodySmall, paddingBottom: space.sm, paddingHorizontal: space.md },
  divider: { borderTopColor: color.divider, borderTopWidth: 1 },
  flex: { flex: 1 },
  heading: { ...text.sectionTitle, marginBottom: space.xs, marginTop: space.md },
  question: { alignItems: "center", flexDirection: "row", gap: space.sm, minHeight: 52, padding: space.md },
  search: { marginTop: space.xs },
  support: { alignItems: "center", gap: space.xs, marginTop: space.md },
  supportBody: { color: color.onPrimary, fontSize: 12, opacity: 0.85 },
  supportTitle: { color: color.onPrimary, fontSize: 16, fontWeight: "700" },
});
