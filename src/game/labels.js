import { normalizeRequireScope, normalizeRequireType } from "../../shared/requires.js";

export function chakraCostLabel(chakra = {}) {
  return Object.entries(chakra)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => `${amount} ${type}`)
    .join(" + ");
}

export function groupStatusEffects(effects = []) {
  const groups = new Map();
  for (const effect of effects) {
    const key = effect.sourceSkillId || effect.id;
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
  if (effect.type === "buffDamage") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.join(", ")})` : " (todas)";
    return `Aumenta dano: +${effect.value} por ${effect.duration} turno(s)${scope}`;
  }
  if (effect.type === "stun") return `Aturde: ${effect.value} turno(s)`;
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
    return `${scopeLabel}: tiene status ${requirement.effectId || requirement.statusEffectId || requirement.id}`;
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
  const type = normalizeRequireType(requirement.type || requirement.condition);
  if (type === "hasStatusEffect") {
    return `objetivo tiene status ${requirement.effectId || requirement.statusEffectId || requirement.id}`;
  }
  if (type === "hasMinHp") {
    return `objetivo tiene minimo ${requirement.minHp ?? requirement.hp ?? requirement.value} HP`;
  }
  if (type === "hasMaxHp") {
    return `objetivo tiene maximo ${requirement.maxHp ?? requirement.hp ?? requirement.value} HP`;
  }
  return requirementDescription(requirement).toLowerCase();
}
