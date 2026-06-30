export const reviveOnDeathEffect = {
  description: "Revive al personaje una vez cuando llega a 0 HP. hp define la vida al revivir. removeNegativeEffects limpia efectos negativos. invulnerableTurns agrega invulnerabilidad tras revivir. disableSkillIds marca habilidades como usadas/no disponibles.",
  fields: ["type", "hp", "duration", "targets", "removeNegativeEffects", "invulnerableTurns", "disableSkillIds", "descriptions"]
};
