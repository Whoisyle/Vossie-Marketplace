import { Redirect } from "expo-router";

/** The round "+" in the bar opens the quick actions and never lands here; if a link ever does, go Home. */
export default function Route() {
  return <Redirect href="/seller/home" />;
}
