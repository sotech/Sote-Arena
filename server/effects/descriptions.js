import { getSkillNameById } from "../../shared/characters.js";
import { chakraCostModifierTypes } from "../../shared/chakraCostModifiers.js";
import { skillFamiliesLabel, stunFamiliesAffected } from "../../shared/effects.js";

const resourceLabels = {
  taijutsu: "Fisico",
  ninjutsu: "Energetico",
  genjutsu: "Mental",
  bloodline: "Especial",
  neutralChakra: "neutral"
};

function hasCustomDescriptions(effect) {
  return Array.isArray(effect?.descriptions) && effect.descriptions.length > 0;
}

export function statusDescription(effect, actorCharacter) {
  if (effect.type === "shield") return `Este personaje tiene ${effect.remainingShield || effect.value} de escudo.`;
  if (effect.type === "payLife") return `${actorCharacter.name} pago ${effect.value} de vida.`;
  if (effect.type === "instakill") return `${actorCharacter.name} ha ejecutado a este personaje.`;
  if (effect.type === "breakShield") return `${actorCharacter.name} destruyo los escudos de este personaje.`;
  if (effect.type === "damage-reduction") return `${actorCharacter.name} ha obtenido ${effect.value}${effect.percent ? "%" : ""} de reduccion de dano.`;
  if (effect.type === "allyCountStatus") return `${actorCharacter.name} ha ganado proteccion por sus aliados vivos.`;
  if (effect.type === "modifyDamage") {
    const scope = effect.skillIds?.length ? ` de ${effect.skillIds.map(getSkillNameById).join(", ")}` : "";
    return `${actorCharacter.name} ha modificado el dano${scope} de este personaje en ${effect.value}.`;
  }
  if (effect.type === "modifyDamageByMissingHp") return `${actorCharacter.name} ha modificado el dano de este personaje segun su vida faltante.`;
  if (effect.type === "modifyDamageType") return `${actorCharacter.name} ha modificado el tipo de dano de este personaje.`;
  if (effect.type === "modifyTargetType") return `${actorCharacter.name} ha modificado los objetivos de este personaje.`;
  if (effect.type === "modifyTargetCount") return `${actorCharacter.name} ha modificado la cantidad de objetivos de este personaje.`;
  if (effect.type === "addEffectToBase") return `${actorCharacter.name} ha agregado efectos a las habilidades de este personaje.`;
  if (effect.type === "addUncountereable") return `${actorCharacter.name} ha hecho habilidades de este personaje no contrarestables.`;
  if (effect.type === "addNonReflectable") return `${actorCharacter.name} ha hecho habilidades de este personaje no reflejables.`;
  if (effect.type === "replaceEffects") return `${actorCharacter.name} ha reemplazado los efectos de habilidades de este personaje.`;
  if (effect.type === "replaceSkill") return `${actorCharacter.name} reemplazo ${getSkillNameById(effect.baseSkillId)} por ${getSkillNameById(effect.skillId)}.`;
  if (effect.type === "counter") return `${actorCharacter.name} ha preparado un counter.`;
  if (effect.type === "reflect") return `${actorCharacter.name} ha preparado un reflejo.`;
  if (chakraCostModifierTypes.includes(effect.type)) return `${actorCharacter.name} ha modificado el coste de chakra de este personaje.`;
  if (effect.type === "complex") return `${actorCharacter.name} ha aplicado un efecto complejo.`;
  if (effect.type === "stun") return `${actorCharacter.name} ha aturdido a este personaje.`;
  if (effect.type === "invulnerable") return `${actorCharacter.name} ha vuelto invulnerable a este personaje.`;
  if (effect.type === "effect-immunity") return `${actorCharacter.name} ignora efectos que no sean dano o sanacion.`;
  if (effect.type === "stunImmunity") return `${actorCharacter.name} es inmune a aturdimientos especificos.`;
  if (effect.type === "ignoreEffects") return `${actorCharacter.name} ignora algunos efectos aplicados.`;
  return `${actorCharacter.name} ha aplicado ${effect.type} a este personaje.`;
}

export function shieldDescriptions(effect) {
  return [`Este personaje tiene ${effect.remainingShield || 0} de escudo.`];
}

export function damageReductionDescriptions(effect) {
  return [`${effect.sourceActorName || "Un personaje"} ha obtenido ${effect.value}${effect.percent ? "%" : ""} de reduccion de dano.`];
}

export function damageTypeLabel(type = "basic") {
  if (type === "piercing") return "dano perforante";
  if (type === "affliction") return "dano afliccion";
  return "dano normal";
}

function modifyDamageDescriptions(effect) {
  const scope = effect.skillIds?.length ? ` para ${effect.skillIds.map(getSkillNameById).join(", ")}` : " para todas sus habilidades";
  const amount = Math.abs(Number(effect.value || 0));
  const verb = Number(effect.value || 0) < 0 ? "redujo" : "aumento";
  return [`${effect.sourceActorName || "Un personaje"} ${verb} el dano en ${amount}${scope}.`];
}

function modifyDamageByMissingHpDescriptions(effect) {
  const scope = effect.skillIds?.length ? ` para ${effect.skillIds.map(getSkillNameById).join(", ")}` : " para todas sus habilidades";
  const amount = Number(effect.amountPerStep ?? effect.value ?? 0);
  const hpStep = Math.max(1, Number(effect.hpStep || 1));
  return [`${effect.sourceActorName || "Un personaje"} aumenta el dano en ${amount} por cada ${hpStep} de vida faltante${scope}.`];
}

function modifyDamageTypeDescriptions(effect) {
  const scope = effect.skillIds?.length ? ` para ${effect.skillIds.map(getSkillNameById).join(", ")}` : " para todas sus habilidades";
  return [`${effect.sourceActorName || "Un personaje"} cambio el tipo de dano a ${damageTypeLabel(effect.damageType)}${scope}.`];
}

function addEffectToBaseDescriptions(effect) {
  const scope = effect.skillIds?.length ? ` para ${effect.skillIds.map(getSkillNameById).join(", ")}` : " para todas sus habilidades";
  return [
    `${effect.sourceActorName || "Un personaje"} agrego efectos${scope}.`,
    ...(effect.effects || []).map(simpleEffectDescription)
  ];
}

function replaceEffectsDescriptions(effect) {
  const scope = effect.skillIds?.length ? ` para ${effect.skillIds.map(getSkillNameById).join(", ")}` : " para todas sus habilidades";
  return [
    `${effect.sourceActorName || "Un personaje"} reemplazo efectos${scope}.`,
    ...(effect.effects || []).map(simpleEffectDescription)
  ];
}

function replaceSkillDescriptions(effect) {
  const duration = effect.turns === -1 ? " permanentemente" : "";
  return [`${effect.sourceActorName || "Un personaje"} reemplazo${duration} ${getSkillNameById(effect.baseSkillId)} por ${getSkillNameById(effect.skillId)}.`];
}

export function modifierDescriptions(effect) {
  if (effect.type === "modifyDamage") return modifyDamageDescriptions(effect);
  if (effect.type === "modifyDamageByMissingHp") return modifyDamageByMissingHpDescriptions(effect);
  if (effect.type === "modifyDamageType") return modifyDamageTypeDescriptions(effect);
  if (effect.type === "modifyTargetType") return [`${effect.sourceActorName || "Un personaje"} cambio los objetivos de habilidades.`];
  if (effect.type === "modifyTargetCount") return [`${effect.sourceActorName || "Un personaje"} limito la cantidad de objetivos de habilidades.`];
  if (effect.type === "addEffectToBase") return addEffectToBaseDescriptions(effect);
  if (effect.type === "addUncountereable") return [`${effect.sourceActorName || "Un personaje"} hizo habilidades no contrarestables.`];
  if (effect.type === "addNonReflectable") return [`${effect.sourceActorName || "Un personaje"} hizo habilidades no reflejables.`];
  if (effect.type === "replaceEffects") return replaceEffectsDescriptions(effect);
  if (effect.type === "replaceSkill") return replaceSkillDescriptions(effect);
  if (effect.type === "counter") return [`${effect.sourceActorName || "Un personaje"} preparo un counter.`];
  if (effect.type === "reflect") return [`${effect.sourceActorName || "Un personaje"} preparo un reflejo.`];
  return modifyChakraCostDescriptions(effect);
}

function chakraCostModifierSummary(chakra = {}, { asReplacement = false } = {}) {
  return Object.entries(chakra)
    .filter(([, amount]) => Number(amount || 0) !== 0)
    .map(([type, amount]) => `${!asReplacement && Number(amount) > 0 ? "+" : ""}${amount} ${resourceLabels[type] || type}`)
    .join(", ");
}

function modifyChakraCostDescriptions(effect) {
  const scope = effect.skillIds?.length ? ` para ${effect.skillIds.map(getSkillNameById).join(", ")}` : " para todas sus habilidades";
  const isReplacement = effect.type === "substituteChakraCost";
  const summary = chakraCostModifierSummary(effect.chakra, { asReplacement: isReplacement });
  const verb = effect.type === "substituteChakraCost" ? "sustituyo" : "modifico";
  return [`${effect.sourceActorName || "Un personaje"} ${verb} el coste de chakra${scope}${summary ? ` (${summary})` : ""}.`];
}

export function simpleEffectDescription(effect) {
  if (effect.type === "damage") return `Inflige ${effect.value} de ${damageTypeLabel(effect.damageType)}.`;
  if (effect.type === "payLife") return `Paga ${effect.value} de vida${effect.notKill ? " sin poder morir" : ""}.`;
  if (effect.type === "breakShield") return "Destruye todo el escudo.";
  if (effect.type === "instakill") return "Mata instantaneamente.";
  if (effect.type === "heal" || effect.type === "self-heal") return `Cura ${effect.value} de vida.`;
  if (effect.type === "shield") return `Otorga ${effect.value} de escudo.`;
  if (effect.type === "damage-reduction") return `Otorga ${effect.value}${effect.percent ? "%" : ""} de reduccion de dano.`;
  if (effect.type === "allyCountStatus") {
    const shield = Number(effect.shieldPerAlly || 0);
    const reduction = Number(effect.damageReductionPerAlly || 0);
    const maxShield = Number(effect.maxShieldPerAlly || 0) > 0
      ? `, maximo ${effect.maxShieldPerAlly} escudo por aliado vivo`
      : (Number.isFinite(Number(effect.maxShield)) ? `, maximo ${effect.maxShield} escudo` : "");
    return `Otorga ${reduction} reduccion de dano y ${shield} escudo por aliado vivo${maxShield}.`;
  }
  if (effect.type === "modifyDamage") {
    const scope = effect.skillIds?.length ? ` a ${effect.skillIds.map(getSkillNameById).join(", ")}` : " a todas las habilidades";
    const amount = Math.abs(Number(effect.value || 0));
    return `${Number(effect.value || 0) < 0 ? "Reduce" : "Aumenta"} ${amount} de dano${scope}.`;
  }
  if (effect.type === "modifyDamageByMissingHp") {
    const scope = effect.skillIds?.length ? ` a ${effect.skillIds.map(getSkillNameById).join(", ")}` : " a todas las habilidades";
    const amount = Number(effect.amountPerStep ?? effect.value ?? 0);
    const hpStep = Math.max(1, Number(effect.hpStep || 1));
    return `Aumenta ${amount} de dano por cada ${hpStep} de vida faltante${scope}.`;
  }
  if (effect.type === "modifyDamageType") {
    const scope = effect.skillIds?.length ? ` a ${effect.skillIds.map(getSkillNameById).join(", ")}` : " a todas las habilidades";
    return `Cambia el tipo de dano a ${damageTypeLabel(effect.damageType)}${scope}.`;
  }
  if (effect.type === "modifyTargetType") return `Cambia objetivos a ${effect.targetType}.`;
  if (effect.type === "modifyTargetCount") return `Limita objetivos a ${effect.count}.`;
  if (effect.type === "addEffectToBase") {
    if (hasCustomDescriptions(effect)) return effect.descriptions.join(" ");
    const scope = effect.skillIds?.length ? ` a ${effect.skillIds.map(getSkillNameById).join(", ")}` : " a todas las habilidades";
    const descriptions = (effect.effects || []).map(simpleEffectDescription).join(" + ");
    return `Agrega efectos${scope}${descriptions ? `: ${descriptions}` : ""}.`;
  }
  if (effect.type === "addUncountereable") return "Hace que habilidades no puedan ser contrarestadas.";
  if (effect.type === "addNonReflectable") return "Hace que habilidades no puedan ser reflejadas.";
  if (effect.type === "replaceSkill") {
    const duration = effect.duration === -1 || effect.turns === -1 ? " permanentemente" : "";
    return `Reemplaza${duration} ${getSkillNameById(effect.baseSkillId)} por ${getSkillNameById(effect.skillId)}.`;
  }
  if (effect.type === "replaceEffects") return "Reemplaza todos los efectos de una habilidad.";
  if (effect.type === "counter") return "Cancela habilidades.";
  if (effect.type === "reflect") return "Refleja habilidades.";
  if (chakraCostModifierTypes.includes(effect.type)) {
    const scope = effect.skillIds?.length ? ` a ${effect.skillIds.map(getSkillNameById).join(", ")}` : " a todas las habilidades";
    const summary = chakraCostModifierSummary(effect.chakra, { asReplacement: effect.type === "substituteChakraCost" });
    return `${effect.type === "substituteChakraCost" ? "Sustituye" : "Modifica"} coste de chakra${scope}${summary ? ` (${summary})` : ""}.`;
  }
  if (effect.type === "invulnerable") return "Otorga invulnerabilidad.";
  if (effect.type === "effect-immunity") return "Ignora efectos que no sean dano o sanacion.";
  if (effect.type === "stunImmunity") return "Otorga inmunidad a aturdimientos especificos.";
  if (effect.type === "ignoreEffects") return "Ignora efectos indicados aunque sus estados se apliquen.";
  if (effect.type === "removeStatus") return "Elimina estados especificos.";
  if (effect.type === "conditionalEffects") return "Aplica efectos condicionales.";
  if (effect.type === "onEnemyDeath") return "Se activa cuando muere un enemigo.";
  if (effect.type === "stun") {
    const affectedFamilies = stunFamiliesAffected(effect);
    const scope = affectedFamilies.length ? ` a las habilidades ${skillFamiliesLabel(affectedFamilies)}` : "";
    return `Aplica aturdimiento${scope}.`;
  }
  if (effect.type === "gain-chakra") return `Otorga ${effect.value} recurso.`;
  if (effect.type === "remove-chakra") return `Elimina ${effect.value} recurso.`;
  return `${effect.type}: ${effect.value || ""}`.trim();
}

export function complexDescriptions(effect) {
  const duration = effect.turns === -1 ? "permanentemente" : `por ${effect.turns} turno(s)`;
  const interruptDescription = (() => {
    if (effect.mode === "cancelOnStun" || effect.mode === "cancelable") {
      return `${effect.sourceSkillName || "Esta habilidad"} puede ser cancelada si el personaje es aturdido.`;
    }
    if (effect.mode === "pauseOnStun" || effect.mode === "interruptible") {
      return `${effect.sourceSkillName || "Esta habilidad"} puede ser interrumpida si el personaje es aturdido.`;
    }
    if (effect.cancelIfOriginStunned) {
      return `${effect.sourceSkillName || "Esta habilidad"} puede ser cancelada si el lanzador es aturdido.`;
    }
    return null;
  })();
  return [
    `${effect.sourceActorName || "Un personaje"} mantiene este efecto ${duration}.`,
    interruptDescription,
    ...(effect.effects || []).map(simpleEffectDescription)
  ].filter(Boolean);
}
