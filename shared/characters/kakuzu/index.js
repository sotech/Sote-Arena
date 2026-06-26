export const kakuzu = {
  id: "kakuzu",
  name: "Kakuzu",
  avatar: "KZ",
  maxHp: 100,
  skills: [
    {
      id: "fuuton-pressure-damage",
      name: "Estilo de viento: Presion",
      chakra: { ninjutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Kakuzu inflige 25 de dano a un enemigo y lo aturde 1 turno. Al usarse, esta habilidad cambia a Estilo de fuego: Fuego infernal por 2 turnos.",
      effects: [
        {
          type: "damage",
          value: 25,
          targets: "target",
        },
        {
            type: "replaceSkill",
            baseSkillId: "fuuton-pressure-damage",
            skillId: "katon-inferno-fire",
            targets: "self",
            duration: 2,
        }
      ],
      family:["chakra","instant"]
    },
    {
      id: "raiton-false-lightning",
      name: "Estilo de rayo: Falso relampago",
      chakra: { genjutsu: 1 , neutralChakra: 1 },
      targetType: "enemy",
      description: "Kakuzu inflige 30 puntos de daño perforante a un enemigo. Al usarse, esta habilidad cambia a Estilo de agua: Muro de agua por 2 turnos.",
      effects: [
        {
            type: "damage",
            value: 30,
            damageType: "piercing",
            targets: "target", 
        },
        {
            type: "replaceSkill",
            baseSkillId: "raiton-false-lightning",
            skillId: "suiton-suijenki",
            targets: "self",
            duration: 2,
            showStatusEffect: false
        }
        ],
      family:["chakra","instant"]
    },
    {
      id: "heart-steal",
      name: "Robo de corazones",
      chakra: { neutralChakra: 6 },
      targetType: "enemy",
      description: "Kakuzu le roba el corazon a un enemigo. Le inflige 20 de daño de afliccion y Kakuzu recupera 100 de salud. Requiere que el objetivo tenga al menos 20 de salud.",
      effects: [
        { type: "damage", value: 20, damageType: "affliction", targets: "target" },
        { type: "heal", value: 100, targets: "self" }
      ],      
      family:["physical","instant"],
      cooldown: 4
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
    },
    {
        id: "katon-inferno-fire",
        name: "Estilo de fuego: Fuego infernal",
        chakra: { bloodline: 1},
        targetType: "enemies",
        description: "Kakuzu inflige 15 de dano de afliccion a todos los enemigos.",
        effects: [
            { type: "damage", value: 15, damageType: "affliction", targets: "target" },
        ],
        family:["chakra","instant"],
        isExtraSkill: true
    },
    {
        id: "suiton-suijenki",
        name: "Estilo de agua: Muro de agua",
        chakra: { bloodline: 1, ninjutsu: 1 },
        targetType: "allies",
        description: "Kakuzu levanta un muro defensivo a sus aliados. Otorga a todos los aliados 30 puntos de escudo. No se puede acumular consigo misma.",
        effects: [
            { type: "shield", value: 30, targets: "target", isStackable: false },
        ],
        family:["chakra","instant"],
        isExtraSkill: true
    }
  ]
};
