import { effectTypes } from "./definitions/index.js";

export { effectTypes };

export const commonEffectFields = {
  ignoreInvulnerable: "Si es true, el efecto puede afectar enemigos invulnerables. Por defecto es false."
};

export const supportedEffectTypes = Object.keys(effectTypes);
