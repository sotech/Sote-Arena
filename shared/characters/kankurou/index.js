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
      chakra: { ninjutsu: 2 },
      targetType: "enemy",
      description: "Inflige 20 de dano a un enemigo y lo aturde 2 turno.",
      effects: [
        { type: "damage", value: 20, targets: "target" },
        { type: "stun", value: 2, targets: "target" }
      ],
      cooldown: 1
    },
    {
      id: "iron-puppet-barrage",
      name: "Rafaga de marionetas de hierro",
      chakra: { ninjutsu: 2 },
      targetType: "enemies",
      description: "Las marionetas atacan a todos los enemigos con veneno y les inflige 20 puntos de daño de afliccion.",
      effects: [{ type: "damage", value: 20, targets: "target", damageType: "affliction" }],
      cooldown: 1
    },
    {
      id: "puppet-preparation",
      name: "Preparacion de marionetas",
      chakra: { taijutsu: 1 },
      targetType: "self",
      description: "Kankuro prepara sus marionetas para un ataque. Obtienes 1 chakra de tipo ninjutsu.",
      effects: [{ type: "gain-chakra", value: 1, targets: "self", chakraType: "ninjutsu" }]
    },
    {
      id: "puppet-substitution",
      name: "Jutsu de sustitucion de marionetas",
      chakra: { taijutsu: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "invulnerable", value: 1, targets: "self" }],
      cooldown: 4
    }
  ]
};
