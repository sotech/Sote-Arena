const gojoOffensiveSkillIds = [
  "cursed-technique-blue",
  "cursed-technique-red",
  "infinite-void-domain",
  "cursed-technique-purple"
];

const purpleReplacementRequirements = [
  { type: "hasStatusEffect", sourceSkillId: "cursed-technique-blue" },
  { type: "hasStatusEffect", sourceSkillId: "cursed-technique-red" }
];

const purpleReplacementEffect = {
  type: "replaceSkill",
  duration: 2,
  targets: "self",
  baseSkillId: "limitless-void",
  skillId: "cursed-technique-purple",
  showStatusEffect: false,
  statusSourceSkillId: "gojo-purple-ready",
  statusSourceSkillName: "Hechiceria maldita: Violeta",
  requires: purpleReplacementRequirements
};

export const gojo = {
  id: "gojo",
  name: "Satoru Gojo",
  avatar: "SG",
  bio: "Satoru Gojo domina la energia maldita con tecnicas de atraccion, repulsion y vacio absoluto. Alterna Azul y Rojo para abrir la condicion de Violeta, mientras El Vacio reduce constantemente el dano recibido.",
  maxHp: 100,
  skills: [
    {
      id: "cursed-technique-blue",
      name: "Hechiceria maldita: Azul",
      cost: { azul: 1 },
      targetType: "enemy",
      description: "Gojo atrae a un enemigo con Azul, inflige 25 de dano y hace que ese objetivo reciba 20% de dano adicional de las habilidades ofensivas de Gojo durante 2 turnos. Gojo obtiene Hechiceria maldita: Azul.",
      effects: [
        { type: "damage", value: 25, targets: "target" },
        {
          type: "modifyReceivedDamage",
          mode: "percent",
          value: 20,
          duration: 2,
          targets: "target",
          sourceCharacterIds: ["gojo"],
          skillIds: gojoOffensiveSkillIds,
          statusSourceSkillId: "gojo-blue-vulnerability",
          statusSourceSkillName: "Hechiceria maldita: Azul",
          statusIconSkillId: "cursed-technique-blue",
          descriptions: ["Este personaje recibe 20% de dano adicional de las habilidades ofensivas de Gojo por 2 turnos."]
        },
        {
          type: "complex",
          duration: -1,
          targets: "self",
          effects: [],
          statusSourceSkillId: "gojo-blue-mark",
          statusSourceSkillName: "Hechiceria maldita: Azul",
          statusIconSkillId: "cursed-technique-blue",
          descriptions: ["Gojo mantiene el efecto Hechiceria maldita: Azul."]
        },
        purpleReplacementEffect
      ],
      cooldown: 1,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "cursed-technique-red",
      name: "Hechiceria maldita: Rojo",
      cost: { rojo: 1, negro: 1 },
      targetType: "enemy",
      description: "Gojo repele a un enemigo con Rojo, inflige 30 de dano y reduce el dano realizado por ese objetivo en 20% durante 2 turnos. Gojo obtiene Hechiceria maldita: Rojo.",
      effects: [
        { type: "damage", value: 30, targets: "target" },
        {
          type: "modifyDamageMultiplier",
          multiplier: 0.8,
          duration: 2,
          targets: "target",
          statusSourceSkillId: "gojo-red-weakness",
          statusSourceSkillName: "Hechiceria maldita: Rojo",
          statusIconSkillId: "cursed-technique-red",
          descriptions: ["Este personaje realiza 20% menos de dano por 2 turnos."]
        },
        {
          type: "complex",
          duration: -1,
          targets: "self",
          effects: [],
          statusSourceSkillId: "gojo-red-mark",
          statusSourceSkillName: "Hechiceria maldita: Rojo",
          statusIconSkillId: "cursed-technique-red",
          descriptions: ["Gojo mantiene el efecto Hechiceria maldita: Rojo."]
        },
        purpleReplacementEffect
      ],
      cooldown: 1,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "infinite-void-domain",
      name: "Expansion de Dominio: Vacio infinito",
      cost: { rojo: 2, azul: 2 },
      targetType: "enemies",
      description: "Gojo expande Vacio infinito e inflige 60 de dano perforante a todos los enemigos. Este dano no puede ser reducido por reduccion de dano.",
      effects: [
        { type: "damage", value: 60, damageType: "piercing", targets: "enemies" },        
      ],
      cooldown: 4,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "limitless-void",
      name: "El Vacio",
      passive: true,
      startsActive: true,
      cost: {},
      targetType: "self",
      description: "Pasiva: Gojo reduce todo el dano recibido a si mismo en 40%. Si Gojo tiene Hechiceria maldita: Azul y Hechiceria maldita: Rojo, esta habilidad se reemplaza por Hechiceria maldita: Violeta.",
      effects: [
        {
          type: "damage-reduction",
          value: 40,
          percent: true,
          duration: -1,
          targets: "self",
          statusSourceSkillId: "limitless-void",
          statusSourceSkillName: "El Vacio",
          statusIconSkillId: "limitless-void",
          descriptions: ["Gojo reduce todo el dano recibido a si mismo en 40%."]
        }
      ],
      family: ["strategic", "instant"]
    },
    {
      id: "cursed-technique-purple",
      name: "Hechiceria maldita: Violeta",
      cost: { azul: 1, rojo: 1, negro: 1 },
      targetType: "enemies",
      description: "Gojo combina Azul y Rojo en Violeta e inflige 45 de dano a todos los enemigos. Los enemigos afectados realizan 50% menos de dano por 2 turnos y reciben 25% mas de dano por 2 turnos.",
      effects: [
        { type: "damage", value: 45, targets: "enemies" },
        {
          type: "modifyDamageMultiplier",
          multiplier: 0.5,
          duration: 2,
          targets: "enemies",
          statusSourceSkillId: "gojo-purple-damage-down",
          statusSourceSkillName: "Hechiceria maldita: Violeta",
          statusIconSkillId: "cursed-technique-purple",
          descriptions: ["Este personaje realiza 50% menos de dano por 2 turnos."]
        },
        {
          type: "modifyReceivedDamage",
          mode: "percent",
          value: 25,
          duration: 2,
          targets: "enemies",
          statusSourceSkillId: "gojo-purple-vulnerability",
          statusSourceSkillName: "Hechiceria maldita: Violeta",
          statusIconSkillId: "cursed-technique-purple",
          descriptions: ["Este personaje recibe 25% mas de dano por 2 turnos."]
        },
        { type: "removeStatus", targets: "self", statusSourceSkillIds: ["cursed-technique-blue", "cursed-technique-red", "gojo-purple-ready"] }
      ],
      cooldown: 5,
      isExtraSkill: true,
      hideUntilReplaced: true,
      family: ["special", "offensive", "instant"]
    }
  ]
};
