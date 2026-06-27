export const kakashi = {
  id: "kakashi",
  name: "Kakashi Hatake",
  avatar: "KH",
  maxHp: 100,
  skills: [
    {
      id: "raikiri",
      name: "Raikiri",
      chakra: { taijutsu: 1, ninjutsu: 1 },
      targetType: "enemy",
      description: "Usando su habilidad ilustre, Kakashi inflige 50 de dano perforante a un enemigo.",
      effects: [
        { type: "damage", value: 50, damageType: "piercing", targets: "target" },
        { type: "instakill", targets: "target", when: { type: "hasStatusEffect", effectId: "ninken-trap" } }
      ],
      family:["chakra","instant"],
      cooldown: 1
    },
    {
      id: "kakashi-sharingan",
      name: "Sharingan de Kakashi",
      chakra: { bloodline: 1 },
      targetType: "self",
      isSecret: true,
      description: "Kakashi activa su Sharingan en secreto. Durante 1 turno, todas las habilidades usadas sobre Kakashi seran reflejadas.",
      effects: [
        { type: "reflect", duration: 1, targets: "self", trigger: "incoming", charges: -1, reflectTo: "caster", showStatusEffect: false }
      ],
      cooldown: 2,
      family:["mental","instant"]
    },
    {
      id: "ninken-trap",
      name: "Trampa Ninken",
      chakra: { ninjutsu: 2 },
      targetType: "enemy",
      description: "Kakashi usa sus ninken para infligir 10 de dano a un enemigo y aturdirlo 2 turnos. Mientras el objetivo este afectado, Raikiri lo matara instantaneamente.",
      effects: [
        { type: "damage", value: 10, targets: "target" },
        { type: "complex", duration: 2, targets: "target", effects: [{ type: "stun", value: 2, targets: "self" }] }
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
