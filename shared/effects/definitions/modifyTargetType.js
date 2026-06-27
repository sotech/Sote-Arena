export const modifyTargetTypeEffect = {
  description: "Modifica temporalmente el targetType de las habilidades del objetivo. targetType acepta self, enemy, ally, enemies, allies o allPlayers. skillIds permite limitar el modificador.",
  fields: ["type", "targetType", "duration", "targets", "skillIds"]
};
