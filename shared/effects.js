export const effectTargetRefs = {
  target: "Usa el objetivo seleccionado por targetType. Puede resolver a uno o varios miembros.",
  self: "Usa al personaje que lanza la habilidad."
};

export const effectTypes = {
  damage: {
    description: "Inflige dano a cada objetivo, consumiendo escudo antes de vida.",
    fields: ["type", "value", "targets"]
  },
  heal: {
    description: "Restaura vida a cada objetivo hasta su vida maxima.",
    fields: ["type", "value", "targets"]
  },
  "self-heal": {
    description: "Restaura vida al lanzador. Normalmente usa targets: self.",
    fields: ["type", "value", "targets"]
  },
  leech: {
    description: "Dana al primer objetivo por value y cura al lanzador por heal.",
    fields: ["type", "value", "heal", "targets"]
  },
  shield: {
    description: "Otorga escudo a cada objetivo.",
    fields: ["type", "value", "targets"]
  },
  stun: {
    description: "Impide que cada objetivo use habilidades durante la cantidad indicada de turnos.",
    fields: ["type", "value", "targets"]
  },
  invulnerable: {
    description: "Impide que enemigos puedan seleccionar al objetivo durante la cantidad indicada de turnos.",
    fields: ["type", "value", "targets"]
  }
};

export const supportedEffectTypes = Object.keys(effectTypes);
