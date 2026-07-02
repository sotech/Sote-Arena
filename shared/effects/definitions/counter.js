export const counterEffect = {
  description: "Estado secreto por defecto que cancela habilidades. trigger puede ser incoming, outgoing o both. charges indica cuantas habilidades cancela; -1 es indefinido. effects permite disparar efectos adicionales cuando el counter se consume. onCounterSuccess permite disparar efectos reutilizables solo cuando el counter se activa. counteredNoticeTemplate permite personalizar el aviso al contrarrestar usando {skillName}.",
  fields: ["type", "duration", "targets", "trigger", "charges", "skillIds", "familiesAffected", "effectTypesAffected", "effects", "onCounterSuccess", "showStatusEffect", "counteredNoticeTemplate"]
};
