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
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: `Gaara encierra en arena a su objetivo y lo comprime rompiendo huesos y carne. 
                    Inflige 35 de dano a un enemigo y lo aturde 1 turno.`,
      effects: [
        { type: "damage", value: 35, targets: "target" },
        { type: "complex", duration: 1, targets: "target", effects: [{ type: "stun", value: 1, targets: "self" }] }
      ],
      cooldown: 1
    },
    {
      id: "sand-shield",
      name: "Escudo de arena",
      chakra: { genjutsu: 1 },
      targetType: "allies",
      description: "La arena protectora envuelve a todos los aliados. Otorga 15 de escudo a todos los aliados. No puede acumularse consigo mismo.",
      effects: [{ type: "shield", value: 15, targets: "target", isStackable: false }],
      cooldown: 2
    },
    {
      id: "sand-armor",
      name: "Armadura de arena",
      chakra: { neutralChakra: 2 },
      targetType: "self",
      description: "La arena forma una armadura alrededor del lanzador. Otorga 35 de escudo. No puede acumularse consigo mismo.",
      effects: [{ type: "shield", value: 35, targets: "self", isStackable: false }],
      cooldown: 1
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4
    }
  ]
};
