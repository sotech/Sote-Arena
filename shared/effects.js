export const effectTargetRefs = {
  target: "Usa el objetivo seleccionado por targetType. Puede resolver a uno o varios miembros.",
  self: "Usa al personaje que lanza la habilidad.",
  origin: "En efectos complex, usa al personaje que aplico originalmente el statusEffect si todavia existe.",
  allies: "Usa todos los aliados vivos.",
  enemies: "Usa todos los enemigos vivos que puedan ser seleccionados."
};

export const effectTypes = {
  damage: {
    description: "Inflige dano a cada objetivo. damageType puede ser basic, piercing o affliction. bonusWhen permite sumar dano si el objetivo cumple una condicion de requires.",
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
  buffDamage: {
    description: "Aumenta el dano de las habilidades del objetivo durante una duracion en turnos. skillIds permite limitar el bonus a habilidades especificas; si se omite, afecta a todas.",
    fields: ["type", "value", "duration", "targets", "skillIds"]
  },
  stun: {
    description: "Impide que cada objetivo use habilidades durante la cantidad indicada de turnos.",
    fields: ["type", "value", "targets"]
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
    description: "Elimina chakra del jugador dueno del objetivo. chakraType puede ser un tipo especifico; si se omite, se elimina al azar.",
    fields: ["type", "value", "targets", "chakraType"]
  },
  complex: {
    description: "Crea un statusEffect duracional que aplica efectos simples mientras dure.",
    fields: ["type", "duration", "targets", "effects"]
  }
};

export const supportedEffectTypes = Object.keys(effectTypes);
