export const kakashi = {
  id: "kakashi",
  name: "Kakashi Hatake",
  role: "Control",
  avatar: "KH",
  maxHp: 100,
  skills: [
    {
      id: "raikiri",
      name: "Raikiri",
      chakra: { ninjutsu: 2 },
      targetType: "enemy",
      description: "Inflige 30 de dano preciso a un enemigo.",
      effects: [{ type: "damage", value: 30, targets: "target" }]
    },
    {
      id: "tactical-read",
      name: "Lectura tactica",
      chakra: { genjutsu: 2 },
      targetType: "enemy",
      description: "Inflige 15 de dano y aturde 2 turnos a un enemigo.",
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "stun", value: 2, targets: "target" }
      ]
    },
    {
      id: "ninken-trap",
      name: "Trampa Ninken",
      chakra: { taijutsu: 1, genjutsu: 2 },
      targetType: "enemies",
      description: "Inflige 10 de dano y aturde 1 turno a todos los enemigos.",
      effects: [
        { type: "damage", value: 10, targets: "target" },
        { type: "stun", value: 1, targets: "target" }
      ]
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
