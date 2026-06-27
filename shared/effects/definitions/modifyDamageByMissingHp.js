export const modifyDamageByMissingHpEffect = {
  description: "Modifica el dano segun la vida faltante del objetivo. amountPerStep se suma por cada hpStep puntos de vida faltante. skillIds permite limitar el modificador a habilidades especificas; si se omite, afecta a todas.",
  fields: ["type", "amountPerStep", "hpStep", "duration", "targets", "skillIds"]
};
