export const modifyDamageTypeEffect = {
  description: "Modifica el tipo de dano de las habilidades del objetivo durante una duracion en turnos. damageType puede ser basic/normal, piercing o affliction. skillIds permite limitar el modificador a habilidades especificas; si se omite, afecta a todas.",
  fields: ["type", "damageType", "duration", "targets", "skillIds"]
};
