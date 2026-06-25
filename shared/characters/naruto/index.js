export const naruto = {
  id: "naruto",
  name: "Naruto Uzumaki",
  role: "Ataque sostenido",
  avatar: "NU",
  maxHp: 100,
  skills: [
    {
      id: "rasengan",
      name: "Rasengan",
      chakra: { taijutsu: 1, ninjutsu: 1 },
      targetType: "enemy",
      description: "Inflige 30 de dano a un enemigo.",
      effects: [{ type: "damage", value: 30, targets: "target" }]
    },
    {
      id: "shadow-clones",
      name: "Clones de sombra",
      chakra: { taijutsu: 2 },
      targetType: "enemies",
      description: "Inflige 15 de dano a todos los enemigos.",
      effects: [
        { type: "damage", value: 15, targets: "target" }
      ]
    },
    {
      id: "uzumaki-resolve",
      name: "Voluntad Uzumaki",
      chakra: { genjutsu: 1 },
      targetType: "self",
      description: "Cura 15 de vida al lanzador y le otorga 10 de reduccion de dano durante 2 turnos.",
      effects: [
        { type: "self-heal", value: 15, targets: "self" },
        { type: "damage-reduction", value: 10, duration: 2, targets: "self" }
      ],
      cooldown: 2
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { taijutsu: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }],
      cooldown: 4
    }
  ]
};
