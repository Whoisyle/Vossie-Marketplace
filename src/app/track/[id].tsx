import { Redirect, useLocalSearchParams, type Href } from "expo-router";

/** Opens an order being followed from a shared vossie://track/<order> link. */
export default function TrackLinkRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Redirect href={`/activity/track/${id}` as Href} />;
}
