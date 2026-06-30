export const jotaro = {
  id: "jotaro",
  name: "Jotaro Kujo",
  avatar: "JK",
  maxHp: 100,
  bio: "Jotaro Kujo es un joven de carácter frío e inquebrantable que enfrenta cualquier amenaza con una calma absoluta. La fuerza descomunal, la velocidad y la precisión de su Stand Star Platinum, junto con su excepcional instinto de combate, lo convierten en uno de los guerreros más temibles.",
  deathSound: { soundname: "jotaro", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "ora-ora-ora",
      name: "ORA ORA ORA",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Star Platinum golpea a un enemigo. Inflige 10 de dano adicional solo a escudos e inflige 15 de dano durante 3 turnos. Con Star Platinum activo inflige 10 adicional por turno y no puede ser contrarrestada. Puede ser interrumpida.",
      effects: [
        {
          type: "complex",
          duration: 3,
          targets: "self",
          mode: "interruptible",
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "ora-ora-ora",
          showStatusEffect: true,
          descriptions: ["ORA ORA ORA puede ser interrumpida."]
        },
        {
          type: "complex",
          duration: 3,
          targets: "target",
          cancelIfOriginStunned: true,
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "ora-ora-ora",
          effects: [
            { type: "shieldDamage", value: 10, targets: "self" },
            { type: "damage", value: 15, targets: "self" }
          ]
        }
      ],
      cooldown: 3,
      family: ["physical", "offensive", "channeled"]
    },
    {
      id: "star-finger",
      name: "Star Finger",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Star Platinum atraviesa defensas. Rompe los escudos del oponente, inflige 30 de daño perforante e ignora invulnerabilidad. Con Star Platinum activo inflige 15 adicional y no puede ser contrarrestada.",
      effects: [
        { type: "breakShield", value: 1, targets: "target", ignoreInvulnerable: true },
        { type: "damage", value: 30, damageType: "piercing", targets: "target", ignoreInvulnerable: true }
      ],
      cooldown: 1,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "stand-star-platinum",
      name: "Stand: Star Platinum",
      chakra: { taijutsu: 1, bloodline: 1 },
      targetType: "self",
      description: "Jotaro invoca Star Platinum durante 3 turnos, obtiene 35% de reduccion de daño, mejora ORA ORA ORA y Star Finger en 10, y reemplaza esta habilidad por Star Platinum: The World.",
      effects: [
        { type: "damage-reduction", value: 25, percent: true, duration: 3, targets: "self" },
        { type: "modifyDamage", value: 10, duration: 3, targets: "self", skillIds: ["ora-ora-ora", "star-finger"] },
        { type: "addUncountereable", duration: 3, targets: "self", skillIds: ["ora-ora-ora", "star-finger"] },
        { type: "replaceSkill", duration: 3, targets: "self", baseSkillId: "stand-star-platinum", skillId: "star-platinum-the-world" }
      ],
      cooldown: 3,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "star-platinum-block",
      name: "Star Platinum Block",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Star Platinum intercepta ataques y vuelve invulnerable a Jotaro durante 1 turno. Pasiva: Jotaro es inmune al aturdimiento provocado por The World de Dio Brando.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    },
    {
      id: "jotaro-time-stop-immunity",
      name: "Inmunidad de Star Platinum",
      passive: true,
      startsActive: true,
      chakra: {},
      targetType: "self",
      description: "Jotaro ignora 1 aturdimiento provocado por The World de Dio Brando.",
      effects: [{ type: "stunImmunity", value: 1, duration: -1, targets: "self", skillIds: ["the-world", "star-platinum-the-world"], showStatusEffect: false }],
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "star-platinum-the-world",
      name: "Star Platinum: The World",
      chakra: { bloodline: 2 },
      targetType: "allPlayers",
      description: "Jotaro detiene el tiempo. No puede ser contrarrestada ni reflejada. Todos excepto Jotaro quedan aturdidos durante 2 turnos. Durante este tiempo, los enemigos aturdidos por esta habilidad reciben doble daño de Jotaro",
      effects: [
        { type: "stun", value: 2, targets: ["allies", "enemies"] },
        {
          type: "modifyDamageMultiplier",
          multiplier: 2,
          duration: 2,
          targets: "self",
          targetStatus: { type: "stun", sourceSkillId: "star-platinum-the-world", originCharacterId: "jotaro" },
          statusSourceSkillId: "star-platinum-the-world-damage-window",
          statusSourceSkillName: "Star Platinum: The World",
          statusIconSkillId: "star-platinum-the-world",
          descriptions: ["Los enemigos aturdidos por Star Platinum: The World reciben doble daño de las habilidades de Jotaro."]
        }
      ],
      uncountereable: true,
      nonReflectable: true,
      isExtraSkill: true,
      hideUntilReplaced: true,
      cooldown: 4,
      family: ["special", "offensive", "instant"]
    }
  ]
};
