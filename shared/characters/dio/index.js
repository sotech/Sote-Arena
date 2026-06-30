export const dio = {
  id: "dio",
  name: "Dio Brando",
  avatar: "DB",
  maxHp: 100,
  deathSound: { soundname: "dio", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "muda-muda-muda",
      name: "MUDA MUDA MUDA",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "The World golpea a un enemigo. Inflige 15 de dano durante 3 turnos. Puede ser interrumpida.",
      effects: [
        {
          type: "complex",
          duration: 3,
          targets: "self",
          mode: "interruptible",
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "muda-muda-muda",
          showStatusEffect: true,
          descriptions: ["MUDA MUDA MUDA puede ser interrumpida."]
        },
        {
          type: "complex",
          duration: 3,
          targets: "target",
          cancelIfOriginStunned: true,
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "muda-muda-muda",
          effects: [{ type: "damage", value: 15, targets: "self" }]
        }
      ],
      cooldown: 1,
      family: ["physical", "channeled", "offensive"]
    },
    {
      id: "blood-transfer",
      name: "Transferencia de Sangre",
      chakra: { bloodline: 1 },
      targetType: "anyCharacter",
      description: `Dio absorbe la sangre de cualquiera que lo rodee. 
      Si el objetivo es enemigo, hace 15 de daño de afliccion, Dio recupera 15 de vida y MUDA MUDA MUDA inflige 10 dano adicional durante 2 turnos. 
      Si es aliado, hace 15 de daño de afliccion, Dio recupera 25 de vida y MUDA MUDA MUDA inflige 15 dano adicional durante 2 turnos. 
      .`,
      requires: [{ scope: "target", type: "characterId", operator: "ne", value: "dio", message: "Transferencia de Sangre no puede usarse sobre Dio." }],
      effects: [{
        type: "conditionalEffects",
        value: 1,
        targets: "target",
        cases: [
          {
            relation: "enemy",
            effects: [
              { type: "damage", value: 15, damageType: "affliction", targets: "target" },
              { type: "self-heal", value: 15, targets: "self" },
              { type: "modifyDamage", value: 10, duration: 2, targets: "self", skillIds: ["muda-muda-muda"] }
            ]
          },
          {
            relation: "ally",
            effects: [
              { type: "damage", value: 15, damageType: "affliction", targets: "target" },
              { type: "self-heal", value: 25, targets: "self" },
              { type: "modifyDamage", value: 15, duration: 2, targets: "self", skillIds: ["muda-muda-muda"] }
            ]
          }
        ]
      }],
      cooldown: 2,
      family: ["strategic", "offensive", "instant"]
    },
    {
      id: "stand-the-world",
      name: "Stand: The World",
      chakra: { bloodline: 2 },
      targetType: "self",
      description: "Dio invoca The World durante 3 turnos, obtiene 35% de reduccion de dano, MUDA MUDA MUDA es reemplazada por Perfora Abdomen y esta habilidad por The World.",
      effects: [
        { type: "damage-reduction", value: 35, percent: true, duration: 3, targets: "self" },
        { type: "replaceSkill", duration: 3, targets: "self", baseSkillId: "muda-muda-muda", skillId: "abdomen-pierce" },
        { type: "replaceSkill", duration: 3, targets: "self", baseSkillId: "stand-the-world", skillId: "the-world" }
      ],
      cooldown: 4,
      family: ["strategic", "instant"]
    },
    {
      id: "defense-the-world",
      name: "Defensa: The World",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "The World intercepta ataques y vuelve invulnerable a Dio durante 1 turno. Dio es inmune al aturdimiento provocado por Star Platinum: The World.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "instant"]
    },
    {
      id: "dio-time-stop-immunity",
      name: "Inmunidad de The World",
      passive: true,
      startsActive: true,
      chakra: {},
      targetType: "self",
      description: "Dio ignora 1 aturdimiento provocado por Star Platinum: The World.",
      effects: [{ type: "stunImmunity", value: 1, duration: -1, targets: "self", skillIds: ["star-platinum-the-world", "the-world"], showStatusEffect: false }],
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["strategic", "instant"]
    },
    {
      id: "the-world",
      name: "The World",
      chakra: { bloodline: 2 },
      targetType: "allPlayers",
      description: "Dio detiene el tiempo. Todos excepto Dio quedan aturdidos durante 1 turnos.",
      effects: [{ type: "stun", value: 1, targets: ["allies", "enemies"] }],
      uncountereable: true,
      nonReflectable: true,
      isExtraSkill: true,
      hideUntilReplaced: true,
      cooldown: 3,
      family: ["strategic", "offensive"]
    },
    {
      id: "abdomen-pierce",
      name: "Perfora Abdomen",
      chakra: { taijutsu: 1},
      targetType: "enemy",
      description: "The World atraviesa violentamente el abdomen del enemigo. Inflige 50 de dano. No puede ser contrarrestada ni reflejada.",
      effects: [{ type: "damage", value: 50, targets: "target" }],
      uncountereable: true,
      nonReflectable: true,
      isExtraSkill: true,
      hideUntilReplaced: true,
      family: ["physical", "offensive", "instant"]
    }
  ]
};
