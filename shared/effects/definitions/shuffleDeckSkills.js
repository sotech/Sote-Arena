export const shuffleDeckSkillsEffect = {
  description: "Reemplaza varias ranuras de habilidad por cartas aleatorias de un mazo, sin repetir cartas entre ranuras. Puede evitar cartas en cooldown si hay suficientes disponibles.",
  fields: ["type", "targets", "baseSkillIds", "deckSkillIds", "avoidCooldown", "showStatusEffect"]
};
