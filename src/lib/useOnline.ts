import { useEffect, useState } from "react";
import { Platform } from "react-native";

/**
 * Whether the phone has a connection. True until we know otherwise, so a slow check never shows an
 * offline banner by mistake. Web uses the browser's events; the phone uses NetInfo.
 */
export function useOnline(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (process.env.JEST_WORKER_ID) return;
    if (Platform.OS === "web") {
      const update = () => setOnline(typeof navigator === "undefined" ? true : navigator.onLine);
      update();
      window.addEventListener("online", update);
      window.addEventListener("offline", update);
      return () => {
        window.removeEventListener("online", update);
        window.removeEventListener("offline", update);
      };
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const NetInfo = require("@react-native-community/netinfo").default as typeof import("@react-native-community/netinfo").default;
      return NetInfo.addEventListener((state) => setOnline(state.isConnected !== false && state.isInternetReachable !== false));
    } catch {
      return undefined;
    }
  }, []);

  return online;
}
