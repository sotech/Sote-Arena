export const joseph = {
  id: "joseph",
  name: "Joseph Joestar",
  avatar: "JJ",
  maxHp: 100,
  deathSound: { soundname: "joseph", shouldFadeIn: true, shouldFadeOut: true },
  skills: [
    {
      id: "clacker-volley",
      name: "Clacker Volley",
      chakra: { taijutsu: 1 },
      targetType: "enemy",
      description: "Joseph lanza sus Clackers con Hamon. Inflige 20 de dano y aumenta 10 por cada acumulacion de Hamon.",
      effects: [{ type: "damage", value: 20, targets: "target" }],
      cooldown: 0,
      family: ["physical", "offensive", "instant"]
    },
    {
      id: "hamon",
      name: "Hamon",
      chakra: { bloodline: 1 },
      targetType: "self",
      description: "Joseph obtiene 1 acumulacion de Hamon y 75% de reduccion de dano durante 1 turno. Cada Hamon aumenta Clacker Volley en 10.",
      effects: [
        { type: "modifyDamage", value: 10, duration: -1, targets: "self", skillIds: ["clacker-volley"], isStackable: true },
        { type: "damage-reduction", value: 75, percent: true, duration: 1, targets: "self" }
      ],
      cooldown: 2,
      family: ["strategic", "instant"]
    },
    {
      id: "your-next-line",
      name: "Tu siguiente frase es...",
      chakra: { genjutsu: 1 },
      targetType: "enemy",
      isSecret: true,
      description: "Joseph predice el movimiento enemigo y prepara un counter. Si contrarresta una habilidad, obtiene 2 acumulaciones de Hamon equivalentes a 20 de dano adicional.",
      effects: [{
        type: "counter",
        duration: 1,
        targets: "target",
        trigger: "outgoing",
        charges: 1,
        effects: [
          { type: "modifyDamage", value: 20, duration: -1, targets: "origin", skillIds: ["clacker-volley"], statusNoticeDescription: "Tu siguiente frase es: habilidad contrarrestada" }
        ]
      }],
      cooldown: 1,
      family: ["strategic", "instant"]
    },
    {
      id: "nigerundayo",
      name: "Nigerundayo!",
      chakra: { neutralChakra: 1 },
      targetType: "self",
      description: "Joseph decide que la mejor estrategia es escapar. Obtiene invulnerabilidad durante 1 turno.",
      effects: [{ type: "complex", duration: 1, targets: "self", effects: [{ type: "invulnerable", value: 1, targets: "self" }] }],
      cooldown: 4,
      family: ["physical", "instant"]
    }
  ]
};
