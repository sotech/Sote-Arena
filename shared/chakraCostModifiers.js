export const chakraCostTypes = ["taijutsu", "ninjutsu", "bloodline", "genjutsu", "neutralChakra"];
export const chakraCostModifierTypes = ["modifyChakraCost", "substituteChakraCost"];

export function normalizeChakraCost(cost = {}) {
  return chakraCostTypes.reduce((normalized, type) => {
    normalized[type] = Math.max(0, Number(cost?.[type] || 0));
    return normalized;
  }, {});
}

export function appliesToCostModifiedSkill(effect, skill) {
  if (!chakraCostModifierTypes.includes(effect?.type) || effect.turns <= 0) return false;
  if (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0) return true;
  return effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name);
}

export function applyChakraCostModifiers(baseCost = {}, modifiers = []) {
  let cost = normalizeChakraCost(baseCost);
  for (const modifier of modifiers) {
    const chakra = modifier.chakra || modifier.value || {};
    if (modifier.type === "substituteChakraCost") {
      cost = normalizeChakraCost(chakra);
      continue;
    }
    for (const type of chakraCostTypes) {
      cost[type] = Math.max(0, cost[type] + Number(chakra[type] || 0));
    }
  }
  return cost;
}

export function modifiedSkillChakraCost(actor, skill) {
  const modifiers = (actor?.statusEffects || [])
    .filter((effect) => effect.ignoredByEffectImmunity !== true)
    .flatMap((effect) => {
      if (effect.type === "complex" && effect.turns > 0) {
        return (effect.effects || [])
          .filter((childEffect) => childEffect.ignoredByEffectImmunity !== true)
          .filter((childEffect) => appliesToCostModifiedSkill({ ...childEffect, turns: 1 }, skill));
      }
      return appliesToCostModifiedSkill(effect, skill) ? [effect] : [];
    });
  return applyChakraCostModifiers(skill?.chakra || {}, modifiers);
}
