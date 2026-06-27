# Guia de autoria de habilidades

Las habilidades siguen usando el mismo contrato: cada habilidad declara `effects: []` y cada efecto puede ser simple o expandido con propiedades opcionales.

## Reglas base

- Combate 3 v 3.
- `targetType` de habilidad: `self`, `enemy`, `ally`, `enemies`, `allies`, `allPlayers`.
- `targets` de efecto: `self`, `target`, `origin`, `allies`, `enemies`. Tambien puede ser array: `targets: ["self", "target"]`.
- Duracion: `duration: 1..n`; `duration: -1` es indefinida.
- Un valor numerico puede ser fijo (`value: 25`) o aleatorio (`value: { min: 10, max: 30, multipleOf: 5 }`).
- Para elegir solo algunos objetivos al azar desde un efecto multiobjetivo: `pickRandom: 1` o `randomTargetCount: 1`.

## Requisitos

`requires` acepta condiciones sobre `self`, `target`, `anyTarget`, `anyAlly`, `anyEnemy`.

```js
requires: [
  { scope: "self", type: "hasStatusEffect", effectId: "sharingan" },
  { scope: "target", type: "hp", operator: "lte", value: 50 },
  { scope: "self", type: "hasSkill", skillId: "rasengan" }
]
```

Operadores de vida: `eq`, `gte`, `lte`, `gt`, `lt`, `ne`.

## Efectos duracionales

Usa `complex` para dano/sanacion/escudo/chakra por turnos.

```js
{
  type: "complex",
  duration: 3,
  targets: "target",
  effects: [{ type: "damage", value: 10, damageType: "affliction", targets: "self" }]
}
```

## Muerte instantanea

`instakill` mata a todos los objetivos resueltos poniendo su vida en 0.

```js
{
  requires: [{ scope: "target", type: "hp", operator: "lte", value: 20 }],
  effects: [
    { type: "instakill", targets: "target" },
    { type: "heal", value: 50, targets: "self" }
  ]
}
```

Interrupciones:

```js
{
  type: "complex",
  duration: 4,
  mode: "pauseOnStun",
  interruptFamilies: ["chakra"],
  targets: "self",
  effects: [{ type: "heal", value: 10, targets: "self" }]
}
```

`mode: "cancelOnStun"` elimina el estado al ser aturdido.

## Modificar habilidades

Estos efectos se aplican como estados sobre el personaje objetivo:

```js
{ type: "modifyDamage", duration: 2, value: 10, targets: "self", skillIds: ["chidori"] }
{ type: "modifyDamageByMissingHp", duration: -1, amountPerStep: 5, hpStep: 10, targets: "self", skillIds: ["cacho-lariat"] }
{ type: "modifyDamageType", duration: 2, damageType: "piercing", targets: "self" }
{ type: "modifyTargetType", duration: 1, targetType: "allies", targets: "self", skillIds: ["shadow-clones"] }
{ type: "modifyTargetCount", duration: 1, count: 1, random: true, targets: "self", skillIds: ["shadow-clones"] }
{ type: "addEffectToBase", duration: 2, targets: "self", skillIds: ["rasengan"], effects: [{ type: "stun", value: 1, targets: "target" }] }
{ type: "replaceEffects", duration: 1, targets: "self", skillIds: ["rasengan"], effects: [{ type: "heal", value: 30, targets: "self" }] }
```

## Reemplazar habilidades

```js
{ type: "replaceSkill", duration: 2, targets: "self", baseSkillId: "sand-armor", skillId: "sand-storm" }
```

Para toggle A -> F -> A, la habilidad F debe aplicar otro `replaceSkill` que restaure `baseSkillId: "sand-armor"` con `skillId: "sand-armor"` o usar duracion corta para que vuelva al expirar.

## Estados secretos, counter y reflejo

`counter` y `reflect` son secretos por defecto (`showStatusEffect: false`).

```js
{
  type: "counter",
  duration: 2,
  targets: "self",
  trigger: "incoming",
  charges: 1,
  familiesAffected: ["chakra"]
}
```

`trigger` puede ser `incoming`, `outgoing` o `both`. `charges: -1` no se consume.

```js
{
  type: "reflect",
  duration: 1,
  targets: "self",
  reflectTo: "caster",
  charges: 1
}
```

`reflectTo`: `caster`, `randomCasterAlly`, `casterEnemies`.

## Pasivos

Una habilidad puede marcarse como pasiva de inicio de combate. Se ejecuta automaticamente al comenzar la partida usando la misma resolucion de efectos.

```js
{
  id: "bloodline-instinct",
  name: "Instinto de sangre",
  passive: true,
  trigger: "battleStart",
  targetType: "self",
  effects: [
    { type: "complex", duration: -1, targets: "self", effects: [{ type: "modifyDamage", value: 5, targets: "self" }] }
  ]
}
```

Para pasivos que se activan luego de un evento, usa un estado duracional/indefinido secreto con `counter`, `reflect` o un `complex` con efectos modificadores. Los triggers de evento especificos como "vida llego a X" o "quedan N aliados" deben agregarse como una capa de trigger dedicada si se necesitan con automatizacion completa.
