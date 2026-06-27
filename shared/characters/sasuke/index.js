export const sasuke = {
  id: "sasuke",
  name: "Sasuke Uchiha",
  avatar: "SU",
  maxHp: 100,
  skills: [
    {
      id: "chidori",
      name: "Chidori",
      chakra: { ninjutsu: 1, bloodline: 1 },
      targetType: "enemy",
      nonReflectable: true,
      description: "Sasuke usa su version de Chidori, inflingiendo 35 de dano perforante a un enemigo. Solo puede usarse con Sharingan activo. Si el objetivo tiene 50 o menos de vida, esta habilidad hace 15 mas de dano.",
      requires: [{ type: "hasStatusEffect", effectId: "sharingan", message: "Chidori requiere Sharingan activo." }],
      effects: [
        { type: "damage", value: 35, damageType: "piercing", targets: "target", bonusWhen: [{ bonus: 15, require: { type: "hasMaxHp", hp: 50 } }] }
      ],
      family:["chakra","instant"]
    },
    {
      id: "sharingan",
      name: "Sharingan",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: "Sasuke activa su Sharingan, ganando 20 de reduccion de dano por 3 turnos y permitiendo usar Chidori.",
      effects: [
        {
          type: "complex",
          duration: 3,
          targets: "self",
          effects: [
            { type: "damage-reduction", value: 20, targets: "self" },
          ]
        }
      ],
      cooldown: 4,
      family:["mental","instant"]
    },
    {
      id: "curse-mark-leech",
      name: "Marca maldita",
      chakra: { bloodline: 1 },
      targetType: "enemy",
      description: "Inflige 20 de dano afliccion a un enemigo y cura 20 de vida al lanzador.",
      effects: [
        { type: "damage", value: 20, damageType: "affliction", targets: "target" },
        { type: "self-heal", value: 20, targets: "self" }
      ],
      cooldown: 1,
      family:["chakra","instant"]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family:["physical","instant"]
    }
  ]
};
