export const naruto = {
  id: "naruto",
  name: "Naruto Uzumaki",
  avatar: "NU",
  bio:"Naruto Uzumaki es un ninja de voluntad inquebrantable que jamás abandona a sus amigos, sin importar cuán imposible parezca la batalla. Su inmensa reserva de chakra, el poder del Nueve Colas y su dominio del Modo Sabio lo convierten en uno de los shinobi más poderosos de su era.",
  maxHp: 100,
  skills: [
    {
      id: "oodama-rasengan",
      name: "Oodama Rasengan",
      chakra: { taijutsu: 1, ninjutsu: 1 },
      targetType: "enemy",
      description: "Naruto inflige 40 de daño a un enemigo. Ignora invulnerabilidad. Durante el siguiente turno despues de usar Poder del Kyubi, esta habilidad aturde 1 turno.",
      effects: [
        { type: "damage", value: 40, targets: "target", ignoreInvulnerable: true },
        { type: "stun", value: 1, targets: "target", require: { scope: "self", type: "hasStatusEffect", effectId: "kyuubi-chakra" } }
      ],
      cooldown: 1,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "multi-shadow-clones",
      name: "Multi clones de sombra",
      chakra: { neutralChakra: 2 },
      targetType: "enemies",
      description: "Naruto inflige 20 de daño a todos los enemigos. Por 1 turno ignora aturdimientos y efectos negativos, aunque esos estados sigan apareciendo sobre Naruto.",
      effects: [
        { type: "damage", value: 20, targets: "target" },
        {
          type: "complex",
          duration: 1,
          targets: "self",
          effects: [{
            type: "ignoreEffects",
            targets: "self",
            ignoreEffects: [
              "stun",
              "damage-reduction",
              "modifyDamage",
              "modifyDamageByMissingHp",
              "modifyDamageType",
              "modifyTargetType",
              "modifyTargetCount",
              "addEffectToBase",
              "addUncountereable",
              "addNonReflectable",
              "replaceEffects",
              "replaceSkill",
              "modifyChakraCost",
              "substituteChakraCost",
              "counter",
              "reflect",
              "invulnerable",
              "gain-chakra",
              "remove-chakra"
            ],
            value: 1
          }]
        }
      ],
      cooldown: 2,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "kyuubi-chakra",
      name: "Poder del Kyubi",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "self",
      description: "Naruto gana 1 Recurso Fisico y 1 Recurso Energetico. Naruto pierde 15 puntos de vida. Durante el siguiente turno Oodama Rasengan aturde 1 turno.",
      effects: [
        { type: "payLife", value: 15, targets: "self", notKill: true },
        { type: "gain-chakra", value: 1, chakraType: "taijutsu", targets: "self" },
        { type: "gain-chakra", value: 1, chakraType: "ninjutsu", targets: "self" },
        {
          type: "complex",
          duration: 1,
          targets: "self",
          showStatusEffect: true,
          effects: [],
          descriptions: ["Naruto gano 1 Recurso Fisico y 1 Recurso Energetico. Oodama Rasengan aturdira 1 turno durante el siguiente turno."]
        }
      ],
      cooldown: 2,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    },
    {
      id: "kurama-possession",
      name: "Posesion Kurama",
      passive: true,
      startsActive: true,
      chakra: {},
      targetType: "self",
      description: "Pasiva oculta: si Naruto llega a 30% de vida o menos, obtiene 50% de reduccion de daño permanentemente.",
      effects: [{
        type: "triggerSkills",
        duration: -1,
        targets: "self",
        condition: { type: "hpPercent", comparator: "<=", value: 30 },
        showStatusEffect: false,
        effects: [
          {
            type: "damage-reduction",
            value: 50,
            percent: true,
            duration: -1,
            targets: "self",
            statusSourceSkillId: "kurama-possession",
            statusSourceSkillName: "Posesion Kurama",
            statusIconSkillId: "kyuubi-chakra",
            descriptions: ["Naruto esta poseido por Kurama y recibe 50% menos daño permanentemente."]
          },
          {
            type: "changeAvatarImage",
            duration: -1,
            targets: "self",
            avatarImage: "naruto-kurama",
            showStatusEffect: false
          }
        ]
      }],
      hideUntilReplaced: true,
      family: ["special", "strategic", "instant"]
    }
  ]
};
