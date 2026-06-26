import { normalizeRequireScope, normalizeRequireType } from "../../shared/requires.js";
import { getSkillNameById } from "../../shared/characters.js";
import { chakraCostModifierTypes } from "../../shared/chakraCostModifiers.js";
import { skillFamiliesLabel } from "../../shared/effects.js";

export function chakraCostLabel(chakra = {}) {
  return Object.entries(chakra)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => `${amount} ${type}`)
    .join(" + ");
}

export function groupStatusEffects(effects = []) {
  const groups = new Map();
  for (const [index, effect] of effects.entries()) {
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
      sourceSkillName: effect.sourceSkillName,
      className: effect.type,
      effects: [effect]
    });
  }
  return [...groups.values()];
}

export function statusEffectGroupValue(group) {
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
  if (Number.isFinite(effect.turns)) return effect.turns;
  return effect.turns;
}

export function statusEffectMeta(effect) {
  if (effect.type === "shield") return "Escudo destruible";
  if (effect.type === "complex") return `Turnos restantes: ${effect.turns}`;
  if (effect.type === "damage-reduction") return `Turnos restantes: ${effect.turns}`;
  return `Turnos restantes: ${effect.turns}`;
}

export function effectDescription(effect) {
  if (effect.type === "damage") {
    const bonuses = (effect.bonusWhen || []).map((rule) => {
      const requirement = rule.require || rule.when || rule;
      return `+${rule.bonus ?? rule.value ?? 0} si ${targetConditionDescription(requirement)}`;
    });
    return [`${damageTypeLabel(effect.damageType)}: ${effect.value}`, ...bonuses].join(" | ");
  }
  if (effect.type === "heal") return `Cura: ${effect.value}`;
  if (effect.type === "self-heal") return `Auto-curacion: ${effect.value}`;
  if (effect.type === "shield") return `Escudo destruible: ${effect.value}${effect.isStackable ? " (acumulable)" : " (renovable)"}`;
  if (effect.type === "damage-reduction") return `Reduccion de dano: ${effect.value} por ${effect.duration} turno(s)`;
  if (effect.type === "modifyDamage") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const value = Number(effect.value || 0);
    const amount = Math.abs(value);
    const duration = effect.duration ? ` por ${effect.duration} turno(s)` : "";
    return `${value < 0 ? "Reduce" : "Aumenta"} dano: ${value < 0 ? "-" : "+"}${amount}${duration}${scope}`;
  }
  if (effect.type === "modifyDamageType") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = effect.duration ? ` por ${effect.duration} turno(s)` : "";
    return `Cambia tipo de dano: ${damageTypeLabel(effect.damageType)}${duration}${scope}`;
  }
  if (effect.type === "addEffectToBase") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.map(getSkillNameById).join(", ")})` : " (todas)";
    const duration = effect.duration ? ` por ${effect.duration} turno(s)` : "";
    const descriptions = (effect.effects || []).map(effectDescription).join(" + ");
    return `Agrega efecto${duration}${scope}${descriptions ? `: ${descriptions}` : ""}`;
  }
  if (effect.type === "replaceSkill") {
    const duration = effect.duration ? ` por ${effect.duration} turno(s)` : "";
    return `Reemplaza habilidad${duration}: ${getSkillNameById(effect.baseSkillId)} -> ${getSkillNameById(effect.skillId)}`;
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
    const scope = effect.familiesAffected?.length ? ` (${skillFamiliesLabel(effect.familiesAffected)})` : "";
    return `Aturde: ${effect.value} turno(s)${scope}`;
  }
  if (effect.type === "invulnerable") return `Invulnerable: ${effect.value} turno(s)`;
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
  return "Dano";
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
  if (type === "hasMinHp") {
    return `${subject} tiene minimo ${requirement.minHp ?? requirement.hp ?? requirement.value} HP`;
  }
  if (type === "hasMaxHp") {
    return `${subject} tiene maximo ${requirement.maxHp ?? requirement.hp ?? requirement.value} HP`;
  }
  return requirementDescription(requirement).toLowerCase();
}
