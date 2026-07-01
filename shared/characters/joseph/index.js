export const joseph = {
  id: "joseph",
  name: "Joseph Joestar",
  avatar: "JJ",
  maxHp: 100,
  bio: "Joseph Joestar es un luchador ingenioso y extravagante que vence a sus enemigos combinando astucia, humor y una increíble capacidad de improvisación. Su dominio del Hamon y su talento para anticipar los movimientos del rival lo convierten en un combatiente tan impredecible como peligroso.",
  deathSound: { soundname: "joseph", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "clacker-volley",
      name: "Boleadoras Resonantes",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Joseph lanza sus Boleadoras con Hamon. Inflige 20 de daño y aumenta 5 por cada acumulacion de Hamon.",
      effects: [{ type: "damage", value: 20, targets: "target" }],
      cooldown: 0,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "hamon",
      name: "Hamon",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: "Joseph obtiene 1 acumulacion de Hamon, 50% de reduccion de daño durante 3 turnos y devuelve 5 de daño especial al atacante si recibe daño. Cada Hamon aumenta Boleadoras Resonantes en 5.",
      effects: [
        { type: "modifyDamage", value: 5, duration: -1, targets: "self", skillIds: ["clacker-volley"], isStackable: true },
        { type: "damage-reduction", value: 50, percent: true, duration: 3, targets: "self" },
        { type: "spike", value: 5, damageType: "special", duration: 3, targets: "self", descriptions: ["Hamon devuelve 5 de daño especial al atacante cuando Joseph recibe daño."] }
      ],
      cooldown: 4,
      family: ["special", "strategic", "instant"]
    },
    {
      id: "your-next-line",
      name: "Tu siguiente frase es...",
      chakra: { genjutsu: 1 },
      targetType: "enemy",
      isSecret: true,
      description: "Joseph predice el movimiento enemigo y prepara un counter. Si contrarresta una habilidad, obtiene 1 acumulacion de Hamon.",
      effects: [{
        type: "counter",
        duration: 1,
        targets: "target",
        trigger: "outgoing",
        familiesAffected: ["offensive"],
        charges: 1,
        showStatusEffect: true,
        descriptions: ["Tu siguiente frase es... fue usada en este personaje."],
        counteredNoticeTemplate: "Tu siguiente frase es: {skillName}",
        effects: [
          { type: "modifyDamage", isStackable: true ,value: 5, duration: -1, targets: "origin", skillIds: ["clacker-volley"], statusNoticeDescription: "Tu siguiente frase es: habilidad contrarrestada" }
        ]
      }],
      cooldown: 2,
      family: ["mental", "strategic", "instant"]
    },
    {
      id: "nigerundayo",
      name: "Nigerundayo!",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Joseph decide que la mejor estrategia es escapar. Obtiene invulnerabilidad durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "strategic", "instant"]
    }
  ]
};
