export const applyEffectsOntriggerEventEffect = {
  description: "Crea un estado que dispara effects cuando ocurre un evento. triggerEvent reachHp compara la vida del portador con comparator y value. charges define cuantas veces se dispara; por defecto 1. disableSkillIds marca habilidades como no disponibles al dispararse.",
  fields: ["type", "duration", "targets", "triggerEvent", "condition", "comparator", "value", "effects", "charges", "disableSkillIds", "showStatusEffect", "descriptions"]
};
