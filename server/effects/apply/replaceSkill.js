import { randomUUID } from "node:crypto";
import { statusDescription } from "../descriptions.js";

function tooltipDescriptionForEffect(effect) {
  return effect?.tooltipDescription
    ?? effect?.tooltipDescripcion
    ?? effect?.tooltipHtml
    ?? effect?.["tooltip descripcion"]
    ?? null;
}

function turnsFromDuration(duration) {
  if (duration === "lastUntilShieldBroken") return -1;
  return duration;
}

function memberHasStatusEffect(member, requirement) {
  const effectId = requirement.effectId || requirement.statusEffectId || requirement.id || requirement.sourceSkillId;
  if (!effectId) return false;
  return (member?.statusEffects || []).some((status) => (
    status.id === effectId
    || status.type === effectId
    || status.sourceSkillId === effectId
    || status.statusSourceSkillId === effectId
  ));
}

function targetMeetsRequirement(target, requirement) {
  const type = requirement.type || requirement.condition;
  if (type === "hasStatusEffect" || type === "hasStatus" || type === "status") {
    return memberHasStatusEffect(target, requirement);
  }
  return true;
}

function targetMeetsRequirements(target, effect) {
  return (effect.requires || effect.requirements || []).every((requirement) => targetMeetsRequirement(target, requirement));
}

export function applyReplaceSkillEffect({ targets, effect, skill, actor, actorCharacter, currentTurn, addStatus, statusOrigin }) {
  for (const target of targets) {
    if (!targetMeetsRequirements(target, effect)) continue;
    const baseSkillId = effect.baseSkillId || skill.id;
    addStatus(target, {
      id: randomUUID(),
      type: "replaceSkill",
      turns: turnsFromDuration(effect.duration),
      baseSkillId,
      skillId: effect.skillId,
      showStatusEffect: effect.showStatusEffect,
      statusLinkId: effect.statusLinkId,
      sourceSkillId: effect.statusSourceSkillId || skill.id,
      sourceSkillName: effect.statusSourceSkillName || skill.name,
      sourceActorName: actorCharacter.name,
      ...statusOrigin(actor),
      createdTurn: currentTurn,
      descriptions: [statusDescription(effect, actorCharacter)],
      tooltipDescription: tooltipDescriptionForEffect(effect)
    });
  }

  return targets.length;
}
