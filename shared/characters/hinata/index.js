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
      description: "Inflige 25 de dano a un enemigo y lo aturde 1 turno.",
      effects: [
        { type: "damage", value: 25, targets: "target" },
        { type: "stun", value: 1, targets: "target" }
      ]
    },
    {
      id: "byakugan-guard",
      name: "Guardia Byakugan",
      chakra: { bloodline: 3 },
      targetType: "allies",
      description: "Otorga 30 de escudo a todos los aliados.",
      effects: [{ type: "shield", value: 30, targets: "target" }]
    },
    {
      id: "chakra-seal",
      name: "Sello de chakra",
      chakra: { bloodline: 1, taijutsu: 1 },
      targetType: "enemies",
      description: "Inflige 15 de dano a todos los enemigos.",
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "stun", value: 1, targets: "target" }
      ]
    },
    {
      id: "substitution-jutsu",
      name: "Jutsu de sustitucion",
      chakra: { taijutsu: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }]
    }
  ]
};
