export const modifyReceivedDamageEffect = {
  description: "Modifica el dano recibido por el portador mientras dure el estado. Por defecto value suma dano plano; mode percent usa value como porcentaje y multiplier multiplica el dano recibido. sourceCharacterIds limita que atacantes disparan el modificador.",
  fields: ["type", "value", "multiplier", "mode", "duration", "targets", "sourceCharacterIds", "skillIds", "ignoreInvulnerable", "isStackable"]
};
