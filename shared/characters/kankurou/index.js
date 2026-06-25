export const kankurou = {
  id: "kankurou",
  name: "Kankurou",
  role: "",
  avatar: "KA",
  maxHp: 100,
  skills: [
    {
      id: "puppet-ambush",
      name: "Emboscada de marionetas",
      chakra: { neutralChakra: 2 },
      targetType: "enemy",
      description: "Usando sus marionetas para la ofensiva, Kankurou inflige 25 de dano a un enemigo",
      effects: [
        { type: "damage", value: 25, targets: "target" },
      ],
    },
    {
      id: "iron-puppet-barrage",
      name: "Rafaga de marionetas de hierro",
      chakra: { neutralChakra: 1 },
      targetType: "enemies",
      description: "Las marionetas atacan a todos los enemigos con veneno y les inflige 20 puntos de daño de afliccion.",
      effects: [{ type: "damage", value: 20, targets: "target", damageType: "affliction" }],
      cooldown: 1
    },
    {
      id: "puppet-preparation",
      name: "Preparacion de marionetas",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Kankuro prepara sus marionetas para atacar. Por 4 turnos el daño de Rafaga de marionetas de hierro aumenta en 5 y el daño de Emboscada de marionetas aumenta en 10.",
      effects: [{ type: "gain-chakra", value: 2, targets: "self"},
        { type: "buffDamage", value: 5, duration: 4, targets: "self", skillIds: ["iron-puppet-barrage"] },
        { type: "buffDamage", value: 10, duration: 4, targets: "self", skillIds: ["puppet-ambush"] }
      ],
      cooldown: 5
    },
    {
      id: "puppet-substitution",
      name: "Jutsu de sustitucion de marionetas",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }],
      cooldown: 4
    }
  ]
};
