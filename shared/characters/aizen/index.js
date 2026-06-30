export const aizen = {
  id: "aizen",
  name: "Aizen Sosuke",
  avatar: "AS",
  bio: `Aizen Sosuke es uno de los antagonistas más inteligentes y manipuladores, 
  un estratega brillante que oculta sus verdaderas intenciones tras una apariencia serena y confiable. 
  Su inmenso poder espiritual, el dominio absoluto de su hipnosis perfecta y su ambición de trascender 
  los límites de los Shinigami lo convierten en una de las mayores amenazas.`,
  maxHp: 100,
  skills: [
    {
      id: "flash-step-massacre",
      name: "Masacre paso flash",
      chakra: { genjutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Aizen marca a un enemigo. Durante 1 turno Aizen sera invulnerable. En el siguiente turno ese enemigo recibira 30 de daño perforante que ignora invulnerabilidad.",
      effects: [
        { type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] },
        {
          type: "complex",
          duration: 1,
          targets: "target",
          isSecret: true,
          activationDelayTurns: 1,
          suppressSecretEndNotice: true,
          descriptions: ["Este personaje fue marcado por Masacre paso flash y recibira 30 de dano perforante."],
          effects: [{ type: "damage", value: 30, targets: "self", damageType: "piercing", ignoreInvulnerable: true }]
        }
      ],
      cooldown: 2,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "kyouka-suijetsu-scatter",
      name: "Dispersate, Kyouka Suijetsu",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemy",
      isSecret: true,
      description: "Aizen marca a un enemigo. Durante 1 turno, la siguiente habilidad que use ese enemigo sera contrarrestada y un enemigo al azar recibira 20 de daño perforante que ignora invulnerabilidad. Esta habilidad es secreta.",
      effects: [
        { type: "complex", duration: 1, targets: "self", showStatusEffect: true, effects: [] },
        {
          type: "counter",
          duration: 1,
          targets: "target",
          trigger: "outgoing",
          familiesAffected: ["offensive"],
          charges: 1,
          effects: [{
            type: "damage",
            value: 20,
            targets: "enemies",
            damageType: "piercing",
            ignoreInvulnerable: true,
            randomTargetCount: 1,
            statusNoticeDescription: "Este objetivo recibio dano de Dispersate, Kyouka Suijetsu de Aizen."
          }]
        }
      ],
      cooldown: 2,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "hado-90-black-coffin",
      name: "Hado 90: Cofre negro",
      chakra: { ninjutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Aizen aturde a un objetivo por 2 turnos. Por 2 turnos, el objetivo recibe 20 de daño. Esta habilidad puede ser cancelada si Aizen es aturdido.",
      effects: [
        {
          type: "complex",
          duration: 2,
          targets: "self",
          mode: "cancelable",
          interruptFamilies: ["special", "instant"],
          statusLinkId: "hado-90-black-coffin",
          showStatusEffect: true,
          descriptions: ["Hado 90: Cofre negro puede ser cancelado si Aizen es aturdido."],
          effects: []
        },
        {
          type: "complex",
          duration: 2,
          targets: "target",
          interruptFamilies: ["special", "instant"],
          cancelIfOriginStunned: true,
          statusLinkId: "hado-90-black-coffin",
          effects: [
            { type: "stun", value: 2, targets: "self" },
            { type: "damage", value: 20, targets: "self" }
          ]
        }
      ],
      cooldown: 4,
      family: ["special", "offensive", "channeled"]
    },
    {
      id: "false-corpse",
      name: "Cadaver falso",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Aizen se vuelve invulnerable por 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["mental", "strategic", "instant"]
    }
  ]
};
