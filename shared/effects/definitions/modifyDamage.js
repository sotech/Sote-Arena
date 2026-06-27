export const modifyDamageEffect = {
  description: "Modifica el dano de las habilidades del objetivo durante una duracion en turnos. value positivo aumenta el dano y value negativo lo reduce. skillIds permite limitar el modificador a habilidades especificas; si se omite, afecta a todas.",
  fields: ["type", "value", "duration", "targets", "skillIds"]
};
