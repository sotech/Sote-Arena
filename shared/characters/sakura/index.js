export const sakura = {
  id: "sakura",
  name: "Sakura Haruno",
  role: "Soporte",
  avatar: "SH",
  maxHp: 100,
  skills: [
    {
      id: "chakra-punch",
      name: "Golpe de chakra",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Inflige 20 de dano a un enemigo.",
      effects: [{ type: "damage", value: 20, targets: "target" }]
    },
    {
      id: "medical-ninjutsu",
      name: "Ninjutsu medico",
      chakra: { ninjutsu: 1 },
      targetType: "ally",
      description: "Cura 25 de vida a un aliado.",
      effects: [{ type: "heal", value: 25, targets: "target" }]
    },
    {
      id: "team-medical-care",
      name: "Cuidados medicos",
      chakra: { ninjutsu: 1, genjutsu: 1 },
      targetType: "allies",
      description: "Cura 15 de vida a todos los aliados.",
      effects: [{ type: "heal", value: 15, targets: "target" }]
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
