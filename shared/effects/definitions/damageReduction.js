export const damageReductionEffect = {
  description: "Otorga reduccion de dano durante una duracion en turnos. Puede restaurarse al inicio de cada turno. Si percent es true, value se interpreta como porcentaje y no se consume.",
  fields: ["type", "value", "duration", "targets", "restoresEachTurn", "percent"]
};
