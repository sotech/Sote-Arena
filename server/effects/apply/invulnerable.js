import { randomUUID } from "node:crypto";
import { statusDescription } from "../descriptions.js";

function tooltipDescriptionForEffect(effect) {
  return effect?.tooltipDescription
    ?? effect?.tooltipDescripcion
    ?? effect?.tooltipHtml
    ?? effect?.["tooltip descripcion"]
    ?? null;
}

export function applyInvulnerableEffect({ targets, effect, skill, actor, actorCharacter, currentTurn, addStatus, statusOrigin, positiveEffectValue, effectForTargetImmunity }) {
  let totalInvulnerable = 0;

  for (const target of targets) {
    const appliedEffect = effectForTargetImmunity ? effectForTargetImmunity(effect, target) : effect;
    const value = positiveEffectValue(appliedEffect);
    addStatus(target, {
      id: randomUUID(),
      type: "invulnerable",
      turns: value,
      familiesAffected: Array.isArray(appliedEffect.familiesAffected) ? appliedEffect.familiesAffected : [],
      ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
      sourceSkillId: skill.id,
      sourceSkillName: skill.name,
      sourceActorName: actorCharacter.name,
      ...statusOrigin(actor),
      createdTurn: currentTurn,
      descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription(appliedEffect, actorCharacter)],
      tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
    });
    if (appliedEffect.ignoredByEffectImmunity !== true) totalInvulnerable += value;
  }

  return totalInvulnerable;
}
