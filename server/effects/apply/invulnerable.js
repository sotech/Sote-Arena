import { randomUUID } from "node:crypto";
import { statusDescription } from "../descriptions.js";

export function applyInvulnerableEffect({ targets, effect, skill, actor, actorCharacter, currentTurn, addStatus, statusOrigin, positiveEffectValue }) {
  let totalInvulnerable = 0;

  for (const target of targets) {
    const value = positiveEffectValue(effect);
    addStatus(target, {
      id: randomUUID(),
      type: "invulnerable",
      turns: value,
      sourceSkillId: skill.id,
      sourceSkillName: skill.name,
      sourceActorName: actorCharacter.name,
      ...statusOrigin(actor),
      createdTurn: currentTurn,
      descriptions: [statusDescription(effect, actorCharacter)]
    });
    totalInvulnerable += value;
  }

  return totalInvulnerable;
}
