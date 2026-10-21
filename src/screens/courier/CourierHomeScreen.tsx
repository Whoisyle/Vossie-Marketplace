import { useRouter, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text as RNText, View } from "react-native";

import { Icon, Sheet, useToast } from "@/components";
import { rand } from "@/courier/pay";
import { activeNow, demand, goalProgress, hiddenOffers, streak, todayStats, visibleOffers } from "@/courier/selectors";
import { dayKeyOf } from "@/seller/schedule";
import { workStatus } from "@/courier/schedule";
import { licenceProblem } from "@/courier/state";
import { getCampusName } from "@/data/repository";
import { haptic } from "@/lib/haptics";
import { Text } from "@/screens/seller/ui";

import { firstWord, useCourier, useNow } from "./hooks";
import { JobCard } from "./JobParts";
import { Button, Card, CourierPage, COURIER, Empty, Heading, Pill, Radar, Rise, Stat, Toggle, type } from "./ui";

const GOALS = [50000, 100000, 150000, 250000];

/** Home, a blue page like the seller's: whether you are online, the week's goal and streak, busy areas, today's numbers and the offer that is waiting. */
export function CourierHomeScreen() {
  const router = useRouter();
  const toast = useToast();
  const { courier, dispatch } = useCourier();
  const now = useNow(15_000);
  const clock = new Date(now);
  const stats = todayStats(courier, clock);
  const offers = visibleOffers(courier, clock);
  const hidden = hiddenOffers(courier, clock);
  const active = activeNow(courier)[0];
  const online = courier.online;
  const status = workStatus(courier.schedule, clock);
  const onBreak = status.reason === "break";
  const lit = online && !onBreak;
  const problem = licenceProblem(courier, now);
  const hoursToday = courier.schedule.hours[dayKeyOf(clock)];
  const goal = goalProgress(courier, clock);
  const run = streak(courier, clock);
  const areas = demand(courier, clock).slice(0, 3);
  const [goalOpen, setGoalOpen] = useState(false);

  const accept = (id: string) => {
    haptic.success();
    dispatch({ id, type: "courierAcceptJob" });
    router.push(`/courier/active/${id}` as Href);
  };

  return (
    <CourierPage subtitle={`${getCampusName(courier.profile.campusId).replace(/\s*\(.*\)/, "")} campus`} testID="courier-home" title={`Hi, ${firstWord(courier.profile.fullName)}`} tone="blue">
      <Rise>
        <Card style={styles.online} testID="online-card" tone={lit ? "dark" : "plain"}>
          <View style={styles.onlineTop}>
            <Radar active={lit} size={50} />
            <View style={styles.flex}>
              <RNText style={[styles.onlineTitle, !lit && { color: COURIER.ink }]}>{!online ? "You are offline" : onBreak ? "On a break" : "You are online"}</RNText>
              <RNText style={[styles.onlineSub, !lit && { color: COURIER.inkSoft }]}>{!online ? "Go online to receive offers" : onBreak ? status.label : "Receiving delivery offers"}</RNText>
            </View>
            <Toggle
              label={online ? "Go offline" : "Go online"}
              on={online}
              onChange={(on) => {
                if (on && problem === "expired") {
                  toast.show("Your licence has expired. Send a new one in Documents.");
                  return;
                }
                dispatch({ online: on, type: "courierSetOnline" });
                toast.show(on ? "You are online. Offers will appear here." : "You are offline");
              }}
              onDark={lit}
              testID="online-toggle"
            />
          </View>
          <RNText style={[styles.hours, !lit && { color: COURIER.inkSoft }]}>{status.label}</RNText>
          {online ? (
            <View style={styles.quick}>
              {onBreak ? (
                <Pressable accessibilityRole="button" onPress={() => dispatch({ type: "courierEndBreak" })} style={styles.quickChip} testID="quick-resume">
                  <Icon color={COURIER.solid} name="play" size={14} />
                  <RNText style={styles.quickText}>Resume</RNText>
                </Pressable>
              ) : (
                <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); dispatch({ minutes: 15, type: "courierStartBreak" }); }} style={styles.quickChip} testID="quick-break">
                  <Icon color={COURIER.solid} name="coffee" size={14} />
                  <RNText style={styles.quickText}>15 min break</RNText>
                </Pressable>
              )}
              <Pressable accessibilityRole="button" onPress={() => { haptic.tap(); dispatch({ type: "courierFinishToday" }); toast.show("Finished for today. See you tomorrow."); }} style={styles.quickChip} testID="quick-finish">
                <Icon color={COURIER.solid} name="moon" size={14} />
                <RNText style={styles.quickText}>Finish for today</RNText>
              </Pressable>
            </View>
          ) : null}
        </Card>
      </Rise>

      <Rise index={1}>
        <Card onPress={() => router.push("/courier/account/availability" as Href)} style={styles.hoursRow} testID="hours-card">
          <View style={styles.flex}>
            <RNText style={type.caption}>Today</RNText>
            <RNText style={styles.time}>{hoursToday.open ? `${hoursToday.from} to ${hoursToday.to}` : "Not on duty"}</RNText>
          </View>
          <View style={styles.zonesPill}>
            <Icon color={COURIER.solid} name="map-pin" size={13} />
            <RNText style={styles.zonesText}>{courier.zones.filter((zone) => zone.on).length} zones</RNText>
          </View>
          <Icon color={COURIER.muted} name="chevron-right" size={16} />
        </Card>
      </Rise>

      <Rise index={2} style={styles.stats}>
        <View style={styles.flex}>
          <Stat label="Today" testID="stat-today" value={rand(stats.cents)} />
        </View>
        <View style={styles.flex}>
          <Stat label="Done" testID="stat-done" value={String(stats.done)} />
        </View>
        <View style={styles.flex}>
          <Stat label="Rating" testID="stat-rating" value={stats.rating === null ? "New" : stats.rating.toFixed(1)} />
        </View>
      </Rise>

      <Rise index={3}>
        <Card onPress={() => setGoalOpen(true)} style={styles.goal} testID="goal-home">
          <View style={styles.goalRow}>
            <RNText style={type.card}>{goal ? (goal.reached ? "Weekly goal reached" : "Weekly goal") : "Set a weekly goal"}</RNText>
            {goal ? (
              <RNText style={styles.goalNumbers}>
                {rand(goal.earnedCents)} of {rand(goal.targetCents)}
              </RNText>
            ) : null}
          </View>
          {goal ? (
            <>
              <View style={styles.goalTrack}>
                <View style={[styles.goalFill, { width: `${Math.max(3, goal.percent)}%` }, goal.reached && styles.goalDone]} />
              </View>
              <RNText style={type.caption}>{goal.reached ? "Nice work. You hit it before the week ended." : `${rand(goal.remainingCents)} to go`}</RNText>
            </>
          ) : (
            <RNText style={type.caption}>Pick what you want to earn this week and watch it fill.</RNText>
          )}
          <View style={styles.streakRow} testID="streak">
            <Icon color={run.current > 0 ? COURIER.amber : COURIER.muted} name="zap" size={15} />
            <RNText style={styles.streakText}>{run.current > 0 ? `${run.current}-day streak` : "No streak yet"}</RNText>
            <RNText style={type.caption}>Best {run.best} {run.best === 1 ? "day" : "days"}</RNText>
          </View>
        </Card>
      </Rise>

      {active ? (
        <Rise index={4}>
          <Card onPress={() => router.push(`/courier/active/${active.id}` as Href)} style={styles.activeCard} testID="home-active">
            <View style={styles.activeIcon}>
              <Icon color={COURIER.solid} name="truck" size={20} />
            </View>
            <View style={styles.flex}>
              <RNText style={type.card}>{active.number} in progress</RNText>
              <RNText style={type.caption}>{active.status === "accepted" ? `Collect from ${active.pickup.name}` : active.status === "returning" ? `Take it back to ${active.pickup.name}` : `Deliver to ${active.dropoff.name}`}</RNText>
            </View>
            <Icon color={COURIER.muted} name="chevron-right" size={18} />
          </Card>
        </Rise>
      ) : null}

      {areas.length > 0 ? (
        <>
          <Heading>Busy areas</Heading>
          <Card style={styles.areas} testID="busy-areas">
            {areas.map((area) => (
              <View key={area.id} style={styles.areaRow} testID={`area-${area.id}`}>
                <View style={[styles.areaDot, { backgroundColor: area.level === "high" ? COURIER.red : area.level === "busy" ? COURIER.amber : COURIER.green }]} />
                <RNText style={[type.card, styles.flex]}>{area.name}</RNText>
                {area.bonusCents > 0 ? <Pill label={`+${rand(area.bonusCents)} bonus`} tone="green" /> : null}
                <Pill label={area.level === "high" ? "High demand" : area.level === "busy" ? "Busy" : "Quiet"} tone={area.level === "high" ? "red" : area.level === "busy" ? "amber" : "grey"} />
              </View>
            ))}
            <RNText style={type.caption}>Demo: demand follows the time of day. Real numbers come from the orders being placed.</RNText>
          </Card>
        </>
      ) : null}

      <View style={styles.sectionRow}>
        <Heading style={styles.headFlat}>New delivery offer</Heading>
        <Pressable accessibilityRole="button" hitSlop={8} onPress={() => router.push("/courier/jobs" as Href)} testID="see-all">
          <Text style={styles.link}>See all</Text>
        </Pressable>
      </View>
      {!online ? (
        <Empty detail="Turn on Online above and offers near you will show up here." icon="power" title="You are offline" />
      ) : onBreak ? (
        <Empty detail="Offers are paused until your break ends, or tap Resume." icon="coffee" title="On a break" />
      ) : offers[0] ? (
        <Rise index={5}>
          <JobCard job={offers[0]} onAccept={() => accept(offers[0]!.id)} onOpen={() => router.push(`/courier/jobs/${offers[0]!.id}` as Href)} />
        </Rise>
      ) : (
        <Empty detail="New offers appear here as soon as a student orders delivery in your zones." icon="inbox" title="No offers right now" />
      )}
      {online && offers.length > 1 ? <Button label={`See all ${offers.length} offers`} onPress={() => router.push("/courier/jobs" as Href)} tone="light" /> : null}
      {online && hidden.length > 0 ? (
        <Card onPress={() => router.push("/courier/account/availability" as Href)} style={styles.hiddenBanner} testID="hidden-offers" tone="warn">
          <Icon color={COURIER.amber} name="eye-off" size={16} />
          <RNText style={styles.hiddenText}>
            {hidden.length} {hidden.length === 1 ? "offer is" : "offers are"} outside your zones or longest trip. Tap to widen them.
          </RNText>
        </Card>
      ) : null}
      {problem === "expired" ? (
        <Card onPress={() => router.push("/courier/account/documents" as Href)} style={styles.licence} testID="licence-warning" tone="warn">
          <Icon color={COURIER.amber} name="alert-triangle" size={18} />
          <RNText style={[type.body, styles.flex]}>Your licence has expired, so you cannot take offers. Send a new one in Documents.</RNText>
        </Card>
      ) : null}
      <Sheet onClose={() => setGoalOpen(false)} title="Your weekly goal" visible={goalOpen}>
        <RNText style={type.caption}>What do you want to earn from Monday to Sunday? Tips count too.</RNText>
        <View style={styles.goalChips}>
          {GOALS.map((cents) => (
            <Pressable accessibilityRole="button" key={cents} onPress={() => { dispatch({ type: "courierSetGoal", weeklyCents: cents }); setGoalOpen(false); }} style={[styles.goalChip, courier.goal.weeklyCents === cents && styles.goalChipOn]} testID={`goal-${cents}`}>
              <RNText style={[styles.goalChipText, courier.goal.weeklyCents === cents && { color: "#FFFFFF" }]}>{rand(cents)}</RNText>
            </Pressable>
          ))}
        </View>
        {courier.goal.weeklyCents ? <Button label="Remove my goal" onPress={() => { dispatch({ type: "courierSetGoal", weeklyCents: null }); setGoalOpen(false); }} testID="goal-clear" tone="outline" /> : null}
      </Sheet>
    </CourierPage>
  );
}

const styles = StyleSheet.create({
  activeCard: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 12 },
  activeIcon: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 14, height: 42, justifyContent: "center", width: 42 },
  areaDot: { borderRadius: 5, height: 10, width: 10 },
  areaRow: { alignItems: "center", flexDirection: "row", gap: 8 },
  areas: { gap: 12 },
  flex: { flex: 1 },
  goal: { gap: 8, marginTop: 14 },
  goalChip: { alignItems: "center", backgroundColor: "#E9EFF3", borderRadius: 18, boxShadow: "-4px -4px 8px rgba(255,255,255,0.9), 4px 4px 10px rgba(150,166,180,0.5)", height: 44, justifyContent: "center", paddingHorizontal: 18 },
  goalChipOn: { backgroundColor: COURIER.solid },
  goalChipText: { color: COURIER.ink, fontSize: 15, fontWeight: "800" },
  goalChips: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  goalDone: { backgroundColor: COURIER.green },
  goalFill: { backgroundColor: COURIER.solid, borderRadius: 5, height: 10 },
  goalNumbers: { color: COURIER.inkSoft, fontSize: 12, fontWeight: "700" },
  goalRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between" },
  goalTrack: { backgroundColor: "#D3DFE4", borderRadius: 5, height: 10, overflow: "hidden" },
  headFlat: { marginBottom: 0, marginTop: 0 },
  hiddenBanner: { alignItems: "center", flexDirection: "row", gap: 8, marginTop: 12 },
  hiddenText: { color: COURIER.amber, flex: 1, fontSize: 12, fontWeight: "700" },
  hours: { color: "#DCE8EC", fontSize: 12, fontWeight: "600" },
  hoursRow: { alignItems: "center", flexDirection: "row", gap: 12, marginTop: 14 },
  licence: { alignItems: "center", flexDirection: "row", gap: 10, marginTop: 12 },
  link: { color: "#FFFFFF", fontSize: 13, fontWeight: "800" },
  online: { gap: 12, paddingVertical: 16 },
  onlineSub: { color: "#DCE8EC", fontSize: 13, marginTop: 2 },
  onlineTitle: { color: "#FFFFFF", fontSize: 20, fontWeight: "800" },
  onlineTop: { alignItems: "center", flexDirection: "row", gap: 12 },
  quick: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickChip: { alignItems: "center", backgroundColor: "#FFFFFF", borderRadius: 18, flexDirection: "row", gap: 6, height: 36, paddingHorizontal: 14 },
  quickText: { color: COURIER.solid, fontSize: 12, fontWeight: "800" },
  sectionRow: { alignItems: "center", flexDirection: "row", justifyContent: "space-between", marginBottom: 10, marginTop: 20 },
  stats: { flexDirection: "row", gap: 12, marginTop: 14 },
  streakRow: { alignItems: "center", flexDirection: "row", gap: 6 },
  streakText: { color: COURIER.ink, fontSize: 13, fontWeight: "800" },
  time: { color: COURIER.ink, fontSize: 18, fontWeight: "800", marginTop: 2 },
  zonesPill: { alignItems: "center", backgroundColor: "#DDE8EC", borderRadius: 14, flexDirection: "row", gap: 5, paddingHorizontal: 10, paddingVertical: 5 },
  zonesText: { color: COURIER.solid, fontSize: 12, fontWeight: "800" },
});
