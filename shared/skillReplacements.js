export function baseSkillsForCharacter(character) {
  return (character?.skills || []).filter((skill) => !skill.isExtraSkill && skill.passive !== true);
}

export function visibleBaseSkillsForCharacter(character) {
  return (character?.skills || []).filter((skill) => !skill.hideUntilReplaced);
}

export function allSkillsForCharacter(character) {
  return character?.skills || [];
}

export function inspectableSkillsForCharacter(character) {
  return allSkillsForCharacter(character).filter((skill) => skill.hideSkillInInspect !== true);
}

function skillReplacementApplies(effect, baseSkill) {
  return effect?.type === "replaceSkill"
    && (effect.turns > 0 || effect.turns === -1)
    && effect.baseSkillId === baseSkill.id
    && effect.skillId;
}

export function replacementEffectsForSkill(member, baseSkill) {
  return (member?.statusEffects || []).flatMap((effect, index) => {
    if (effect.ignoredByEffectImmunity === true) return [];
    if (skillReplacementApplies(effect, baseSkill)) return [effect];
    if (effect.type === "complex" && (effect.turns > 0 || effect.turns === -1)) {
      return (effect.effects || [])
        .filter((childEffect) => childEffect.ignoredByEffectImmunity !== true)
        .map((childEffect) => ({ ...childEffect, turns: childEffect.duration === -1 ? -1 : 1, createdTurn: effect.createdTurn, statusIndex: index }))
        .filter((childEffect) => skillReplacementApplies(childEffect, baseSkill));
    }
    return [];
  }).sort((a, b) => (a.createdTurn || 0) - (b.createdTurn || 0) || (a.statusIndex || 0) - (b.statusIndex || 0));
}

function targetTypeModifierApplies(effect, skill) {
  return effect?.type === "modifyTargetType"
    && (effect.turns > 0 || effect.turns === -1)
    && effect.targetType
    && (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0 || effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name));
}

function targetTypeModifiersForSkill(member, skill) {
  return (member?.statusEffects || []).flatMap((effect, index) => {
    if (effect.ignoredByEffectImmunity === true) return [];
    if (targetTypeModifierApplies(effect, skill)) return [{ ...effect, statusIndex: index }];
    if (effect.type === "complex" && (effect.turns > 0 || effect.turns === -1)) {
      return (effect.effects || [])
        .filter((childEffect) => childEffect.ignoredByEffectImmunity !== true)
        .map((childEffect) => ({ ...childEffect, turns: childEffect.duration === -1 ? -1 : 1, createdTurn: effect.createdTurn, statusIndex: index }))
        .filter((childEffect) => targetTypeModifierApplies(childEffect, skill));
    }
    return [];
  }).sort((a, b) => (a.createdTurn || 0) - (b.createdTurn || 0) || (a.statusIndex || 0) - (b.statusIndex || 0));
}

function applyActiveSkillModifiers(member, skill) {
  const targetTypeModifier = targetTypeModifiersForSkill(member, skill).at(-1);
  return targetTypeModifier ? { ...skill, targetType: targetTypeModifier.targetType } : skill;
}

export function activeSkillsForMember(member, character = member?.character) {
  const skills = character?.skills || [];
  return baseSkillsForCharacter(character).map((baseSkill) => {
    const replacement = replacementEffectsForSkill(member, baseSkill).at(-1);
    const skill = replacement ? skills.find((skill) => skill.id === replacement.skillId) || baseSkill : baseSkill;
    return applyActiveSkillModifiers(member, skill);
  });
}

export function visibleSkillsForMember(member, character = member?.character) {
  const activeSkillIds = new Set(activeSkillsForMember(member, character).map((skill) => skill.id));
  return (character?.skills || []).filter((skill) => !skill.hideUntilReplaced || activeSkillIds.has(skill.id));
}

export function actionSkillsForMember(member, character = member?.character) {
  const activeSkills = activeSkillsForMember(member, character);
  const activeSkillIds = new Set(activeSkills.map((skill) => skill.id));
  const visiblePassives = (character?.skills || []).filter((skill) => (
    skill.passive === true
    && !skill.hideUntilReplaced
    && !activeSkillIds.has(skill.id)
  ));
  return [...activeSkills, ...visiblePassives];
}

export function activeSkillForMember(member, character, skillId) {
  const skills = character?.skills || [];
  const baseSkill = baseSkillsForCharacter(character).find((skill) => skill.id === skillId);

  if (baseSkill) {
    const replacement = replacementEffectsForSkill(member, baseSkill).at(-1);
    const skill = replacement ? skills.find((skill) => skill.id === replacement.skillId) || baseSkill : baseSkill;
    return applyActiveSkillModifiers(member, skill);
  }

  return activeSkillsForMember(member, character).find((skill) => skill.id === skillId);
}
