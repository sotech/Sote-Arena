export const cacho = {
  id: "cacho",
  name: "Cacho",
  avatar: "CH",
  maxHp: 150,
  skills: [
    {
      id: "cacho-lariat",
      name: "Lariat de Cacho",
      chakra: { taijutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Cacho utiliza un Lariat sobre el enemigo e inflige 20 de dano a un enemigo.",
      effects: [
        { type: "damage", value: 20, targets: "target" }
        ],
      family:["physical","instant","offensive"],
    },
    {
      id: "smoke-hazard",
      name: "Humo peligroso",
      chakra: { genjutsu: 1, neutralChakra: 1 },
      targetType: "enemies",
      description: "Cacho lanza humos de nicotina sobre los enemigos infligiendo 15 de daño de afliccion aturdiendo sus habilidades fisicas por 1 turno. Ademas cacho recibe 10 puntos de daño de afliccion.",
      effects: [
        { type: "complex", duration: 1, targets: "target", effects: [{ type: "stun", value: 1, targets: "self", familiesAffected: ["physical"] }] },
        { type: "damage", value: 10, damageType: "affliction", targets: "target" },
        { type: "damage", value: 10, damageType: "affliction", targets: "self" }
        ],
      cooldown: 3,
      family:["chakra","instant","offensive"]
    },
    {
      id: "cigarrette-care",
      name: "Cuidados de cigarrillo",
      chakra: { neutralChakra: 2 },
      targetType: "self",
      description: "Cacho fuma unos puchos. Cacho se restaura 20 de vida y gana 15 de reduccion de dano durante 2 turnos.",
      effects: [
        { type: "heal", value: 20, targets: "target" },
        { type: "complex", duration: 2, targets: "target", effects: [{ type: "damage-reduction", value: 15, targets: "self" }] }
      ],
      cooldown: 3,
      family:["chakra","instant"]
    },
    {
      id: "cacho-bloodlust",
      name: "Ira de Cacho",
      passive: true,
      trigger: "battleStart",
      chakra: {},
      targetType: "self",
      description: "Cacho posee una ira primigenea. Lariat de Cacho aumenta en 5 por cada 15 puntos de vida que le falte a Cacho.",
      effects: [
        { type: "modifyDamageByMissingHp", amountPerStep: 5, hpStep: 15, duration: -1, targets: "self", skillIds: ["cacho-lariat"] }
      ],
      family:["physical","instant"]
    }
  ]
};
