export const gaara = {
  id: "gaara",
  name: "Gaara",
  role: "Tanque",
  avatar: "GA",
  maxHp: 100,
  skills: [
    {
      id: "sand-coffin",
      name: "Ataud de arena",
      chakra: { bloodline: 2, ninjutsu: 1 },
      targetType: "enemy",
      description: "Inflige 35 de dano pesado a un enemigo y lo aturde 1 turno.",
      effects: [
        { type: "damage", value: 35, targets: "target" },
        { type: "stun", value: 1, targets: "target" }
      ]
    },
    {
      id: "sand-shield",
      name: "Escudo de arena",
      chakra: { genjutsu: 2 },
      targetType: "allPlayers",
      description: "Otorga 15 de escudo a todos los jugadores.",
      effects: [{ type: "shield", value: 15, targets: "target" }]
    },
    {
      id: "sand-armor",
      name: "Armadura de arena",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: "Otorga 25 de escudo al lanzador.",
      effects: [{ type: "shield", value: 25, targets: "self" }]
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
