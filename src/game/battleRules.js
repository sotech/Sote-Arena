import { compareHp, normalizeRequireScope, normalizeRequireType } from "../../shared/requires.js";
import { stunFamiliesAffected } from "../../shared/effects.js";

export function teamHealthPercent(player) {
  if (!player?.team?.length) return 1;
  const current = player.team.reduce((total, member) => total + Math.max(0, member.hp), 0);
  const max = player.team.reduce((total, member) => total + member.character.maxHp, 0);
  return max > 0 ? current / max : 0;
}

export function teamCurrentHealth(player) {
  return (player?.team || []).reduce((total, member) => total + Math.max(0, member.hp), 0);
}

export function playerHealthShare(player, opponent) {
  const ownHealth = teamCurrentHealth(player);
  const opponentHealth = teamCurrentHealth(opponent);
  const totalHealth = ownHealth + opponentHealth;
  return totalHealth > 0 ? ownHealth / totalHealth : 0.5;
}

export function skillCooldownFor(member, skillId) {
  return Math.max(0, member?.skillCooldowns?.[skillId] || 0);
}

export function isQueuedSkill(player, actorId, skillId) {
  return Boolean(actorId && skillId && (player?.queue || []).some((item) => item.actorId === actorId && item.skillId === skillId));
}

export function isQueuedActor(player, actorId) {
  return Boolean(actorId && (player?.queue || []).some((item) => item.actorId === actorId));
}

export function hasStatus(member, type) {
  return (member?.statusEffects || []).some((effect) => {
    if (effect.type === type && effect.turns > 0) return true;
    return effect.type === "complex" && effect.turns > 0 && (effect.effects || []).some((childEffect) => childEffect.type === type);
  });
}

function stunAffectsSkill(effect, skill) {
  const affectedFamilies = stunFamiliesAffected(effect);
  if (affectedFamilies.length === 0) return true;
  const skillFamilies = Array.isArray(skill?.family) ? skill.family : [];
  return affectedFamilies.some((family) => skillFamilies.includes(family));
}

export function isSkillStunned(member, skill) {
  return (member?.statusEffects || []).some((effect) => {
    if (effect.type === "stun" && effect.turns > 0) return stunAffectsSkill(effect, skill);
    if (effect.type !== "complex" || effect.turns <= 0) return false;
    return (effect.effects || []).some((childEffect) => (
      childEffect.type === "stun" && stunAffectsSkill(childEffect, skill)
    ));
  });
}

export function eligibleTargetsForSkill(skill, me, opponent, actor) {
  if (!skill || !actor || actor.hp <= 0) return [];

  const allies = (me?.team || []).filter((member) => member.hp > 0);
  const enemies = (opponent?.team || []).filter((member) => member.hp > 0 && !hasStatus(member, "invulnerable"));

  if (skill.targetType === "self") return actor.hp > 0 ? [actor] : [];
  if (skill.targetType === "ally" || skill.targetType === "allies") return allies;
  if (skill.targetType === "enemy" || skill.targetType === "enemies") return enemies;
  if (skill.targetType === "allPlayers") return [...allies, ...enemies];
  return [];
}

function memberHasStatusEffect(member, effectId) {
  return (member?.statusEffects || []).some((effect) => {
    if (effect.id === effectId || effect.sourceSkillId === effectId || effect.type === effectId) return true;
    return effect.type === "complex" && (effect.effects || []).some((childEffect) => (
      childEffect.id === effectId || childEffect.sourceSkillId === effectId || childEffect.type === effectId
    ));
  });
}

function requireCandidates(requirement, me, opponent, actor, selectedTargets = []) {
  const scope = normalizeRequireScope(requirement.scope || requirement.target);
  const allies = (me?.team || []).filter((member) => member.hp > 0);
  const enemies = (opponent?.team || []).filter((member) => member.hp > 0);
  if (scope === "target") return selectedTargets.slice(0, 1);
  if (scope === "anyTarget") return selectedTargets;
  if (scope === "anyAlly") return allies;
  if (scope === "anyEnemy") return enemies;
  return actor ? [actor] : [];
}

function memberMeetsRequirement(member, requirement) {
  const type = normalizeRequireType(requirement.type || requirement.condition);
  if (type === "hasStatusEffect") {
    const effectId = requirement.effectId || requirement.statusEffectId || requirement.id;
    return Boolean(effectId && memberHasStatusEffect(member, effectId));
  }
  if (type === "hasSkill") {
    const skillId = requirement.skillId || requirement.id || requirement.value;
    const character = member.character;
    return Boolean(skillId && (character?.skills || []).some((skill) => skill.id === skillId || skill.name === skillId));
  }
  if (type === "hp") {
    return compareHp(member.hp, requirement.operator || requirement.comparison, requirement.hp ?? requirement.value);
  }
  if (type === "hasMinHp") {
    const minHp = Number(requirement.minHp ?? requirement.hp ?? requirement.value ?? 0);
    return member.hp >= minHp;
  }
  if (type === "hasMaxHp") {
    const maxHp = Number(requirement.maxHp ?? requirement.hp ?? requirement.value ?? 0);
    return member.hp <= maxHp;
  }
  return false;
}

export function meetsSkillRequirements(skill, me, opponent, actor, selectedTargets = []) {
  return (skill?.requires || []).every((requirement) => (
    (["target", "anyTarget"].includes(normalizeRequireScope(requirement.scope || requirement.target)) && selectedTargets.length === 0)
      || requireCandidates(requirement, me, opponent, actor, selectedTargets).some((member) => memberMeetsRequirement(member, requirement))
  ));
}
