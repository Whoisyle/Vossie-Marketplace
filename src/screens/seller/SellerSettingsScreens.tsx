import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { StyleSheet, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";

import { Button, Sheet, TextField, TwoFactorSheet, useToast } from "@/components";
import { dateAndTime } from "@/data/format";
import { securityScore } from "@/screens/account/SecurityScreen";
import { useSecurityActions } from "@/screens/account/useSecurityActions";
import { useDemoStore } from "@/state/DemoStore";
import { space, text } from "@/theme/tokens";

import { useSeller } from "./hooks";
import { SettingRow } from "./parts";
import { Pill, SELLER, SellerButton, SellerCard, SellerHeading, SellerScreen, SellerTopBar, Text } from "./ui";

/** Sign-in and device security for the seller: the score, Face ID, two-factor sign-in, and where the account is signed in. */
export function SellerSecurityScreen() {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const security = useSecurityActions();
  const [email, setEmail] = useState(false);
  const others = state.loginEvents.filter((event) => !event.current);
  const check = securityScore({ biometric: security.biometric, otherSessions: others.length, twoFactor: security.twoFactorOn });

  return (
    <SellerScreen tone="white" testID="seller-security">
      <SellerTopBar title="Security" />
      <SellerCard style={styles.score} testID="security-score">
        <View style={styles.between}>
          <View style={styles.flex}>
            <Text style={styles.big}>
              {check.score} of {check.total} protections on
            </Text>
            <Text style={styles.hint}>Face ID, two-factor sign-in and one signed-in device keep your shop and your earnings safe.</Text>
          </View>
          <Pill label={check.score === check.total ? "Strong" : "Add more"} tone={check.score === check.total ? "success" : "warn"} />
        </View>
      </SellerCard>

      <SellerHeading>Sign-in</SellerHeading>
      <View style={styles.stack}>
        <SettingRow hint={state.profile?.email ?? "Your student email"} icon="mail" label="Sign-in email" onPress={() => setEmail(true)} testID="row-email" />
        <SettingRow hint="Unlock the app with your face or fingerprint" icon="smile" label="Face ID or fingerprint" onToggle={(value) => void security.setBiometric(value)} testID="row-biometric" toggle={security.biometric} />
        <SettingRow hint="A code from an authenticator app when you sign in" icon="shield" label="Two-factor sign-in" onToggle={(value) => security.startTwoFactor(value)} testID="row-2fa" toggle={security.twoFactorOn} />
      </View>

      <SellerHeading>Signed-in devices</SellerHeading>
      <View style={styles.stack}>
        {state.loginEvents.map((event, index) => (
          <Animated.View entering={FadeInDown.delay(index * 50).duration(300)} key={event.id}>
            <SellerCard style={styles.between} testID={`device-${event.id}`}>
              <View style={styles.flex}>
                <Text style={styles.name}>
                  {event.device}
                  {event.current ? " · This device" : ""}
                </Text>
                <Text style={styles.hint}>
                  {event.location} · {dateAndTime(event.at)}
                </Text>
              </View>
            </SellerCard>
          </Animated.View>
        ))}
        {others.length > 0 ? (
          <SellerButton
            icon="log-out"
            label="Sign out other devices"
            onPress={() => {
              dispatch({ type: "signOutOtherSessions" });
              toast.show("Other devices signed out");
            }}
            testID="sign-out-others"
            variant="outline"
          />
        ) : null}
      </View>

      <TwoFactorSheet mode={security.twoFactor ?? "enable"} onClose={security.closeTwoFactor} visible={security.twoFactor !== null} />
      <Sheet onClose={() => setEmail(false)} title="Sign-in email" visible={email}>
        <Text style={text.body}>You sign in with a one-time code sent to {state.profile?.email ?? "your student email"}. It is your Eduvos address, so it can only be changed with Eduvos.</Text>
        <Button fullWidth label="Got it" onPress={() => setEmail(false)} testID="email-close" variant="soft" />
      </Sheet>
    </SellerScreen>
  );
}

/** Account, privacy and store settings: business and tax details, bank, pausing or closing the store, your data. */
export function SellerSettingsScreen() {
  const router = useRouter();
  const toast = useToast();
  const view = useSeller();
  const { dispatch } = useDemoStore();
  const [tax, setTax] = useState(view.seller.profile.taxNumber ?? "");
  const [panel, setPanel] = useState<"tax" | "data" | "delete" | null>(null);
  const go = (path: string) => router.push(path as Href);
  const close = () => setPanel(null);

  return (
    <SellerScreen tone="white" testID="seller-settings">
      <SellerTopBar title="Settings" />
      <SellerHeading>Business</SellerHeading>
      <View style={styles.stack}>
        <SettingRow hint={view.storeName} icon="shopping-bag" label="Business details" onPress={() => go("/seller/account/store")} testID="set-business" />
        <SettingRow hint={view.seller.profile.taxNumber ? `Tax number ${view.seller.profile.taxNumber}` : "Optional, for a registered business"} icon="file-text" label="Tax information" onPress={() => setPanel("tax")} testID="set-tax" />
        <SettingRow hint={view.seller.profile.bank ? `${view.seller.profile.bank.bankName} ending ${view.seller.profile.bank.last4}` : "Added when you first request a payout"} icon="credit-card" label="Bank accounts" onPress={() => go("/seller/payouts")} testID="set-bank" />
        <SettingRow hint="Open days, lectures and closures" icon="clock" label="Operating times" onPress={() => go("/seller/account/hours")} testID="set-hours" />
      </View>

      <SellerHeading>Your shop</SellerHeading>
      <View style={styles.stack}>
        <SettingRow hint={view.seller.schedule.closedNow ? "Buyers see the store as closed" : "Take a break without losing anything"} icon="pause-circle" label="Pause the store" onToggle={(value) => view.dispatch({ schedule: { ...view.seller.schedule, closedNow: value }, type: "sellerSetSchedule" })} testID="set-pause" toggle={view.seller.schedule.closedNow} />
        <SettingRow hint="Push, email, quiet hours" icon="bell" label="Notification settings" onPress={() => go("/seller/account/notifications")} testID="set-notify" />
        <SettingRow hint="Sign-in, Face ID and devices" icon="lock" label="Security" onPress={() => go("/seller/account/security")} testID="set-security" />
      </View>

      <SellerHeading>Privacy and data</SellerHeading>
      <View style={styles.stack}>
        <SettingRow hint="A copy of your orders, products and earnings" icon="download" label="Download my data" onPress={() => setPanel("data")} testID="set-data" />
        <SettingRow hint="Removes your seller account" icon="trash-2" label="Close seller account" onPress={() => setPanel("delete")} testID="set-delete" />
      </View>

      <Sheet onClose={close} title="Tax information" visible={panel === "tax"}>
        <Text style={text.body}>Add your tax or VAT number if you are a registered business. Receipts show it.</Text>
        <TextField label="Tax number" onChangeText={setTax} testID="tax-field" value={tax} />
        <Button
          fullWidth
          label="Save"
          onPress={() => {
            dispatch({ patch: { taxNumber: tax.trim() }, type: "sellerSaveStore" });
            toast.show("Tax information saved");
            close();
          }}
          testID="tax-save"
        />
      </Sheet>
      <Sheet onClose={close} title="Download my data" visible={panel === "data"}>
        <Text style={text.body}>In the live app a copy of your seller data is emailed to you within a day. In this demo nothing is sent.</Text>
        <Button
          fullWidth
          label="Request a copy"
          onPress={() => {
            toast.show("Requested (demo)");
            close();
          }}
          testID="data-request"
          variant="soft"
        />
      </Sheet>
      <Sheet onClose={close} title="Close seller account" visible={panel === "delete"}>
        <Text style={text.body}>Closing stops your listings and orders. In this demo it takes you back to buying and keeps your data on this phone.</Text>
        <Button
          fullWidth
          label="Switch to buying"
          onPress={() => {
            dispatch({ role: "buyer", type: "switchRole" });
            close();
            router.replace("/home" as Href);
          }}
          testID="close-account"
          variant="outline"
        />
      </Sheet>
    </SellerScreen>
  );
}

const styles = StyleSheet.create({
  between: { alignItems: "center", flexDirection: "row", gap: space.sm, justifyContent: "space-between" },
  big: { color: SELLER.ink, fontSize: 17, fontWeight: "800" },
  flex: { flex: 1, gap: 2 },
  hint: { color: SELLER.inkSoft, fontSize: 13 },
  name: { color: SELLER.ink, fontSize: 15, fontWeight: "800" },
  score: { gap: 10, marginTop: 14 },
  stack: { gap: 12 },
});
