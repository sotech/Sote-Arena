export const hinata = {
  id: "hinata",
  name: "Hinata Hyuga",
  role: "Defensa",
  avatar: "HH",
  maxHp: 100,
  skills: [
    {
      id: "gentle-fist",
      name: "Punio suave",
      chakra: { taijutsu: 2 },
      targetType: "enemy",
      description: "Inflige 25 de dano a un enemigo y remueve 1 chakra al azar.",
      effects: [
        { type: "damage", value: 25, targets: "target" },
        { type: "remove-chakra", value: 1, targets: "target" }
      ]
    },
    {
      id: "byakugan-guard",
      name: "Guardia Byakugan",
      chakra: { bloodline: 3 },
      targetType: "allies",
      description: "Otorga 15 de escudo a los aliados y 25 de reduccion de dano a si misma durante 2 turnos. El escudo no puede acumularse consigo mismo.",
      effects: [
        { type: "shield", value: 15, targets: "target", isStackable: false },
        { type: "damage-reduction", value: 25, duration: 2, targets: "self" }
      ]
    },
    {
      id: "chakra-seal",
      name: "Sello de chakra",
      chakra: { bloodline: 1, taijutsu: 1 },
      targetType: "enemies",
      description: "Inflige 15 de dano a todos los enemigos y remueve 2 chakras al azar.",
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "remove-chakra", value: 2, targets: "target" }
      ]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { taijutsu: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }],
      cooldown: 4
    }
  ]
};
