export const triggerSkillsEffect = {
  description: "Crea un estado que dispara effects cuando se cumple una condicion. condition permite comparar hp o hpPercent del portador con comparator y value. charges define cuantas veces se dispara; por defecto 1.",
  fields: ["type", "duration", "targets", "condition", "effects", "charges", "showStatusEffect", "descriptions"]
};
