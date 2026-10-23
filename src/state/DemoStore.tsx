import { createContext, use, useEffect, useReducer, useRef, type Dispatch, type ReactNode } from "react";

import { setHapticsEnabled } from "@/lib/haptics";
import { setSoundsEnabled } from "@/lib/sounds";
import { auth, backendEnabled } from "@/services";

import {
  cartTotals,
  createInitialState,
  demoReducer,
  type DemoAction,
  type DemoState,
} from "./demoReducer";

type DemoStore = {
  state: DemoState;
  dispatch: Dispatch<DemoAction>;
};

const DemoStoreContext = createContext<DemoStore | null>(null);

/**
 * In-memory demo state shared by every screen during the frontend phase.
 * It resets when the app process restarts. Nothing here is sent to a server.
 */
export function DemoStoreProvider({
  children,
  initialState,
}: {
  children: ReactNode;
  initialState?: DemoState;
}) {
  const [state, dispatch] = useReducer(
    demoReducer,
    initialState,
    (seed) => seed ?? createInitialState(),
  );
  useEffect(() => setHapticsEnabled(state.settings.haptics), [state.settings.haptics]);
  useEffect(() => setSoundsEnabled(state.settings.sounds), [state.settings.sounds]);
  // signing out of the app also ends a real backend session, if one was started at sign-in
  const wasSignedIn = useRef(false);
  useEffect(() => {
    const signedIn = state.profile !== null;
    if (wasSignedIn.current && !signedIn && backendEnabled) void auth.signOut().catch(() => undefined);
    wasSignedIn.current = signedIn;
  }, [state.profile]);
  return <DemoStoreContext value={{ state, dispatch }}>{children}</DemoStoreContext>;
}

export function useDemoStore(): DemoStore {
  const store = use(DemoStoreContext);
  if (!store) throw new Error("useDemoStore must be used inside DemoStoreProvider");
  return store;
}

export function useCartTotals() {
  const { state } = useDemoStore();
  return cartTotals(state);
}

export { cartTotals, unitPrice } from "./demoReducer";
export type { DemoState, Receipt } from "./demoReducer";
