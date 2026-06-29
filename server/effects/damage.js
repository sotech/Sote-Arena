import { randomUUID } from "node:crypto";
import {
  complexDescriptions,
  damageReductionDescriptions,
  shieldDescriptions
} from "./descriptions.js";

function livingAllyCount(player, effect) {
  return player.team
    .filter((member) => member.hp > 0)
    .filter((member) => effect.excludeSelf === false || member.id !== effect.originActorId)
    .length;
}

function dynamicShieldGain(player, effect) {
  const shieldPerAlly = Math.max(0, Number(effect.shieldPerAlly || 0));
  if (shieldPerAlly <= 0) return 0;
  return Math.max(0, livingAllyCount(player, effect) * shieldPerAlly);
}

function dynamicShieldCap(player, effect) {
  const perAllyCap = Number(effect.maxShieldPerAlly || 0);
  const aliveCap = perAllyCap > 0 ? livingAllyCount(player, effect) * perAllyCap : Infinity;
  const fixedCap = Number.isFinite(Number(effect.maxShield)) ? Math.max(0, Number(effect.maxShield)) : Infinity;
  return Math.min(aliveCap, fixedCap);
}

function protectionShieldStatuses(member, sourceSkillId) {
  return (member.statusEffects || [])
    .filter((status) => status.type === "shield")
    .filter((status) => status.sourceSkillId === sourceSkillId);
}

function clampProtectionShield(member, sourceSkillId, cap) {
  const shields = protectionShieldStatuses(member, sourceSkillId);
  let total = shields.reduce((sum, status) => sum + Math.max(0, Number(status.remainingShield || 0)), 0);
  let excess = Math.max(0, total - cap);
  if (excess <= 0) return total;

  for (const shield of [...shields].reverse()) {
    if (excess <= 0) break;
    const current = Math.max(0, Number(shield.remainingShield || 0));
    const removed = Math.min(current, excess);
    shield.remainingShield = current - removed;
    shield.value = shield.remainingShield;
    shield.descriptions = shieldDescriptions(shield);
    excess -= removed;
  }

  member.statusEffects = (member.statusEffects || []).filter((effect) => effect.type !== "shield" || effect.ignoredByEffectImmunity === true || (effect.remainingShield || 0) > 0);
  member.shield = shieldValue(member);
  return protectionShieldStatuses(member, sourceSkillId)
    .reduce((sum, status) => sum + Math.max(0, Number(status.remainingShield || 0)), 0);
}

export function shieldValue(member) {
  return (member.statusEffects || [])
    .filter((effect) => effect.type === "shield" && effect.ignoredByEffectImmunity !== true)
    .reduce((total, effect) => total + (effect.remainingShield || 0), 0);
}

function absorbShield(member, damage) {
  let remainingDamage = damage;
  for (const effect of member.statusEffects || []) {
    if (effect.type !== "shield" || remainingDamage <= 0) continue;
    if (effect.ignoredByEffectImmunity === true) continue;
    const blocked = Math.min(effect.remainingShield || 0, remainingDamage);
    effect.remainingShield = (effect.remainingShield || 0) - blocked;
    effect.value = effect.remainingShield;
    effect.descriptions = shieldDescriptions(effect);
    remainingDamage -= blocked;
  }
  member.statusEffects = (member.statusEffects || []).filter((effect) => effect.type !== "shield" || effect.ignoredByEffectImmunity === true || (effect.remainingShield || 0) > 0);
  member.shield = shieldValue(member);
  return damage - remainingDamage;
}

function absorbDamageReduction(member, damage) {
  let remainingDamage = damage;
  for (const effect of member.statusEffects || []) {
    if (remainingDamage <= 0) continue;
    if (effect.ignoredByEffectImmunity === true) continue;
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
        if (childEffect.ignoredByEffectImmunity === true) continue;
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
    if (effect.ignoredByEffectImmunity === true) return total;
    if (effect.type === "damage-reduction" && effect.percent === true) {
      return Math.min(100, total + Math.max(0, Number(effect.value || 0)));
    }
    if (effect.type === "complex" && effect.turns > 0) {
      const complexTotal = (effect.effects || [])
        .filter((childEffect) => childEffect.type === "damage-reduction" && childEffect.percent === true && childEffect.ignoredByEffectImmunity !== true)
        .reduce((sum, childEffect) => sum + Math.max(0, Number(childEffect.value || 0)), 0);
      return Math.min(100, total + complexTotal);
    }
    return total;
  }, 0);
}

export function restoreDamageReduction(player) {
  player.team.forEach((member) => {
    member.statusEffects = (member.statusEffects || []).map((effect) => {
      if (effect.dynamicAllyCountStatus === true) {
        const value = Math.max(0, livingAllyCount(player, effect) * Number(effect.damageReductionPerAlly || 0));
        return {
          ...effect,
          value,
          remainingReduction: value,
          descriptions: damageReductionDescriptions({ ...effect, value, remainingReduction: value })
        };
      }
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
    for (const effect of member.statusEffects || []) {
      if (effect.dynamicAllyCountStatus !== true) continue;
      const gain = dynamicShieldGain(player, effect);
      const cap = dynamicShieldCap(player, effect);
      const currentProtectionShield = clampProtectionShield(member, effect.sourceSkillId, cap);
      const appliedGain = Math.min(gain, Math.max(0, cap - currentProtectionShield));
      if (appliedGain <= 0) continue;
      const dynamicShieldId = `${effect.sourceSkillId}-dynamic-shield`;
      let shield = (member.statusEffects || []).find((status) => status.type === "shield" && status.id === dynamicShieldId);
      if (!shield) {
        shield = {
          id: dynamicShieldId,
          type: "shield",
          turns: null,
          value: 0,
          remainingShield: 0,
          isStackable: true,
          sourceSkillId: effect.sourceSkillId,
          sourceSkillName: effect.sourceSkillName,
          sourceActorName: effect.sourceActorName,
          originActorId: effect.originActorId,
          originCharacterId: effect.originCharacterId,
          createdTurn: effect.createdTurn
        };
        member.statusEffects = [...(member.statusEffects || []), shield];
      }
      shield.remainingShield = Math.max(0, Number(shield.remainingShield || 0)) + appliedGain;
      shield.value = shield.remainingShield;
      shield.descriptions = shieldDescriptions(shield);
      member.shield = shieldValue(member);
    }
  });
}

export function applyDamage(target, value, damageType = "basic") {
  const type = damageType === "normal" ? "basic" : (["basic", "piercing", "affliction"].includes(damageType) ? damageType : "basic");
  let remainingDamage = Math.max(0, value);

  if (type === "basic" || type === "piercing") {
    remainingDamage -= absorbShield(target, remainingDamage);
  }

  if (type === "basic") {
    const percentReduction = percentDamageReductionValue(target);
    if (percentReduction > 0) {
      remainingDamage = Math.ceil(Math.max(0, remainingDamage) * ((100 - percentReduction) / 100));
    }
    remainingDamage -= absorbDamageReduction(target, remainingDamage);
  }

  const dealt = Math.max(0, remainingDamage);
  target.hp = Math.max(0, target.hp - dealt);
  return dealt;
}
