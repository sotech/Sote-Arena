# Guia de autoria de personajes y habilidades

Esta guia documenta el contrato actual para crear personajes en `shared/characters/*/index.js` y habilidades con `effects: []`.

## Crear un personaje

1. Crea una carpeta en `shared/characters/<id>/index.js`.
2. Exporta un objeto con el mismo nombre que luego se importa en `shared/characters.js`.
3. Agrega la imagen `src/assets/characters/<id>.png`.
4. Importa y agrega el personaje al array `characters` en `shared/characters.js`.
5. Cada personaje debe tener normalmente 4 habilidades base; las pasivas y habilidades extra pueden sumarse al mismo array.

```js
export const ejemplo = {
  id: "ejemplo",
  name: "Personaje Ejemplo",
  avatar: "PE",
  maxHp: 100,
  skills: [
    {
      id: "golpe-ejemplo",
      name: "Golpe ejemplo",
      cost: { verde: 1 },
      targetType: "enemy",
      description: "Inflige 25 de dano a un enemigo.",
      effects: [{ type: "damage", value: 25, targets: "target" }],
      cooldown: 1,
      family: ["physical", "instant", "offensive"]
    }
  ]
};
```

## Campos de habilidad

- `id`: slug unico de la habilidad. Debe coincidir con el nombre del icono en `src/assets/skills/<id>.png`.
- `name`: nombre visible.
- `cost`: coste. Tipos validos: `verde`, `azul`, `rojo`, `blanco`, `negro`.
- `targetType`: `self`, `enemy`, `ally`, `otherAlly`, `anyCharacter`, `enemies`, `allies`, `allPlayers`.
- `description`: texto visible para el jugador.
- `effects`: lista de efectos resueltos al usar la habilidad.
- `cooldown`: turnos de recarga. Si se omite, se completa con `0`.
- `family`: tags para stun/counter/reflect. Usados actualmente: `chakra`, `physical`, `mental`, `instant`, `offensive`.
- `requires`: requisitos para permitir usar la habilidad.
- `passive: true`: habilidad pasiva. Con `trigger: "battleStart"` se ejecuta al iniciar combate.
- `isSecret: true`: marca la habilidad como secreta en logs/estados cuando aplica.
- `uncountereable: true`: la habilidad no puede ser contrarrestada.
- `nonReflectable: true`: la habilidad no puede ser reflejada.
- `isExtraSkill: true`: no cuenta como habilidad base y solo aparece por reemplazo u otra logica.
- `hideUntilReplaced: true`: oculta la habilidad hasta que sea la habilidad activa.
- `hideSkillInInspect: true`: oculta la habilidad en la UI de inspeccion del personaje. No cambia si la habilidad existe, si se puede usar, si cuenta como base o si puede aparecer por reemplazo.
- `hideSkillUses: true`: para habilidades con `uses`/`maxUses`, oculta el estado visual de usos restantes en la UI. No cambia el limite real de usos.

## Objetivos

`targetType` vive en la habilidad y define que puede seleccionar el jugador.

`targets` vive en cada efecto y define a quien afecta el efecto despues de seleccionar objetivo:

- `target`: usa el objetivo seleccionado por `targetType`; puede resolver a uno o varios miembros.
- `self`: usa al personaje que lanza la habilidad.
- `origin`: en estados `complex`, usa al lanzador original si todavia existe.
- `allies`: todos los aliados vivos del lanzador.
- `enemies`: todos los enemigos vivos seleccionables.
- Tambien puede ser array: `targets: ["self", "target"]`.

Para efectos multiobjetivo puedes limitar aleatoriamente con `pickRandom: 1` o `randomTargetCount: 1`.

## Requisitos y condiciones

`requires` en una habilidad bloquea el uso si no se cumple. `require` o `when` en un efecto bloquea solo ese efecto.

Scopes validos: `self`, `target`, `anyTarget`, `anyAlly`, `otherAlly`, `anyEnemy`.

Tipos validos: `hasStatusEffect`, `hasSkill`, `hasMinHp`, `hasMaxHp`, `hp`, `characterId`.

Operadores de vida: `eq`, `gte`, `lte`, `gt`, `lt`, `ne`.

```js
requires: [
  { scope: "target", type: "hp", operator: "lte", value: 20, message: "Requiere un enemigo con 20 de vida o menos." },
  { scope: "self", type: "hasStatusEffect", effectId: "modo-especial" }
]
```

```js
effects: [
  { type: "damage", value: 40, targets: "target" },
  { type: "stun", value: 1, targets: "target", require: { scope: "self", type: "hasStatusEffect", effectId: "modo-especial" } },
  { type: "instakill", targets: "target", when: { type: "hasStatusEffect", effectId: "marca" } }
]
```

`damage.bonusWhen` suma dano si una condicion se cumple:

```js
{ type: "damage", value: 20, targets: "target", bonusWhen: [{ bonus: 10, require: { scope: "self", type: "hp", operator: "lt", value: 50 } }] }
```

## Flags comunes de efectos

- `duration`: duracion del estado. `-1` es indefinido.
- `value`: valor principal. Puede ser numero o aleatorio: `{ min: 10, max: 30, multipleOf: 5 }`.
- `showStatusEffect`: muestra u oculta el estado. `counter` y `reflect` son secretos por defecto.
- `ignoreInvulnerable: true`: el efecto afecta objetivos invulnerables.
- `tooltipDescription`: HTML opcional para el tooltip del estado.
- `descriptions`: textos visibles del estado generado.
- `statusIconSkillId`: id de skill usado solo para la imagen del tooltip/status cuando `sourceSkillId` es un id tecnico.
- `isStackable`: permite acumular con aplicaciones previas del mismo tipo/fuente cuando el efecto lo soporta.
- `skillIds`: limita modificadores a habilidades especificas. Si se omite en modificadores, suele afectar a todas.
- `familiesAffected`: limita stun/counter/reflect a habilidades con alguna familia coincidente.

## Efectos soportados

| Efecto | Campos principales | Uso |
| --- | --- | --- |
| `damage` | `value`, `targets`, `damageType`, `bonusWhen` | Inflige dano. `damageType`: `basic`/`normal`, `piercing`, `affliction`. |
| `instakill` | `targets` | Mata poniendo la vida en 0. |
| `heal` | `value`, `targets` | Cura hasta la vida maxima. |
| `self-heal` | `value`, `targets` | Cura al lanzador. |
| `payLife` | `value`, `targets`, `notKill` | Paga vida. Con `notKill` no baja de 1 HP. |
| `shield` | `value`, `targets`, `isStackable` | Otorga escudo destruible. |
| `breakShield` | `value`, `targets` | Destruye el escudo actual del objetivo. |
| `damage-reduction` | `value`, `duration`, `targets`, `restoresEachTurn`, `percent` | Reduce dano recibido. Con `percent` usa porcentaje y no se consume. |
| `invulnerable` | `value`, `targets` | Impide que enemigos seleccionen al objetivo. Normalmente va dentro de `complex`. |
| `stun` | `value`, `targets`, `familiesAffected` | Impide usar habilidades durante turnos. |
| `stunImmunity` | `value`, `duration`, `targets`, `skillIds` | Ignora stun de habilidades especificas o de todas. |
| `effect-immunity` | `duration`, `targets` | Ignora efectos recibidos que no sean dano o sanacion. |
| `ignoreEffects` | `duration`, `targets`, `ignoreEffects` | Recibe estados, pero ignora tipos de efecto al resolverlos. |
| `gain-chakra` | `value`, `targets`, `chakraType` | Da chakra al dueno del objetivo. Sin `chakraType`, elige al azar. |
| `remove-chakra` | `value`, `targets`, `chakraType` | Quita chakra del pool enemigo. Sin `chakraType`, elige al azar. |
| `modifyChakraCost` | `chakra`, `duration`, `targets`, `skillIds` | Suma/resta coste de chakra. El coste final no baja de 0. |
| `substituteChakraCost` | `chakra`, `duration`, `targets`, `skillIds` | Sobrescribe el coste final de chakra. |
| `modifyDamage` | `value`, `duration`, `targets`, `skillIds`, `isStackable` | Suma o resta dano de habilidades. |
| `modifyDamageByMissingHp` | `amountPerStep`, `hpStep`, `duration`, `targets`, `skillIds` | Suma dano por vida faltante del portador. |
| `modifyDamageMultiplier` | `multiplier`, `duration`, `targets`, `skillIds`, `targetStatus` | Multiplica el dano de habilidades. `targetStatus` limita el multiplicador a objetivos con un estado especifico. |
| `modifyDamageType` | `damageType`, `duration`, `targets`, `skillIds` | Cambia el tipo de dano. |
| `modifyTargetType` | `targetType`, `duration`, `targets`, `skillIds` | Cambia temporalmente el `targetType` activo. |
| `modifyTargetCount` | `count`, `random`, `duration`, `targets`, `skillIds` | Limita cuantos objetivos resuelve una habilidad. |
| `addEffectToBase` | `duration`, `targets`, `skillIds`, `effects` | Agrega efectos extra a habilidades. |
| `replaceEffects` | `duration`, `targets`, `skillIds`, `effects` | Reemplaza todos los efectos de habilidades. |
| `replaceSkill` | `duration`, `targets`, `baseSkillId`, `skillId`, `showStatusEffect` | Reemplaza una habilidad base por otra. |
| `addUncountereable` | `duration`, `targets`, `skillIds` | Hace no countereables habilidades del objetivo. |
| `addNonReflectable` | `duration`, `targets`, `skillIds` | Hace no reflejables habilidades del objetivo. |
| `removeStatus` | `value`, `targets`, `statusSourceSkillIds`, `statusTypes` | Remueve estados por cantidad, fuente o tipo. |
| `conditionalEffects` | `targets`, `cases` | Aplica efectos segun casos condicionales. |
| `onEnemyDeath` | `duration`, `targets`, `effects`, `showStatusEffect` | Crea un estado pasivo que dispara efectos cuando muere un enemigo. |
| `allyCountStatus` | `duration`, `targets`, `excludeSelf`, `damageReductionPerAlly`, `shieldPerAlly`, `maxShieldPerAlly`, `maxShield` | Escudo/reduccion segun aliados vivos. |
| `counter` | `duration`, `targets`, `trigger`, `charges`, `skillIds`, `familiesAffected`, `effects` | Cancela habilidades y puede disparar efectos al consumirse. |
| `reflect` | `duration`, `targets`, `reflectTo`, `charges`, `skillIds`, `familiesAffected` | Refleja efectos dirigidos al portador. |
| `reviveOnDeath` | `hp`, `duration`, `targets`, `removeNegativeEffects`, `invulnerableTurns`, `disableSkillIds` | Revive una vez al llegar a 0 HP. |
| `complex` | `duration`, `targets`, `effects`, `mode`, `interruptFamilies`, `activationDelayTurns`, `cancelIfOriginStunned`, `statusLinkId`, `suppressSecretEndNotice` | Crea un estado duracional que aplica efectos hijos. |

## Estados duracionales con `complex`

Usa `complex` para dano, curacion, escudo, chakra o modificadores por turnos.

```js
{
  type: "complex",
  duration: 3,
  targets: "target",
  effects: [{ type: "damage", value: 10, damageType: "affliction", targets: "self" }]
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

- `mode: "pauseOnStun"` pausa el estado si el portador esta aturdido.
- `mode: "cancelOnStun"` elimina el estado si el portador esta aturdido.
- `cancelIfOriginStunned: true` cancela el estado si el lanzador original esta aturdido.
- `activationDelayTurns` retrasa la primera aplicacion.
- `statusLinkId` vincula estados relacionados para eliminarlos juntos.
- `suppressSecretEndNotice` oculta el aviso final de secretos.

## Modificar habilidades

Estos efectos se aplican como estados sobre el personaje objetivo y alteran sus habilidades mientras duren:

```js
{ type: "modifyDamage", duration: 2, value: 10, targets: "self", skillIds: ["chidori"] }
{ type: "modifyDamageByMissingHp", duration: -1, amountPerStep: 5, hpStep: 10, targets: "self", skillIds: ["cacho-lariat"] }
{ type: "modifyDamageType", duration: 2, damageType: "piercing", targets: "self" }
{ type: "modifyTargetType", duration: 1, targetType: "allies", targets: "self", skillIds: ["shadow-clones"] }
{ type: "modifyTargetCount", duration: 1, count: 1, random: true, targets: "self", skillIds: ["shadow-clones"] }
{ type: "addEffectToBase", duration: 2, targets: "self", skillIds: ["rasengan"], effects: [{ type: "stun", value: 1, targets: "target" }] }
{ type: "replaceEffects", duration: 1, targets: "self", skillIds: ["rasengan"], effects: [{ type: "heal", value: 30, targets: "self" }] }
```

## Reemplazar habilidades y skills extra

`replaceSkill` cambia una habilidad base por otra habilidad definida en el mismo personaje.

```js
{
  id: "modo-arena",
  name: "Modo arena",
  cost: { negro: 1 },
  targetType: "self",
  effects: [{ type: "replaceSkill", duration: 2, targets: "self", baseSkillId: "sand-armor", skillId: "sand-storm" }]
}
```

La habilidad reemplazante debe existir:

```js
{
  id: "sand-storm",
  name: "Tormenta de arena",
  cost: { negro: 2 },
  targetType: "enemies",
  effects: [{ type: "damage", value: 20, targets: "target" }],
  isExtraSkill: true,
  hideUntilReplaced: true
}
```

Para toggle A -> B -> A, la habilidad B puede aplicar otro `replaceSkill` con el mismo `baseSkillId` y `skillId` de la habilidad original, o usar una duracion corta para que vuelva al expirar.

## Counter y reflejo

`counter` y `reflect` son secretos por defecto. Usa `showStatusEffect: true` si deben verse.

```js
{
  type: "counter",
  duration: 2,
  targets: "self",
  trigger: "incoming",
  charges: 1,
  familiesAffected: ["chakra"],
  effects: [{ type: "damage", value: 10, targets: "origin" }]
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

Una habilidad puede saltarse estas defensas con flags directos:

```js
{
  id: "golpe-imparable",
  uncountereable: true,
  nonReflectable: true,
  effects: [{ type: "damage", value: 20, targets: "target", ignoreInvulnerable: true }]
}
```

## Pasivos

Una habilidad pasiva de inicio de combate se ejecuta automaticamente al comenzar la partida.

```js
{
  id: "rojo-instinct",
  name: "Instinto de sangre",
  passive: true,
  trigger: "battleStart",
  targetType: "self",
  cost: {},
  effects: [
    { type: "complex", duration: -1, targets: "self", effects: [{ type: "modifyDamage", value: 5, targets: "self" }] }
  ],
  hideUntilReplaced: true
}
```

Para pasivos activados por eventos, usa estados duracionales/indefinidos con `counter`, `reflect`, `reviveOnDeath`, `ignoreEffects` o modificadores dentro de `complex`.

Ejemplo de pasivo por muerte enemiga:

```js
{
  id: "black-feather",
  name: "Pluma negra",
  passive: true,
  startsActive: true,
  targetType: "self",
  cost: {},
  effects: [{
    type: "onEnemyDeath",
    duration: -1,
    targets: "self",
    effects: [{
      type: "damage-reduction",
      value: 25,
      percent: true,
      duration: 2,
      targets: "self",
      isStackable: true,
      stackCount: 1,
      statusIconSkillId: "black-feather"
    }]
  }]
}
```

## Checklist antes de commitear

- El personaje esta importado en `shared/characters.js`.
- Cada habilidad tiene `id`, `name`, `chakra`, `targetType`, `description`, `effects`, `family` y `cooldown` cuando corresponda.
- Las habilidades no pasivas tienen coste de chakra mayor a 0.
- El cuarto skill base suele ser `substitution-jutsu` con `cooldown: 4`.
- `isExtraSkill` no aparece como base; usa `hideUntilReplaced` si no debe verse hasta estar activa.
- Usa `hideSkillInInspect` solo para ocultar informacion en la inspeccion visual; no reemplaza `isExtraSkill` ni `hideUntilReplaced`.
- `skillIds`, `baseSkillId`, `effectId` y assets usan ids reales.
- Los efectos que generan estados tienen `duration`; los efectos instantaneos no la necesitan.
- Ejecuta `npm test` despues de agregar o cambiar mecanicas/personajes.
