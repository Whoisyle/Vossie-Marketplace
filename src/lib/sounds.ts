import { Platform } from "react-native";

/**
 * Short, quiet sounds for success, errors and taps. Off by default and switched on in Security and Settings.
 * They follow the phone's silent switch (expo-audio does not play in silent mode unless asked to), and never
 * throw: if audio is missing or fails, nothing happens.
 */
export type SoundName = "tap" | "success" | "error";

const files: Record<SoundName, number> = {
  error: require("../../assets/sounds/error.wav"),
  success: require("../../assets/sounds/success.wav"),
  tap: require("../../assets/sounds/tap.wav"),
};

let enabled = false;

export function setSoundsEnabled(value: boolean) {
  enabled = value;
}

export function soundsEnabled(): boolean {
  return enabled;
}

type Audio = typeof import("expo-audio");

function load(): Audio | null {
  if (Platform.OS === "web" || process.env.JEST_WORKER_ID) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-audio") as Audio;
  } catch {
    return null;
  }
}

export function playSound(name: SoundName) {
  if (!enabled) return;
  const audio = load();
  if (!audio) return;
  try {
    const player = audio.createAudioPlayer(files[name]);
    player.volume = 0.6;
    player.play();
    // free the player once the short clip is done
    setTimeout(() => {
      try {
        player.remove();
      } catch {
        // already gone
      }
    }, 1_500);
  } catch {
    // sound is a nicety, never a failure
  }
}
