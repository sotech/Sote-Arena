export const naruto = {
  id: "naruto",
  name: "Naruto Uzumaki",
  role: "Ataque sostenido",
  avatar: "NU",
  maxHp: 100,
  skills: [
    {
      id: "rasengan",
      name: "Rasengan",
      chakra: { taijutsu: 1, ninjutsu: 1 },
      targetType: "enemy",
      description: "Preparando su tecnica insignia, Naruto inflige 35 de dano a un enemigo y lo aturde 1 turno.",
      effects: [{ type: "damage", value: 35, targets: "target" }, 
        { type: "stun", value: 1, targets: "target" }
      ],
      cooldown: 1
    },
    {
      id: "shadow-clones",
      name: "Clones de sombra",
      chakra: { neutralChakra: 2 },
      targetType: "enemies",
      description: "Una multitud de clones de sombra atacan a los enemigos y les inflige 15 de dano a todos los enemigos. Naruto obtiene 15 puntos de defensa destructible. No se puede acumularse consigo mismo.",
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "shield", value: 15, targets: "self", isStackable: false }
      ]
    },
    {
      id: "uzumaki-resolve",
      name: "Voluntad Uzumaki",
      chakra: { bloodline: 2 },
      targetType: "self",
      description: "Naruto recurre al zorro para obtener poder, recupera 15 de vida y gana 1 chakra de Taijutsu y 1 chakra de Ninjutsu.",
      effects: [
        { type: "self-heal", value: 15, targets: "self" },
        { type: "gain-chakra", value: 1, chakraType: "taijutsu", targets: "self" },
        { type: "gain-chakra", value: 1, chakraType: "ninjutsu", targets: "self" }
      ],
      cooldown: 2
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }],
      cooldown: 4
    }
  ]
};
