export const mai = {
  id: "mai",
  name: "Mai",
  avatar: "MI",
  bio: "Mai es la inseparable compañera de Daniel, una gata de apariencia serena cuya curiosidad la lleva a explorar cualquier situación sin dudarlo. Detrás de su calma esconde un temperamento feroz y una sorprendente ferocidad cuando llega el momento de defender a quienes aprecia.",
  maxHp: 70,
  skills: [
    {
      id: "cat-scratch",
      name: "Aranazo de gato",
      chakra: { neutralChakra: 1 },
      targetType: "enemy",
      cooldown: 1,
      description: "Mai arana a un enemigo, infligiendo 5 de daño perforante. Cada uso aumenta permanentemente el daño de esta habilidad en 5.",
      effects: [
        { type: "damage", value: 5, damageType: "piercing", targets: "target" },
        { type: "modifyDamage", value: 5, duration: -1, targets: "self", skillIds: ["cat-scratch"], isStackable: true }
      ],
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "prrr",
      name: "Prrr",
      chakra: { neutralChakra: 2 },
      targetType: "ally",
      description: "Mai mejora el estado de animo de un aliado. Durante 2 turnos, sus habilidades cuestan 1 recurso neutral menos.",
      effects: [
        { type: "modifyChakraCost", chakra: { neutralChakra: -1 }, duration: 2, targets: "target" }
      ],
      cooldown: 4,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "licks",
      name: "Lamidas",
      chakra: { neutralChakra: 2 },
      targetType: "otherAlly",
      description: "Mai lame a un aliado que no sea ella misma. Durante 2 turnos, ese aliado recupera 15 de salud. Esta habilidad puede ser interrumpida.",
      effects: [
        { type: "heal", value: 15, targets: "target" },
        { type: "complex", duration: 1, targets: "target", mode: "interruptible", effects: [{ type: "heal", value: 10, targets: "self" }] }
      ],
      cooldown: 4,
      family: ["physical", "strategic", "channeled"]
    },
    {
      id: "ally-protection",
      name: "Proteccion de aliado",
      passive: true,
      trigger: "battleStart",
      chakra: {},
      targetType: "self",
      description: "Por cada aliado vivo, sin incluir a Mai, Mai gana 5 de reduccion de daño y 5 de escudo cada turno. El escudo no puede superar 5 por aliado vivo.",
      effects: [
        { type: "allyCountStatus", duration: -1, targets: "self", excludeSelf: true, damageReductionPerAlly: 5, shieldPerAlly: 5, maxShieldPerAlly: 5, maxShield: 20 }
      ],
      family: ["special", "strategic", "instant"]
    }
  ]
};
