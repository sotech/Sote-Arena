export const hinata = {
  id: "hinata",
  name: "Hinata Hyuga",
  avatar: "HH",
  maxHp: 100,
  skills: [
    {
      id: "gentle-fist",
      name: "Puño suave",
      chakra: { taijutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Golpeando puntos de chakra fijos, Hinata inflige 15 de dano a un enemigo y remueve 1 chakra al azar.",
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "remove-chakra", value: 1, targets: "target" }
      ],
      family:["physical","instant"]
    },
    {
      id: "byakugan-guard",
      name: "Guardia Byakugan",
      chakra: { bloodline: 2, neutralChakra: 1 },
      targetType: "allies",
      description: `Con la prevision del Byakugan, Hinata otorga 15 de escudo a los aliados y 25 de reduccion de dano a si misma durante 2 turnos. 
        El escudo no puede acumularse consigo mismo.
        Durante este tiempo, Puno suave cuesta 1 taijutsu menos y Puno suave y Sello de chakra infligen 10 de dano adicional.`,
      effects: [
        { type: "shield", value: 15, targets: "target", isStackable: false },
        {
          type: "complex",
          duration: 2,
          targets: "self",
          effects: [
            { type: "damage-reduction", value: 25, targets: "self" },
            { type: "modifyChakraCost", chakra: { taijutsu: -1, ninjutsu: 0, bloodline: 0, genjutsu: 0, neutralChakra: 0 }, targets: "self", skillIds: ["gentle-fist"] },
            { type: "modifyDamage", value: 10, targets: "self", skillIds: ["gentle-fist", "chakra-seal"] }
          ]
        }
      ],
      family:["chakra","instant"]
    },
    {
      id: "chakra-seal",
      name: "Sello de chakra",
      chakra: { bloodline: 2, taijutsu: 1 },
      targetType: "enemies",
      description: "Golpeando nodos especificos del oponente, Hinata inflige 15 de dano a todos los enemigos y remueve 2 chakras al azar.",
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "remove-chakra", value: 2, targets: "target" }
      ],
      family:["chakra","instant"]
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
