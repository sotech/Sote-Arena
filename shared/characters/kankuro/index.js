export const kankuro = {
  id: "kankuro",
  name: "Kankuro",
  avatar: "KA",
  bio:"Kankurō es un maestro titiritero que combate desde la distancia utilizando marionetas repletas de armas ocultas y venenos letales. Su ingenio táctico, el control preciso de sus puppets y su habilidad para tender emboscadas lo convierten en un oponente tan impredecible como peligroso.",
  maxHp: 100,
  skills: [
    {
      id: "puppet-ambush",
      name: "Emboscada de marionetas",
      cost: { negro: 2 },
      targetType: "enemy",
      description: "Usando sus marionetas para la ofensiva, Kankuro inflige 30 de daño a un enemigo. Inflige 10 de daño adicional si el objetivo esta aturdido.",
      effects: [
        {
          type: "damage",
          value: 30,
          targets: "target",
          bonusWhen: [{ bonus: 10, require: { type: "hasStatusEffect", effectId: "stun" } }]
        }
      ],
      family:["physical","offensive","instant"]
    },
    {
      id: "iron-puppet-barrage",
      name: "Rafaga de marionetas de hierro",
      cost: { negro: 2 },
      targetType: "enemies",
      description: "Las marionetas atacan a todos los enemigos con veneno y les inflige 10 puntos de daño de afliccion durante 2 turnos.",
      effects: [
        { type: "complex", duration: 2, targets: "enemies", effects: [{ type: "damage", value: 10, targets: "self", damageType: "affliction" }] }
      ],
      cooldown: 3,
      family:["affliction", "offensive","instant"]
    },
    {
      id: "puppet-preparation",
      name: "Preparacion de marionetas",
      cost: { negro: 1 },
      targetType: "self",
      description: "Kankuro prepara sus marionetas para atacar. Kankuro gana 5 puntos de defensa destruible y por 4 turnos el daño de Rafaga de marionetas de hierro aumenta en 5 y el daño de Emboscada de marionetas aumenta en 10.",
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
      family:["physical","strategic","instant"]
    },
    {
      id: "puppet-substitution",
      name: "Jutsu de sustitucion de marionetas",
      cost: { negro: 1 },
      targetType: "enemy",
      isSecret: true,
      description: "Coloca una trampa de marionetas en un objetivo. Durante el siguiente turno, la primera habilidad ofensiva usada por ese objetivo sera countereada.",
      effects: [{ type: "counter", duration: 1, targets: "target", trigger: "outgoing", charges: 1, familiesAffected: ["offensive"] }],
      cooldown: 4,
      family:["physical", "strategic", "instant"]
    }
  ]
};
