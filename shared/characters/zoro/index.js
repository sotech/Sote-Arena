const stanceSourceIds = ["zoro-ittoryu", "zoro-nitoryu", "zoro-santoryu"];

const clearStances = {
  type: "removeStatus",
  value: 1,
  targets: "self",
  statusSourceSkillIds: stanceSourceIds
};

const ittoryuEffects = [
  clearStances,
  {
    type: "damage-reduction",
    value: 20,
    percent: true,
    duration: -1,
    targets: "self",
    statusSourceSkillId: "zoro-ittoryu",
    statusSourceSkillName: "Ittoryu",
    descriptions: ["Ittoryu: Zoro reduce el dano recibido en 20%."]
  }
];

const nitoryuEffects = [
  clearStances,
  {
    type: "damage-reduction",
    value: 15,
    duration: -1,
    targets: "self",
    statusSourceSkillId: "zoro-nitoryu",
    statusSourceSkillName: "Nitoryu",
    descriptions: ["Nitoryu: Zoro reduce el dano recibido en 15 puntos."]
  },
  {
    type: "spike",
    value: 10,
    damageType: "piercing",
    duration: -1,
    targets: "self",
    statusSourceSkillId: "zoro-nitoryu",
    statusSourceSkillName: "Nitoryu",
    descriptions: ["Nitoryu: si Zoro recibe dano de vida, devuelve 10 de dano perforante al atacante."]
  }
];

const santoryuEffects = [
  clearStances,
  {
    type: "modifyDamage",
    value: 20,
    duration: -1,
    targets: "self",
    statusSourceSkillId: "zoro-santoryu",
    statusSourceSkillName: "Santoryu",
    descriptions: ["Santoryu: Zoro inflige 35 de daño con Filo del Rey del Infierno."]
  }
];

const consumeEnmaEffect = {
  type: "removeStatus",
  value: 1,
  targets: "self",
  statusSourceSkillIds: ["enma-release"],
  descriptions: ["Liberacion de Enma se consume al usar Filo del Rey del Infierno."]
};

export const zoro = {
  id: "zoro",
  name: "Roronoa Zoro",
  avatar: "RZ",
  maxHp: 100,
  bio: "Roronoa Zoro es un espadachín legendario cuyo Santoryu y voluntad inquebrantable lo convierten en una fuerza imparable. En Wano domina la espada Enma y desafía a los enemigos más poderosos sin retroceder un solo paso.",
  skills: [
    {
      id: "sword-style-stance",
      name: "Estilo de Espadas",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Zoro cambia su postura en orden ciclico: Ittoryu reduce el dano recibido en 20%, Nitoryu reduce 15 puntos y devuelve 10 de dano perforante al atacante, Santoryu aumenta el dano infligido en 20.",
      effects: [{
        type: "conditionalEffects",
        value: 1,
        targets: "self",
        cases: [
          {
            condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-ittoryu" },
            effects: nitoryuEffects
          },
          {
            condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-nitoryu" },
            effects: santoryuEffects
          },
          {
            condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-santoryu" },
            effects: ittoryuEffects
          },
          {
            when: "default",
            effects: ittoryuEffects
          }
        ]
      }],
      cooldown: 0,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "enma-release",
      name: "Liberacion de Enma",
      chakra: { ninjutsu: 1 },
      targetType: "self",
      description: "Zoro se inflige 5 de dano sin poder morir por ese dano. El efecto permanece hasta usar Filo del Rey del Infierno. Ese Filo gana un efecto segun su postura: Ittoryu suma 10 e ignora invulnerabilidad, Nitoryu suma 10 y aturde 1 turno, Santoryu golpea a todos los enemigos.",
      effects: [
        { type: "payLife", value: 5, targets: "self", notKill: true },
        {
          type: "addEffectToBase",
          duration: -1,
          targets: "self",
          skillIds: ["king-of-hell-blade"],
          effects: [consumeEnmaEffect],
          descriptions: ["Liberacion de Enma permanece hasta usar Filo del Rey del Infierno."]
        },
        {
          type: "conditionalEffects",
          value: 1,
          targets: "self",
          cases: [
            {
              condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-nitoryu" },
              effects: [{
                type: "replaceEffects",
                duration: -1,
                targets: "self",
                skillIds: ["king-of-hell-blade"],
                effects: [
                  { type: "damage", value: 30, damageType: "piercing", targets: "target" },
                  { type: "stun", value: 1, targets: "target" }
                ],
                descriptions: ["Enma: Filo del Rey del Infierno suma 10 de dano y aturde 1 turno."]
              }]
            },
            {
              condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-santoryu" },
              effects: [
                {
                  type: "modifyTargetType",
                  duration: -1,
                  targets: "self",
                  skillIds: ["king-of-hell-blade"],
                  targetType: "enemies",
                  descriptions: ["Enma: Filo del Rey del Infierno golpea a todos los enemigos."]
                }
              ]
            },
            {
              when: "default",
              effects: [{
                type: "replaceEffects",
                duration: -1,
                targets: "self",
                skillIds: ["king-of-hell-blade"],
                effects: [{ type: "damage", value: 35, targets: "target", ignoreInvulnerable: true }],
                descriptions: ["Enma: Filo del Rey del Infierno suma 10 de dano e ignora invulnerabilidad."]
              }]
            }
          ]
        }
      ],
      cooldown: 0,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "king-of-hell-blade",
      name: "Filo del Rey del Infierno",
      chakra: { taijutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Zoro ataca con su estilo actual. Ittoryu inflige 25 de dano normal, Nitoryu inflige 20 de dano perforante y Santoryu inflige 35 de dano normal.",
      effects: [{
        type: "conditionalEffects",
        value: 1,
        targets: "target",
        cases: [
          {
            condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-nitoryu" },
            effects: [{ type: "damage", value: 20, damageType: "piercing", targets: "target" }]
          },
          {
            condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-santoryu" },
            effects: [{ type: "damage", value: 15, targets: "target" }]
          },
          {
            when: "default",
            effects: [{ type: "damage", value: 25, targets: "target" }]
          }
        ]
      }],
      cooldown: 1,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "zoro-defense",
      name: "Defensa de Zoro",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Zoro se vuelve invulnerable por 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    },
    {
      id: "zoro-start-ittoryu",
      name: "Ittoryu",
      passive: true,
      startsActive: true,
      chakra: {},
      targetType: "self",
      description: "Zoro empieza el combate en Ittoryu, reduciendo el dano recibido en 20%.",
      effects: ittoryuEffects,
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["physical", "strategic", "instant"]
    }
  ]
};
