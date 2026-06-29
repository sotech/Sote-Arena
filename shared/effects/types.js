import { effectTypes } from "./definitions/index.js";

export { effectTypes };

export const commonEffectFields = {
  ignoreInvulnerable: "Si es true, el efecto puede afectar enemigos invulnerables. Por defecto es false.",
  tooltipDescription: "HTML opcional para mostrar dentro del tooltip del estado creado por este efecto."
};

export const supportedEffectTypes = Object.keys(effectTypes);
