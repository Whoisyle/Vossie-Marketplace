import { StyleSheet, View } from "react-native";

import { Button, Sheet } from "@/components";
import { dateKey, fromMin, storeStatus, toMin } from "@/seller/schedule";
import { text } from "@/theme/tokens";

import { useSeller } from "./hooks";
import { Text } from "./ui";

/** The times to offer for closing early: in an hour, in two, or at the next round time, never in the past and always before closing. */
export function closeEarlyOptions(now: Date, closes: string): { label: string; at: string }[] {
  const minutes = now.getHours() * 60 + now.getMinutes();
  const latest = toMin(closes);
  const round = (value: number) => Math.ceil(value / 30) * 30;
  const picks = [
    { at: round(minutes + 60), label: "In 1 hour" },
    { at: round(minutes + 120), label: "In 2 hours" },
    { at: round(minutes + 180), label: "In 3 hours" },
  ];
  return picks.filter((item) => item.at < latest).map((item) => ({ at: fromMin(item.at), label: `${item.label} (${fromMin(item.at)})` }));
}

/**
 * Close early today: stop taking orders from a time today, or right now. The store opens as usual the next open day.
 * If it is already closed early, the same sheet opens it again.
 */
export function CloseEarlySheet({ onClose, visible }: { visible: boolean; onClose: () => void }) {
  const view = useSeller();
  const now = new Date();
  const today = dateKey(now);
  const early = view.seller.schedule.closeEarly;
  const active = early && early.date === today;
  const closes = view.seller.schedule.hours[["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()] as "mon"].to;
  const status = storeStatus(view.seller.schedule, now);
  const set = (at: string | null) => {
    view.dispatch({ at, date: today, type: "sellerCloseEarly" });
    onClose();
  };
  const options = closeEarlyOptions(now, closes);
  return (
    <Sheet onClose={onClose} title={active ? "Closing early today" : "Close early today"} visible={visible}>
      {active ? (
        <>
          <Text style={text.body}>You stop taking orders at {early!.at} today. {status.open ? "The store is still open until then." : "The store is closed."}</Text>
          <Button fullWidth label="Open as usual" onPress={() => set(null)} testID="reopen-today" />
        </>
      ) : (
        <>
          <Text style={text.body}>Choose when to stop taking orders today. Orders already accepted stay with you, and tomorrow is as normal.</Text>
          <View style={styles.list}>
            {options.map((item) => (
              <Button fullWidth key={item.at} label={item.label} onPress={() => set(item.at)} testID={`early-${item.at}`} variant="soft" />
            ))}
            <Button fullWidth label="Stop taking orders now" onPress={() => set(fromMin(now.getHours() * 60 + now.getMinutes()))} testID="early-now" variant="outline" />
          </View>
        </>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8, marginTop: 8 },
});
