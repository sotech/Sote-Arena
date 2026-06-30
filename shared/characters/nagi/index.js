export const nagi = {
  id: "nagi",
  name: "Nagi Seishiro",
  avatar: "NS",
  maxHp: 100,
  deathSound: { soundname: "nagi", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "volley-shot",
      name: "Remate de volea",
      chakra: { taijutsu: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: "Nagi controla el balon y ejecuta una volea perfecta. Inflige 30 de dano y obtiene Flow, aumentando Remate de Cinco Etapas en 15.",
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
          maxStacks: 3,
          statusSourceSkillId: "flow-stacks",
          statusSourceSkillName: "Acumulaciones de La Zona",
          statusIconSkillId: "flow",
          descriptions: ["Remate de Cinco Etapas gana 15 de dano por cada acumulacion de La Zona."]
        }
      ],
      cooldown: 0,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "flow",
      name: "La Zona",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Otorga 1 acumulacion de La Zona. Cada acumulacion aumenta Five-Stage Volley en 15 de dano. Maximo: 3 acumulaciones.",
      effects: [{
        type: "modifyDamage",
        value: 15,
        duration: -1,
        targets: "self",
        skillIds: ["five-stage-volley"],
        isStackable: true,
        stackCount: 1,
        maxStacks: 3,
        statusSourceSkillId: "flow-stacks",
        statusSourceSkillName: "Acumulaciones de La Zona",
        statusIconSkillId: "flow",
        descriptions: ["Remate de Cinco Etapas gana 15 de dano por cada acumulacion de La Zona."]
      }],
      cooldown: 1,
      family: ["instant"]
    },
    {
      id: "five-stage-volley",
      name: "Remate de Cinco Etapas",
      chakra: { taijutsu: 2 },
      targetType: "enemy",
      description: "Nagi ejecuta un remate imposible. Inflige 25 de dano mas el bono de La Zona y elimina 1 grupo de acumulaciones de La Zona. No puede ser contrarestada, reflejada e ignora invulnerabilidad.",
      effects: [
        { type: "damage", value: 25, targets: "target", ignoreInvulnerable: true },
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
      description: "Nagi obtiene 75% de reduccion de dano durante 3 turnos. Por este tiempo, Remate de volea cuesta 1 recurso fisico menos.",
      effects: [
        { type: "damage-reduction", value: 75, percent: true, duration: 3, targets: "self" },
        { type: "modifyChakraCost", chakra: { taijutsu: -1 }, duration: 3, targets: "self", skillIds: ["volley-shot"] }
      ],
      cooldown: 3,
      family: ["defensive", "instant"]
    }
  ]
};
