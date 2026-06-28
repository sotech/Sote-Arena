export const mai = {
  id: "mai",
  name: "Mai",
  avatar: "MI",
  maxHp: 70,
  skills: [
    {
      id: "cat-scratch",
      name: "Aranazo de gato",
      chakra: { neutralChakra: 1 },
      targetType: "enemy",
      description: "Mai arana a un enemigo, infligiendo 5 de dano perforante. Cada uso aumenta permanentemente el dano de esta habilidad en 5.",
      effects: [
        { type: "damage", value: 5, damageType: "piercing", targets: "target" },
        { type: "modifyDamage", value: 5, duration: -1, targets: "self", skillIds: ["cat-scratch"], isStackable: true }
      ],
      family: ["physical", "instant"]
    },
    {
      id: "prrr",
      name: "Prrr",
      chakra: { neutralChakra: 2 },
      targetType: "ally",
      description: "Mai mejora el estado de animo de un aliado. Durante 4 turnos, sus habilidades cuestan 1 chakra neutral menos.",
      effects: [
        { type: "modifyChakraCost", chakra: { neutralChakra: -1 }, duration: 4, targets: "target" }
      ],
      cooldown: 5,
      family: ["mental", "instant"]
    },
    {
      id: "licks",
      name: "Lamidas",
      chakra: { neutralChakra: 2 },
      targetType: "otherAlly",
      description: "Mai lame a un aliado que no sea ella misma. Durante 2 turnos, ese aliado recupera 10 de salud. Esta habilidad puede ser interrumpida.",
      effects: [
        { type: "complex", duration: 2, targets: "target", mode: "interruptible", effects: [{ type: "heal", value: 10, targets: "self" }] }
      ],
      cooldown: 3,
      family: ["physical", "instant"]
    },
    {
      id: "ally-protection",
      name: "Proteccion de aliado",
      passive: true,
      trigger: "battleStart",
      chakra: {},
      targetType: "self",
      description: "Por cada aliado vivo, sin incluir a Mai, Mai gana 10 de reduccion de dano y 10 de escudo. El escudo no puede superar 40.",
      effects: [
        { type: "allyCountStatus", duration: -1, targets: "self", excludeSelf: true, damageReductionPerAlly: 10, shieldPerAlly: 10, maxShield: 40 }
      ],
      family: ["mental", "instant"]
    }
  ]
};
