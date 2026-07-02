const yugiDeckSkillIds = [
  "guardian-celta",
  "slifer-el-dragon-celestial",
  "kuriboh",
  "cilindros-magicos",
  "espadas-de-luz-reveladoras",
  "mago-oscuro"
];

const yugiDeckSlots = ["yugi-card-a", "yugi-card-b"];

export const yugi = {
  id: "yugi",
  name: "Yugi",
  avatar: "YG",
  bio: "Yugi es un duelista brillante que convierte cada combate en una partida de estrategia. Su mazo cambia sus opciones turno a turno, alternando monstruos, trampas y dioses egipcios para responder a cualquier amenaza.",
  maxHp: 100,
  initialSkillDeck: {
    baseSkillIds: yugiDeckSlots,
    deckSkillIds: yugiDeckSkillIds,
    avoidCooldown: true,
    sourceSkillId: "yugi-deck",
    sourceSkillName: "Mazo de cartas"
  },
  skills: [
    {
      id: "yugi-card-a",
      name: "Carta del mazo",
      cost: {},
      targetType: "enemy",
      description: "Una carta aleatoria del mazo de Yugi ocupa esta ranura al comenzar el combate y cada vez que Yugi usa Robar!.",
      effects: [],
      hideSkillInInspect: true,
      family: ["strategic", "instant"]
    },
    {
      id: "yugi-card-b",
      name: "Carta del mazo",
      cost: {},
      targetType: "enemy",
      description: "Una carta aleatoria del mazo de Yugi ocupa esta ranura al comenzar el combate y cada vez que Yugi usa Robar!.",
      effects: [],
      hideSkillInInspect: true,
      family: ["strategic", "instant"]
    },
    {
      id: "robar",
      name: "Robar!",
      cost: {negro: 1},
      targetType: "self",
      description: "Yugi saca una carta de su mazo. Gana 20 puntos de escudo que no se acumulan y cambia al azar sus dos cartas activas por otras del mazo.",
      effects: [
        { type: "removeStatus", targets: "self", statusSourceSkillIds: ["robar"], statusTypes: ["shield"] },
        {
          type: "shield",
          value: 20,
          targets: "self",
          duration: -1,
          isStackable: false,
          statusSourceSkillId: "robar",
          statusSourceSkillName: "Robar!",
          descriptions: ["Yugi tiene 20 puntos de escudo de Robar!. Este escudo no se acumula."]
        },
        {
          type: "shuffleDeckSkills",
          targets: "self",
          baseSkillIds: yugiDeckSlots,
          deckSkillIds: yugiDeckSkillIds,
          avoidCooldown: true,
          avoidCurrentSkillIds: true,
          descriptions: ["Yugi cambio sus cartas activas por otras del mazo."]
        }
      ],
      cooldown: 1,
      family: ["strategic", "instant"]
    },
    {
      id: "gran-escudo-gardna",
      name: "Gran escudo gardna",
      cost: {negro: 1},
      targetType: "self",
      description: "Yugi se hace invulnerable durante 1 turno.",
      effects: [
        { type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }
      ],
      cooldown: 4,
      family: ["strategic", "instant"]
    },
    {
      id: "guardian-celta",
      name: "Guardian Celta",
      cost: {verde: 1},
      targetType: "enemy",
      description: "Yugi ataca a un objetivo enemigo con el Guardian Celta e inflige 25 puntos de dano perforante.",
      effects: [{ type: "damage", value: 25, damageType: "piercing", targets: "target" }],
      cooldown: 1,
      isExtraSkill: true,
      hideUntilReplaced: true,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "slifer-el-dragon-celestial",
      name: "Slifer, el Dragon Celestial",
      cost: {rojo: 3},
      targetType: "enemies",
      description: "Yugi invoca a su dios egipcio para obliterar a sus enemigos. Todos los enemigos reciben 20 puntos de dano durante 3 turnos. Durante este tiempo, si este personaje usa una habilidad ofensiva, recibira 10 de daño. No puede ser contrarestada ni reflejada.",
      effects: [{
        type: "complex",
        duration: 3,
        targets: "enemies",
        effects: [{ type: "damage", value: 20, targets: "self" }],
        descriptions: ["Este personaje recibe 20 de dano al comienzo de sus turnos por Slifer, el Dragon Celestial."]
      }, {
        type: "applyEffectsOntriggerEvent",
        duration: 3,
        targets: "enemies",
        triggerEvent: "useOffensiveSkill",
        showStatusEffect: true,
        charges: -1,
        effects: [{ type: "damage", value: 10, targets: "statusMember" }],
        descriptions: ["Si este personaje usa una habilidad ofensiva, recibe 10 de dano por Slifer, el Dragon Celestial."]
      }],
      uncounterable: true,
      nonReflectable: true,
      isExtraSkill: true,
      cooldown: 3,
      hideUntilReplaced: true,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "kuriboh",
      name: "Kuriboh",
      cost: {negro: 1},
      targetType: "ally",
      description: "Yugi coloca en secreto una proteccion sobre un aliado o sobre si mismo. Durante el siguiente turno, ese personaje ignora todos los efectos de dano enemigos sobre si. Luego Kuriboh se revela y termina.",
      effects: [
        {
          type: "counter",
          duration: 1,
          targets: "target",
          trigger: "incoming",
          charges: 1,
          familiesAffected: ["offensive"],
          effectTypesAffected: ["damage"],
          isSecret: true,
          showStatusEffect: false,
          descriptions: ["Este personaje esta ignorando los efectos de tipo: dano."],
          counteredNoticeTemplate: "Kuriboh hizo que {skillName} no tuviera efecto.",
          onCounterSuccess: [{ type: "gainRandomChakra", value: 1, targets: "statusMember" }]
        }
      ],
      isExtraSkill: true,
      hideUntilReplaced: true,
      isSecret: true,
      cooldown: 2,
      family: ["strategic", "instant"]
    },
    {
      id: "cilindros-magicos",
      name: "Cilindros magicos",
      cost: {azul: 1},
      targetType: "ally",
      description: "Yugi coloca una carta trampa secreta sobre un aliado o sobre si mismo. La primera habilidad ofensiva usada contra ese aliado es reflejada.",
      effects: [
        {
          type: "reflect",
          duration: 1,
          targets: "target",
          trigger: "incoming",
          charges: 1,
          reflectTo: "caster",
          familiesAffected: ["offensive"],
          showStatusEffect: false,
          descriptions: ["Cilindros magicos reflejara la primera habilidad ofensiva usada contra este personaje."]
        }
      ],
      isExtraSkill: true,
      hideUntilReplaced: true,
      isSecret: true,
      cooldown: 3,
      family: ["strategic", "instant"]
    },
    {
      id: "espadas-de-luz-reveladoras",
      name: "Espadas de luz reveladoras",
      cost: {azul: 1, negro: 1},
      targetType: "enemy",
      description: "Yugi activa las espadas de luz reveladoras impidiendo al contrincante jugar. Aturde las habilidades fisicas de un objetivo por 2 turnos y recibe 15 de dano por 2 turnos.",
      effects: [
        { type: "stun", value: 2, targets: "target", familiesAffected: ["physical"] },
        {
          type: "complex",
          duration: 2,
          targets: "target",
          effects: [{ type: "damage", value: 15, damageType: "affliction", targets: "self" }],
          descriptions: ["Este personaje recibe 15 de dano de afliccion al comienzo de sus turnos por Espadas de luz reveladoras."]
        }
      ],
      isExtraSkill: true,
      hideUntilReplaced: true,
      cooldown: 4,
      family: ["strategic", "offensive", "instant"]
    },
    {
      id: "mago-oscuro",
      name: "Mago oscuro",
      cost: {azul: 1, negro: 1},
      targetType: "enemy",
      description: "Yugi invoca a su fiel aliado y confidente. El Mago oscuro hace 30 de dano a un objetivo y ese objetivo recibe 5 mas de dano permanentemente de las habilidades de Yugi. Esta habilidad ignora invulnerabilidad.",
      effects: [
        { type: "damage", value: 30, targets: "target", ignoreInvulnerable: true },
        {
          type: "modifyReceivedDamage",
          value: 5,
          duration: -1,
          targets: "target",
          ignoreInvulnerable: true,
          isStackable: true,
          stackCount: 1,
          sourceCharacterIds: ["yugi"],
          skillIds: ["guardian-celta", "slifer-el-dragon-celestial", "espadas-de-luz-reveladoras", "mago-oscuro"],
          descriptions: ["Este personaje recibe 5 de dano adicional de las habilidades ofensivas de Yugi."]
        }
      ],
      isExtraSkill: true,
      hideUntilReplaced: true,
      cooldown: 1,
      family: ["special", "offensive", "instant"]
    }
  ]
};
