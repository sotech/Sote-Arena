export const counterEffect = {
  description: "Estado secreto por defecto que cancela habilidades. trigger puede ser incoming, outgoing o both. charges indica cuantas habilidades cancela; -1 es indefinido.",
  fields: ["type", "duration", "targets", "trigger", "charges", "skillIds", "familiesAffected", "showStatusEffect"]
};
