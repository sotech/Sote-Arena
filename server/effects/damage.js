import {
  complexDescriptions,
  damageReductionDescriptions,
  shieldDescriptions
} from "./descriptions.js";

export function shieldValue(member) {
  return (member.statusEffects || [])
    .filter((effect) => effect.type === "shield")
    .reduce((total, effect) => total + (effect.remainingShield || 0), 0);
}

function absorbShield(member, damage) {
  let remainingDamage = damage;
  for (const effect of member.statusEffects || []) {
    if (effect.type !== "shield" || remainingDamage <= 0) continue;
    const blocked = Math.min(effect.remainingShield || 0, remainingDamage);
    effect.remainingShield = (effect.remainingShield || 0) - blocked;
    effect.value = effect.remainingShield;
    effect.descriptions = shieldDescriptions(effect);
    remainingDamage -= blocked;
  }
  member.statusEffects = (member.statusEffects || []).filter((effect) => effect.type !== "shield" || (effect.remainingShield || 0) > 0);
  member.shield = shieldValue(member);
  return damage - remainingDamage;
}

function absorbDamageReduction(member, damage) {
  let remainingDamage = damage;
  for (const effect of member.statusEffects || []) {
    if (remainingDamage <= 0) continue;
    if (effect.type === "damage-reduction" && effect.percent !== true) {
      const blocked = Math.min(effect.remainingReduction || 0, remainingDamage);
      effect.remainingReduction = (effect.remainingReduction || 0) - blocked;
      effect.descriptions = damageReductionDescriptions(effect);
      remainingDamage -= blocked;
      continue;
    }
    if (effect.type === "complex" && effect.turns > 0) {
      effect.remainingReductions = effect.remainingReductions || {};
      for (const [index, childEffect] of (effect.effects || []).entries()) {
        if (childEffect.type !== "damage-reduction" || childEffect.percent === true || remainingDamage <= 0) continue;
        const currentReduction = effect.remainingReductions[index] ?? childEffect.value;
        const blocked = Math.min(currentReduction || 0, remainingDamage);
        effect.remainingReductions[index] = Math.max(0, currentReduction - blocked);
        effect.descriptions = complexDescriptions(effect);
        remainingDamage -= blocked;
      }
    }
  }
  return damage - remainingDamage;
}

function percentDamageReductionValue(member) {
  return (member.statusEffects || []).reduce((total, effect) => {
    if (effect.type === "damage-reduction" && effect.percent === true) {
      return Math.min(100, total + Math.max(0, Number(effect.value || 0)));
    }
    if (effect.type === "complex" && effect.turns > 0) {
      const complexTotal = (effect.effects || [])
        .filter((childEffect) => childEffect.type === "damage-reduction" && childEffect.percent === true)
        .reduce((sum, childEffect) => sum + Math.max(0, Number(childEffect.value || 0)), 0);
      return Math.min(100, total + complexTotal);
    }
    return total;
  }, 0);
}

export function restoreDamageReduction(player) {
  player.team.forEach((member) => {
    member.statusEffects = (member.statusEffects || []).map((effect) => {
      if (effect.type !== "damage-reduction" || effect.restoresEachTurn === false) return effect;
      return {
        ...effect,
        remainingReduction: effect.value,
        descriptions: damageReductionDescriptions({ ...effect, remainingReduction: effect.value })
      };
    }).map((effect) => {
      if (effect.type !== "complex") return effect;
      const remainingReductions = { ...(effect.remainingReductions || {}) };
      (effect.effects || []).forEach((childEffect, index) => {
        if (childEffect.type === "damage-reduction" && childEffect.restoresEachTurn !== false) {
          remainingReductions[index] = childEffect.value;
        }
      });
      return {
        ...effect,
        remainingReductions,
        descriptions: complexDescriptions({ ...effect, remainingReductions })
      };
    });
  });
}

export function applyDamage(target, value, damageType = "basic") {
  const type = damageType === "normal" ? "basic" : (["basic", "piercing", "affliction"].includes(damageType) ? damageType : "basic");
  const percentReduction = percentDamageReductionValue(target);
  let remainingDamage = percentReduction > 0
    ? Math.ceil(Math.max(0, value) * ((100 - percentReduction) / 100))
    : value;
  if (type === "basic") {
    remainingDamage -= absorbDamageReduction(target, remainingDamage);
  }
  if (type === "basic" || type === "piercing") {
    remainingDamage -= absorbShield(target, remainingDamage);
  }
  const dealt = Math.max(0, remainingDamage);
  target.hp = Math.max(0, target.hp - dealt);
  return dealt;
}
