export const nagi = {
  id: "nagi",
  name: "Nagi Seishiro",
  avatar: "NS",
  maxHp: 100,
  deathSound: { soundname: "nagi", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "volley-shot",
      name: "Volley Shot",
      chakra: { taijutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Nagi controla el balon y ejecuta una volea perfecta. Inflige 30 de dano y obtiene Flow, aumentando Five-Stage Volley en 15.",
      effects: [
        { type: "damage", value: 30, targets: "target" },
        {
          type: "modifyDamage",
          value: 15,
          duration: -1,
          targets: "self",
          skillIds: ["five-stage-volley"],
          isStackable: true,
          stackCount: 1,
          statusSourceSkillId: "flow-stacks",
          statusSourceSkillName: "Acumulaciones de Flow",
          statusIconSkillId: "flow",
          descriptions: ["Five-Stage Volley gana 15 de dano por cada Acumulacion de Flow."]
        }
      ],
      cooldown: 0,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "flow",
      name: "Flow",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Otorga 1 acumulacion de Flow. Cada acumulacion aumenta Five-Stage Volley en 15 de dano. Maximo recomendado: 3 acumulaciones.",
      effects: [{
        type: "modifyDamage",
        value: 15,
        duration: -1,
        targets: "self",
        skillIds: ["five-stage-volley"],
        isStackable: true,
        stackCount: 1,
        statusSourceSkillId: "flow-stacks",
        statusSourceSkillName: "Acumulaciones de Flow",
        statusIconSkillId: "flow",
        descriptions: ["Five-Stage Volley gana 15 de dano por cada Acumulacion de Flow."]
      }],
      cooldown: 1,
      family: ["instant"]
    },
    {
      id: "five-stage-volley",
      name: "Five-Stage Volley",
      chakra: { taijutsu: 2 },
      targetType: "enemy",
      description: "Nagi ejecuta un remate imposible. Inflige 20 de dano mas el bono de Flow y elimina 1 grupo de Acumulaciones de Flow. Ignora Counter, Reflect e Invulnerabilidad.",
      effects: [
        { type: "damage", value: 20, targets: "target", ignoreInvulnerable: true },
        { type: "removeStatus", value: 1, targets: "self", statusSourceSkillIds: ["flow-stacks"], statusTypes: ["modifyDamage"] }
      ],
      uncountereable: true,
      nonReflectable: true,
      cooldown: 1,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "lazy-genius",
      name: "Lazy Genius",
      chakra: { genjutsu: 1 },
      targetType: "self",
      description: "Nagi obtiene 75% de reduccion de dano durante 1 turno. Hasta su siguiente turno, Volley Shot cuesta 1 recurso fisico menos.",
      effects: [
        { type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] },
        { type: "damage-reduction", value: 75, percent: true, duration: 1, targets: "self" },
        { type: "modifyChakraCost", chakra: { taijutsu: -1 }, duration: 1, targets: "self", skillIds: ["volley-shot"] }
      ],
      cooldown: 4,
      family: ["defensive", "instant"]
    }
  ]
};
