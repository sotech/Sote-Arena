export const gaara = {
  id: "gaara",
  name: "Gaara",
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
      cooldown: 1,
      family:["physical","instant"]
    },
    {
      id: "sand-shield",
      name: "Escudo de arena",
      chakra: { bloodline: 1, genjutsu: 1 },
      targetType: "allies",
      description: "La arena protectora envuelve a todos los aliados. Otorga 15 de escudo a todos los aliados. No puede acumularse consigo mismo. Durante 2 turnos, Ataud de arena cuesta 1 chakra neutral menos.",
      effects: [
        { type: "shield", value: 15, targets: "target", isStackable: false },
        { type: "complex", duration: 2, targets: "self", effects: [{ type: "modifyChakraCost", chakra: { neutralChakra: -1 }, targets: "self", skillIds: ["sand-coffin"] }] }
      ],
      cooldown: 2,
      family:["chakra","instant"]
    },
    {
      id: "sand-armor",
      name: "Armadura de arena",
      chakra: { neutralChakra: 2 },
      targetType: "self",
      description: "La arena forma una armadura alrededor del lanzador. Otorga 35 de escudo. No puede acumularse consigo mismo. Durante 2 turnos, Armadura de arena se reemplaza por Tormenta de arena.",
      effects: [
        { type: "shield", value: 35, targets: "self", isStackable: false },
        { type: "replaceSkill", duration: 2, targets: "self", baseSkillId: "sand-armor", skillId: "sand-storm" }
      ],
      cooldown: 1,
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
    },
    {
      id: "sand-storm",
      name: "Tormenta de arena",
      chakra: { neutralChakra: 1 },
      targetType: "enemies",
      description: "Gaara invoca una tormenta de arena que inflige 20 puntos de daño a todos los enemigos.",
      effects: [{ type: "damage", value: 20, targets: "enemies" }],
      isExtraSkill: true,
      family:["chakra","instant"]
    }

  ]
};
