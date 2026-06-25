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
      description: "Inflige 35 de dano a un enemigo.",
      effects: [{ type: "damage", value: 35, targets: "target" }]
    },
    {
      id: "sharingan",
      name: "Sharingan",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: "Gana 20 de escudo uno mismo.",
      effects: [{ type: "shield", value: 20, targets: "self" }]
    },
    {
      id: "curse-mark-leech",
      name: "Marca maldita",
      chakra: { bloodline: 1, genjutsu: 1 },
      targetType: "enemy",
      description: "Inflige 15 de dano a un enemigo y cura 10 de vida al lanzador.",
      effects: [{ type: "leech", value: 15, heal: 10, targets: "target" }]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { taijutsu: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }]
    }
  ]
};
