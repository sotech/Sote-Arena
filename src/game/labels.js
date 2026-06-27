import { normalizeHpOperator, normalizeRequireScope, normalizeRequireType } from "../../shared/requires.js";
import { getSkillNameById } from "../../shared/characters.js";
import { chakraCostModifierTypes } from "../../shared/chakraCostModifiers.js";
import { skillFamiliesLabel, stunFamiliesAffected } from "../../shared/effects.js";

export function chakraCostLabel(chakra = {}) {
  return Object.entries(chakra)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => `${amount} ${type}`)
    .join(" + ");
}

export function groupStatusEffects(effects = []) {
  const groups = new Map();
  for (const [index, effect] of effects.filter((effect) => effect.showStatusEffect !== false).entries()) {
    const key = effect.id || `${effect.sourceSkillId || effect.type}-${index}`;
    const current = groups.get(key);
    if (current) {
      current.effects.push(effect);
      current.className = current.effects.length > 1 ? `${current.effects[0].type} stacked-status` : current.className;
      continue;
    }
    groups.set(key, {
      id: key,
      sourceSkillId: effect.sourceSkillId,
      sourceSkillName: effect.sourceSkillName ? getSkillNameById(effect.sourceSkillName) : getSkillNameById(effect.sourceSkillId),
      className: effect.type,
      effects: [effect]
    });
  }
  return [...groups.values()];
}

export function statusEffectGroupValue(group) {
  if (group.effects.some((effect) => effect.turns === -1)) return "∞";
  const timedEffects = group.effects.filter((effect) => Number.isFinite(effect.turns));
  if (timedEffects.length > 0) {
    return Math.max(...timedEffects.map((effect) => effect.turns));
  }
  return statusEffectValue(group.effects[0]);
}

export function statusEffectGroupMeta(group) {
  const metas = group.effects.map((effect) => statusEffectMeta(effect));
  return [...new Set(metas)].join(" | ");
}

export function statusEffectValue(effect) {
  if (effect.type === "shield") return effect.remainingShield || effect.value;
  if (effect.turns === -1) return "∞";
  if (Number.isFinite(effect.turns)) return effect.turns;
  return effect.turns;
}

export function statusEffectMeta(effect) {
  if (effect.type === "shield") return "Escudo destruible";
  if (effect.turns === -1) return "Permanente";
  if (effect.type === "complex") return `Turnos restantes: ${effect.turns}`;
  if (effect.type === "damage-reduction") return `Turnos restantes: ${effect.turns}`;
  return `Turnos restantes: ${effect.turns}`;
}

function durationDescription(duration) {
  if (duration === -1) return " permanentemente";
  return duration ? ` por ${duration} turno(s)` : "";
}

export function effectDescription(effect) {
  if (effect.type === "damage") {
    const bonuses = (effect.bonusWhen || []).map((rule) => {
      const requirement = rule.require || rule.when || rule;
      return `+${rule.bonus ?? rule.value ?? 0} si ${targetConditionDescription(requirement)}`;
    });
    return [`${damageTypeLabel(effect.damageType)}: ${effect.value}`, ...bonuses].join(" | ");
  }
  if (effect.type === "instakill") return "Muerte instantanea";
  if (effect.type === "heal") return `Cura: ${effect.value}`;
  if (effect.type === "self-heal") return `Auto-curacion: ${effect.value}`;
  if (effect.type === "shield") return `Escudo destruible: ${effect.value}${effect.isStackable ? " (acumulable)" : " (renovable)"}`;
  if (effect.type === "damage-reduction") return `Reduccion de dano: ${effect.value} por ${effect.duration} turno(s)`;
  if (effect.type === "modifyDamage") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const value = Number(effect.value || 0);
    const amount = Math.abs(value);
    const duration = durationDescription(effect.duration);
    return `${value < 0 ? "Reduce" : "Aumenta"} dano: ${value < 0 ? "-" : "+"}${amount}${duration}${scope}`;
  }
  if (effect.type === "modifyDamageByMissingHp") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const amount = Number(effect.amountPerStep ?? effect.value ?? 0);
    const hpStep = Math.max(1, Number(effect.hpStep || 1));
    const duration = durationDescription(effect.duration);
    return `Aumenta dano: +${amount} por cada ${hpStep} HP faltante${duration}${scope}`;
  }
  if (effect.type === "modifyDamageType") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = durationDescription(effect.duration);
    return `Cambia tipo de dano: ${damageTypeLabel(effect.damageType)}${duration}${scope}`;
  }
  if (effect.type === "modifyTargetType") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = durationDescription(effect.duration);
    return `Cambia objetivos: ${targetTypeLabel(effect.targetType)}${duration}${scope}`;
  }
  if (effect.type === "modifyTargetCount") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = durationDescription(effect.duration);
    return `Limita objetivos: ${effect.count ?? effect.value}${effect.random === false ? "" : " al azar"}${duration}${scope}`;
  }
  if (effect.type === "addEffectToBase") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = durationDescription(effect.duration);
    const descriptions = (effect.effects || []).map(effectDescription).join(" + ");
    return `Agrega efecto${duration}${scope}${descriptions ? `: ${descriptions}` : ""}`;
  }
  if (effect.type === "addUncountereable") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = durationDescription(effect.duration);
    return `No countereable${duration}${scope}`;
  }
  if (effect.type === "addNonReflectable") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = durationDescription(effect.duration);
    return `No reflejable${duration}${scope}`;
  }
  if (effect.type === "replaceEffects") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = durationDescription(effect.duration);
    const descriptions = (effect.effects || []).map(effectDescription).join(" + ");
    return `Reemplaza efectos${duration}${scope}${descriptions ? `: ${descriptions}` : ""}`;
  }
  if (effect.type === "replaceSkill") {
    const duration = durationDescription(effect.duration);
    const baseSkillName = effect.baseSkillId ? getSkillNameById(effect.baseSkillId) : "habilidad actual";
    return `Reemplaza habilidad${duration}: ${baseSkillName} -> ${getSkillNameById(effect.skillId)}`;
  }
  if (chakraCostModifierTypes.includes(effect.type)) {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const entries = Object.entries(effect.chakra || {})
      .filter(([, amount]) => Number(amount || 0) !== 0)
      .map(([type, amount]) => `${effect.type !== "substituteChakraCost" && Number(amount) > 0 ? "+" : ""}${amount} ${chakraEffectTypeLabel(type)}`);
    const label = effect.type === "substituteChakraCost" ? "Sustituye coste" : "Modifica coste";
    return `${label}: ${entries.join(", ") || "sin cambios"}${scope}`;
  }
  if (effect.type === "stun") {
    const affectedFamilies = stunFamiliesAffected(effect);
    const scope = affectedFamilies.length ? ` (${skillFamiliesLabel(affectedFamilies)})` : "";
    return `Aturde: ${effect.value} turno(s)${scope}`;
  }
  if (effect.type === "invulnerable") return `Invulnerable: ${effect.value} turno(s)`;
  if (effect.type === "counter") return `Counter: ${effect.duration === -1 ? "permanente" : `${effect.duration} turno(s)`}`;
  if (effect.type === "reflect") return `Reflejo: ${effect.duration === -1 ? "permanente" : `${effect.duration} turno(s)`}`;
  if (effect.type === "gain-chakra") return `Gana chakra: ${effect.value} ${chakraEffectTypeLabel(effect.chakraType)}`;
  if (effect.type === "remove-chakra") return `Elimina chakra: ${effect.value} ${chakraEffectTypeLabel(effect.chakraType)}`;
  if (effect.type === "complex") {
    const descriptions = (effect.effects || []).map(effectDescription).join(" + ");
    return `Efecto complejo: ${effect.duration} turno(s)${descriptions ? ` - ${descriptions}` : ""}`;
  }
  return `${effect.type}: ${effect.value}`;
}

export function chakraEffectTypeLabel(type) {
  if (type === "neutralChakra") return "neutral";
  return type ? `de ${type}` : "aleatorio";
}

export function damageTypeLabel(type = "basic") {
  if (type === "piercing") return "Dano perforante";
  if (type === "affliction") return "Dano afliccion";
  return "Dano normal";
}

export function targetTypeLabel(type) {
  if (type === "enemy") return "Enemigo";
  if (type === "enemies") return "Todos los enemigos";
  if (type === "ally") return "Aliado";
  if (type === "allies") return "Todos los aliados";
  if (type === "self") return "Propio";
  if (type === "allPlayers") return "Todos";
  return type;
}

export function requirementDescription(requirement) {
  const scope = normalizeRequireScope(requirement.scope || requirement.target);
  const type = normalizeRequireType(requirement.type || requirement.condition);
  const scopeLabel = {
    self: "Propio",
    anyAlly: "Algun aliado",
    anyEnemy: "Algun enemigo"
  }[scope] || scope;

  if (type === "hasStatusEffect") {
    return `${scopeLabel}: tiene status ${getSkillNameById(requirement.effectId || requirement.statusEffectId || requirement.id)}`;
  }
  if (type === "hasSkill") {
    return `${scopeLabel}: tiene habilidad ${getSkillNameById(requirement.skillId || requirement.id || requirement.value)}`;
  }
  if (type === "hp") {
    const operator = {
      eq: "igual a",
      gte: "igual o mayor a",
      lte: "igual o menor a",
      gt: "mayor a",
      lt: "menor a",
      ne: "distinta a"
    }[normalizeHpOperator(requirement.operator || requirement.comparison)] || "igual o mayor a";
    return `${scopeLabel}: vida ${operator} ${requirement.hp ?? requirement.value}`;
  }
  if (type === "hasMinHp") {
    return `${scopeLabel}: minimo ${requirement.minHp ?? requirement.hp ?? requirement.value} HP`;
  }
  if (type === "hasMaxHp") {
    return `${scopeLabel}: maximo ${requirement.maxHp ?? requirement.hp ?? requirement.value} HP`;
  }
  return `${scopeLabel}: ${type}`;
}

function targetConditionDescription(requirement) {
  const scope = String(requirement.scope || requirement.target || "target").toLowerCase();
  const subject = scope === "self" ? "lanzador" : "objetivo";
  const type = normalizeRequireType(requirement.type || requirement.condition);
  if (type === "hasStatusEffect") {
    return `${subject} tiene status ${getSkillNameById(requirement.effectId || requirement.statusEffectId || requirement.id)}`;
  }
  if (type === "hasSkill") {
    return `${subject} tiene habilidad ${getSkillNameById(requirement.skillId || requirement.id || requirement.value)}`;
  }
  if (type === "hp") {
    const operator = {
      eq: "igual a",
      gte: "igual o mayor a",
      lte: "igual o menor a",
      gt: "mayor a",
      lt: "menor a",
      ne: "distinta a"
    }[normalizeHpOperator(requirement.operator || requirement.comparison)] || "igual o mayor a";
    return `${subject} tiene vida ${operator} ${requirement.hp ?? requirement.value}`;
  }
  if (type === "hasMinHp") {
    return `${subject} tiene minimo ${requirement.minHp ?? requirement.hp ?? requirement.value} HP`;
  }
  if (type === "hasMaxHp") {
    return `${subject} tiene maximo ${requirement.maxHp ?? requirement.hp ?? requirement.value} HP`;
  }
  return requirementDescription(requirement).toLowerCase();
}
