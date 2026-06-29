export const aizen = {
  id: "aizen",
  name: "Aizen Sosuke",
  avatar: "AS",
  maxHp: 100,
  skills: [
    {
      id: "flash-step-massacre",
      name: "Masacre paso flash",
      chakra: { genjutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Aizen marca a un enemigo. Durante 1 turno Aizen sera invulnerable. En el siguiente turno ese enemigo recibira 35 de dano perforante que ignora invulnerabilidad.",
      effects: [
        { type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] },
        {
          type: "complex",
          duration: 1,
          targets: "target",
          isSecret: true,
          activationDelayTurns: 1,
          suppressSecretEndNotice: true,
          effects: [{ type: "damage", value: 35, targets: "self", damageType: "piercing", ignoreInvulnerable: true }]
        }
      ],
      cooldown: 1,
      family: ["physical", "instant", "offensive"]
    },
    {
      id: "kyouka-suijetsu-scatter",
      name: "Dispersate, Kyouka Suijetsu",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemy",
      isSecret: true,
      description: "Aizen marca a un enemigo. Durante 1 turno, la siguiente habilidad que use ese enemigo sera contrarrestada y un enemigo al azar recibira 30 de dano perforante que ignora invulnerabilidad. Esta habilidad es secreta.",
      effects: [
        { type: "complex", duration: 1, targets: "self", showStatusEffect: true, effects: [] },
        {
          type: "counter",
          duration: 1,
          targets: "target",
          trigger: "outgoing",
          charges: 1,
          effects: [{
            type: "damage",
            value: 30,
            targets: "enemies",
            damageType: "piercing",
            ignoreInvulnerable: true,
            randomTargetCount: 1,
            statusNoticeDescription: "Este objetivo recibio dano de Dispersate, Kyouka Suijetsu de Aizen."
          }]
        }
      ],
      cooldown: 2,
      family: ["mental", "instant"]
    },
    {
      id: "hado-90-black-coffin",
      name: "Hado 90: Cofre negro",
      chakra: { ninjutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Aizen aturde a un objetivo por 2 turnos. Por 2 turnos, el objetivo recibe 25 de dano. Esta habilidad puede ser cancelada si Aizen es aturdido.",
      effects: [
        { type: "complex", duration: 2, targets: "self", mode: "cancelable", interruptFamilies: ["chakra", "instant"], statusLinkId: "hado-90-black-coffin", showStatusEffect: true, effects: [] },
        {
          type: "complex",
          duration: 2,
          targets: "target",
          interruptFamilies: ["chakra", "instant"],
          cancelIfOriginStunned: true,
          statusLinkId: "hado-90-black-coffin",
          effects: [
            { type: "stun", value: 2, targets: "self" },
            { type: "damage", value: 25, targets: "self" }
          ]
        }
      ],
      cooldown: 3,
      family: ["chakra", "instant", "offensive"]
    },
    {
      id: "false-corpse",
      name: "Cadaver falso",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Aizen se vuelve invulnerable por 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["mental", "instant"]
    }
  ]
};
