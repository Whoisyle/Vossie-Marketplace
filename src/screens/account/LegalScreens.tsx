import { useLocalSearchParams, useRouter, type Href } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { AppHeader, EmptyState, MenuRow, Screen } from "@/components";
import { getLegalDoc, LEGAL_UPDATED, legalDocs } from "@/data/legal";
import { color, space, text } from "@/theme/tokens";

/** Terms and conditions, privacy policy and community rules, with a note that the text is still a draft. */
export function LegalListScreen() {
  const router = useRouter();
  return (
    <Screen testID="legal-screen">
      <AppHeader back subtitle="The rules and your rights." title="Terms and policies" />
      <View style={styles.list}>
        {legalDocs.map((doc) => (
          <MenuRow
            hint={doc.summary}
            icon={doc.id === "terms" ? "file-text" : doc.id === "privacy" ? "lock" : doc.id === "refunds" ? "rotate-ccw" : doc.id === "seller" ? "briefcase" : "users"}
            key={doc.id}
            label={doc.title}
            onPress={() => router.push(`/legal/${doc.id}` as Href)}
          />
        ))}
      </View>
      <Text style={styles.updated}>Last updated {LEGAL_UPDATED}</Text>
    </Screen>
  );
}

export function LegalReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const doc = getLegalDoc(id);
  if (!doc) {
    return (
      <Screen>
        <AppHeader back />
        <EmptyState actionLabel="Back" icon="file-text" onAction={() => router.back()} title="Document not found" />
      </Screen>
    );
  }
  return (
    <Screen inTabs={false} testID="legal-reader">
      <AppHeader back subtitle={`Last updated ${doc.updated}`} title={doc.title} />
      {doc.sections.map((section, index) => (
        <View key={section.heading} style={styles.section}>
          <Text accessibilityRole="header" style={styles.heading}>
            {index + 1}. {section.heading}
          </Text>
          {section.body.map((paragraph) => (
            <Text key={paragraph} style={text.body}>
              {paragraph}
            </Text>
          ))}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  updated: { ...text.caption, marginTop: space.md, textAlign: "center" },
  heading: { color: color.heading, fontSize: 16, fontWeight: "800" },
  list: { gap: space.xs, marginTop: space.md },
  section: { gap: space.xs, marginTop: space.md },
});
