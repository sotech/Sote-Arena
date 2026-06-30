export const changeAvatarImageEffect = {
  description: "Cambia la imagen del avatar del personaje mientras el estado este activo. avatarImage indica el nombre del archivo dentro de assets/characters sin extension. duration lastUntilShieldBroken mantiene el cambio hasta que se rompa el escudo vinculado por statusLinkId. Puede ocultarse con showStatusEffect false.",
  fields: ["type", "duration", "targets", "avatarImage", "statusLinkId", "showStatusEffect", "descriptions"]
};
