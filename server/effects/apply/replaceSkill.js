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

export function applyReplaceSkillEffect({ targets, effect, skill, actor, actorCharacter, currentTurn, addStatus, statusOrigin }) {
  for (const target of targets) {
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
