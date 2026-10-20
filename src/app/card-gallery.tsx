import { ScrollView, StyleSheet } from "react-native";

import { StudentCard, uprightWidth } from "@/components/StudentCard";
import { issuers } from "@/data/cardBrands";
import { BankFace } from "@/screens/account/BankFaces";
import { ApplePayFace, GooglePayFace, VossieWalletFace } from "@/screens/account/PayFaces";
import { CardFace } from "@/screens/account/WalletCards";

const W = 320;
const card = { brand: "visa" as const, expiry: "08/28", holder: "Vumisa", id: "x", isDefault: false, last4: "4242" };

/** Temporary preview of every card face side by side. */
export default function CardGallery() {
  return (
    <ScrollView contentContainerStyle={styles.grid} style={styles.page}>
      <StudentCard campusName="Potchefstroom" name="Paballo Kali" studentNumber="202309530" width={uprightWidth(W)} />
      <VossieWalletFace balanceCents={125000} width={W} />
      {issuers.map((issuer, i) => (
        <BankFace card={{ ...card, brand: i % 2 ? "mastercard" : "visa", issuer: issuer.id }} issuer={issuer} key={issuer.id} width={W} />
      ))}
      <ApplePayFace ready width={W} />
      <GooglePayFace ready width={W} />
      <CardFace card={card} width={W} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 24, padding: 24 },
  page: { backgroundColor: "#D9DEE2" },
});
