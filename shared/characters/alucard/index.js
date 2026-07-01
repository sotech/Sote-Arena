export const alucard = {
  id: "alucard",
  name: "Alucard",
  avatar: "AL",
  maxHp: 100,
  bio: "Alucard es un vampiro inmortal de poder abrumador que disfruta enfrentarse a los enemigos más peligrosos con una confianza inquebrantable. Su capacidad para regenerarse, controlar legiones de almas y liberar su aterrador Nivel de Restricción 0 lo convierten en una fuerza prácticamente imparable.",
  deathSound: { soundname: "alucard", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "casull-jackal",
      name: "Casull & Jackal",
      chakra: { bloodline: 1, neutralChakra: 1 },
      targetType: "enemy",
      description: `Alucard dispara ambas pistolas insignia hacia un enemigo. 
        Inflige 20 de daño a un enemigo durante 2 turnos y recupera 10 de vida si inflingieron daño. 
        Esta habilidad puede ser interrumpida si Alucard es aturdido.`,
      effects: [
        {
          type: "complex",
          duration: 2,
          targets: "self",
          mode: "interruptible",
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "casull-jackal",
          showStatusEffect: true,
          descriptions: ["Casull & Jackal puede ser interrumpida."]
        },
        {
          type: "complex",
          duration: 2,
          targets: "target",
          cancelIfOriginStunned: true,
          interruptFamilies: ["physical", "channeled", "offensive"],
          statusLinkId: "casull-jackal",
          effects: [
            { type: "damage", value: 20, targets: "self" },
            { type: "self-heal", value: 10, targets: "origin", requirePreviousDamage: true }
          ]
        }
      ],
      cooldown: 3,
      family: ["physical", "offensive", "channeled"]
    },
    {
      id: "mist-form",
      name: "Forma de Niebla",
      chakra: { bloodline: 2 },
      targetType: "enemies",
      description: `Alucard se disuelve en niebla y atraviesa a sus enemigos. 
        Inflige 15 de daño de afliccion a todos los enemigos, obtiene invulnerabilidad por 1 turno y recupera 15 de vida.`,
      effects: [
        { type: "damage", value: 15, targets: "target", damageType: "affliction" },
        { type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] },
        { type: "self-heal", value: 15, targets: "self" }
      ],
      cooldown: 4,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "restriction-level-zero",
      name: "Nivel de Restriccion 0",
      chakra: { bloodline: 2 },
      targetType: "self",
      description: `Teniendo la aprobación, Alucard despliega su forma final, sin restricciones pero quedando expuesto.
        Casull & Jackal y Forma de niebla hacen el doble de daño. 
        Durante este tiempo Alucard recibe 25% mas de daño. Esta habilidad solo puede utilizarse una vez por combate.`,
      effects: [
        {
          type: "modifyDamage",
          value: 20,
          duration: -1,
          targets: "self",
          skillIds: ["casull-jackal"],
          statusSourceSkillId: "restriction-level-zero-casull",
          statusSourceSkillName: "Nivel de Restriccion 0",
          statusIconSkillId: "restriction-level-zero",
          descriptions: ["Casull & Jackal hacen el doble de dano. Forma de niebla hace el doble de dano. Alucard recibe 25% mas de dano."]
        },
        {
          type: "modifyDamage",
          value: 15,
          duration: -1,
          targets: "self",
          skillIds: ["mist-form"],
          statusSourceSkillId: "restriction-level-zero-mist",
          statusSourceSkillName: "Nivel de Restriccion 0",
          statusIconSkillId: "restriction-level-zero",
          descriptions: ["Casull & Jackal hacen el doble de dano. Forma de niebla hace el doble de dano. Alucard recibe 25% mas de dano."]
        },
        {
          type: "modifyReceivedDamage",
          value: 25,
          duration: -1,
          targets: "self",
          mode: "percent",
          statusSourceSkillId: "restriction-level-zero-vulnerability",
          statusSourceSkillName: "Nivel de Restriccion 0",
          statusIconSkillId: "restriction-level-zero",
          descriptions: ["Alucard recibe 25% mas de dano."]
        }
      ],
      uses: 1,
      cooldown: 0,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "undead-king",
      name: "Rey sin vida",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Alucard obtiene invulnerabilidad durante 1 turno. PASIVA: La primera vez que Alucard llega a 0 HP, revive con 50 HP. Si revive, Nivel de Restriccion 0 queda deshabilitado permanentemente.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "undead-king-passive",
      name: "Rey sin vida pasiva",
      passive: true,
      startsActive: true,
      chakra: {},
      targetType: "self",
      description: "La primera vez que Alucard llega a 0 HP, revive con 50 HP y deshabilita Nivel de Restriccion 0.",
      effects: [{ type: "reviveOnDeath", value: 50, hp: 50, duration: -1, targets: "self", disableSkillIds: ["restriction-level-zero"] }],
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["special", "strategic", "instant"]
    }
  ]
};
