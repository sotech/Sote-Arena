export const kankurou = {
  id: "kankurou",
  name: "Kankurou",
  avatar: "KA",
  maxHp: 100,
  skills: [
    {
      id: "puppet-ambush",
      name: "Emboscada de marionetas",
      chakra: { neutralChakra: 2 },
      targetType: "enemy",
      description: "Usando sus marionetas para la ofensiva, Kankurou inflige 30 de dano a un enemigo. Inflige 10 de dano adicional si el objetivo esta aturdido.",
      effects: [
        {
          type: "damage",
          value: 30,
          targets: "target",
          bonusWhen: [{ bonus: 10, require: { type: "hasStatusEffect", effectId: "stun" } }]
        }
      ],
      family:["physical","instant"]
    },
    {
      id: "iron-puppet-barrage",
      name: "Rafaga de marionetas de hierro",
      chakra: { neutralChakra: 1 },
      targetType: "enemies",
      description: "Las marionetas atacan a todos los enemigos con veneno y les inflige 10 puntos de dano de afliccion durante 4 turnos.",
      effects: [
        { type: "complex", duration: 4, targets: "enemies", effects: [{ type: "damage", value: 10, targets: "self", damageType: "affliction" }] }
      ],
      cooldown: 1,
      family:["physical","instant"]
    },
    {
      id: "puppet-preparation",
      name: "Preparacion de marionetas",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Kankuro prepara sus marionetas para atacar. Kankurou gana 5 puntos de defensa destruible y por 4 turnos el dano de Rafaga de marionetas de hierro aumenta en 5 y el dano de Emboscada de marionetas aumenta en 10.",
      effects: [
        { type: "shield", value: 5, targets: "self", isStackable: true },
        {
          type: "complex",
          duration: 4,
          targets: "self",
          effects: [
            { type: "modifyDamage", value: 5, targets: "self", skillIds: ["iron-puppet-barrage"] },
            { type: "modifyDamage", value: 10, targets: "self", skillIds: ["puppet-ambush"] }
          ]
        }
      ],
      family:["physical","instant"]
    },
    {
      id: "puppet-substitution",
      name: "Jutsu de sustitucion de marionetas",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Vuelve invulnerable al lanzador durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family:["physical","instant"]
    }
  ]
};
