export const modifyChakraCostEffect = {
  description: "Modifica el coste de chakra de las habilidades del objetivo. chakra acepta taijutsu, ninjutsu, bloodline, genjutsu y neutralChakra con valores positivos o negativos. skillIds permite limitarlo a habilidades especificas; si se omite, afecta a todas. El coste final nunca baja de 0.",
  fields: ["type", "chakra", "duration", "targets", "skillIds"]
};
