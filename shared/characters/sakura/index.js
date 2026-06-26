export const sakura = {
  id: "sakura",
  name: "Sakura Haruno",
  avatar: "SH",
  maxHp: 100,
  skills: [
    {
      id: "chakra-punch",
      name: "Golpe de chakra",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Sakura utiliza su control de chakra en su puño e inflige 20 de dano a un enemigo.",
      effects: [{ type: "damage", value: 20, targets: "target" }],
      family:["physical","chakra","instant"]
    },
    {
      id: "medical-ninjutsu",
      name: "Ninjutsu medico",
      chakra: { ninjutsu: 1 },
      targetType: "ally",
      description: "Sakura cura 25 de vida a un aliado. Por 2 turnos, Golpe de chakra inflige 10 puntos de daño adicional.",
      effects: [
        { type: "heal", value: 25, targets: "target" },
        { type: "complex", duration: 2, targets: "self", effects: [{ type: "modifyDamage", value: 10, targets: "self", skillIds: ["chakra-punch"] }] }
      ],
      cooldown: 1,
      family:["chakra","instant"]
    },
    {
      id: "team-medical-care",
      name: "Cuidados medicos",
      chakra: { ninjutsu: 1, genjutsu: 1 },
      targetType: "allies",
      description: "Sakura cura 15 de vida a todos los aliados y les otorga 10 de reduccion de dano durante 1 turnos.",
      effects: [
        { type: "heal", value: 15, targets: "target" },
        { type: "complex", duration: 1, targets: "target", effects: [{ type: "damage-reduction", value: 10, targets: "self" }] }
      ],
      cooldown: 3,
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
