import { type Href, Redirect } from "expo-router";

export default function Route() {
  return <Redirect href={"/operations/hub" as Href} />;
}
