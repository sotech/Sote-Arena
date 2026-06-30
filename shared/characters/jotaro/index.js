export const jotaro = {
  id: "jotaro",
  name: "Jotaro Kujo",
  avatar: "JK",
  maxHp: 100,
  deathSound: { soundname: "jotaro", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "ora-ora-ora",
      name: "ORA ORA ORA",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Star Platinum golpea a un enemigo. Rompe escudos e inflige 15 de dano durante 3 turnos. Con Star Platinum activo inflige 10 adicional por turno y no puede ser contrarrestada. Puede ser interrumpida.",
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
            { type: "breakShield", value: 1, targets: "self" },
            { type: "damage", value: 15, targets: "self" }
          ]
        }
      ],
      cooldown: 3,
      family: ["physical", "channeled", "offensive"]
    },
    {
      id: "star-finger",
      name: "Star Finger",
      chakra: { bloodline: 1 },
      targetType: "enemy",
      description: "Star Platinum atraviesa defensas. Inflige 25 de dano perforante e ignora invulnerabilidad. Con Star Platinum activo inflige 10 adicional y no puede ser contrarrestada.",
      effects: [
        { type: "breakShield", value: 1, targets: "target", ignoreInvulnerable: true },
        { type: "damage", value: 25, damageType: "piercing", targets: "target", ignoreInvulnerable: true }
      ],
      cooldown: 1,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "stand-star-platinum",
      name: "Stand: Star Platinum",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "self",
      description: "Jotaro invoca Star Platinum durante 2 turnos, obtiene 25% de reduccion de dano, mejora ORA ORA ORA y Star Finger en 10, y reemplaza esta habilidad por Star Platinum: The World.",
      effects: [
        { type: "damage-reduction", value: 25, percent: true, duration: 2, targets: "self" },
        { type: "modifyDamage", value: 10, duration: 2, targets: "self", skillIds: ["ora-ora-ora", "star-finger"] },
        { type: "addUncountereable", duration: 2, targets: "self", skillIds: ["ora-ora-ora", "star-finger"] },
        { type: "replaceSkill", duration: 2, targets: "self", baseSkillId: "stand-star-platinum", skillId: "star-platinum-the-world" }
      ],
      cooldown: 3,
      family: ["strategic", "instant"]
    },
    {
      id: "star-platinum-block",
      name: "Star Platinum Block",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Star Platinum intercepta ataques y vuelve invulnerable a Jotaro durante 1 turno. Pasiva: Jotaro es inmune al aturdimiento provocado por The World de Dio Brando.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["strategic", "instant"]
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
      family: ["strategic", "instant"]
    },
    {
      id: "star-platinum-the-world",
      name: "Star Platinum: The World",
      chakra: { bloodline: 3 },
      targetType: "allPlayers",
      description: "Jotaro detiene el tiempo. No puede ser contrarrestada ni reflejada. Todos excepto Jotaro quedan aturdidos durante 1 turno. ORA ORA ORA gana 10 de dano y Star Finger gana 20 de dano.",
      effects: [
        { type: "stun", value: 1, targets: ["allies", "enemies"] },
        {
          type: "modifyDamage",
          value: 10,
          duration: 1,
          targets: "self",
          skillIds: ["ora-ora-ora"],
          statusSourceSkillId: "star-platinum-world-ora",
          statusSourceSkillName: "Star Platinum: The World",
          statusIconSkillId: "star-platinum-the-world",
          descriptions: ["ORA ORA ORA y Star Finger duplican su dano."]
        },
        {
          type: "modifyDamage",
          value: 20,
          duration: 1,
          targets: "self",
          skillIds: ["star-finger"],
          statusSourceSkillId: "star-platinum-world-finger",
          statusSourceSkillName: "Star Platinum: The World",
          statusIconSkillId: "star-platinum-the-world",
          descriptions: ["ORA ORA ORA y Star Finger duplican su dano."]
        }
      ],
      uncountereable: true,
      nonReflectable: true,
      isExtraSkill: true,
      hideUntilReplaced: true,
      cooldown: 4,
      family: ["instant"]
    }
  ]
};
