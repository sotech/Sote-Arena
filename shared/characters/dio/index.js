export const dio = {
  id: "dio",
  name: "Dio Brando",
  avatar: "DB",
  maxHp: 100,
  bio: "Dio Brando es un enemigo despiadado y carismático cuya ambición desmedida lo impulsa a dominar a cualquiera que se cruce en su camino. Su naturaleza vampírica, el poder de su Stand The World y su capacidad para detener el tiempo lo convierten en uno de los adversarios más temibles.",
  deathSound: { soundname: "dio", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "muda-muda-muda",
      name: "MUDA MUDA MUDA",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "The World golpea a un enemigo con una rafaga de golpes. Inflige 15 de daño durante 3 turnos. Con Stand: The World activo inflige 10 adicional por turno. Puede ser interrumpida.",
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
      family: ["physical", "offensive", "channeled"]
    },
    {
      id: "blood-transfer",
      name: "Transferencia de Sangre",
      chakra: { bloodline: 1 },
      targetType: "anyCharacter",
      description: `Dio absorbe la sangre de cualquiera que lo rodee. 
      Si el objetivo es enemigo, hace 20 de daño de afliccion, Dio recupera 15 de vida y MUDA MUDA MUDA inflige 10 daño adicional durante 3 turnos. 
      Si es aliado, hace 20 de daño de afliccion, Dio recupera 25 de vida y MUDA MUDA MUDA inflige 15 daño adicional durante 3 turnos. 
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
              { type: "damage", value: 20, damageType: "affliction", targets: "target" },
              { type: "self-heal", value: 15, targets: "self" },
              { type: "modifyDamage", value: 10, duration: 3, targets: "self", skillIds: ["muda-muda-muda"] }
            ]
          },
          {
            relation: "ally",
            effects: [
              { type: "damage", value: 20, damageType: "affliction", targets: "target" },
              { type: "self-heal", value: 25, targets: "self" },
              { type: "modifyDamage", value: 15, duration: 3, targets: "self", skillIds: ["muda-muda-muda"] }
            ]
          }
        ]
      }],
      cooldown: 2,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "stand-the-world",
      name: "Stand: The World",
      chakra: { taijutsu: 1, bloodline: 1 },
      targetType: "self",
      description: "Dio invoca The World durante 3 turnos, obtiene 35% de reduccion de daño, MUDA MUDA MUDA es reemplazada por Perfora Abdomen y esta habilidad por The World.",
      effects: [
        { type: "damage-reduction", value: 35, percent: true, duration: 3, targets: "self" },
        { type: "modifyDamage", value: 10, duration: 3, targets: "self", skillIds: ["ora-ora-ora"] },
        { type: "replaceSkill", duration: 3, targets: "self", baseSkillId: "blood-transfer", skillId: "abdomen-pierce" },
        { type: "replaceSkill", duration: 3, targets: "self", baseSkillId: "stand-the-world", skillId: "the-world" }
      ],
      cooldown: 4,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "defense-the-world",
      name: "Defensa: The World",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "The World intercepta ataques y vuelve invulnerable a Dio durante 1 turno. Dio es inmune al aturdimiento provocado por Star Platinum: The World.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
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
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "the-world",
      name: "The World",
      chakra: { bloodline: 2 },
      targetType: "allPlayers",
      description: "Dio detiene el tiempo. Todos excepto Dio quedan aturdidos durante 2 turnos. Durante este tiempo, los enemigos aturdidos por esta habilidad reciben doble daño de Dio",
      effects: [
        { type: "stun", value: 2, targets: ["allies", "enemies"] },
        {
          type: "modifyDamageMultiplier",
          multiplier: 2,
          duration: 2,
          targets: "self",
          targetStatus: { type: "stun", sourceSkillId: "the-world", originCharacterId: "dio" },
          statusSourceSkillId: "the-world-damage-window",
          statusSourceSkillName: "The World",
          statusIconSkillId: "the-world",
          descriptions: ["Los enemigos aturdidos por The World reciben doble daño de las habilidades de Dio."]
        }
      ],
      uncountereable: true,
      nonReflectable: true,
      isExtraSkill: true,
      hideUntilReplaced: true,
      cooldown: 3,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "abdomen-pierce",
      name: "Perfora Abdomen",
      chakra: { taijutsu: 2 },
      targetType: "enemy",
      description: "The World atraviesa violentamente el abdomen del enemigo. Inflige 40 de daño. No puede ser contrarrestada ni reflejada.",
      effects: [{ type: "damage", value: 40, targets: "target" }],
      uncountereable: true,
      nonReflectable: true,
      isExtraSkill: true,
      hideUntilReplaced: true,
      family: ["physical", "offensive", "instant"]
    }
  ]
};
