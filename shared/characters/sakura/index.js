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
      description: "Sakura utiliza su control de chakra en su puño e inflige 20 de dano a un enemigo.",
      effects: [{ type: "damage", value: 20, targets: "target" }]
    },
    {
      id: "medical-ninjutsu",
      name: "Ninjutsu medico",
      chakra: { ninjutsu: 1 },
      targetType: "ally",
      description: "Sakura cura 25 de vida a un aliado.",
      effects: [{ type: "heal", value: 25, targets: "target" }],
      cooldown: 1
    },
    {
      id: "team-medical-care",
      name: "Cuidados medicos",
      chakra: { ninjutsu: 1, genjutsu: 1 },
      targetType: "allies",
      description: "Sakura cura 15 de vida a todos los aliados y les otorga 10 de reduccion de dano durante 1 turnos.",
      effects: [
        { type: "heal", value: 15, targets: "target" }, 
        { type: "damage-reduction", value: 10, duration: 1, targets: "target" }
      ],
      cooldown: 3
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
