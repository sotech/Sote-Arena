export const damageEffect = {
  description: "Inflige dano a cada objetivo. damageType puede ser basic/normal, piercing o affliction. bonusWhen permite sumar dano si target o self cumplen una condicion de requires.",
  fields: ["type", "value", "targets", "damageType", "bonusWhen", "selectedTargetOnly"]
};
