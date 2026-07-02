export const ichigo = {
  id: "ichigo",
  name: "Kurosaki Ichigo",
  avatar: "KI",
  bio: "Kurosaki Ichigo es un shinigami sustituto de voluntad feroz, capaz de alternar entre tecnicas veloces de Zangetsu y el poder oscuro de su hueco interior.",
  maxHp: 100,
  skills: [
    {
      id: "combo-zangetsu",
      name: "Combo Zangetsu",
      cost: { verde: 1 },
      targetType: "enemy",
      description: "Ichigo inflige 15 de daño a un enemigo por 2 turnos. Durante este tiempo Ichigo es invulnerable a habilidades fisicas y Getsuga Tensho cuesta 1 neutral. Si se usa sobre un enemigo afectado por Getsuga Tensho, Ichigo gana 1 recurso fisico.",
      effects: [
        {
          type: "complex",
          duration: 2,
          targets: "target",
          effects: [{ type: "damage", value: 15, targets: "self" }]
        },
        {
          type: "complex",
          duration: 2,
          targets: "self",
          effects: [{ type: "invulnerable", value: 2, targets: "self", familiesAffected: ["physical"] }],
          descriptions: ["Ichigo es invulnerable a habilidades fisicas."]
        },
        {
          type: "substituteChakraCost",
          duration: 2,
          targets: "self",
          skillIds: ["getsuga-tensho"],
          chakra: { negro: 1 }
        },
        {
          type: "gain-chakra",
          value: 1,
          chakraType: "verde",
          targets: "self",
          require: { scope: "target", type: "hasStatusEffect", effectId: "getsuga-tensho" }
        }
      ],
      cooldown: 2,
      family: ["physical", "instant", "offensive"]
    },
    {
      id: "getsuga-tensho",
      name: "Getsuga Tensho",
      cost: { azul: 1 },
      targetType: "enemy",
      description: "Ichigo inflige 15 de daño a un enemigo por 2 turnos. Durante este tiempo Ichigo es invulnerable a habilidades especiales y Combo Zangetsu cuesta 1 neutral. Si se usa sobre un enemigo afectado por Combo Zangetsu, lo aturde 1 turno.",
      effects: [
        {
          type: "complex",
          duration: 2,
          targets: "target",
          effects: [{ type: "damage", value: 15, targets: "self" }]
        },
        {
          type: "complex",
          duration: 2,
          targets: "self",
          effects: [{ type: "invulnerable", value: 2, targets: "self", familiesAffected: ["special"] }],
          descriptions: ["Ichigo es invulnerable a habilidades especiales."]
        },
        {
          type: "substituteChakraCost",
          duration: 2,
          targets: "self",
          skillIds: ["combo-zangetsu"],
          chakra: { negro: 1 }
        },
        {
          type: "stun",
          value: 1,
          targets: "target",
          require: { scope: "target", type: "hasStatusEffect", effectId: "combo-zangetsu" }
        }
      ],
      cooldown: 2,
      family: ["special", "instant", "offensive"]
    },
    {
      id: "hollow-possession",
      name: "Posesion Hueco",
      cost: { negro: 1 },
      targetType: "self",
      uses: 1,
      hideSkillUses:true,
      isSecret: true,
      description: `Solo se puede usar 1 vez. Se mantiene activa en Ichigo por 3 turnos. Si Ichigo llega a 50 de vida o menos mientras esta habilidad esta activa,
      Ichigo gana Posesion Hueco. Gana 50 de escudo. Si el escudo se rompe, Posesion Hueco - Efecto termina. Combo Zangetsu se reemplaza con Vortice Negro y Getsuga Tensho se reemplaza con Getsuga Tensho Negro.`,
      effects: [
        {
          type: "applyEffectsOntriggerEvent",
          duration: 3,
          targets: "self",
          triggerEvent: "reachHp",
          condition: { type: "hp", comparator: "lte", value: 50 },
          charges: 1,
          disableSkillIds: ["hollow-possession"],
          showStatusEffect: true,
          descriptions: ["Posesion Hueco espera a ser activada."],
          effects: [
            {
              type: "shield",
              value: 50,
              targets: "self",
              isStackable: false,
              duration: "lastUntilShieldBroken",
              statusSourceSkillId: "hollow-possession-effect",
              statusSourceSkillName: "Posesion Hueco - Efecto",
              statusLinkId: "hollow-possession-effect"
            },
            {
              type: "replaceSkill",
              duration: "lastUntilShieldBroken",
              targets: "self",
              baseSkillId: "combo-zangetsu",
              skillId: "black-vortex",
              statusSourceSkillId: "hollow-possession-effect",
              statusSourceSkillName: "Posesion Hueco - Efecto",
              statusLinkId: "hollow-possession-effect"
            },
            {
              type: "replaceSkill",
              duration: "lastUntilShieldBroken",
              targets: "self",
              baseSkillId: "getsuga-tensho",
              skillId: "black-getsuga-tensho",
              showStatusEffect: false,
              statusSourceSkillId: "hollow-possession-effect",
              statusSourceSkillName: "Posesion Hueco - Efecto",
              statusLinkId: "hollow-possession-effect"
            },
            {
              type: "changeAvatarImage",
              duration: "lastUntilShieldBroken",
              targets: "self",
              avatarImage: "ichigo-hollow",
              showStatusEffect: false,
              statusSourceSkillId: "hollow-possession-effect",
              statusSourceSkillName: "Posesion Hueco - Efecto",
              statusLinkId: "hollow-possession-effect"
            }
          ]
        }
      ],
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "bankai-block",
      name: "Bloqueo con Bankai",
      cost: { negro: 1 },
      targetType: "self",
      description: "Ichigo se vuelve invulnerable por 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    },
    {
      id: "hollow-possession-effect",
      name: "Posesion Hueco - Efecto",
      passive: true,
      cost: {},
      targetType: "self",
      description: "Ichigo gana 50 de escudo. Si se rompe todo el escudo, Posesion Hueco - Efecto termina. Combo Zangetsu se reemplaza con Vortice Negro y Getsuga Tensho con Getsuga Tensho Negro.",
      effects: [
        {
          type: "shield",
          value: 50,
          targets: "self",
          isStackable: false,
          duration: "lastUntilShieldBroken",
          statusLinkId: "hollow-possession-effect"
        }
      ],
      hideUntilReplaced: true,
      hideSkillInInspect: true,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "black-vortex",
      name: "Vortice Negro",
      cost: { azul: 1, negro: 2 },
      targetType: "enemies",
      description: "Ichigo inflige 30 de daño perforante a todos los enemigos.",
      effects: [{ type: "damage", value: 30, damageType: "piercing", targets: "target" }],
      cooldown: 2,
      isExtraSkill: true,
      hideUntilReplaced: true,
      family: ["special", "offensive", "instant"]
    },
    {
      id: "black-getsuga-tensho",
      name: "Getsuga Tensho Negro",
      cost: { azul: 1, blanco: 1 },
      targetType: "enemy",
      description: "Ichigo inflige 45 de daño perforante a un enemigo.",
      effects: [{ type: "damage", value: 45, damageType: "piercing", targets: "target" }],
      cooldown: 2,
      isExtraSkill: true,
      hideUntilReplaced: true,
      family: ["special", "offensive", "instant"]
    }
  ]
};
