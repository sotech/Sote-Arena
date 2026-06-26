export const kakashi = {
  id: "kakashi",
  name: "Kakashi Hatake",
  avatar: "KH",
  maxHp: 100,
  skills: [
    {
      id: "raikiri",
      name: "Raikiri",
      chakra: { ninjutsu: 2 },
      targetType: "enemy",
      description: "Usando su habilidad ilustre, Kakashi inflige 40 de dano perforante a un enemigo. Inflige 10 de dano adicional si el objetivo tiene 50 de vida o menos.",
      effects: [
        {
          type: "damage",
          value: 40,
          damageType: "piercing",
          targets: "target",
          bonusWhen: [{ bonus: 10, require: { type: "hasMaxHp", hp: 50 } }]
        }
      ],
      family:["chakra","instant"]
    },
    {
      id: "tactical-read",
      name: "Lectura tactica",
      chakra: { genjutsu: 2 , neutralChakra: 1 },
      targetType: "enemy",
      description: "Leyendo sus novelas aburridas, Kakashi inflige 15 de dano y aturde las habilidades fisicas 2 turnos a un enemigo.",
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "complex", duration: 2, targets: "target", effects: [{ type: "stun", value: 1, targets: "self", familiesAffected: ["physical"] }] }
      ],
      cooldown: 3,
      family:["mental","instant"]
    },
    {
      id: "ninken-trap",
      name: "Trampa Ninken",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemies",
      description: "Una trampa de perros y herramientras ninja, infligen 25 de dano perforante a todos los enemigos.",
      effects: [
        { type: "damage", value: 25, damageType: "piercing", targets: "target" },
      ],
      cooldown: 1,
      family:["physical","instant"]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family:["physical","instant"]
    }
  ]
};
