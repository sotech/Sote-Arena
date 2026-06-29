import { naruto } from "./characters/naruto/index.js";
import { sasuke } from "./characters/sasuke/index.js";
import { sakura } from "./characters/sakura/index.js";
import { kakashi } from "./characters/kakashi/index.js";
import { hinata } from "./characters/hinata/index.js";
import { gaara } from "./characters/gaara/index.js";
import { kankuro } from "./characters/kankuro/index.js";
import { daniel } from "./characters/daniel/index.js";
import { kakuzu } from "./characters/kakuzu/index.js";
import { cacho } from "./characters/cacho/index.js";
import { mai } from "./characters/mai/index.js";
import { aizen } from "./characters/aizen/index.js";

function effectBotDescription(effect) {
  if (effect.type === "damage") {
    const bonuses = (effect.bonusWhen || [])
      .map((rule) => {
        const requirement = rule.require || rule.when || rule;
        const conditionType = requirement.type || requirement.condition || "condition";
        const conditionValue = requirement.effectId || requirement.statusEffectId || requirement.id || requirement.hp || requirement.value || "";
        return `+${rule.bonus ?? rule.value ?? 0}-if-${conditionType}${conditionValue ? `-${conditionValue}` : ""}`;
      })
      .join(",");
    return `damage-${effect.value}${bonuses ? `(${bonuses})` : ""}`;
  }
  if (effect.type === "instakill") return "instakill";
  if (effect.type === "heal" || effect.type === "self-heal") return `heal-${effect.value}`;
  if (effect.type === "shield") return `shield-${effect.value}`;
  if (effect.type === "damage-reduction") return `damageReduction-${effect.value}`;
  if (effect.type === "ignoreEffects") return `ignoreEffects-${(effect.ignoreEffects || []).join(",")}`;
  if (effect.type === "allyCountStatus") return `allyCountStatus-dr${effect.damageReductionPerAlly || 0}-shield${effect.shieldPerAlly || 0}`;
  if (effect.type === "modifyDamage") return `modifyDamage-${effect.value}`;
  if (effect.type === "modifyDamageByMissingHp") return `modifyDamageByMissingHp-${effect.amountPerStep || effect.value || 0}-per-${effect.hpStep || 1}`;
  if (effect.type === "modifyDamageType") return `modifyDamageType-${effect.damageType || "basic"}`;
  if (effect.type === "modifyTargetType") return `modifyTargetType-${effect.targetType || ""}`;
  if (effect.type === "modifyTargetCount") return `modifyTargetCount-${effect.count ?? effect.value ?? ""}`;
  if (effect.type === "addEffectToBase") return `addEffectToBase-${(effect.effects || []).map(effectBotDescription).join(",")}`;
  if (effect.type === "addUncountereable") return `addUncountereable-${(effect.skillIds || []).join(",") || "all"}`;
  if (effect.type === "addNonReflectable") return `addNonReflectable-${(effect.skillIds || []).join(",") || "all"}`;
  if (effect.type === "replaceEffects") return `replaceEffects-${(effect.effects || []).map(effectBotDescription).join(",")}`;
  if (effect.type === "replaceSkill") return `replaceSkill-${effect.baseSkillId || ""}-${effect.skillId || ""}`;
  if (effect.type === "counter") return `counter-${effect.trigger || "incoming"}-${effect.charges ?? effect.value ?? 1}-${(effect.effects || []).map(effectBotDescription).join(",")}`;
  if (effect.type === "reflect") return `reflect-${effect.reflectTo || "caster"}-${effect.charges ?? effect.value ?? 1}`;
  if (effect.type === "modifyChakraCost" || effect.type === "substituteChakraCost") return `${effect.type}-${JSON.stringify(effect.chakra || {})}`;
  if (effect.type === "stun") return `stun-${effect.value}`;
  if (effect.type === "invulnerable") return `invulnerable-${effect.value}`;
  if (effect.type === "gain-chakra") return `gainChakra-${effect.value}`;
  if (effect.type === "remove-chakra") return `removeChakra-${effect.value}`;
  if (effect.type === "complex") {
    const childDescriptions = (effect.effects || []).map(effectBotDescription);
    if (childDescriptions.length === 1 && childDescriptions[0].startsWith("invulnerable-")) {
      return childDescriptions[0];
    }
    const children = childDescriptions.join(",");
    return `complex-${effect.duration}[${children}]`;
  }
  return effect.type;
}

function skillBotDescription(skill) {
  return (skill.effects || []).map(effectBotDescription).join("|") || "none";
}

function withSkillDefaults(character) {
  return {
    ...character,
    skills: character.skills.map((skill) => ({ cooldown: 0, botDescription: skillBotDescription(skill), ...skill }))
  };
}

export function getCharacterById(id) {
  return characters.find((character) => character.id === id);
}

export function getSkillNameById(id) {
  return characters
  .flatMap((character) => character.skills)
  .find((skill) => skill.id === id)?.name || id;
}

export const characters = [naruto, sasuke, sakura, kakashi, hinata, gaara, kankuro, daniel, kakuzu, cacho, mai, aizen].map(withSkillDefaults);
