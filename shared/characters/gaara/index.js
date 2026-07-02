export const gaara = {
  id: "gaara",
  name: "Gaara",
  avatar: "GA",
  bio: "Gaara es un ninja de la Arena que pasó de ser un arma temida a convertirse en un líder respetado gracias a su inquebrantable determinación. Su control absoluto de la arena, su defensa casi impenetrable y el poder del Una Cola lo convierten en un combatiente excepcional.",
  maxHp: 100,
  skills: [
    {
      id: "sand-coffin",
      name: "Ataud de arena",
      cost: { rojo: 1, negro: 1 },
      targetType: "enemy",
      description: `Gaara encierra en arena a su objetivo y lo comprime rompiendo huesos y carne. 
                    Inflige 30 de daño a un enemigo y lo aturde 1 turno.`,
      effects: [
        { type: "damage", value: 30, targets: "target" },
        { type: "complex", duration: 1, targets: "target", effects: [{ type: "stun", value: 1, targets: "self" }] }
      ],
      cooldown: 1,
      family:["physical","offensive","instant"]
    },
    {
      id: "sand-shield",
      name: "Escudo de arena",
      cost: { rojo: 1, blanco: 1 },
      targetType: "allies",
      description: "La arena protectora envuelve a todos los aliados. Otorga 15 de escudo a todos los aliados. No puede acumularse consigo mismo. Durante 2 turnos, Ataud de arena cuesta 1 chakra neutral menos.",
      effects: [
        { type: "shield", value: 15, targets: "target", isStackable: false },
        { type: "complex", duration: 2, targets: "self", effects: [{ type: "modifyChakraCost", chakra: { negro: -1 }, targets: "self", skillIds: ["sand-coffin"] }] }
      ],
      cooldown: 2,
      family:["physical","strategic","instant"]
    },
    {
      id: "sand-armor",
      name: "Armadura de arena",
      cost: { negro: 2 },
      targetType: "self",
      description: "La arena forma una armadura alrededor del lanzador. Otorga 35 de escudo. No puede acumularse consigo mismo. Durante 2 turnos, Armadura de arena se reemplaza por Tormenta de arena.",
      effects: [
        { type: "shield", value: 35, targets: "self", isStackable: false },
        { type: "replaceSkill", duration: 2, targets: "self", baseSkillId: "sand-armor", skillId: "sand-storm" }
      ],
      cooldown: 1,
      family:["physical","strategic", "instant"]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      cost: { negro: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family:["physical","strategic","instant"]
    },
    {
      id: "sand-storm",
      name: "Tormenta de arena",
      cost: { negro: 2 },
      targetType: "enemies",
      description: "Gaara invoca una tormenta de arena que inflige 20 puntos de daño a todos los enemigos.",
      effects: [{ type: "damage", value: 20, targets: "enemies" }],
      isExtraSkill: true,
      family:["special","offensive", "instant"],
    }

  ]
};
