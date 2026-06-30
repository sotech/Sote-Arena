export const modifyDamageMultiplierEffect = {
  description: "Multiplica el dano de habilidades del objetivo durante una duracion. multiplier indica el factor. skillIds limita habilidades. targetStatus permite aplicar solo si el objetivo danado tiene un estado especifico.",
  fields: ["type", "multiplier", "duration", "targets", "skillIds", "targetStatus"]
};
