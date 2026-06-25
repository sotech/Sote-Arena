import express from "express";
import cors from "cors";
import http from "http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { characters, getCharacterById } from "../shared/characters.js";
import { supportedEffectTypes } from "../shared/effects.js";

const PORT = process.env.PORT || 3002;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173";
const CLIENT_ORIGINS = CLIENT_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean);

const app = express();
app.use(cors({ origin: CLIENT_ORIGINS }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGINS,
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const socketRooms = new Map();
const CHAKRA_TYPES = ["taijutsu", "ninjutsu", "bloodline", "genjutsu"];
const NEUTRAL_CHAKRA = "neutralChakra";

function emptyChakra() {
  return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
}

function cloneChakra(chakra) {
  return { ...emptyChakra(), ...chakra };
}

function cloneCooldowns(cooldowns) {
  return { ...(cooldowns || {}) };
}

function totalChakra(chakra) {
  return CHAKRA_TYPES.reduce((total, type) => total + (chakra?.[type] || 0), 0);
}

function cleanChakraSelection(chakra = {}) {
  return CHAKRA_TYPES.reduce((selection, type) => {
    const amount = Number(chakra[type] || 0);
    selection[type] = Number.isInteger(amount) && amount > 0 ? amount : 0;
    return selection;
  }, emptyChakra());
}

function chakraLabel(cost) {
  return Object.entries(cost)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => `${amount} ${type === NEUTRAL_CHAKRA ? "neutral" : type}`)
    .join(", ");
}

function canPay(chakra, cost) {
  return CHAKRA_TYPES.every((type) => (chakra?.[type] || 0) >= (cost?.[type] || 0));
}

function specificChakraCost(cost = {}) {
  return CHAKRA_TYPES.reduce((specific, type) => {
    specific[type] = Math.max(0, Number(cost[type] || 0));
    return specific;
  }, emptyChakra());
}

function neutralChakraCost(cost = {}) {
  return Math.max(0, Number(cost[NEUTRAL_CHAKRA] || 0));
}

function requiredChakraTotal(cost = {}) {
  return totalChakra(specificChakraCost(cost)) + neutralChakraCost(cost);
}

function queuedNeutralChakraCost(player) {
  return (player?.queue || []).reduce((total, action) => total + neutralChakraCost(action.chakra), 0);
}

function canPaySkillCost(chakra, cost = {}, reservedNeutral = 0) {
  return canPay(chakra, specificChakraCost(cost)) && totalChakra(chakra) >= reservedNeutral + requiredChakraTotal(cost);
}

function payChakra(player, cost) {
  for (const type of CHAKRA_TYPES) {
    const amount = Math.max(0, Number(cost?.[type] || 0));
    player.chakra[type] = Math.max(0, (player.chakra[type] || 0) - amount);
  }
}

function refundChakra(player, cost) {
  for (const type of CHAKRA_TYPES) {
    const amount = Math.max(0, Number(cost?.[type] || 0));
    player.chakra[type] = (player.chakra[type] || 0) + amount;
  }
}

function grantPlayerRandomChakra(player) {
  const type = CHAKRA_TYPES[Math.floor(Math.random() * CHAKRA_TYPES.length)];
  player.chakra[type] = (player.chakra[type] || 0) + 1;
}

function randomAvailableChakraType(chakra) {
  const availableTypes = CHAKRA_TYPES.filter((type) => (chakra?.[type] || 0) > 0);
  if (!availableTypes.length) return null;
  return availableTypes[Math.floor(Math.random() * availableTypes.length)];
}

function applyChakraGain(player, amount, chakraType) {
  const gained = emptyChakra();
  for (let i = 0; i < amount; i += 1) {
    const type = CHAKRA_TYPES.includes(chakraType)
      ? chakraType
      : CHAKRA_TYPES[Math.floor(Math.random() * CHAKRA_TYPES.length)];
    player.chakra[type] = (player.chakra[type] || 0) + 1;
    gained[type] += 1;
  }
  return gained;
}

function applyChakraRemoval(player, amount, chakraType) {
  const removed = emptyChakra();
  for (let i = 0; i < amount; i += 1) {
    const type = CHAKRA_TYPES.includes(chakraType) ? chakraType : randomAvailableChakraType(player.chakra);
    if (!type || (player.chakra[type] || 0) <= 0) break;
    player.chakra[type] -= 1;
    removed[type] += 1;
  }
  return removed;
}

function grantTurnChakra(player, setAmount) {
  if (setAmount) {
    grantPlayerRandomChakra(player);
    return;
  }

  const aliveCount = player.team.filter((member) => member.hp > 0).length;
  for (let i = 0; i < aliveCount; i += 1) {
    grantPlayerRandomChakra(player);
  }
}

function createRoomCode() {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 7).toUpperCase();
  } while (rooms.has(code));
  return code;
}

function cleanPlayerName(name) {
  const playerName = String(name || "").trim().slice(0, 18);
  return playerName || null;
}

function publicRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    activePlayerId: room.activePlayerId,
    winnerId: room.winnerId,
    turn: room.turn,
    log: room.log.slice(0, 80),
    chat: (room.chat || []).slice(-40),
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      side: player.side,
      ready: player.ready,
      connected: player.connected,
      chakra: cloneChakra(player.chakra),
      chakraExchange: player.chakraExchange
        ? {
            turn: player.chakraExchange.turn,
            receivedType: player.chakraExchange.receivedType,
            spent: cloneChakra(player.chakraExchange.spent),
            undone: Boolean(player.chakraExchange.undone)
          }
        : null,
      queue: player.queue.map((item) => ({
        id: item.id,
        actorId: item.actorId,
        targetId: item.targetId,
        skillId: item.skillId,
        chakra: cloneChakra(item.chakra),
        actorName: item.actorName,
        targetName: item.targetName,
        skillName: item.skillName
      })),
      team: player.team.map((member) => ({
        ...member,
        skillCooldowns: cloneCooldowns(member.skillCooldowns),
        shield: shieldValue(member),
        character: getCharacterById(member.characterId)
      }))
    }))
  };
}

function broadcast(room) {
  io.to(room.code).emit("room:update", publicRoom(room));
}

function findPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId);
}

function opponentOf(room, playerId) {
  return room.players.find((player) => player.id !== playerId);
}

function ownerOfMember(room, member) {
  return room.players.find((player) => player.team.includes(member));
}

function createTeam(characterIds) {
  return characterIds.map((characterId) => {
    const character = getCharacterById(characterId);
    return {
      id: `${characterId}-${randomUUID()}`,
      characterId,
      hp: character.maxHp,
      shield: 0,
      skillCooldowns: {},
      statusEffects: []
    };
  });
}

function teamAlive(player) {
  return player.team.some((member) => member.hp > 0);
}

function getMember(player, memberId) {
  return player.team.find((member) => member.id === memberId);
}

function validateTeam(characterIds) {
  if (!Array.isArray(characterIds) || characterIds.length !== 3) {
    return "El equipo debe tener exactamente 3 personajes.";
  }

  const uniqueIds = new Set(characterIds);
  if (uniqueIds.size !== 3) {
    return "No puedes repetir personajes en el equipo.";
  }

  if (characterIds.some((id) => !getCharacterById(id))) {
    return "El equipo contiene un personaje no disponible.";
  }

  return null;
}

function maybeStart(room) {
  if (room.players.length !== 2 || room.players.some((player) => !player.ready)) {
    return;
  }

  room.phase = "battle";
  room.activePlayerId = room.players[0].id;
  room.turn = 1;
  room.players.forEach((player) => {
    player.chakra = emptyChakra();
    player.queue = [];
    player.chakraExchange = null;
  });
  grantTurnChakra(room.players[0], true);
  room.log.unshift("La batalla comenzo. Cada turno otorga 1 chakra aleatorio por cada personaje vivo del jugador activo.");
}

function removeQueuedSkill(room, playerId, actionId) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const index = player.queue.findIndex((item) => item.id === actionId);
  if (index === -1) return "Esa habilidad ya no esta en cola.";

  const [action] = player.queue.splice(index, 1);
  const refunded = specificChakraCost(action.chakra);
  refundChakra(player, refunded);

  return null;
}

function queuedSkillFor(player, actorId, skillId) {
  return player.queue.some((item) => item.actorId === actorId && item.skillId === skillId);
}

function queuedActorFor(player, actorId) {
  return player.queue.some((item) => item.actorId === actorId);
}

function skillCooldown(member, skillId) {
  return Math.max(0, member.skillCooldowns?.[skillId] || 0);
}

function setSkillCooldown(member, skillId, cooldown) {
  const value = Math.max(0, cooldown || 0);
  member.skillCooldowns = member.skillCooldowns || {};
  if (value > 0) {
    member.skillCooldowns[skillId] = value;
  } else {
    delete member.skillCooldowns[skillId];
  }
}

function reduceCooldowns(player) {
  player.team.forEach((member) => {
    const cooldowns = member.skillCooldowns || {};
    for (const [skillId, amount] of Object.entries(cooldowns)) {
      const next = Math.max(0, amount - 1);
      if (next > 0) {
        cooldowns[skillId] = next;
      } else {
        delete cooldowns[skillId];
      }
    }
    member.skillCooldowns = cooldowns;
  });
}

function moveQueuedSkill(room, playerId, actionId, direction) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const index = player.queue.findIndex((item) => item.id === actionId);
  if (index === -1) return "Esa habilidad ya no esta en cola.";

  const offset = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  if (offset === 0) return "Direccion invalida.";

  const nextIndex = index + offset;
  if (nextIndex < 0 || nextIndex >= player.queue.length) return null;

  const [action] = player.queue.splice(index, 1);
  player.queue.splice(nextIndex, 0, action);
  return null;
}

function exchangeChakra(room, playerId, receivedType, spent) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";
  if (!CHAKRA_TYPES.includes(receivedType)) return "El chakra elegido no es valido.";

  const player = findPlayer(room, playerId);
  if (player.chakraExchange?.turn === room.turn) return "Ya intercambiaste chakra este turno.";
  if (totalChakra(player.chakra) < 5) return "Necesitas al menos 5 chakras para intercambiar.";

  const selected = cleanChakraSelection(spent);
  if (totalChakra(selected) !== 5) return "Debes entregar exactamente 5 chakras.";
  if (!canPay(player.chakra, selected)) return "No tienes esos chakras disponibles.";

  payChakra(player, selected);
  player.chakra[receivedType] = (player.chakra[receivedType] || 0) + 1;
  player.chakraExchange = {
    turn: room.turn,
    receivedType,
    spent: selected
  };
  room.log.unshift(`${player.name} intercambio ${chakraLabel(selected)} por 1 ${receivedType}.`);

  return null;
}

function undoChakraExchange(room, playerId) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const exchange = player.chakraExchange;
  if (!exchange || exchange.turn !== room.turn || exchange.undone) return "No hay intercambio de chakra para deshacer.";
  if ((player.chakra[exchange.receivedType] || 0) <= 0) return "Ya no queda el chakra obtenido por el intercambio.";

  player.chakra[exchange.receivedType] -= 1;
  refundChakra(player, exchange.spent);
  player.chakraExchange = { ...exchange, undone: true };
  room.log.unshift(`${player.name} deshizo el intercambio de chakra y recupero ${chakraLabel(exchange.spent)}.`);

  return null;
}

function advanceTurn(room) {
  const currentIndex = room.players.findIndex((player) => player.id === room.activePlayerId);
  const next = room.players[(currentIndex + 1) % room.players.length];
  next.queue = [];
  next.chakraExchange = null;
  reduceCooldowns(next);
  grantTurnChakra(next);
  restoreDamageReduction(next);
  room.activePlayerId = next.id;
  room.turn += 1;
}

function expireStatusEffects(player, currentTurn) {
  player.team.forEach((member) => {
    member.statusEffects = (member.statusEffects || [])
      .map((effect) => {
        if (effect.type === "shield") return effect;
        return effect.createdTurn === currentTurn ? effect : { ...effect, turns: effect.turns - 1 };
      })
      .filter((effect) => (effect.type === "shield" ? (effect.remainingShield || 0) > 0 : effect.turns > 0));
  });
}

function hasStatus(member, type) {
  return (member.statusEffects || []).some((effect) => effect.type === type && effect.turns > 0);
}

function addStatus(member, status) {
  const existing = (member.statusEffects || []).find((effect) => effect.type === status.type && effect.sourceSkillId === status.sourceSkillId);
  if (status.type === "shield") {
    if (existing) {
      existing.remainingShield = status.isStackable
        ? (existing.remainingShield || 0) + (status.remainingShield || 0)
        : status.remainingShield || 0;
      existing.value = existing.remainingShield;
      existing.isStackable = status.isStackable;
      existing.descriptions = shieldDescriptions(existing);
      existing.createdTurn = status.createdTurn;
      return;
    }
    status.value = status.remainingShield;
    status.descriptions = shieldDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  if (status.type === "damage-reduction") {
    if (existing) {
      existing.value = status.value;
      existing.remainingReduction = status.remainingReduction;
      existing.turns = Math.max(existing.turns, status.turns);
      existing.restoresEachTurn = status.restoresEachTurn;
      existing.descriptions = damageReductionDescriptions(existing);
      existing.createdTurn = status.createdTurn;
      return;
    }
    status.descriptions = damageReductionDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  if (status.type === "buffDamage") {
    if (existing) {
      existing.value = status.value;
      existing.turns = Math.max(existing.turns, status.turns);
      existing.skillIds = status.skillIds;
      existing.descriptions = buffDamageDescriptions(status);
      existing.createdTurn = status.createdTurn;
      return;
    }
    status.descriptions = buffDamageDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  
  if (existing) {
    existing.turns = Math.max(existing.turns, status.turns);
    existing.descriptions = status.descriptions;
    existing.createdTurn = status.createdTurn;
    return;
  }
  member.statusEffects = [...(member.statusEffects || []), status];
}

function statusDescription(effect, actorCharacter) {
  if (effect.type === "shield") return `Este personaje tiene ${effect.remainingShield || effect.value} de escudo destruible.`;
  if (effect.type === "damage-reduction") return `${actorCharacter.name} ha obtenido ${effect.value} de reduccion de dano.`;
  if (effect.type === "buffDamage") return `${actorCharacter.name} ha aumentado el dano de este personaje en ${effect.value}.`;
  if (effect.type === "stun") return `${actorCharacter.name} ha aturdido a este personaje.`;
  if (effect.type === "invulnerable") return `${actorCharacter.name} ha vuelto invulnerable a este personaje.`;
  return `${actorCharacter.name} ha aplicado ${effect.type} a este personaje.`;
}

function shieldDescriptions(effect) {
  return [`Este personaje tiene ${effect.remainingShield || 0} de escudo destruible.`];
}

function damageReductionDescriptions(effect) {
  return [`${effect.sourceActorName || "Un personaje"} ha obtenido ${effect.value} de reduccion de dano.`];
}

function buffDamageDescriptions(effect) {
  const scope = effect.skillIds?.length ? ` para ${effect.skillIds.join(", ")}` : " para todas sus habilidades";
  return [`${effect.sourceActorName || "Un personaje"} aumento el dano en ${effect.value}${scope}.`];
}

function appliesToBuffedSkill(effect, skill) {
  if (effect.type !== "buffDamage" || effect.turns <= 0) return false;
  if (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0) return true;
  return effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name);
}

function damageBuffValue(actor, skill, currentTurn) {
  return (actor.statusEffects || [])
    .filter((effect) => appliesToBuffedSkill(effect, skill))
    .filter((effect) => !(effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn))
    .reduce((total, effect) => total + Math.max(0, Number(effect.value || 0)), 0);
}

function shieldValue(member) {
  return (member.statusEffects || [])
    .filter((effect) => effect.type === "shield")
    .reduce((total, effect) => total + (effect.remainingShield || 0), 0);
}

function absorbShield(member, damage) {
  let remainingDamage = damage;
  for (const effect of member.statusEffects || []) {
    if (effect.type !== "shield" || remainingDamage <= 0) continue;
    const blocked = Math.min(effect.remainingShield || 0, remainingDamage);
    effect.remainingShield = (effect.remainingShield || 0) - blocked;
    effect.value = effect.remainingShield;
    effect.descriptions = shieldDescriptions(effect);
    remainingDamage -= blocked;
  }
  member.statusEffects = (member.statusEffects || []).filter((effect) => effect.type !== "shield" || (effect.remainingShield || 0) > 0);
  member.shield = shieldValue(member);
  return damage - remainingDamage;
}

function absorbDamageReduction(member, damage) {
  let remainingDamage = damage;
  for (const effect of member.statusEffects || []) {
    if (effect.type !== "damage-reduction" || remainingDamage <= 0) continue;
    const blocked = Math.min(effect.remainingReduction || 0, remainingDamage);
    effect.remainingReduction = (effect.remainingReduction || 0) - blocked;
    effect.descriptions = damageReductionDescriptions(effect);
    remainingDamage -= blocked;
  }
  return damage - remainingDamage;
}

function restoreDamageReduction(player) {
  player.team.forEach((member) => {
    member.statusEffects = (member.statusEffects || []).map((effect) => {
      if (effect.type !== "damage-reduction" || effect.restoresEachTurn === false) return effect;
      return {
        ...effect,
        remainingReduction: effect.value,
        descriptions: damageReductionDescriptions({ ...effect, remainingReduction: effect.value })
      };
    });
  });
}

function applyDamage(target, value, damageType = "basic") {
  const type = ["basic", "piercing", "affliction"].includes(damageType) ? damageType : "basic";
  let remainingDamage = value;
  if (type === "basic") {
    remainingDamage -= absorbDamageReduction(target, remainingDamage);
  }
  if (type === "basic" || type === "piercing") {
    remainingDamage -= absorbShield(target, remainingDamage);
  }
  const dealt = Math.max(0, remainingDamage);
  target.hp = Math.max(0, target.hp - dealt);
  return dealt;
}

function aliveMembers(player) {
  return player.team.filter((member) => member.hp > 0);
}

function canBeTargetedBy(player, candidate) {
  return player.team.includes(candidate) || !hasStatus(candidate, "invulnerable");
}

function targetsForSkill(room, player, actor, targetId, skill) {
  const opponent = opponentOf(room, player.id);
  if (skill.targetType === "self") return [actor];
  if (skill.targetType === "enemy") return [getMember(opponent, targetId)].filter(Boolean).filter((member) => canBeTargetedBy(player, member));
  if (skill.targetType === "ally") return [getMember(player, targetId)].filter(Boolean);
  if (skill.targetType === "enemies") return aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member));
  if (skill.targetType === "allies") return aliveMembers(player);
  if (skill.targetType === "allPlayers") return [...aliveMembers(player), ...aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member))];
  return [];
}

function resolveEffectTargets(room, player, actor, targetId, skill, effect) {
  const requestedTargets = Array.isArray(effect.targets) ? effect.targets : [effect.targets];
  const members = [];
  for (const requestedTarget of requestedTargets) {
    if (requestedTarget === "self") {
      members.push(actor);
      continue;
    }
    if (requestedTarget === "target") {
      members.push(...targetsForSkill(room, player, actor, targetId, skill));
    }
  }
  return [...new Map(members.filter(Boolean).map((member) => [member.id, member])).values()];
}

function targetNameForSkill(room, player, actor, targetId, skill) {
  if (skill.targetType === "enemies") return "Todos los enemigos";
  if (skill.targetType === "allies") return "Todos los aliados";
  if (skill.targetType === "allPlayers") return "Todos los jugadores";
  const targets = targetsForSkill(room, player, actor, targetId, skill);
  if (skill.targetType === "self") return getCharacterById(actor.characterId).name;
  return targets[0] ? getCharacterById(targets[0].characterId).name : "objetivo invalido";
}

function validateSkillAction(room, playerId, actorId, targetId, skillId) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const opponent = opponentOf(room, playerId);
  const actor = getMember(player, actorId);
  if (!actor || actor.hp <= 0) return "Ese personaje no puede actuar.";
  if (hasStatus(actor, "stun")) return "Ese personaje esta aturdido y no puede usar habilidades.";

  const actorCharacter = getCharacterById(actor.characterId);
  const skill = actorCharacter.skills.find((item) => item.id === skillId);
  if (!skill) return "Habilidad invalida.";
  if (queuedActorFor(player, actor.id)) return `${actorCharacter.name} ya tiene una habilidad en cola este turno.`;
  if (skillCooldown(actor, skill.id) > 0) return `${skill.name} esta en cooldown.`;
  if (queuedSkillFor(player, actor.id, skill.id)) return `${skill.name} ya esta en cola.`;
  if (!canPaySkillCost(player.chakra, skill.chakra, queuedNeutralChakraCost(player))) return `No tienes chakra suficiente: requiere ${chakraLabel(skill.chakra)}.`;

  const targets = targetsForSkill(room, player, actor, targetId, skill);
  if (targets.length === 0 || targets.some((target) => target.hp <= 0)) return "Objetivo invalido.";

  return { player, opponent, actor, actorCharacter, skill, targetName: targetNameForSkill(room, player, actor, targetId, skill) };
}

function queueSkill(room, playerId, actorId, targetId, skillId) {
  const validation = validateSkillAction(room, playerId, actorId, targetId, skillId);
  if (typeof validation === "string") return validation;

  const { player, actorCharacter, skill, targetName } = validation;
  payChakra(player, specificChakraCost(skill.chakra));
  player.queue.push({
    id: randomUUID(),
    actorId,
    targetId,
    skillId,
    chakra: cloneChakra(skill.chakra),
    actorName: actorCharacter.name,
    targetName,
    skillName: skill.name
  });

  return null;
}

function applyQueuedSkill(room, player, action) {
  const opponent = opponentOf(room, player.id);
  const actor = getMember(player, action.actorId);
  if (!actor || actor.hp <= 0) {
    return `${action.skillName} se descarto: ${action.actorName} ya no puede actuar.`;
  }

  const actorCharacter = getCharacterById(actor.characterId);
  const skill = actorCharacter.skills.find((item) => item.id === action.skillId);
  if (!skill) {
    return `${action.skillName} se descarto: habilidad invalida.`;
  }

  if (hasStatus(actor, "stun")) {
    return `${action.skillName} se descarto: ${action.actorName} esta aturdido.`;
  }

  const selectedTargets = targetsForSkill(room, player, actor, action.targetId, skill);
  if (selectedTargets.length === 0 || selectedTargets.every((target) => target.hp <= 0)) {
    return `${actorCharacter.name} desperdicio ${skill.name}: el objetivo ya no es valido.`;
  }

  const events = [];
  let totalDamage = 0;
  let totalHeal = 0;
  let totalShield = 0;
  let totalStun = 0;
  let totalInvulnerable = 0;
  let totalDamageReduction = 0;
  let totalDamageBuff = 0;
  let gainedChakra = emptyChakra();
  let removedChakra = emptyChakra();

  for (const effect of skill.effects || []) {
    if (!supportedEffectTypes.includes(effect.type)) {
      events.push(`${effect.type} no esta implementado.`);
      continue;
    }

    const targets = resolveEffectTargets(room, player, actor, action.targetId, skill, effect).filter((target) => target.hp > 0);
    if (targets.length === 0) continue;

    if (effect.type === "damage") {
      const buffedDamage = Math.max(0, Number(effect.value || 0)) + damageBuffValue(actor, skill, room.turn);
      for (const target of targets) {
        const dealt = applyDamage(target, buffedDamage, effect.damageType || "basic");
        totalDamage += dealt;
      }
      continue;
    }

    if (effect.type === "heal" || effect.type === "self-heal") {
      for (const target of targets) {
        const targetCharacter = getCharacterById(target.characterId);
        const before = target.hp;
        target.hp = Math.min(targetCharacter.maxHp, target.hp + effect.value);
        totalHeal += target.hp - before;
      }
      continue;
    }

    if (effect.type === "damage-reduction") {
      for (const target of targets) {
        addStatus(target, {
          id: randomUUID(),
          type: "damage-reduction",
          turns: effect.duration,
          value: effect.value,
          remainingReduction: effect.value,
          restoresEachTurn: effect.restoresEachTurn !== false,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          createdTurn: room.turn,
          descriptions: [statusDescription({ ...effect, remainingReduction: effect.value }, actorCharacter)]
        });
        totalDamageReduction += effect.value;
      }
      continue;
    }

    if (effect.type === "buffDamage") {
      for (const target of targets) {
        addStatus(target, {
          id: randomUUID(),
          type: "buffDamage",
          turns: effect.duration,
          value: effect.value,
          skillIds: Array.isArray(effect.skillIds) ? effect.skillIds : [],
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          createdTurn: room.turn,
          descriptions: [statusDescription(effect, actorCharacter)]
        });
        totalDamageBuff += effect.value;
      }
      continue;
    }

    if (effect.type === "shield") {
      for (const target of targets) {
        const shieldBefore = shieldValue(target);
        addStatus(target, {
          id: randomUUID(),
          type: "shield",
          turns: null,
          value: effect.value,
          remainingShield: effect.value,
          isStackable: effect.isStackable,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          createdTurn: room.turn,
          descriptions: [statusDescription({ ...effect, remainingShield: effect.value }, actorCharacter)]
        });
        target.shield = shieldValue(target);
        totalShield += Math.max(0, target.shield - shieldBefore);
      }
      continue;
    }

    if (effect.type === "stun") {
      for (const target of targets) {
        addStatus(target, {
          id: randomUUID(),
          type: "stun",
          turns: effect.value,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          createdTurn: room.turn,
          descriptions: [statusDescription(effect, actorCharacter)]
        });
        totalStun += effect.value;
      }
    }

    if (effect.type === "invulnerable") {
      for (const target of targets) {
        addStatus(target, {
          id: randomUUID(),
          type: "invulnerable",
          turns: effect.value,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          createdTurn: room.turn,
          descriptions: [statusDescription(effect, actorCharacter)]
        });
        totalInvulnerable += effect.value;
      }
    }

    if (effect.type === "gain-chakra" || effect.type === "remove-chakra") {
      const affectedPlayers = [...new Set(targets.map((target) => ownerOfMember(room, target)).filter(Boolean))];
      const amount = Math.max(0, Number(effect.value || 0));
      for (const affectedPlayer of affectedPlayers) {
        const changed = effect.type === "gain-chakra"
          ? applyChakraGain(affectedPlayer, amount, effect.chakraType)
          : applyChakraRemoval(affectedPlayer, amount, effect.chakraType);

        for (const type of CHAKRA_TYPES) {
          if (effect.type === "gain-chakra") {
            gainedChakra[type] += changed[type] || 0;
          } else {
            removedChakra[type] += changed[type] || 0;
          }
        }
      }
    }
  }

  if (totalDamage > 0) events.push(`${actorCharacter.name} uso ${skill.name} e hizo ${totalDamage} dano.`);
  if (totalHeal > 0) events.push(`${actorCharacter.name} curo ${totalHeal} de vida.`);
  if (totalShield > 0) events.push(`${actorCharacter.name} gano ${totalShield} de escudo.`);
  if (totalDamageReduction > 0) events.push(`${actorCharacter.name} otorgo ${totalDamageReduction} de reduccion de dano.`);
  if (totalDamageBuff > 0) events.push(`${actorCharacter.name} aumento ${totalDamageBuff} de dano.`);
  if (totalStun > 0) events.push(`${actorCharacter.name} aturdio por ${totalStun} turno(s).`);
  if (totalInvulnerable > 0) events.push(`${actorCharacter.name} gano invulnerabilidad por ${totalInvulnerable} turno(s).`);
  if (totalChakra(gainedChakra) > 0) events.push(`${actorCharacter.name} gano ${chakraLabel(gainedChakra)}.`);
  if (totalChakra(removedChakra) > 0) events.push(`${actorCharacter.name} elimino ${chakraLabel(removedChakra)}.`);

  setSkillCooldown(actor, skill.id, skill.cooldown || 0);

  return events.join(" ") || `${actorCharacter.name} uso ${skill.name}.`;
}

function resolveTurn(room, playerId, neutralChakraPayment = {}) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const opponent = opponentOf(room, playerId);
  const requiredNeutral = queuedNeutralChakraCost(player);
  const neutralPayment = cleanChakraSelection(neutralChakraPayment);

  if (requiredNeutral > 0) {
    if (totalChakra(neutralPayment) !== requiredNeutral) {
      return `Debes pagar ${requiredNeutral} chakra neutral para finalizar el turno.`;
    }
    if (!canPay(player.chakra, neutralPayment)) {
      return "No tienes chakra suficiente para pagar el coste neutral.";
    }
    payChakra(player, neutralPayment);
    room.log.unshift(`${player.name} pago ${chakraLabel(neutralPayment)} como chakra neutral.`);
  }

  const queue = player.queue.splice(0);

  if (queue.length === 0) {
    room.log.unshift(`${player.name} finalizo el turno sin acciones.`);
  }

  for (const action of queue) {
    room.log.unshift(applyQueuedSkill(room, player, action));
    if (!teamAlive(opponent)) break;
  }

  if (!teamAlive(opponent)) {
    room.phase = "finished";
    room.winnerId = playerId;
    room.log.unshift(`${player.name} gano la partida.`);
  } else {
    expireStatusEffects(player, room.turn);
    advanceTurn(room);
  }

  return null;
}

app.get("/api/characters", (_req, res) => {
  res.json(characters);
});

app.get("/api/rooms/:code", (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: "Sala no encontrada." });
    return;
  }
  res.json(publicRoom(room));
});

io.on("connection", (socket) => {
  socket.emit("characters", characters);

  socket.on("room:create", ({ name }, callback) => {
    const playerName = cleanPlayerName(name);
    if (!playerName) {
      callback?.({ ok: false, error: "Debes ingresar un nombre para jugar." });
      return;
    }

    const code = createRoomCode();
    const player = {
      id: socket.id,
      name: playerName,
      side: "red",
      connected: true,
      ready: false,
      chakra: emptyChakra(),
      chakraExchange: null,
      queue: [],
      team: []
    };
    const room = {
      code,
      phase: "lobby",
      players: [player],
      activePlayerId: null,
      winnerId: null,
      turn: 0,
      chat: [],
      log: ["Sala creada. Esperando al segundo jugador."]
    };
    rooms.set(code, room);
    socketRooms.set(socket.id, code);
    socket.join(code);
    callback?.({ ok: true, room: publicRoom(room), playerId: socket.id });
    broadcast(room);
  });

  socket.on("room:join", ({ code, name }, callback) => {
    const playerName = cleanPlayerName(name);
    if (!playerName) {
      callback?.({ ok: false, error: "Debes ingresar un nombre para jugar." });
      return;
    }

    const room = rooms.get(String(code || "").toUpperCase());
    if (!room) {
      callback?.({ ok: false, error: "Sala no encontrada." });
      return;
    }
    if (room.players.length >= 2) {
      callback?.({ ok: false, error: "La sala ya tiene 2 jugadores." });
      return;
    }

    const player = {
      id: socket.id,
      name: playerName,
      side: "blue",
      connected: true,
      ready: false,
      chakra: emptyChakra(),
      chakraExchange: null,
      queue: [],
      team: []
    };
    room.players.push(player);
    room.log.unshift(`${player.name} se unio a la sala.`);
    socketRooms.set(socket.id, room.code);
    socket.join(room.code);
    callback?.({ ok: true, room: publicRoom(room), playerId: socket.id });
    broadcast(room);
  });

  socket.on("team:select", ({ characterIds }, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room || room.phase !== "lobby") {
      callback?.({ ok: false, error: "No puedes seleccionar equipo ahora." });
      return;
    }

    const error = validateTeam(characterIds);
    if (error) {
      callback?.({ ok: false, error });
      return;
    }

    const player = findPlayer(room, socket.id);
    player.team = createTeam(characterIds);
    player.ready = true;
    room.log.unshift(`${player.name} confirmo su equipo.`);
    maybeStart(room);
    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("battle:skill", ({ actorId, targetId, skillId }, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = queueSkill(room, socket.id, actorId, targetId, skillId);
    if (error) {
      callback?.({ ok: false, error });
      return;
    }

    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("battle:endTurn", ({ neutralChakra } = {}, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = resolveTurn(room, socket.id, neutralChakra);
    if (error) {
      callback?.({ ok: false, error });
      return;
    }

    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("battle:exchangeChakra", ({ receivedType, spent }, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = exchangeChakra(room, socket.id, receivedType, spent);
    if (error) {
      callback?.({ ok: false, error });
      return;
    }

    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("battle:undoChakraExchange", (_payload, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = undoChakraExchange(room, socket.id);
    if (error) {
      callback?.({ ok: false, error });
      return;
    }

    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("battle:removeQueuedSkill", ({ actionId }, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = removeQueuedSkill(room, socket.id, actionId);
    if (error) {
      callback?.({ ok: false, error });
      return;
    }

    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("battle:moveQueuedSkill", ({ actionId, direction }, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = moveQueuedSkill(room, socket.id, actionId, direction);
    if (error) {
      callback?.({ ok: false, error });
      return;
    }

    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("chat:send", ({ message }, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const player = findPlayer(room, socket.id);
    if (!player) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const text = String(message || "").trim().slice(0, 180);
    if (!text) {
      callback?.({ ok: false, error: "El mensaje no puede estar vacio." });
      return;
    }

    room.chat = [...(room.chat || []), { id: randomUUID(), playerId: player.id, playerName: player.name, message: text }].slice(-80);
    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("disconnect", () => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) return;

    const player = findPlayer(room, socket.id);
    if (player) {
      player.connected = false;
      room.log.unshift(`${player.name} se desconecto.`);
    }

    if (room.players.every((item) => !item.connected)) {
      rooms.delete(room.code);
    } else {
      broadcast(room);
    }
    socketRooms.delete(socket.id);
  });
});

server.listen(PORT, () => {
  console.log(`Shinobi Arena server running on http://127.0.0.1:${PORT}`);
});
