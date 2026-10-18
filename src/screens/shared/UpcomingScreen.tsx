import { AppHeader, EmptyState, Screen, type IconName } from "@/components";

/** Temporary tab content until the owner-designed screen is built. */
export function UpcomingScreen({ icon, step, title }: { title: string; icon: IconName; step: number }) {
  return (
    <Screen>
      <AppHeader title={title} />
      <EmptyState
        icon={icon}
        message={`This screen is built in step ${step} of the plan.`}
        title={`${title} is on the way`}
      />
    </Screen>
  );
}
