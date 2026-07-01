export const PORT = process.env.PORT || 3002;
export const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173";
export const CLIENT_ORIGINS = CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

export const BALANCE_TEST_DEFAULT_FIGHT_COUNT = 1000;
export const BALANCE_TEST_MAX_FIGHT_COUNT = 1000;
export const BALANCE_TEST_TURN_LIMIT = 200;

export const SKILL_MODIFIER_EFFECT_TYPES = [
  "modifyDamage",
  "modifyDamageByMissingHp",
  "modifyDamageMultiplier",
  "modifyReceivedDamage",
  "modifyDamageType",
  "modifyTargetType",
  "modifyTargetCount",
  "addEffectToBase",
  "addUncountereable",
  "addNonReflectable",
  "nullifyNextIncoming",
  "replaceEffects",
  "replaceSkill"
];

export const NEGATIVE_STATUS_TYPES = new Set([
  "stun",
  "modifyDamage",
  "modifyDamageByMissingHp",
  "modifyDamageMultiplier",
  "modifyReceivedDamage",
  "modifyDamageType",
  "modifyTargetType",
  "modifyTargetCount",
  "addEffectToBase",
  "addUncountereable",
  "addNonReflectable",
  "nullifyNextIncoming",
  "replaceEffects",
  "replaceSkill",
  "modifyChakraCost",
  "substituteChakraCost",
  "counter",
  "reflect"
]);
