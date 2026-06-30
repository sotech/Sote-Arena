export const shieldEffect = {
  description: "Otorga escudo destruible a cada objetivo. isStackable permite acumular escudo consigo mismo. duration permite que el escudo expire por turnos; lastUntilShieldBroken mantiene el estado hasta que el escudo se rompa. statusLinkId vincula estados para que terminen si el escudo se rompe o expira.",
  fields: ["type", "value", "targets", "isStackable", "duration", "statusLinkId"]
};
