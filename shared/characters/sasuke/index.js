export const sasuke = {
  id: "sasuke",
  name: "Sasuke Uchiha",
  role: "Dano explosivo",
  avatar: "SU",
  maxHp: 100,
  skills: [
    {
      id: "chidori",
      name: "Chidori",
      chakra: { ninjutsu: 1, bloodline: 1 },
      targetType: "enemy",
      description: "Sasuke usa su version de Chidori, inflingiendo 30 de dano perforante a un enemigo.",
      effects: [{ type: "damage", value: 30, damageType: "piercing", targets: "target" }]
    },
    {
      id: "sharingan",
      name: "Sharingan",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: "Sasuke activa su Sharingan, ganando 20 de reduccion de dano por 3 turnos y aumentando Chidori en 15 de dano.",
      effects: [
        { type: "damage-reduction", value: 20, duration: 3, targets: "self" },
        { type: "buffDamage", value: 15, duration: 3, targets: "self", skillIds: ["chidori"] }
      ],
      cooldown: 4
    },
    {
      id: "curse-mark-leech",
      name: "Marca maldita",
      chakra: { bloodline: 1 },
      targetType: "enemy",
      description: "Inflige 15 de dano afliccion a un enemigo y cura 15 de vida al lanzador.",
      effects: [
        { type: "damage", value: 15, damageType: "affliction", targets: "target" },
        { type: "self-heal", value: 15, targets: "self" }
      ],
      cooldown: 1
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }],
      cooldown: 4
    }
  ]
};
