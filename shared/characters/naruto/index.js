export const naruto = {
  id: "naruto",
  name: "Naruto Uzumaki",
  avatar: "NU",
  maxHp: 100,
  skills: [
    {
      id: "oodama-rasengan",
      name: "Oodama Rasengan",
      chakra: { taijutsu: 1, ninjutsu: 1 },
      targetType: "enemy",
      description: "Naruto inflige 40 de dano a un enemigo. Ignora invulnerabilidad. Durante el siguiente turno despues de usar Poder del Kyubi, esta habilidad aturde 1 turno.",
      effects: [
        { type: "damage", value: 40, targets: "target", ignoreInvulnerable: true },
        { type: "stun", value: 1, targets: "target", require: { scope: "self", type: "hasStatusEffect", effectId: "kyuubi-chakra" } }
      ],
      cooldown: 1,
      family: ["chakra", "instant", "offensive"]
    },
    {
      id: "multi-shadow-clones",
      name: "Multi clones de sombra",
      chakra: { neutralChakra: 2 },
      targetType: "enemies",
      description: "Naruto inflige 20 de dano a todos los enemigos. Por 1 turno ignora aturdimientos y efectos negativos, aunque esos estados sigan apareciendo sobre Naruto.",
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
      family: ["physical", "instant", "offensive"]
    },
    {
      id: "kyuubi-chakra",
      name: "Poder del Kyubi",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "self",
      description: "Naruto gana 1 Recurso Fisico y 1 Recurso Energetico. Naruto pierde 5 puntos de vida. Durante el siguiente turno Oodama Rasengan aturde 1 turno.",
      effects: [
        { type: "payLife", value: 5, targets: "self", notKill: true },
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
      family: ["mental", "instant"]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "instant"]
    }
  ]
};
