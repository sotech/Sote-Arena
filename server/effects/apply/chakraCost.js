import { randomUUID } from "node:crypto";
import { statusDescription } from "../descriptions.js";

function tooltipDescriptionForEffect(effect) {
  return effect?.tooltipDescription
    ?? effect?.tooltipDescripcion
    ?? effect?.tooltipHtml
    ?? effect?.["tooltip descripcion"]
    ?? null;
}

export function applyChakraCostModifierEffect({ targets, effect, skill, actor, actorCharacter, currentTurn, addStatus, statusOrigin }) {
  for (const target of targets) {
    addStatus(target, {
      id: randomUUID(),
      type: effect.type,
      turns: effect.duration,
      chakra: effect.chakra || {},
      skillIds: Array.isArray(effect.skillIds) ? effect.skillIds : [],
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
