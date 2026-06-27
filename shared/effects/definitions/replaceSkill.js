export const replaceSkillEffect = {
  description: "Reemplaza una habilidad base por otra habilidad durante una duracion en turnos. duration -1 hace el reemplazo permanente. baseSkillId indica la habilidad visible a reemplazar; si se omite, se usa la habilidad que lanza el efecto. skillId indica la habilidad que ocupa su lugar. showStatusEffect define si se muestra el statusEffect; si se omite, se muestra.",
  fields: ["type", "duration", "targets", "baseSkillId", "skillId", "showStatusEffect"]
};
