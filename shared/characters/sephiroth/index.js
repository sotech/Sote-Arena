export const sephiroth = {
  id: "sephiroth",
  name: "Sephiroth",
  avatar: "SP",
  maxHp: 100,
  bio: "Sephiroth es un legendario espadachín de habilidad incomparable cuya fría determinación oculta una ambición capaz de poner en peligro al mundo entero. Su dominio absoluto de la Masamune, su inmenso poder sobrenatural y la influencia de Jenova lo convierten en uno de los enemigos más temibles jamás conocidos.",
  deathSound: { soundname: "sephiroth", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "masamune",
      name: "Masamune",
      cost: { rojo: 1 },
      targetType: "enemy",
      description: "Sephiroth atraviesa al enemigo con la Masamune. Inflige 25 de daño perforante",
      effects: [        
        { type: "damage", value: 25, damageType: "piercing", targets: "target" }
      ],
      cooldown: 3,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "supernova",
      name: "Supernova",
      cost: { rojo: 2 },
      targetType: "enemies",
      description: "Sephiroth invoca una catastrofe cosmica. Inflige 20 de daño a todos los enemigos y reduce su daño en -10 durante 2 turnos.",
      effects: [
        { type: "damage", value: 20, targets: "target" },
        { type: "modifyDamage", value: -10, duration: 2, targets: "target" }
      ],
      cooldown: 1,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "black-feather",
      name: "Pluma negra",
      passive: true,
      startsActive: true,
      cost: {},
      targetType: "self",
      description: "Cada vez que muere un enemigo, Sephiroth obtiene una Pluma Negra. Cada acumulacion otorga 25% de reduccion de dano, aumenta Masamune en 15 y aumenta Supernova en 20. Maximo: 2 acumulaciones.",
      effects: [{
        type: "onEnemyDeath",
        duration: -1,
        targets: "self",
        showStatusEffect: false,
        effects: [
          {
            type: "damage-reduction",
            value: 15,
            percent: true,
            duration: -1,
            targets: "self",
            isStackable: true,
            stackCount: 1,
            maxStacks: 2,
            statusSourceSkillId: "black-feather",
            statusSourceSkillName: "Pluma negra",
            statusIconSkillId: "black-feather",
            descriptions: ["Cada Pluma Negra otorga 25% de reduccion de dano, aumenta Masamune en 10 y aumenta Supernova en 10."]
          },
          {
            type: "modifyDamage",
            value: 10,
            duration: -1,
            targets: "self",
            skillIds: ["masamune"],
            isStackable: true,
            stackCount: 1,
            maxStacks: 2,
            statusSourceSkillId: "black-feather-masamune",
            statusSourceSkillName: "Pluma negra",
            statusIconSkillId: "black-feather",
            descriptions: ["Cada Pluma Negra otorga 25% de reduccion de dano, aumenta Masamune en 10 y aumenta Supernova en 10."]
          },
          {
            type: "modifyDamage",
            value: 10,
            duration: -1,
            targets: "self",
            skillIds: ["supernova"],
            isStackable: true,
            stackCount: 1,
            maxStacks: 2,
            statusSourceSkillId: "black-feather-supernova",
            statusSourceSkillName: "Pluma negra",
            statusIconSkillId: "black-feather",
            descriptions: ["Cada Pluma Negra otorga 25% de reduccion de dano, aumenta Masamune en 10 y aumenta Supernova en 10."]
          }
        ]
      }],
      family: ["special", "strategic", "instant"]
    },
    {
      id: "jenova-cells",
      name: "Celulas Jenova",
      cost: { negro: 1 },
      targetType: "self",
      description: "Sephiroth se vuelve invulnerable durante 1 turno. Pasiva: la primera vez que llega a 0 HP, queda en 1 HP, limpia efectos negativos y obtiene invulnerabilidad durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    },
    {
      id: "jenova-cells-passive",
      name: "Celulas Jenova pasiva",
      passive: true,
      startsActive: true,
      cost: {},
      targetType: "self",
      description: "La primera vez que Sephiroth llega a 0 HP, queda en 1 HP, elimina efectos negativos y obtiene invulnerabilidad por 1 turno.",
      effects: [{ type: "reviveOnDeath", value: 1, hp: 1, duration: -1, targets: "self", invulnerableTurns: 1 }],
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["special", "strategic", "instant"]
    }
  ]
};
