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
    value: 15,
    percent: true,
    duration: -1,
    targets: "self",
    statusSourceSkillId: "zoro-ittoryu",
    statusSourceSkillName: "Ittoryu",
    descriptions: ["Ittoryu: Zoro reduce el dano recibido en 15%."]
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
  },
  {
    type: "addUncountereable",
    duration: -1,
    targets: "self",
    skillIds: ["king-of-hell-blade"],
    statusSourceSkillId: "zoro-nitoryu",
    statusSourceSkillName: "Nitoryu",
    descriptions: ["Nitoryu: Filo del Rey del Infierno no puede ser contrarrestado."]
  }
];

const santoryuEffects = [
  clearStances,
  {
    type: "substituteChakraCost",
    chakra: { verde: 1, negro: 1 },
    duration: -1,
    targets: "self",
    skillIds: ["king-of-hell-blade"],
    statusSourceSkillId: "zoro-santoryu",
    statusSourceSkillName: "Santoryu",
    descriptions: ["Santoryu: Filo del Rey del Infierno cuesta 1 recurso fisico y 1 neutral."]
  },
  {
    type: "addUncountereable",
    duration: -1,
    targets: "self",
    skillIds: ["king-of-hell-blade"],
    statusSourceSkillId: "zoro-santoryu",
    statusSourceSkillName: "Santoryu",
    descriptions: ["Santoryu: Filo del Rey del Infierno no puede ser contrarrestado."]
  },
  {
    type: "addNonReflectable",
    duration: -1,
    targets: "self",
    skillIds: ["king-of-hell-blade"],
    statusSourceSkillId: "zoro-santoryu",
    statusSourceSkillName: "Santoryu",
    descriptions: ["Santoryu: Filo del Rey del Infierno no puede ser reflejado."]
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
  bio: "Roronoa Zoro es un espadachin legendario cuyo Santoryu y voluntad inquebrantable lo convierten en una fuerza imparable. En Wano domina la espada Enma y desafia a los enemigos mas poderosos sin retroceder un solo paso.",
  skills: [
    {
      id: "sword-style-stance",
      name: "Estilo de Espadas",
      cost: {negro: 1},
      targetType: "self",
      description: "Zoro cambia su postura en orden ciclico: Ittoryu reduce el dano recibido en 15%; Nitoryu reduce 15 puntos, devuelve 10 de dano perforante al atacante y vuelve Filo del Rey del Infierno no contrarrestable; Santoryu hace que Filo del Rey del Infierno cueste 1 fisico y 1 neutral, no sea contrarrestable y no sea reflejable.",
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
      cost: { azul: 1 },
      targetType: "self",
      description: "Zoro se inflige 5 de dano sin poder morir por ese dano. El efecto permanece hasta usar Filo del Rey del Infierno. Ese Filo gana un efecto segun su postura: Ittoryu inflige 35 de dano normal e ignora invulnerabilidad; Nitoryu inflige 40 de dano perforante y aturde 1 turno; Santoryu inflige 40 de dano perforante a todos los enemigos y Zoro recupera 10 salud.",
      requires: [{
        scope: "self",
        type: "hasStatusEffect",
        effectId: "enma-release",
        not: true,
        message: "Liberacion de Enma ya esta activa."
      }],
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
                  { type: "damage", value: 40, damageType: "piercing", targets: "target" },
                  { type: "stun", value: 1, targets: "target" }
                ],
                descriptions: ["Enma: Filo del Rey del Infierno inflige 40 de dano perforante y aturde 1 turno."]
              }]
            },
            {
              condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-santoryu" },
              effects: [{
                type: "replaceEffects",
                duration: -1,
                targets: "self",
                skillIds: ["king-of-hell-blade"],
                effects: [
                  { type: "damage", value: 35, damageType: "piercing", targets: "enemies" },
                  { type: "self-heal", value: 10, targets: "self" }
                ],
                descriptions: ["Enma: Filo del Rey del Infierno inflige 35 de dano perforante a todos los enemigos y Zoro recupera 10 salud."]
              }]
            },
            {
              when: "default",
              effects: [{
                type: "replaceEffects",
                duration: -1,
                targets: "self",
                skillIds: ["king-of-hell-blade"],
                effects: [
                  { type: "damage", value: 35, targets: "target", ignoreInvulnerable: true }
                ],
                descriptions: ["Enma: Filo del Rey del Infierno inflige 35 de dano normal e ignora invulnerabilidad."]
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
      cost: { verde: 1 },
      targetType: "enemy",
      description: "Zoro ataca con su estilo actual. Sin Enma: Ittoryu inflige 20 de dano normal y cuesta 1 recurso fisico; Nitoryu inflige 25 de dano perforante, cuesta 1 recurso fisico y no puede ser contrarrestado; Santoryu inflige 35 de dano normal, cuesta 1 recurso fisico y 1 neutral, no puede ser contrarrestado ni reflejado. Con Enma: Ittoryu inflige 35 de dano normal e ignora invulnerabilidad; Nitoryu inflige 40 de dano perforante, aturde 1 turno y no puede ser contrarrestado; Santoryu inflige 40 de dano perforante a todos los enemigos, Zoro recupera 10 salud, no puede ser contrarrestado ni reflejado.",
      effects: [{
        type: "conditionalEffects",
        value: 1,
        targets: "target",
        cases: [
          {
            condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-nitoryu" },
            effects: [{ type: "damage", value: 25, damageType: "piercing", targets: "target" }]
          },
          {
            condition: { scope: "actor", type: "hasStatusEffect", effectId: "zoro-santoryu" },
            effects: [{ type: "damage", value: 35, targets: "target" }]
          },
          {
            when: "default",
            effects: [{ type: "damage", value: 20, targets: "target" }]
          }
        ]
      }],
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "zoro-defense",
      name: "Defensa de Zoro",
      cost: { negro: 1 },
      targetType: "self",
      description: "Zoro se vuelve invulnerable por 1 turno.",
      effects: [{
        type: "complex",
        duration: 1,
        targets: "self",
        effects: [{ type: "invulnerable", value: 1, targets: "self" }]
      }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    },
    {
      id: "zoro-start-ittoryu",
      name: "Ittoryu",
      passive: true,
      startsActive: true,
      cost: {},
      targetType: "self",
      description: "Zoro empieza el combate en Ittoryu, reduciendo el dano recibido en 25%.",
      effects: ittoryuEffects,
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["physical", "strategic", "instant"]
    }
  ]
};
