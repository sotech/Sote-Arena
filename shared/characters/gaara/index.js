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
      chakra: { bloodline: 1, ninjutsu: 1 },
      targetType: "enemy",
      description: "Inflige 35 de dano a un enemigo y lo aturde 1 turno.",
      effects: [
        { type: "damage", value: 35, targets: "target" },
        { type: "stun", value: 1, targets: "target" }
      ],
      cooldown: 1
    },
    {
      id: "sand-shield",
      name: "Escudo de arena",
      chakra: { genjutsu: 2 },
      targetType: "allies",
      description: "Otorga 15 de escudo a todos los aliados. No puede acumularse consigo mismo.",
      effects: [{ type: "shield", value: 15, targets: "target", isStackable: false }],
      cooldown: 1
    },
    {
      id: "sand-armor",
      name: "Armadura de arena",
      chakra: { bloodline: 2 },
      targetType: "self",
      description: "Otorga 35 de escudo al lanzador. No puede acumularse consigo mismo.",
      effects: [{ type: "shield", value: 35, targets: "self", isStackable: false }]
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
