import { useState } from "react";

import { useToast } from "@/components";
import { biometricStatus, changeBiometricSetting } from "@/lib/biometric";
import { useDemoStore } from "@/state/DemoStore";

/**
 * The two protections that need the phone: Face ID or Touch ID (a real check through the phone) and two-factor
 * sign-in (an authenticator app, set up in a sheet). Screens show the sheet from `twoFactor`.
 */
export function useSecurityActions() {
  const toast = useToast();
  const { dispatch, state } = useDemoStore();
  const [twoFactor, setTwoFactor] = useState<"enable" | "disable" | null>(null);
  const [busy, setBusy] = useState(false);

  const setBiometric = async (turnOn: boolean) => {
    if (busy) return;
    setBusy(true);
    const result = await changeBiometricSetting(turnOn);
    setBusy(false);
    if (!result.ok) {
      toast.show(result.message);
      return;
    }
    const status = await biometricStatus();
    dispatch({ key: "biometric", type: "setSetting", value: turnOn });
    toast.show(`${status.label} ${turnOn ? "on" : "off"}`);
  };

  const startTwoFactor = (turnOn: boolean) => setTwoFactor(turnOn ? "enable" : "disable");

  return { biometric: state.settings.biometric, busy, setBiometric, startTwoFactor, twoFactor, closeTwoFactor: () => setTwoFactor(null), twoFactorOn: state.twoFactor };
}
