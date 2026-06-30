export const sakura = {
  id: "sakura",
  name: "Sakura Haruno",
  avatar: "SH",
  bio:"Sakura Haruno es una kunoichi de extraordinaria disciplina que combina un brillante talento médico con una fuerza física devastadora. Su control perfecto del chakra, su capacidad para curar heridas críticas y su poder para destruir con un solo golpe la convierten en una aliada invaluable y una rival temible.",
  maxHp: 100,
  skills: [
    {
      id: "chakra-punch",
      name: "Puno de chakra",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Sakura inflige 25 puntos de dano perforante a un enemigo.",
      effects: [
        { type: "damage", value: 25, damageType: "piercing", targets: "target" }
      ],
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "medical-kunoichi",
      name: "Medical kunoichi",
      chakra: { ninjutsu: 1 },
      targetType: "otherAlly",
      description: "Sakura cura a un aliado, excepto a si misma, el 50% de sus puntos de vida faltantes.",
      effects: [
        { type: "heal", value: 50, missingHpPercent: 50, targets: "target" }
      ],
      cooldown: 1,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "strength-seal-100",
      name: "Sello de Fuerza de 100",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: "Sakura recupera 15 puntos de salud. Durante 2 turnos, Puno de chakra hace 15 mas de dano y Sakura recibe 40% reduccion de dano. Esta habilidad puede usarse solo 3 veces.",
      effects: [
        {
          type: "heal",
          value: 15,
          targets: "self"
        },
        {
          type: "complex",
          duration: 2,
          targets: "self",
          effects: [
            { type: "modifyDamage", value: 15, targets: "self", skillIds: ["chakra-punch"] },
            { type: "damage-reduction", value: 40, percent: true, targets: "self" }
          ]
        }
      ],
      cooldown: 3,
      uses: 3,
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
    }
  ]
};
