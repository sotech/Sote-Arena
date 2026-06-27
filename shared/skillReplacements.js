export function baseSkillsForCharacter(character) {
  return (character?.skills || []).filter((skill) => !skill.isExtraSkill);
}

function skillReplacementApplies(effect, baseSkill) {
  return effect?.type === "replaceSkill"
    && (effect.turns > 0 || effect.turns === -1)
    && effect.baseSkillId === baseSkill.id
    && effect.skillId;
}

export function replacementEffectsForSkill(member, baseSkill) {
  return (member?.statusEffects || []).flatMap((effect) => {
    if (skillReplacementApplies(effect, baseSkill)) return [effect];
    if (effect.type === "complex" && (effect.turns > 0 || effect.turns === -1)) {
      return (effect.effects || [])
        .map((childEffect) => ({ ...childEffect, turns: childEffect.duration === -1 ? -1 : 1 }))
        .filter((childEffect) => skillReplacementApplies(childEffect, baseSkill));
    }
    return [];
  });
}

export function activeSkillsForMember(member, character = member?.character) {
  const skills = character?.skills || [];
  return baseSkillsForCharacter(character).map((baseSkill) => {
    const replacement = replacementEffectsForSkill(member, baseSkill).at(-1);
    if (!replacement) return baseSkill;
    return skills.find((skill) => skill.id === replacement.skillId) || baseSkill;
  });
}

export function activeSkillForMember(member, character, skillId) {
  const skills = character?.skills || [];
  const baseSkill = baseSkillsForCharacter(character).find((skill) => skill.id === skillId);

  if (baseSkill) {
    const replacement = replacementEffectsForSkill(member, baseSkill).at(-1);
    if (!replacement) return baseSkill;
    return skills.find((skill) => skill.id === replacement.skillId) || baseSkill;
  }

  return activeSkillsForMember(member, character).find((skill) => skill.id === skillId);
}
