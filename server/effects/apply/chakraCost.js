import { randomUUID } from "node:crypto";
import { statusDescription } from "../descriptions.js";

export function applyChakraCostModifierEffect({ targets, effect, skill, actor, actorCharacter, currentTurn, addStatus, statusOrigin }) {
  for (const target of targets) {
    addStatus(target, {
      id: randomUUID(),
      type: effect.type,
      turns: effect.duration,
      chakra: effect.chakra || {},
      skillIds: Array.isArray(effect.skillIds) ? effect.skillIds : [],
      sourceSkillId: skill.id,
      sourceSkillName: skill.name,
      sourceActorName: actorCharacter.name,
      ...statusOrigin(actor),
      createdTurn: currentTurn,
      descriptions: [statusDescription(effect, actorCharacter)]
    });
  }

  return targets.length;
}
