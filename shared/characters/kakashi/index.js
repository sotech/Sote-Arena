export const kakashi = {
  id: "kakashi",
  name: "Kakashi Hatake",
  avatar: "KH",
  bio:"Kakashi Hatake es un ninja prodigio reconocido por su inteligencia, serenidad y vasta experiencia en combate. Su dominio del Sharingan, su versatilidad con cientos de jutsus y su capacidad para adaptarse a cualquier situación lo convierten en uno de los shinobi más respetados de su generación.",
  maxHp: 100,
  skills: [
    {
      id: "raikiri",
      name: "Raikiri",
      chakra: { taijutsu: 1, ninjutsu: 1 },
      targetType: "enemy",
      description: "Usando su habilidad ilustre, Kakashi inflige 40 de daño perforante a un enemigo.",
      effects: [
        { type: "damage", value: 40, damageType: "piercing", targets: "target" },
        { type: "instakill", targets: "target", when: { type: "hasStatusEffect", effectId: "ninken-trap" } }
      ],
      family:["special","offensive","instant"],
      cooldown: 2
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
      cooldown: 3,
      family:["mental", "strategic", "instant"]
    },
    {
      id: "ninken-trap",
      name: "Trampa Ninken",
      chakra: { ninjutsu: 2 },
      targetType: "enemy",
      description: "Kakashi usa sus ninken para aturdir un enemigo 2 turnos. Mientras el objetivo este afectado, Raikiri lo matara instantaneamente.",
      effects: [
        { type: "complex", duration: 2, targets: "target", effects: [{ type: "stun", value: 2, targets: "self" }] }
      ],
      cooldown: 3,
      family:["physical","offensive","instant"]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family:["physical","strategic","instant"]
    }
  ]
};
