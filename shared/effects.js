export const effectTargetRefs = {
  target: "Usa el objetivo seleccionado por targetType. Puede resolver a uno o varios miembros.",
  self: "Usa al personaje que lanza la habilidad.",
  origin: "En efectos complex, usa al personaje que aplico originalmente el statusEffect si todavia existe.",
  allies: "Usa todos los aliados vivos.",
  enemies: "Usa todos los enemigos vivos que puedan ser seleccionados."
};

const skillFamilyLabels = {
  physical: "fisicas",
  chakra: "chakra",
  mental: "mental",
  instant: "instantaneas"
};

const skillClassLabels = {
  physical: "fisica",
  chakra: "chakra",
  mental: "mental",
  instant: "instantanea"
};

export function skillFamilyLabel(family) {
  return skillFamilyLabels[family] || family;
}

export function skillFamiliesLabel(families = []) {
  return families.map(skillFamilyLabel).join(", ");
}

export function skillClassLabel(family) {
  return skillClassLabels[family] || family;
}

export function skillClassesLabel(families = []) {
  return families.map(skillClassLabel).join(", ");
}

export const effectTypes = {
  damage: {
    description: "Inflige dano a cada objetivo. damageType puede ser basic, piercing o affliction. bonusWhen permite sumar dano si target o self cumplen una condicion de requires.",
    fields: ["type", "value", "targets", "damageType", "bonusWhen"]
  },
  heal: {
    description: "Restaura vida a cada objetivo hasta su vida maxima.",
    fields: ["type", "value", "targets"]
  },
  "self-heal": {
    description: "Restaura vida al lanzador. Normalmente usa targets: self.",
    fields: ["type", "value", "targets"]
  },
  shield: {
    description: "Otorga escudo destruible a cada objetivo. isStackable permite acumular escudo consigo mismo.",
    fields: ["type", "value", "targets", "isStackable"]
  },
  "damage-reduction": {
    description: "Otorga reduccion de dano durante una duracion en turnos. Puede restaurarse al inicio de cada turno.",
    fields: ["type", "value", "duration", "targets", "restoresEachTurn"]
  },
  modifyDamage: {
    description: "Modifica el dano de las habilidades del objetivo durante una duracion en turnos. value positivo aumenta el dano y value negativo lo reduce. skillIds permite limitar el modificador a habilidades especificas; si se omite, afecta a todas.",
    fields: ["type", "value", "duration", "targets", "skillIds"]
  },
  modifyDamageType: {
    description: "Modifica el tipo de dano de las habilidades del objetivo durante una duracion en turnos. damageType puede ser basic, piercing o affliction. skillIds permite limitar el modificador a habilidades especificas; si se omite, afecta a todas.",
    fields: ["type", "damageType", "duration", "targets", "skillIds"]
  },
  addEffectToBase: {
    description: "Agrega efectos adicionales a las habilidades del objetivo durante una duracion en turnos. effects contiene los efectos a agregar. skillIds permite limitarlo a habilidades especificas; si se omite, afecta a todas.",
    fields: ["type", "duration", "targets", "skillIds", "effects"]
  },
  replaceSkill: {
    description: "Reemplaza una habilidad base por otra habilidad durante una duracion en turnos. baseSkillId indica la habilidad visible a reemplazar y skillId indica la habilidad que ocupa su lugar.",
    fields: ["type", "duration", "targets", "baseSkillId", "skillId"]
  },
  modifyChakraCost: {
    description: "Modifica el coste de chakra de las habilidades del objetivo. chakra acepta taijutsu, ninjutsu, bloodline, genjutsu y neutralChakra con valores positivos o negativos. skillIds permite limitarlo a habilidades especificas; si se omite, afecta a todas. El coste final nunca baja de 0.",
    fields: ["type", "chakra", "duration", "targets", "skillIds"]
  },
  substituteChakraCost: {
    description: "Sobreescribe el coste de chakra de las habilidades del objetivo. chakra acepta taijutsu, ninjutsu, bloodline, genjutsu y neutralChakra con el nuevo coste final. skillIds permite limitarlo a habilidades especificas; si se omite, afecta a todas. El coste final nunca baja de 0.",
    fields: ["type", "chakra", "duration", "targets", "skillIds"]
  },
  stun: {
    description: "Impide que cada objetivo use habilidades durante la cantidad indicada de turnos. familiesAffected permite limitarlo a habilidades que compartan alguna familia; si se omite, afecta a todas.",
    fields: ["type", "value", "targets", "familiesAffected"]
  },
  invulnerable: {
    description: "Impide que enemigos puedan seleccionar al objetivo durante la cantidad indicada de turnos.",
    fields: ["type", "value", "targets"]
  },
  "gain-chakra": {
    description: "Otorga chakra al jugador dueno del objetivo. chakraType puede ser un tipo especifico; si se omite, se otorga al azar.",
    fields: ["type", "value", "targets", "chakraType"]
  },
  "remove-chakra": {
    description: "Elimina chakra. chakraType puede ser un tipo especifico; si se omite, se elimina al azar del pool enemigo.",
    fields: ["type", "value", "targets", "chakraType"]
  },
  complex: {
    description: "Crea un statusEffect duracional que aplica efectos simples mientras dure.",
    fields: ["type", "duration", "targets", "effects"]
  }
};

export const supportedEffectTypes = Object.keys(effectTypes);
