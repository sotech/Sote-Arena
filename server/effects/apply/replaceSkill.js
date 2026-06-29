import { randomUUID } from "node:crypto";
import { statusDescription } from "../descriptions.js";

function tooltipDescriptionForEffect(effect) {
  return effect?.tooltipDescription
    ?? effect?.tooltipDescripcion
    ?? effect?.tooltipHtml
    ?? effect?.["tooltip descripcion"]
    ?? null;
}

export function applyReplaceSkillEffect({ targets, effect, skill, actor, actorCharacter, currentTurn, addStatus, statusOrigin }) {
  for (const target of targets) {
    const baseSkillId = effect.baseSkillId || skill.id;
    addStatus(target, {
      id: randomUUID(),
      type: "replaceSkill",
      turns: effect.duration,
      baseSkillId,
      skillId: effect.skillId,
      showStatusEffect: effect.showStatusEffect,
      sourceSkillId: skill.id,
      sourceSkillName: skill.name,
      sourceActorName: actorCharacter.name,
      ...statusOrigin(actor),
      createdTurn: currentTurn,
      descriptions: [statusDescription(effect, actorCharacter)],
      tooltipDescription: tooltipDescriptionForEffect(effect)
    });
  }

  return targets.length;
}
