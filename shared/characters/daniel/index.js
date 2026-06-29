export const daniel = {
  id: "daniel",
  name: "Daniel-san",
  avatar: "DA",
  maxHp: 100,
  skills: [
    {
      id: "shadow-kick",
      name: "Patada de sombra",
      chakra: { taijutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Daniel-san usa su patada de sombra para infligir 30 puntos de daño a un enemigo.",
      effects: [
        { type: "damage", value: 30, targets: "target" }
      ],
      family: ["physical","instant","offensive"]
    },
    {
      id: "cats-blessing",
      name: "Bendición de Mai",
      chakra: { genjutsu: 1, taijutsu: 1 },
      targetType: "self",
      description: `Daniel-san invoca a su gata para que lo proteja. 
          Durante 2 turnos, Patada de sombra ataca a todos los objetivos. Daniel-san obtiene 15 puntos de reduccion de daño durante este tiempo.`,
      effects: [
        { 
          type: "complex", duration: 2, targets: "self", effects: 
          [
            { type: "damage-reduction", value: 15, targets: "self" },
            { type: "modifyTargetType", targetType: "enemies", targets: "self", skillIds: ["shadow-kick"] }
          ] 
      },
      ],
      family:["chakra","instant"],
      cooldown: 4
    },
    {
      id: "crackling-curtain",
      name: "Cortina crujiente",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemies",
      description: `Daniel usa la cortina del primo para atacar y cubrir a sus aliados. Inflige 15 puntos de daño a todos los enemigos y otorga 15 puntos de escudo a todos los aliados. No puede acumularse consigo mismo. `,
      effects: [
        { type: "damage", value: 15, targets: "target" },
        { type: "shield", value: 15, targets: "allies", isStackable: false }
      ],
      cooldown: 1,
      family:["physical","instant","offensive"]
    },
    {
      id: "nine-lives",
      name: "Nueve vidas",
      chakra: { neutralChakra: 3 },
      targetType: "self",
      description: "Usando la energia vital de su gata, Daniel recupera 50 puntos de vida y se vuelve invulnerable 1 turno.",
      effects: [
        { type: "heal", value: 50, targets: "self" },
        { type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family:["chakra","instant"]
    },
  ]
};
