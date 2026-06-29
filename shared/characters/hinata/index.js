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
      description: "Golpeando puntos de chakra fijos, Hinata inflige 15 de dano a un enemigo durante 2 turnos. Durante Guardia Byakugan, esta habilidad tambien remueve 1 chakra cada turno por 2 turnos.",
      effects: [
        { type: "complex", duration: 2, targets: "target", effects: [{ type: "damage", value: 15, targets: "self" }] }
      ],
      cooldown: 2,
      family: ["physical", "instant", "offensive"]
    },
    {
      id: "byakugan-guard",
      name: "Guardia Byakugan",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: `Hinata adopta una guardia defensiva durante 3 turnos y gana 15 de reduccion de dano.
        Durante este tiempo, Puno suave remueve 1 chakra por turno durante 2 turnos al objetivo enemigo.
        Sello de chakra inflige 5 dano adicional, cuesta 1 chakra neutral menos y otorga 15 de escudo destructible no acumulable a los aliados.`,
      effects: [
        {
          type: "complex",
          duration: 3,
          targets: "self",
          effects: [
            { type: "damage-reduction", value: 15, targets: "self" },
            {
              type: "addEffectToBase",
              targets: "self",
              skillIds: ["gentle-fist"],
              descriptions: ["Puno suave ahora remueve 1 chakra."],
              effects: [{ type: "complex", duration: 2, targets: "target", effects: [{ type: "remove-chakra", value: 1, targets: "self" }] }]
            },
            {
              type: "addEffectToBase",
              targets: "self",
              skillIds: ["chakra-seal"],
              descriptions: ["Sello de chakra otorga 15 de escudo no acumulable a los aliados."],
              effects: [{ type: "shield", value: 15, targets: "allies", isStackable: false }]
            },
            { type: "modifyDamage", value: 5, targets: "self", skillIds: ["chakra-seal"] },
            { type: "modifyChakraCost", chakra: { neutralChakra: -1 }, targets: "self", skillIds: ["chakra-seal"] }
          ]
        }
      ],
      cooldown: 4,
      family: ["chakra", "instant", "offensive"]
    },
    {
      id: "chakra-seal",
      name: "Sello de chakra",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemies",
      description: "Golpeando nodos especificos del oponente, Hinata inflige 15 de dano a todos los enemigos. Durante Guardia Byakugan, esta habilidad otorga 15 de escudo a los aliados",
      effects: [
        { type: "damage", value: 15, targets: "target" }
      ],
      family: ["chakra", "instant"]
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
