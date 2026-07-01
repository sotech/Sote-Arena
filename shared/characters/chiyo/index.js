export const chiyo = {
  id: "chiyo",
  name: "Abuela Chiyo",
  avatar: "CH",
  bio: "Chiyo es una anciana kunoichi de la Aldea de la Arena, maestra titiritera, medica experta y constructora de marionetas. Su experiencia le permite controlar el ritmo del combate, proteger aliados y convertir sacrificios extremos en una segunda oportunidad.",
  maxHp: 100,
  skills: [
    {
      id: "white-secret-attack-rampage",
      name: "Ataque secreto blanco",
      chakra: { neutralChakra: 1 },
      targetType: "enemy",
      description: "Chiyo dirige sus marionetas contra un enemigo e inflige 20 de dano normal. Otro enemigo aleatorio recibe 20 de dano normal al comienzo del segundo turno enemigo siguiente si esta disponible. El siguiente Sanbou Kyuukai de Chiyo consume las acumulaciones de esta habilidad para infligir 5 de dano adicional por acumulacion.",
      effects: [
        { type: "damage", value: 20, targets: "target" },
        {
          type: "complex",
          duration: 1,
          targets: "otherEnemies",
          pickRandom: 1,
          activationDelayTurns: 1,
          isSecret: true,
          showStatusEffect: true,
          descriptions: ["Este personaje recibira 20 de dano normal de Ataque secreto blanco al comienzo del segundo turno enemigo siguiente si esta disponible."],
          effects: [{ type: "damage", value: 20, targets: "self" }]
        },
        {
          type: "modifyDamage",
          value: 5,
          duration: -1,
          targets: "self",
          skillIds: ["sanbou-kyuukai"],
          isStackable: true,
          stackCount: 1,
          statusSourceSkillId: "white-secret-attack-bonus",
          statusSourceSkillName: "Ataque secreto blanco",
          descriptions: ["Sanbou Kyuukai de Chiyo inflige 5 de dano adicional por acumulacion de Ataque secreto blanco. Estas acumulaciones se consumen al usar Sanbou Kyuukai."]
        }
      ],
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "sanbou-kyuukai",
      name: "Sanbou Kyuukai",
      chakra: { neutralChakra: 2 },
      targetType: "enemy",
      description: "Chiyo atrapa a un enemigo con sus marionetas, inflige 20 de dano perforante e ignora invulnerabilidad. El objetivo queda aturdido para habilidades fisicas y especiales por 1 turno y recibe 5 de dano adicional de todas las fuentes durante 1 turno. Consume las acumulaciones de Ataque secreto blanco.",
      effects: [
        { type: "damage", value: 20, damageType: "piercing", targets: "target", ignoreInvulnerable: true },
        { type: "stun", value: 1, targets: "target", familiesAffected: ["physical", "special"], ignoreInvulnerable: true },
        {
          type: "modifyReceivedDamage",
          value: 5,
          duration: 1,
          targets: "target",
          ignoreInvulnerable: true,
          descriptions: ["Este personaje recibe 5 de dano adicional de todas las fuentes."]
        },
        { type: "removeStatus", value: 1, targets: "self", statusSourceSkillIds: ["white-secret-attack-bonus"], statusTypes: ["modifyDamage"] }
      ],
      cooldown: 2,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "ally-puppetry",
      name: "Manipulacion aliada",
      chakra: { neutralChakra: 1 },
      targetType: "ally",
      description: "Chiyo controla a un aliado por 3 turnos. Cada turno, ese aliado anula la primera habilidad fisica, especial o mental no aflictiva usada contra el. Durante este tiempo, sus habilidades fisicas infligen 25% mas dano. Por 2 turnos, esta habilidad es reemplazada por Reencarnacion de vida propia.",
      effects: [
        {
          type: "nullifyNextIncoming",
          duration: 3,
          targets: "target",
          familiesAffected: ["physical", "special", "mental"],
          excludedDamageTypes: ["affliction"],
          chargesPerTurn: 1,
          charges: 1,
          descriptions: ["Este personaje anula la primera habilidad fisica, especial o mental no aflictiva que reciba cada turno."]
        },
        {
          type: "modifyDamageMultiplier",
          multiplier: 1.25,
          duration: 3,
          targets: "target",
          familiesAffected: ["physical"],
          descriptions: ["Las habilidades fisicas de este personaje infligen 25% mas dano."]
        },
        {
          type: "replaceSkill",
          duration: 2,
          targets: "self",
          baseSkillId: "ally-puppetry",
          skillId: "ones-own-life-reincarnation",
          showStatusEffect: false
        }
      ],
      cooldown: 2,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "chakra-shield",
      name: "Escudo de chakra",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Chiyo se vuelve invulnerable por 1 turno.",
      effects: [
        { type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }
      ],
      cooldown: 4,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "ones-own-life-reincarnation",
      name: "Reencarnacion de vida propia",
      chakra: { neutralChakra: 4 },
      targetType: "anyOtherAlly",
      description: "Chiyo selecciona un aliado vivo o caido, lo cura por la vida actual de Chiyo y luego muere. El aliado elegido gana 1 recurso aleatorio al comienzo de sus turnos por el resto de la partida.",
      effects: [
        { type: "heal", targets: "target", affectsDead: true, sourceCurrentHp: true },
        {
          type: "complex",
          duration: -1,
          targets: "target",
          effects: [{ type: "gain-chakra", value: 1, targets: "self" }],
          descriptions: ["Este personaje gana 1 recurso aleatorio al comienzo de sus turnos por el resto de la partida."]
        },
        { type: "instakill", targets: "self" }
      ],
      isExtraSkill: true,
      hideUntilReplaced: true,
      family: ["special", "strategic", "instant"]
    }
  ]
};
