import { GAME_VERSION } from "../shared/config.js";

export { GAME_VERSION };

//Socket
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
export const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";

//Sonido
export const NOTIFIER_START_TIME = 0;
export const NOTIFIER_END_TIME = 0.8;
export const MESSAGE_SOUND_START_TIME = 0.5;
export const MESSAGE_SOUND_END_TIME = 1.5;
export const AUDIO_FADE_MS = 450;
export const RESULT_AUDIO_FADE_MS = 1000;
export const BGM_FADE_MS = 1000;
export const DEATH_AUDIO_FADE_MS = 500;
export const BGM_VOLUME_RATIO = 0.5;

//Ventaje y desventaja
export const ADVANTAGE_HEALTH_SHARE = 0.8;

//Cookie pop up nuevos cambios
export const PATCH_NOTES_SEEN_KEY = `sote-arena-patch-notes-seen-${GAME_VERSION}`;

//Testeo de balance
export const DEFAULT_BALANCE_SORT = { key: "winrate", direction: "desc" };
export const BALANCE_TEST_FIGHT_COUNT = 1000;
