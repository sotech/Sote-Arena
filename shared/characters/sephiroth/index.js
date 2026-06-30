export const sephiroth = {
  id: "sephiroth",
  name: "Sephiroth",
  avatar: "SP",
  maxHp: 100,
  deathSound: { soundname: "sephiroth", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "masamune",
      name: "Masamune",
      chakra: { bloodline: 1 },
      targetType: "enemy",
      description: "Sephiroth atraviesa al enemigo con la Masamune. Inflige 15 de dano perforante durante 2 turnos. Puede ser interrumpida.",
      effects: [
        {
          type: "complex",
          duration: 2,
          targets: "self",
          mode: "interruptible",
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "masamune",
          showStatusEffect: true,
          descriptions: ["Masamune puede ser interrumpida."]
        },
        {
          type: "complex",
          duration: 2,
          targets: "target",
          cancelIfOriginStunned: true,
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "masamune",
          effects: [{ type: "damage", value: 15, damageType: "piercing", targets: "self" }]
        }
      ],
      cooldown: 3,
      family: ["physical", "channeled", "offensive"]
    },
    {
      id: "supernova",
      name: "Supernova",
      chakra: { bloodline: 2 },
      targetType: "enemies",
      description: "Sephiroth invoca una catastrofe cosmica. Inflige 20 de dano a todos los enemigos y reduce su dano en -10 durante 2 turnos.",
      effects: [
        { type: "damage", value: 20, targets: "target" },
        { type: "modifyDamage", value: -10, duration: 2, targets: "target" }
      ],
      cooldown: 1,
      family: ["special", "instant", "offensive"]
    },
    {
      id: "black-feather",
      name: "Pluma negra",
      passive: true,
      startsActive: true,
      chakra: {},
      targetType: "self",
      description: "Pasiva: cada vez que muere un enemigo, Sephiroth obtiene una Pluma Negra durante 2 turnos. Cada acumulacion otorga 10 de reduccion de dano, aumenta Masamune en 10 y aumenta Supernova en 20. Maximo: 2 acumulaciones.",
      effects: [{
        type: "onEnemyDeath",
        duration: -1,
        targets: "self",
        showStatusEffect: false,
        effects: [
          {
            type: "damage-reduction",
            value: 10,
            duration: 2,
            targets: "self",
            isStackable: true,
            stackCount: 1,
            statusSourceSkillId: "black-feather",
            statusSourceSkillName: "Pluma negra",
            statusIconSkillId: "black-feather",
            descriptions: ["Cada Pluma Negra otorga 10 de reduccion de dano, aumenta Masamune en 10 y aumenta Supernova en 20."]
          },
          {
            type: "modifyDamage",
            value: 10,
            duration: 2,
            targets: "self",
            skillIds: ["masamune"],
            isStackable: true,
            statusSourceSkillId: "black-feather-masamune",
            statusSourceSkillName: "Pluma negra",
            statusIconSkillId: "black-feather",
            descriptions: ["Cada Pluma Negra otorga 10 de reduccion de dano, aumenta Masamune en 10 y aumenta Supernova en 20."]
          },
          {
            type: "modifyDamage",
            value: 20,
            duration: 2,
            targets: "self",
            skillIds: ["supernova"],
            isStackable: true,
            statusSourceSkillId: "black-feather-supernova",
            statusSourceSkillName: "Pluma negra",
            statusIconSkillId: "black-feather",
            descriptions: ["Cada Pluma Negra otorga 10 de reduccion de dano, aumenta Masamune en 10 y aumenta Supernova en 20."]
          }
        ]
      }],
      family: ["strategic", "instant"]
    },
    {
      id: "jenova-cells",
      name: "Celulas Jenova",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Sephiroth se vuelve invulnerable durante 1 turno. Pasiva: la primera vez que llega a 0 HP, queda en 1 HP, limpia efectos negativos y obtiene invulnerabilidad durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["strategic", "instant"]
    },
    {
      id: "jenova-cells-passive",
      name: "Celulas Jenova pasiva",
      passive: true,
      startsActive: true,
      chakra: {},
      targetType: "self",
      description: "La primera vez que Sephiroth llega a 0 HP, queda en 1 HP, elimina efectos negativos y obtiene invulnerabilidad por 1 turno.",
      effects: [{ type: "reviveOnDeath", value: 1, hp: 1, duration: -1, targets: "self", invulnerableTurns: 1 }],
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["strategic", "instant"]
    }
  ]
};
