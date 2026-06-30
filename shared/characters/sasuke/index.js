export const sasuke = {
  id: "sasuke",
  name: "Sasuke Uchiha",
  avatar: "SU",
  bio:"Sasuke Uchiha es un prodigio del clan Uchiha impulsado por su incansable búsqueda de poder y la verdad sobre su pasado. Su dominio del Mangekyō Sharingan, el control de las llamas negras del Amaterasu y su impecable habilidad con la espada lo convierten en uno de los shinobi más letales de su generación.",
  maxHp: 100,
  skills: [
    {
      id: "kusanagi-sword",
      name: "Espada de Kusanagi",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Sasuke inflige 15 de daño perforante a un enemigo por 2 turnos. Esta habilidad puede ser interrumpida. Durante este tiempo cambia a Agarre serpiente.",
      effects: [
        { type: "complex", duration: 2, targets: "target", mode: "interruptible", effects: [{ type: "damage", value: 15, damageType: "piercing", targets: "self" }] },
        { type: "replaceSkill", duration: 2, targets: "self", baseSkillId: "chidori", skillId: "snake-grab" }
      ],
      cooldown: 3,
      family: ["physical", "offensive", "channeled"]
    },
    {
      id: "kirin",
      name: "Kirin",
      chakra: { ninjutsu: 2 },
      targetType: "enemy",
      uncountereable: true,
      nonReflectable: true,
      description: "Sasuke libera una descarga electrica sobre el enemigo. El enemigo recibe 45 daño. No puede ser contrarrestada ni reflejada. Si algun enemigo esta afectado por Espada de Kusanagi, ese enemigo tambien recibira 10 de afliccion que ignora invulnerabilidad, contrarrestar o reflejo.",
      effects: [
        { type: "damage", value: 45, targets: "target" },
        { type: "damage", value: 10, damageType: "affliction", targets: "enemies", ignoreInvulnerable: true, require: { type: "hasStatusEffect", effectId: "kusanagi-sword" } }
      ],
      cooldown: 1,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "mangekyou-sharingan",
      name: "Mangekyou Sharingan",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "self",
      description: "Durante 3 turnos Sasuke gana 50% reduccion de daño. Durante este tiempo esta habilidad es reemplazada por Amaterasu.",
      effects: [
        {
          type: "complex",
          duration: 3,
          targets: "self",
          effects: [
            { type: "damage-reduction", value: 50, percent: true, targets: "self" },
            { type: "replaceSkill", baseSkillId: "mangekyou-sharingan", skillId: "amaterasu", targets: "self" }
          ]
        }
      ],
      cooldown: 4,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "snake-grab",
      name: "Agarre serpiente",
      chakra: {taijutsu: 1},
      targetType: "enemy",
      hideUntilReplaced: true,
      isExtraSkill: true,
      description: "Sasuke lanza serpientes de sus brazos atrapando al enemigo. Un enemigo recibe 10 de daño y queda aturdido 1 turno.",
      effects: [
        { type: "damage", value: 10, targets: "target" },
        { type: "stun", value: 1, targets: "target" }
      ],
      family: ["physical", "offensive", "instant"],
      cooldown: 1
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Sasuke se vuelve invulnerable 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    },
    {
      id: "amaterasu",
      name: "Amaterasu",
      chakra: {ninjutsu: 1, neutralChakra: 1},
      targetType: "enemy",
      hideUntilReplaced: true,
      isExtraSkill: true,
      uncountereable: true,
      nonReflectable: true,
      description: "Sasuke lanza llamas negras dirigidas a un objetivo. El objetivo recibe 15 daño de afliccion por 2 turnos. No puede ser contrarrestado ni reflejado e ignora invulnerabilidad.",
      effects: [
        { type: "complex", duration: 2, targets: "target", effects: [{ type: "damage", value: 15, damageType: "affliction", targets: "self", ignoreInvulnerable: true }] }
      ],
      family: ["special", "offensive", "instant"]
    }
  ]
};
