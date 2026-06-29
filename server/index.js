import express from "express";
import cors from "cors";
import http from "http";
import { randomUUID } from "node:crypto";
import { pathToFileURL } from "node:url";
import { Server } from "socket.io";
import { characters, getCharacterById } from "../shared/characters.js";
import { chakraCostModifierTypes, modifiedSkillChakraCost } from "../shared/chakraCostModifiers.js";
import { stunFamiliesAffected, supportedEffectTypes } from "../shared/effects.js";
import { compareHp, normalizeRequireScope, normalizeRequireType } from "../shared/requires.js";
import { activeSkillForMember, activeSkillsForMember } from "../shared/skillReplacements.js";
import {
  complexDescriptions,
  damageReductionDescriptions,
  modifierDescriptions,
  shieldDescriptions,
  statusDescription
} from "./effects/descriptions.js";
import {
  applyDamage,
  restoreDamageReduction,
  shieldValue
} from "./effects/damage.js";
import {
  applyChakraCostModifierEffect,
  applyInvulnerableEffect,
  applyReplaceSkillEffect
} from "./effects/apply/index.js";
import {
  CHAKRA_TYPES,
  applyChakraGain,
  applyChakraRemoval,
  canPay,
  canPaySkillCost,
  chakraLabel,
  cleanChakraSelection,
  cloneChakra,
  emptyChakra,
  grantTurnChakra,
  neutralChakraCost,
  payChakra,
  queuedNeutralChakraCost,
  refundChakra,
  specificChakraCost,
  totalChakra
} from "./chakra.js";
import {
  cloneCooldowns,
  findPlayer,
  getMember,
  getRoomMember,
  opponentOf,
  ownerOfMember,
  teamAlive
} from "./players.js";
import { registerSocketHandlers } from "./socketHandlers.js";

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
const skillModifierEffectTypes = [
  "modifyDamage",
  "modifyDamageByMissingHp",
  "modifyDamageType",
  "modifyTargetType",
  "modifyTargetCount",
  "addEffectToBase",
  "addUncountereable",
  "addNonReflectable",
  "replaceEffects",
  "replaceSkill",
  ...chakraCostModifierTypes
];

function publicLogEntry(entry, viewerId) {
  if (typeof entry === "string") return entry;
  if (!entry || typeof entry !== "object") return null;
  if (Array.isArray(entry.visibleTo) && (!viewerId || !entry.visibleTo.includes(viewerId))) return null;
  return entry.message || null;
}

function publicLog(room, viewerId) {
  return room.log
    .map((entry) => publicLogEntry(entry, viewerId))
    .filter(Boolean)
    .slice(0, 80);
}

function skillLogEntry(player, skill, message) {
  if (!skill?.isSecret) return message;
  return { message, visibleTo: [player.id] };
}

function statusIsIgnored(effect) {
  return effect?.ignoredByEffectImmunity === true;
}

function hasCustomDescriptions(effect) {
  return Array.isArray(effect?.descriptions) && effect.descriptions.length > 0;
}

function tooltipDescriptionForEffect(effect) {
  return effect?.tooltipDescription
    ?? effect?.tooltipDescripcion
    ?? effect?.tooltipHtml
    ?? effect?.["tooltip descripcion"]
    ?? null;
}

function activeStatusEffects(member) {
  return (member?.statusEffects || []).filter((effect) => !statusIsIgnored(effect));
}

function secretStatusOwnerId(room, effect) {
  const originMember = getRoomMember(room, effect.originActorId);
  return originMember ? ownerOfMember(room, originMember)?.id : null;
}

function publicStatusEffects(room, viewerId, member) {
  return (member.statusEffects || []).flatMap((effect) => {
    if (!effect.isSecret) return [effect];
    if (viewerId && secretStatusOwnerId(room, effect) === viewerId) return [effect];
    return [];
  });
}

export function publicRoom(room, viewerId = null) {
  return {
    code: room.code,
    mode: room.mode || "pvp",
    phase: room.phase,
    activePlayerId: room.activePlayerId,
    winnerId: room.winnerId,
    finishReason: room.finishReason || null,
    botPaused: Boolean(room.botPaused),
    botMessage: room.botMessage || "",
    turn: room.turn,
    log: publicLog(room, viewerId),
    chat: (room.chat || []).slice(-40),
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      side: player.side,
      isBot: Boolean(player.isBot),
      ready: player.ready,
      connected: player.connected,
      chakra: cloneChakra(player.chakra),
      botSkillPlan: player.isBot ? [...(player.botSkillPlan || [])] : [],
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
        statusEffects: publicStatusEffects(room, viewerId, member),
        skillCooldowns: cloneCooldowns(member.skillCooldowns),
        skillUses: cloneCooldowns(member.skillUses),
        shield: shieldValue(member),
        character: getCharacterById(member.characterId)
      }))
    }))
  };
}

function broadcast(room) {
  for (const player of room.players) {
    io.to(player.id).emit("room:update", publicRoom(room, player.id));
  }
  for (const viewer of room.viewers || []) {
    io.to(viewer.socketId).emit("room:update", publicRoom(room, viewer.playerId));
  }
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomNumberValue(value) {
  if (typeof value !== "object" || value === null) return Number(value || 0);
  const min = Number(value.min ?? value.from ?? 0);
  const max = Number(value.max ?? value.to ?? min);
  const multipleOf = Math.max(1, Number(value.multipleOf ?? value.step ?? 1));
  const low = Math.ceil(Math.min(min, max) / multipleOf);
  const high = Math.floor(Math.max(min, max) / multipleOf);
  if (high < low) return Math.max(0, min);
  return randomInt(low, high) * multipleOf;
}

function positiveEffectValue(effect, field = "value") {
  return Math.max(0, randomNumberValue(effect?.[field]));
}

function payLife(target, value, { notKill = false } = {}) {
  const amount = Math.max(0, Number(value || 0));
  const minHp = notKill ? 1 : 0;
  const before = Math.max(0, Number(target.hp || 0));
  target.hp = Math.max(minHp, before - amount);
  return before - target.hp;
}

function healValueForTarget(effect, target) {
  if (Number.isFinite(Number(effect?.missingHpPercent))) {
    const targetCharacter = getCharacterById(target.characterId);
    const missingHp = Math.max(0, Number(targetCharacter?.maxHp || 0) - Math.max(0, Number(target.hp || 0)));
    return Math.ceil(missingHp * Math.max(0, Number(effect.missingHpPercent || 0)) / 100);
  }
  return positiveEffectValue(effect);
}

function clearDefeatedStatusEffects(room) {
  for (const player of room.players || []) {
    for (const member of player.team || []) {
      if (member.hp > 0) continue;
      member.statusEffects = [];
      member.shield = 0;
    }
  }
}

function teamDeathSnapshot(player) {
  return new Set((player?.team || [])
    .filter((member) => member.hp <= 0)
    .map((member) => member.id));
}

function newDeaths(beforeDeaths, player) {
  return (player?.team || []).filter((member) => member.hp <= 0 && !beforeDeaths.has(member.id));
}

function characterNames(members) {
  return members
    .map((member) => getCharacterById(member.characterId)?.name)
    .filter(Boolean)
    .join(", ");
}

function botTauntForDeaths(room, beforeDeathsByPlayerId) {
  if (room.mode !== "bot") return "";
  const bot = room.players.find((player) => player.isBot);
  const human = room.players.find((player) => !player.isBot);
  if (!bot || !human) return "";

  const deadBotMembers = newDeaths(beforeDeathsByPlayerId.get(bot.id) || new Set(), bot);
  const deadHumanMembers = newDeaths(beforeDeathsByPlayerId.get(human.id) || new Set(), human);
  if (deadBotMembers.length > 0) {
    const names = characterNames(deadBotMembers);
    return `${bot.name}: ${names} cayo, pero esto no termina aca.`;
  }
  if (deadHumanMembers.length > 0) {
    const names = characterNames(deadHumanMembers);
    return `${bot.name}: ${names} queda fuera.`;
  }
  return "";
}

function deathSnapshotsForRoom(room) {
  return new Map((room.players || []).map((player) => [player.id, teamDeathSnapshot(player)]));
}

function affectedPlayersForChakraEffect(room, player, targets, effect) {
  if (effect.type === "remove-chakra" && !effect.chakraType) {
    const targetOwners = [...new Map(targets
      .map((target) => ownerOfMember(room, target))
      .filter(Boolean)
      .map((owner) => [owner.id, owner])).values()];
    return targetOwners.length > 0 ? targetOwners : [opponentOf(room, player.id)].filter(Boolean);
  }
  return [...new Set(targets.map((target) => ownerOfMember(room, target)).filter(Boolean))];
}

function maybeStart(room) {
  if (room.players.length !== 2 || room.players.some((player) => !player.ready)) {
    return;
  }

  room.phase = "battle";
  const startingPlayer = randomItem(room.players);
  room.activePlayerId = startingPlayer.id;
  room.turn = 1;
  room.players.forEach((player) => {
    player.chakra = emptyChakra();
    player.queue = [];
    player.chakraExchange = null;
  });
  grantTurnChakra(startingPlayer, true);
  for (const event of applyBattleStartPassives(room)) {
    room.log.unshift(event);
  }
  room.log.unshift(`${startingPlayer.name} inicia la partida.`);
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

export function exchangeChakra(room, playerId, receivedType, spent) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";
  if (!CHAKRA_TYPES.includes(receivedType)) return "El chakra elegido no es valido.";

  const player = findPlayer(room, playerId);
  if (player.chakraExchange?.turn === room.turn && !player.chakraExchange.undone) return "Ya intercambiaste chakra este turno.";
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

  return null;
}

export function undoChakraExchange(room, playerId) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const exchange = player.chakraExchange;
  if (!exchange || exchange.turn !== room.turn || exchange.undone) return "No hay intercambio de chakra para deshacer.";
  if ((player.chakra[exchange.receivedType] || 0) <= 0) return "Ya no queda el chakra obtenido por el intercambio.";

  player.chakra[exchange.receivedType] -= 1;
  refundChakra(player, exchange.spent);
  player.chakraExchange = { ...exchange, undone: true };

  return null;
}

function advanceTurn(room) {
  const currentIndex = room.players.findIndex((player) => player.id === room.activePlayerId);
  const next = room.players[(currentIndex + 1) % room.players.length];
  next.queue = [];
  next.chakraExchange = null;
  grantTurnChakra(next);
  restoreDamageReduction(next);
  room.activePlayerId = next.id;
  room.turn += 1;
}

function applyStartTurnEffects(room) {
  const activePlayer = findPlayer(room, room.activePlayerId);
  if (!activePlayer) return;
  for (const event of applyComplexStatusEffects(room, activePlayer)) {
    room.log.unshift(event);
  }
  clearDefeatedStatusEffects(room);
  if (!teamAlive(activePlayer)) {
    const opponent = opponentOf(room, activePlayer.id);
    room.phase = "finished";
    room.winnerId = opponent?.id || null;
    room.finishReason = null;
    if (opponent) room.log.unshift(`${opponent.name} gano la partida.`);
  }
}

function secretEndNotice(effect, currentTurn) {
  const sourceSkillName = effect.sourceSkillName || "Una habilidad secreta";
  return {
    id: randomUUID(),
    type: "secret-ended",
    turns: 1,
    showStatusEffect: true,
    sourceSkillId: effect.sourceSkillId || "secret",
    sourceSkillName: `${sourceSkillName} ha finalizado`,
    sourceActorName: effect.sourceActorName,
    createdTurn: currentTurn - 1,
    descriptions: [`${sourceSkillName} ha finalizado.`]
  };
}

function addSecretEndNotice(room, fallbackMember, effect, currentTurn) {
  if (effect.suppressSecretEndNotice) return;
  const targetMember = room ? getRoomMember(room, effect.originActorId) || fallbackMember : fallbackMember;
  targetMember.statusEffects = [...(targetMember.statusEffects || []), secretEndNotice(effect, currentTurn)];
}

function linkedStatusEffect(status, effect) {
  if (status.statusLinkId) {
    return effect.type === "complex"
      && effect.statusLinkId === status.statusLinkId
      && effect.originActorId === status.originActorId;
  }
  return effect.type === "complex"
    && effect.sourceSkillId === status.sourceSkillId
    && effect.originActorId === status.originActorId;
}

function removeLinkedStatusEffects(room, status) {
  for (const player of room.players || []) {
    for (const member of player.team || []) {
      member.statusEffects = (member.statusEffects || []).filter((effect) => !linkedStatusEffect(status, effect));
    }
  }
}

export function expireStatusEffects(player, currentTurn, room = null) {
  player.team.forEach((member) => {
    const endedSecrets = [];
    const endedLinkedStatuses = [];
    const nextEffects = (member.statusEffects || [])
      .map((effect) => {
        if (effect.type === "shield") return effect;
        if (effect.turns === -1) return effect;
        const nextEffect = effect.createdTurn === currentTurn || effect.pausedThisTurn
          ? { ...effect, pausedThisTurn: false }
          : { ...effect, turns: effect.turns - 1 };
        if (nextEffect.turns <= 0 && effect.isSecret && effect.showStatusEffect !== true) {
          endedSecrets.push(effect);
        }
        if (nextEffect.turns <= 0 && effect.type === "complex" && effect.statusLinkId) {
          endedLinkedStatuses.push(effect);
        }
        return nextEffect.type === "complex"
          ? { ...nextEffect, descriptions: complexDescriptions(nextEffect) }
          : nextEffect;
      })
      .filter((effect) => (effect.type === "shield" ? (effect.remainingShield || 0) > 0 : effect.turns > 0 || effect.turns === -1));
    member.statusEffects = nextEffects;
    if (room) endedLinkedStatuses.forEach((effect) => removeLinkedStatusEffects(room, effect));
    endedSecrets.forEach((effect) => addSecretEndNotice(room, member, effect, currentTurn));
  });
}

export function expireStartTurnSecretEffects(player, currentTurn, room = null) {
  if (!player) return;
  player.team.forEach((member) => {
    const endedSecrets = [];
    const nextEffects = (member.statusEffects || [])
      .map((effect) => {
        const originMember = room ? getRoomMember(room, effect.originActorId) : null;
        const originOwner = originMember ? ownerOfMember(room, originMember) : null;
        const isStartTurnSecret = effect.isSecret
          && ["counter", "reflect"].includes(effect.type)
          && effect.turns !== -1
          && effect.createdTurn !== currentTurn
          && (!originOwner || originOwner.id === player.id);
        if (!isStartTurnSecret) return effect;
        const nextEffect = { ...effect, turns: effect.turns - 1 };
        if (nextEffect.turns <= 0 && effect.showStatusEffect !== true) endedSecrets.push(effect);
        return nextEffect;
      })
      .filter((effect) => (effect.type === "shield" ? (effect.remainingShield || 0) > 0 : effect.turns > 0 || effect.turns === -1));
    member.statusEffects = nextEffects;
    endedSecrets.forEach((effect) => addSecretEndNotice(room, member, effect, currentTurn));
  });
}

function mergeStatusTurns(currentTurns, nextTurns) {
  if (currentTurns === -1 || nextTurns === -1) return -1;
  return Math.max(currentTurns, nextTurns);
}

function hasStatus(member, type) {
  return activeStatusEffects(member).some((effect) => {
    if (effect.type === type && effect.turns > 0) return true;
    return effect.type === "complex" && effect.turns > 0 && (effect.effects || []).some((childEffect) => !statusIsIgnored(childEffect) && childEffect.type === type);
  });
}

function stunAffectsSkill(effect, skill) {
  const affectedFamilies = stunFamiliesAffected(effect);
  if (affectedFamilies.length === 0) return true;
  const skillFamilies = Array.isArray(skill?.family) ? skill.family : [];
  return affectedFamilies.some((family) => skillFamilies.includes(family));
}

export function isSkillStunned(member, skill) {
  return activeStatusEffects(member).some((effect) => {
    if (effect.type === "stun" && effect.turns > 0) return stunAffectsSkill(effect, skill);
    if (effect.type !== "complex" || effect.turns <= 0) return false;
    return (effect.effects || []).some((childEffect) => (
      !statusIsIgnored(childEffect) && childEffect.type === "stun" && stunAffectsSkill(childEffect, skill)
    ));
  });
}

export function addStatus(member, status) {
  const tooltipDescription = tooltipDescriptionForEffect(status);
  if (tooltipDescription) status.tooltipDescription = tooltipDescription;
  if (status.type === "replaceSkill" && status.turns === -1 && status.showStatusEffect === undefined) {
    status.showStatusEffect = false;
  }
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
      existing.originActorId = status.originActorId;
      existing.originCharacterId = status.originCharacterId;
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
      existing.turns = mergeStatusTurns(existing.turns, status.turns);
      existing.restoresEachTurn = status.restoresEachTurn;
      existing.percent = status.percent;
      existing.descriptions = damageReductionDescriptions(existing);
      existing.createdTurn = status.createdTurn;
      existing.originActorId = status.originActorId;
      existing.originCharacterId = status.originCharacterId;
      return;
    }
    status.descriptions = damageReductionDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  if (skillModifierEffectTypes.includes(status.type) || status.type === "counter" || status.type === "reflect") {
    if (existing) {
      existing.value = status.isStackable
        ? Number(existing.value || 0) + Number(status.value || 0)
        : status.value;
      existing.damageType = status.damageType;
      existing.targetType = status.targetType;
      existing.count = status.count;
      existing.random = status.random;
      existing.effects = status.effects;
      existing.baseSkillId = status.baseSkillId;
      existing.skillId = status.skillId;
      existing.chakra = status.chakra;
      existing.turns = mergeStatusTurns(existing.turns, status.turns);
      existing.skillIds = status.skillIds;
      existing.familiesAffected = status.familiesAffected;
      existing.trigger = status.trigger;
      existing.charges = status.charges;
      existing.reflectTo = status.reflectTo;
      existing.showStatusEffect = status.showStatusEffect;
      existing.isStackable = status.isStackable;
      existing.isSecret = Boolean(status.isSecret);
      existing.descriptions = hasCustomDescriptions(status) ? status.descriptions : modifierDescriptions(existing);
      existing.createdTurn = status.createdTurn;
      existing.originActorId = status.originActorId;
      existing.originCharacterId = status.originCharacterId;
      return;
    }
    status.descriptions = hasCustomDescriptions(status) ? status.descriptions : modifierDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  if (status.type === "complex") {
    status.descriptions = hasCustomDescriptions(status) ? status.descriptions : complexDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  
  if (existing) {
    existing.turns = mergeStatusTurns(existing.turns, status.turns);
    existing.familiesAffected = status.familiesAffected;
    existing.ignoreEffects = status.ignoreEffects;
    existing.descriptions = status.descriptions;
    existing.createdTurn = status.createdTurn;
    existing.originActorId = status.originActorId;
    existing.originCharacterId = status.originCharacterId;
    return;
  }
  member.statusEffects = [...(member.statusEffects || []), status];
}

function statusOrigin(actor) {
  return {
    originActorId: actor?.id,
    originCharacterId: actor?.characterId
  };
}

function appliesToModifiedSkill(effect, skill) {
  if (!["modifyDamage", "modifyDamageByMissingHp"].includes(effect.type) || (effect.turns <= 0 && effect.turns !== -1)) return false;
  if (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0) return true;
  return effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name);
}

function appliesToDamageTypeModifiedSkill(effect, skill) {
  if (effect.type !== "modifyDamageType" || (effect.turns <= 0 && effect.turns !== -1)) return false;
  if (!["basic", "normal", "piercing", "affliction"].includes(effect.damageType)) return false;
  if (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0) return true;
  return effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name);
}

function appliesToEffectAddedSkill(effect, skill) {
  if (effect.type !== "addEffectToBase" || (effect.turns <= 0 && effect.turns !== -1)) return false;
  if (!Array.isArray(effect.effects) || effect.effects.length === 0) return false;
  if (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0) return true;
  return effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name);
}

function modifierTypeMatches(effectType, type) {
  const types = Array.isArray(type) ? type : [type];
  return types.includes(effectType);
}

function modifierAppliesToSkill(effect, skill, type) {
  if (!modifierTypeMatches(effect.type, type) || (effect.turns <= 0 && effect.turns !== -1)) return false;
  if (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0) return true;
  return effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name);
}

function activeSkillModifiers(actor, skill, currentTurn, type) {
  return activeStatusEffects(actor)
    .filter((effect) => !(effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn))
    .flatMap((effect) => {
      if (modifierAppliesToSkill(effect, skill, type)) return [effect];
      if (effect.type === "complex" && (effect.turns > 0 || effect.turns === -1)) {
        return (effect.effects || [])
          .filter((childEffect) => !statusIsIgnored(childEffect))
          .filter((childEffect) => modifierAppliesToSkill({ ...childEffect, turns: 1 }, skill, type));
      }
      return [];
    });
}

export function replacementEffectsForSkill(actor, skill, currentTurn) {
  return activeSkillModifiers(actor, skill, currentTurn, "replaceEffects").at(-1)?.effects || null;
}

export function modifiedTargetType(actor, skill, baseTargetType, currentTurn) {
  return activeSkillModifiers(actor, skill, currentTurn, "modifyTargetType").at(-1)?.targetType || baseTargetType;
}

export function modifiedTargetCount(actor, skill, currentTurn) {
  const modifier = activeSkillModifiers(actor, skill, currentTurn, "modifyTargetCount").at(-1);
  if (!modifier) return null;
  return {
    count: Math.max(1, Number(modifier.count ?? modifier.value ?? 1)),
    random: modifier.random !== false
  };
}

export function damageBuffValue(actor, skill, currentTurn) {
  const effectBuffValue = (effect) => {
    if (effect.type === "modifyDamageByMissingHp") {
      const character = getCharacterById(actor.characterId) || actor.character;
      const maxHp = Math.max(0, Number(character?.maxHp || 0));
      const missingHp = Math.max(0, maxHp - Math.max(0, Number(actor.hp || 0)));
      const hpStep = Math.max(1, Number(effect.hpStep || 1));
      return Math.floor(missingHp / hpStep) * Number(effect.amountPerStep ?? effect.value ?? 0);
    }
    return Number(effect.value || 0);
  };
  const directBuffs = activeStatusEffects(actor)
    .filter((effect) => appliesToModifiedSkill(effect, skill))
    .filter((effect) => !(effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn))
    .reduce((total, effect) => total + effectBuffValue(effect), 0);
  const complexBuffs = activeStatusEffects(actor)
    .filter((effect) => effect.type === "complex" && (effect.turns > 0 || effect.turns === -1))
    .filter((effect) => !(effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn))
    .flatMap((effect) => effect.effects || [])
    .filter((effect) => !statusIsIgnored(effect))
    .filter((effect) => appliesToModifiedSkill({ ...effect, turns: 1 }, skill))
    .reduce((total, effect) => total + effectBuffValue(effect), 0);
  return directBuffs + complexBuffs;
}

export function isSkillCountereable(actor, skill, currentTurn) {
  return skill?.uncountereable !== true
    && skill?.uncounterable !== true
    && activeSkillModifiers(actor, skill, currentTurn, "addUncountereable").length === 0;
}

export function isSkillReflectable(actor, skill, currentTurn) {
  return skill?.nonReflectable !== true
    && activeSkillModifiers(actor, skill, currentTurn, "addNonReflectable").length === 0;
}

export function modifiedDamageType(actor, skill, baseDamageType = "basic", currentTurn) {
  let type = ["basic", "normal", "piercing", "affliction"].includes(baseDamageType) ? baseDamageType : "basic";
  for (const effect of activeStatusEffects(actor)) {
    if (effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn) continue;
    if (appliesToDamageTypeModifiedSkill(effect, skill)) {
      type = effect.damageType;
      continue;
    }
    if (effect.type === "complex" && (effect.turns > 0 || effect.turns === -1)) {
      for (const childEffect of effect.effects || []) {
        if (statusIsIgnored(childEffect)) continue;
        if (appliesToDamageTypeModifiedSkill({ ...childEffect, turns: 1 }, skill)) {
          type = childEffect.damageType;
        }
      }
    }
  }
  return type;
}

export function addedEffectsForSkill(actor, skill, currentTurn) {
  return activeStatusEffects(actor)
    .filter((effect) => !(effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn))
    .flatMap((effect) => {
      if (appliesToEffectAddedSkill(effect, skill)) return effect.effects;
      if (effect.type === "complex" && (effect.turns > 0 || effect.turns === -1)) {
        return (effect.effects || [])
          .filter((childEffect) => !statusIsIgnored(childEffect))
          .filter((childEffect) => appliesToEffectAddedSkill({ ...childEffect, turns: 1 }, skill))
          .flatMap((childEffect) => childEffect.effects || []);
      }
      return [];
    });
}

function aliveMembers(player) {
  return player.team.filter((member) => member.hp > 0);
}

function ignoresInvulnerability(effect) {
  if (!effect) return false;
  if (effect.ignoreInvulnerable === true || effect.ignoreInvulnerability === true) return true;
  if (effect.type === "complex") return (effect.effects || []).some((childEffect) => ignoresInvulnerability(childEffect));
  return false;
}

function skillIgnoresInvulnerability(skill) {
  return (skill?.effects || []).some((effect) => ignoresInvulnerability(effect));
}

function canBeTargetedBy(player, candidate, source = null) {
  return player.team.includes(candidate)
    || !hasStatus(candidate, "invulnerable")
    || ignoresInvulnerability(source)
    || skillIgnoresInvulnerability(source);
}

function ignoredEffectTypesForMember(member) {
  const ignored = new Set();
  for (const effect of activeStatusEffects(member)) {
    if (effect.type === "effect-immunity" && effect.turns > 0) {
      supportedEffectTypes
        .filter((type) => !["damage", "heal", "self-heal"].includes(type))
        .forEach((type) => ignored.add(type));
    }
    if (effect.type === "ignoreEffects" && effect.turns > 0) {
      (effect.ignoreEffects || []).forEach((type) => ignored.add(type));
    }
    if (effect.type === "complex" && effect.turns > 0) {
      for (const childEffect of effect.effects || []) {
        if (statusIsIgnored(childEffect)) continue;
        if (childEffect.type === "effect-immunity") {
          supportedEffectTypes
            .filter((type) => !["damage", "heal", "self-heal"].includes(type))
            .forEach((type) => ignored.add(type));
        }
        if (childEffect.type === "ignoreEffects") {
          (childEffect.ignoreEffects || []).forEach((type) => ignored.add(type));
        }
      }
    }
  }
  return ignored;
}

function hasEffectImmunity(member) {
  return activeStatusEffects(member).some((effect) => {
    if (effect.type === "effect-immunity" && effect.turns > 0) return true;
    return effect.type === "complex" && effect.turns > 0 && (effect.effects || []).some((childEffect) => !statusIsIgnored(childEffect) && childEffect.type === "effect-immunity");
  });
}

function ignoredEffectDescription(effect) {
  return `Este efecto fue ignorado y no tendra efecto en este personaje.`;
}

function markEffectIgnored(effect) {
  return {
    ...effect,
    ignoredByEffectImmunity: true,
    descriptions: [
      ...(effect.descriptions || []),
      ignoredEffectDescription(effect)
    ]
  };
}

function effectForTargetImmunity(effect, target) {
  const ignoredTypes = ignoredEffectTypesForMember(target);
  if (!hasEffectImmunity(target) && ignoredTypes.size === 0) return effect;
  const effectIsIgnored = (candidate) => candidate && ignoredTypes.has(candidate.type);
  if (effect?.type !== "complex" && !effectIsIgnored(effect) && !hasEffectImmunity(target)) return effect;
  if (hasEffectImmunity(target) && ["damage", "heal", "self-heal"].includes(effect?.type)) return effect;
  if (effect.type === "complex") {
    return {
      ...effect,
      effects: (effect.effects || []).map((childEffect) => (
        (hasEffectImmunity(target) && ["damage", "heal", "self-heal"].includes(childEffect.type)) || !effectIsIgnored(childEffect)
          ? childEffect
          : markEffectIgnored(childEffect)
      ))
    };
  }
  if (!effectIsIgnored(effect) && hasEffectImmunity(target)) return markEffectIgnored(effect);
  if (!effectIsIgnored(effect)) return effect;
  return markEffectIgnored(effect);
}

function effectsAllowedByTargetImmunity(effects, target) {
  return (effects || []).map((effect) => effectForTargetImmunity(effect, target));
}

function skillUsesLimit(skill) {
  return Math.max(0, Number(skill?.uses ?? skill?.maxUses ?? 0));
}

function updateSkillUsesStatus(actor, skill, actorCharacter, currentTurn) {
  const limit = skillUsesLimit(skill);
  if (limit <= 0) return;
  const used = Math.max(0, Number(actor.skillUses?.[skill.id] || 0));
  const remaining = Math.max(0, limit - used);
  actor.statusEffects = (actor.statusEffects || []).filter((effect) => !(effect.type === "skill-uses" && effect.sourceSkillId === skill.id));
  if (remaining <= 0) return;
  addStatus(actor, {
    id: `uses-${skill.id}`,
    type: "skill-uses",
    turns: -1,
    value: remaining,
    remainingUses: remaining,
    showStatusEffect: true,
    sourceSkillId: skill.id,
    sourceSkillName: skill.name,
    sourceActorName: actorCharacter.name,
    ...statusOrigin(actor),
    createdTurn: currentTurn,
    descriptions: [`${skill.name} puede usarse ${remaining} veces mas.`]
  });
}

export function canEffectAffectTarget(room, sourcePlayer, target, effect) {
  if (!target) return true;
  if (ignoresInvulnerability(effect)) return true;
  const targetOwner = ownerOfMember(room, target);
  if (!targetOwner || !sourcePlayer || targetOwner.id === sourcePlayer.id) return true;
  return !hasStatus(target, "invulnerable");
}

function memberHasStatusEffect(member, effectId) {
  return activeStatusEffects(member).some((effect) => {
    if (effect.id === effectId || effect.sourceSkillId === effectId || effect.type === effectId) return true;
    return effect.type === "complex" && (effect.effects || []).some((childEffect) => (
      !statusIsIgnored(childEffect) && (childEffect.id === effectId || childEffect.sourceSkillId === effectId || childEffect.type === effectId)
    ));
  });
}

function requireCandidates(requirement, player, opponent, actor, selectedTargets = []) {
  const scope = normalizeRequireScope(requirement.scope || requirement.target);
  if (scope === "target") return selectedTargets.slice(0, 1);
  if (scope === "anyTarget") return selectedTargets;
  if (scope === "anyAlly") return aliveMembers(player);
  if (scope === "anyEnemy") return aliveMembers(opponent);
  return actor ? [actor] : [];
}

function memberMeetsRequirement(member, requirement) {
  const type = normalizeRequireType(requirement.type || requirement.condition);
  if (type === "hasStatusEffect") {
    const effectId = requirement.effectId || requirement.statusEffectId || requirement.id;
    return Boolean(effectId && memberHasStatusEffect(member, effectId));
  }
  if (type === "hasSkill") {
    const skillId = requirement.skillId || requirement.id || requirement.value;
    const character = getCharacterById(member.characterId) || member.character;
    return Boolean(skillId && (character?.skills || []).some((skill) => skill.id === skillId || skill.name === skillId));
  }
  if (type === "hp") {
    return compareHp(member.hp, requirement.operator || requirement.comparison, requirement.hp ?? requirement.value);
  }
  if (type === "hasMinHp") {
    const minHp = Number(requirement.minHp ?? requirement.hp ?? requirement.value ?? 0);
    return member.hp >= minHp;
  }
  if (type === "hasMaxHp") {
    const maxHp = Number(requirement.maxHp ?? requirement.hp ?? requirement.value ?? 0);
    return member.hp <= maxHp;
  }
  return false;
}

function damageBonusSubject(rule, target, actor) {
  const requirement = rule.require || rule.when || rule;
  const scope = String(requirement.scope || requirement.target || rule.scope || rule.target || "target").toLowerCase();
  return scope === "self" ? actor : target;
}

export function damageBonusForTarget(effect, target, actor) {
  return (effect.bonusWhen || []).reduce((bonus, rule) => {
    const requirement = rule.require || rule.when || rule;
    const subject = damageBonusSubject(rule, target, actor);
    return subject && memberMeetsRequirement(subject, requirement)
      ? bonus + Math.max(0, Number(rule.bonus ?? rule.value ?? 0))
      : bonus;
  }, 0);
}

function effectConditionSubject(requirement, target, actor) {
  const scope = String(requirement.scope || requirement.target || "target").toLowerCase();
  return scope === "self" ? actor : target;
}

function effectAppliesToTarget(effect, target, actor) {
  const requirements = [effect.require, effect.when, ...(Array.isArray(effect.requires) ? effect.requires : [])].filter(Boolean);
  return requirements.every((requirement) => {
    const subject = effectConditionSubject(requirement, target, actor);
    return subject && memberMeetsRequirement(subject, requirement);
  });
}

function snapshotComplexEffects(effects, actor, skill, target, currentTurn) {
  return (effects || []).map((childEffect) => {
    if (childEffect.type !== "damage") {
      return { ...childEffect };
    }

    const baseDamage = Math.max(0, Number(childEffect.value || 0));
    const buffedDamage = baseDamage + damageBuffValue(actor, skill, currentTurn);
    const damageType = modifiedDamageType(
      actor,
      skill,
      childEffect.damageType || "basic",
      currentTurn
    );

    return {
      ...childEffect,
      value: buffedDamage + damageBonusForTarget(childEffect, target, actor),
      damageType
    };
  });
}

function validateSkillRequirements(skill, player, opponent, actor, selectedTargets = []) {
  for (const requirement of skill.requires || []) {
    const candidates = requireCandidates(requirement, player, opponent, actor, selectedTargets);
    if (!candidates.some((member) => memberMeetsRequirement(member, requirement))) {
      return requirement.message || "No se cumplen los requisitos de la habilidad.";
    }
  }
  return null;
}

function limitTargets(targets, targetLimit) {
  if (!targetLimit || targets.length <= targetLimit.count) return targets;
  if (!targetLimit.random) return targets.slice(0, targetLimit.count);
  const pool = [...targets];
  const selected = [];
  while (pool.length > 0 && selected.length < targetLimit.count) {
    const index = randomInt(0, pool.length - 1);
    selected.push(pool.splice(index, 1)[0]);
  }
  return selected;
}

function targetsForSkill(room, player, actor, targetId, skill, currentTurn = room.turn) {
  const opponent = opponentOf(room, player.id);
  const targetType = skill.ignoreTargetTypeModifiers
    ? skill.targetType
    : modifiedTargetType(actor, skill, skill.targetType, currentTurn);
  let targets = [];
  if (targetType === "self") targets = [actor];
  if (targetType === "enemy") targets = [getMember(opponent, targetId)].filter(Boolean).filter((member) => canBeTargetedBy(player, member, skill));
  if (targetType === "ally") targets = [getMember(player, targetId)].filter(Boolean);
  if (targetType === "otherAlly") targets = [getMember(player, targetId)].filter(Boolean).filter((member) => member.id !== actor.id);
  if (targetType === "enemies") targets = aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member, skill));
  if (targetType === "allies") targets = aliveMembers(player);
  if (targetType === "allPlayers") targets = [...aliveMembers(player), ...aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member, skill))];
  return limitTargets(targets, modifiedTargetCount(actor, skill, currentTurn));
}

function resolveEffectTargets(room, player, actor, targetId, skill, effect) {
  const requestedTargets = Array.isArray(effect.targets) ? effect.targets : [effect.targets || "self"];
  const opponent = opponentOf(room, player.id);
  const members = [];
  for (const requestedTarget of requestedTargets) {
    if (requestedTarget === "self") {
      members.push(actor);
      continue;
    }
    if (requestedTarget === "origin") {
      members.push(actor);
      continue;
    }
    if (requestedTarget === "target") {
      members.push(...targetsForSkill(room, player, actor, targetId, skill));
      continue;
    }
    if (requestedTarget === "allies") {
      members.push(...aliveMembers(player));
      continue;
    }
    if (requestedTarget === "enemies") {
      members.push(...aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member, effect)));
    }
  }
  const uniqueTargets = [...new Map(members.filter(Boolean).map((member) => [member.id, member])).values()];
  const count = effect.randomTargetCount ?? effect.pickRandom ?? effect.targetCount;
  return count ? limitTargets(uniqueTargets, { count: Math.max(1, Number(count)), random: true }) : uniqueTargets;
}

function resolveComplexEffectTargets(room, player, statusMember, effect, status) {
  const requestedTargets = Array.isArray(effect.targets) ? effect.targets : [effect.targets || "self"];
  const opponent = opponentOf(room, player.id);
  const members = [];
  for (const requestedTarget of requestedTargets) {
    if (requestedTarget === "self" || requestedTarget === "target") {
      members.push(statusMember);
      continue;
    }
    if (requestedTarget === "origin") {
      members.push(getRoomMember(room, status.originActorId));
      continue;
    }
    if (requestedTarget === "allies") {
      members.push(...aliveMembers(player));
      continue;
    }
    if (requestedTarget === "enemies") {
      members.push(...aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member, effect)));
    }
  }
  const uniqueTargets = [...new Map(members.filter(Boolean).map((member) => [member.id, member])).values()];
  const count = effect.randomTargetCount ?? effect.pickRandom ?? effect.targetCount;
  return count ? limitTargets(uniqueTargets, { count: Math.max(1, Number(count)), random: true }) : uniqueTargets;
}

function targetNameForSkill(room, player, actor, targetId, skill) {
  if (skill.targetType === "enemies") return "Todos los enemigos";
  if (skill.targetType === "allies") return "Todos los aliados";
  if (skill.targetType === "allPlayers") return "Todos los jugadores";
  const targets = targetsForSkill(room, player, actor, targetId, skill);
  if (skill.targetType === "self") return getCharacterById(actor.characterId).name;
  return targets[0] ? getCharacterById(targets[0].characterId).name : "objetivo invalido";
}

function applyComplexStatusEffects(room, player) {
  const events = [];
  for (const member of aliveMembers(player)) {
    const memberCharacter = getCharacterById(member.characterId);
    for (const status of member.statusEffects || []) {
      if (status.type !== "complex" || (status.turns <= 0 && status.turns !== -1) || status.createdTurn === room.turn) continue;
      if (statusIsIgnored(status)) continue;
      if (status.mode === "pauseOnStun" || status.mode === "interruptible") {
        if (isSkillStunned(member, { id: status.sourceSkillId, family: status.interruptFamilies || [] })) {
          status.pausedThisTurn = true;
          continue;
        }
      }
      if (status.mode === "cancelOnStun" || status.mode === "cancelable") {
        if (isSkillStunned(member, { id: status.sourceSkillId, family: status.interruptFamilies || [] })) {
          removeLinkedStatusEffects(room, status);
          events.push(`${status.sourceSkillName} fue cancelado por aturdimiento.`);
          continue;
        }
      }
      if (status.cancelIfOriginStunned) {
        const originMember = getRoomMember(room, status.originActorId);
        if (originMember && isSkillStunned(originMember, { id: status.sourceSkillId, family: status.interruptFamilies || [] })) {
          removeLinkedStatusEffects(room, status);
          events.push(`${status.sourceSkillName} fue cancelado por aturdimiento.`);
          continue;
        }
      }
      if (room.turn <= status.createdTurn + Number(status.activationDelayTurns || 0)) {
        status.pausedThisTurn = true;
        continue;
      }
      for (const effect of status.effects || []) {
        if (statusIsIgnored(effect)) continue;
        if (skillModifierEffectTypes.includes(effect.type) || effect.type === "counter" || effect.type === "reflect" || effect.type === "damage-reduction" || effect.type === "invulnerable" || effect.type === "effect-immunity" || effect.type === "ignoreEffects" || effect.type === "stun") {
          continue;
        }

        const sourceMember = getRoomMember(room, status.originActorId);
        const sourcePlayer = sourceMember ? ownerOfMember(room, sourceMember) : player;
        const targets = resolveComplexEffectTargets(room, player, member, effect, status)
          .filter((target) => target.hp > 0)
          .filter((target) => canEffectAffectTarget(room, sourcePlayer, target, effect));
        if (targets.length === 0) continue;

        if (effect.type === "damage") {
          let totalDamage = 0;
          for (const target of targets) {
            if (!effectAppliesToTarget(effect, target, member)) continue;
            totalDamage += applyDamage(target, positiveEffectValue(effect), effect.damageType || "basic");
          }
          if (totalDamage > 0) events.push(`${status.sourceSkillName} hizo ${totalDamage} dano continuo.`);
          continue;
        }

        if (effect.type === "payLife") {
          let totalPaid = 0;
          for (const target of targets) {
            if (!effectAppliesToTarget(effect, target, member)) continue;
            totalPaid += payLife(target, positiveEffectValue(effect), { notKill: effect.notKill === true });
          }
          if (totalPaid > 0) events.push(`${status.sourceSkillName} pago ${totalPaid} de vida.`);
          continue;
        }

        if (effect.type === "instakill") {
          let totalKills = 0;
          for (const target of targets) {
            if (!effectAppliesToTarget(effect, target, member)) continue;
            if (target.hp > 0) {
              target.hp = 0;
              totalKills += 1;
            }
          }
          if (totalKills > 0) events.push(`${status.sourceSkillName} elimino ${totalKills} objetivo(s).`);
          continue;
        }

        if (effect.type === "heal" || effect.type === "self-heal") {
          let totalHeal = 0;
          for (const target of targets) {
            if (!effectAppliesToTarget(effect, target, member)) continue;
            const targetCharacter = getCharacterById(target.characterId);
            const before = target.hp;
            target.hp = Math.min(targetCharacter.maxHp, target.hp + healValueForTarget(effect, target));
            totalHeal += target.hp - before;
          }
          if (totalHeal > 0) events.push(`${status.sourceSkillName} curo ${totalHeal} de vida.`);
          continue;
        }

        if (effect.type === "shield") {
          let totalShield = 0;
          for (const target of targets) {
            if (!effectAppliesToTarget(effect, target, member)) continue;
            const shieldBefore = shieldValue(target);
            const value = positiveEffectValue(effect);
            addStatus(target, {
              id: randomUUID(),
              type: "shield",
              turns: null,
              value,
              remainingShield: value,
              isStackable: effect.isStackable,
              sourceSkillId: `${status.id}-${effect.type}`,
              sourceSkillName: status.sourceSkillName,
              sourceActorName: status.sourceActorName,
              originActorId: status.originActorId,
              originCharacterId: status.originCharacterId,
              createdTurn: room.turn,
              descriptions: [statusDescription({ ...effect, remainingShield: value }, memberCharacter)],
              tooltipDescription: tooltipDescriptionForEffect(effect)
            });
            target.shield = shieldValue(target);
            totalShield += Math.max(0, target.shield - shieldBefore);
          }
          if (totalShield > 0) events.push(`${status.sourceSkillName} otorgo ${totalShield} de escudo.`);
          continue;
        }

        if (effect.type === "gain-chakra" || effect.type === "remove-chakra") {
          const activeTargets = targets.filter((target) => effectForTargetImmunity(effect, target).ignoredByEffectImmunity !== true);
          if (activeTargets.length === 0) continue;
          const affectedPlayers = affectedPlayersForChakraEffect(room, player, activeTargets, effect);
          const changedChakra = emptyChakra();
          for (const affectedPlayer of affectedPlayers) {
            const changed = effect.type === "gain-chakra"
              ? applyChakraGain(affectedPlayer, positiveEffectValue(effect), effect.chakraType)
              : applyChakraRemoval(affectedPlayer, positiveEffectValue(effect), effect.chakraType);
            for (const type of CHAKRA_TYPES) changedChakra[type] += changed[type] || 0;
          }
          if (totalChakra(changedChakra) > 0) {
            events.push(`${status.sourceSkillName} ${effect.type === "gain-chakra" ? "gano" : "elimino"} ${chakraLabel(changedChakra)}.`);
          }
        }
      }
    }
  }
  return events;
}

function validateSkillAction(room, playerId, actorId, targetId, skillId) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const opponent = opponentOf(room, playerId);
  const actor = getMember(player, actorId);
  if (!actor || actor.hp <= 0) return "Ese personaje no puede actuar.";

  const actorCharacter = getCharacterById(actor.characterId);
  const skill = activeSkillForMember(actor, actorCharacter, skillId);
  if (!skill) return "Habilidad invalida.";
  if (isSkillStunned(actor, skill)) return "Ese personaje esta aturdido y no puede usar esa habilidad.";
  if (queuedActorFor(player, actor.id)) return `${actorCharacter.name} ya tiene una habilidad en cola este turno.`;
  if (skillCooldown(actor, skill.id) > 0) return `${skill.name} esta en cooldown.`;
  const usesLimit = skillUsesLimit(skill);
  if (usesLimit > 0 && (actor.skillUses?.[skill.id] || 0) >= usesLimit) return `${skill.name} ya no tiene usos disponibles.`;
  if (queuedSkillFor(player, actor.id, skill.id)) return `${skill.name} ya esta en cola.`;
  const chakraCost = modifiedSkillChakraCost(actor, skill);
  if (!canPaySkillCost(player.chakra, chakraCost, queuedNeutralChakraCost(player))) return `No tienes chakra suficiente: requiere ${chakraLabel(chakraCost)}.`;

  const targets = targetsForSkill(room, player, actor, targetId, skill);
  if (targets.length === 0 || targets.some((target) => target.hp <= 0)) return "Objetivo invalido.";
  const requirementError = validateSkillRequirements(skill, player, opponent, actor, targets);
  if (requirementError) return requirementError;

  return { player, opponent, actor, actorCharacter, skill, chakraCost, targetName: targetNameForSkill(room, player, actor, targetId, skill) };
}

function queueSkill(room, playerId, actorId, targetId, skillId) {
  const validation = validateSkillAction(room, playerId, actorId, targetId, skillId);
  if (typeof validation === "string") return validation;

  const { player, actorCharacter, skill, chakraCost, targetName } = validation;
  payChakra(player, specificChakraCost(chakraCost));
  player.queue.push({
    id: randomUUID(),
    actorId,
    targetId,
    skillId,
    chakra: cloneChakra(chakraCost),
    actorName: actorCharacter.name,
    targetName,
    skillName: skill.name
  });

  return null;
}

function reactiveStatusApplies(status, skill, trigger) {
  if (!["counter", "reflect"].includes(status.type)) return false;
  if (status.turns <= 0 && status.turns !== -1) return false;
  const statusTrigger = status.trigger || "incoming";
  if (statusTrigger !== "both" && statusTrigger !== trigger) return false;
  if (Array.isArray(status.skillIds) && status.skillIds.length > 0 && !status.skillIds.includes(skill.id) && !status.skillIds.includes(skill.name)) return false;
  if (Array.isArray(status.familiesAffected) && status.familiesAffected.length > 0) {
    const skillFamilies = Array.isArray(skill.family) ? skill.family : [];
    if (!status.familiesAffected.some((family) => skillFamilies.includes(family))) return false;
  }
  return true;
}

function addCounteredNotice(member, status, currentTurn) {
  const sourceActorName = status.sourceActorName || "Un personaje";
  const sourceSkillName = status.sourceSkillName || "una habilidad";
  addStatus(member, {
    id: randomUUID(),
    type: "countered",
    turns: 1,
    showStatusEffect: true,
    sourceSkillId: status.sourceSkillId,
    sourceSkillName: "Habilidad contrarrestada",
    sourceActorName,
    createdTurn: currentTurn,
    descriptions: [`${sourceActorName} de ${sourceSkillName} ha contrarrestado a este personaje.`]
  });
}

function addReflectedNotice(member, status, currentTurn) {
  const sourceSkillName = status.sourceSkillName || "Una habilidad";
  addStatus(member, {
    id: randomUUID(),
    type: "reflected",
    turns: 1,
    showStatusEffect: true,
    sourceSkillId: status.sourceSkillId,
    sourceSkillName: "Habilidad reflejada",
    sourceActorName: status.sourceActorName,
    createdTurn: currentTurn,
    descriptions: [`${sourceSkillName} ha reflejado una habilidad sobre este personaje.`]
  });
}

function addTriggeredEffectNotice(member, status, effect, currentTurn) {
  if (!effect.statusNoticeDescription) return;
  addStatus(member, {
    id: randomUUID(),
    type: "triggered-effect-notice",
    turns: Number(effect.statusNoticeTurns || 1),
    showStatusEffect: true,
    sourceSkillId: status.sourceSkillId,
    sourceSkillName: status.sourceSkillName || "Efecto disparado",
    sourceActorName: status.sourceActorName,
    createdTurn: currentTurn,
    descriptions: [effect.statusNoticeDescription],
    tooltipDescription: tooltipDescriptionForEffect(effect)
  });
}

function applyTriggeredStatusEffects(room, statusMember, status, currentTurn) {
  const sourceMember = getRoomMember(room, status.originActorId) || statusMember;
  const sourcePlayer = ownerOfMember(room, sourceMember) || ownerOfMember(room, statusMember);
  if (!sourcePlayer) return [];
  const triggeredSkill = {
    id: status.sourceSkillId,
    name: status.sourceSkillName,
    targetType: "self",
    ignoreTargetTypeModifiers: true
  };
  const events = [];

  for (const effect of status.effects || []) {
    const targets = resolveEffectTargets(room, sourcePlayer, sourceMember, statusMember.id, triggeredSkill, effect)
      .filter((target) => target.hp > 0)
      .filter((target) => canEffectAffectTarget(room, sourcePlayer, target, effect));
    if (targets.length === 0) continue;

    if (effect.type === "damage") {
      let totalDamage = 0;
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, sourceMember)) continue;
        const dealt = applyDamage(target, positiveEffectValue(effect), effect.damageType || "basic");
        totalDamage += dealt;
        if (dealt > 0) addTriggeredEffectNotice(target, status, effect, currentTurn);
      }
      if (totalDamage > 0) events.push(`${status.sourceSkillName} hizo ${totalDamage} dano.`);
      continue;
    }

    if (effect.type === "complex") {
      for (const target of targets) {
        const statusEffects = effectsAllowedByTargetImmunity(Array.isArray(effect.effects) ? effect.effects : [], target);
        if (statusEffects.length === 0 && effect.showStatusEffect !== true && !hasCustomDescriptions(effect)) continue;
        addStatus(target, {
          id: randomUUID(),
          type: "complex",
          turns: effect.duration,
          mode: effect.mode,
          interruptFamilies: effect.interruptFamilies,
          activationDelayTurns: effect.activationDelayTurns,
          cancelIfOriginStunned: effect.cancelIfOriginStunned,
          statusLinkId: effect.statusLinkId,
          suppressSecretEndNotice: effect.suppressSecretEndNotice,
          showStatusEffect: effect.showStatusEffect,
          isSecret: Boolean(effect.isSecret),
          descriptions: effect.descriptions,
          tooltipDescription: tooltipDescriptionForEffect(effect),
          effects: snapshotComplexEffects(
            statusEffects,
            sourceMember,
            triggeredSkill,
            target,
            currentTurn
          ),
          sourceSkillId: status.sourceSkillId,
          sourceSkillName: status.sourceSkillName,
          sourceActorName: status.sourceActorName,
          originActorId: status.originActorId,
          originCharacterId: status.originCharacterId,
          createdTurn: currentTurn,
          remainingReductions: {}
        });
      }
    }
  }

  return events;
}

function consumeReactiveStatus(room, member, status, currentTurn) {
  const triggeredEvents = applyTriggeredStatusEffects(room, member, status, currentTurn);
  if (status.charges === -1) return triggeredEvents;
  status.charges = Math.max(0, Number(status.charges ?? 1) - 1);
  if (status.charges <= 0) {
    member.statusEffects = (member.statusEffects || []).filter((effect) => effect !== status);
    if (status.isSecret) addSecretEndNotice(room, member, status, currentTurn);
  }
  return triggeredEvents;
}

function firstCounterForAction(actor, selectedTargets, skill, currentTurn) {
  if (!isSkillCountereable(actor, skill, currentTurn)) return null;
  const outgoing = activeStatusEffects(actor).find((status) => status.type === "counter" && reactiveStatusApplies(status, skill, "outgoing"));
  if (outgoing) return { member: actor, status: outgoing };
  for (const target of selectedTargets) {
    const incoming = activeStatusEffects(target).find((status) => status.type === "counter" && reactiveStatusApplies(status, skill, "incoming"));
    if (incoming) return { member: target, status: incoming };
  }
  return null;
}

function firstReflectForAction(actor, selectedTargets, skill, currentTurn) {
  if (!isSkillReflectable(actor, skill, currentTurn)) return null;
  for (const target of selectedTargets) {
    const status = activeStatusEffects(target).find((effect) => effect.type === "reflect" && reactiveStatusApplies(effect, skill, "incoming"));
    if (status) return { member: target, status };
  }
  return null;
}

function reflectedTargetId(room, player, actor, reflectStatus) {
  const reflectTo = reflectStatus.reflectTo || "caster";
  if (reflectTo === "randomCasterAlly") return randomItem(aliveMembers(player))?.id || actor.id;
  return actor.id;
}

export function reflectedSkill(skill, reflectStatus) {
  const reflectTo = reflectStatus?.reflectTo || "caster";
  if (reflectTo === "randomCasterAlly") return { ...skill, targetType: "ally", ignoreTargetTypeModifiers: true };
  if (reflectTo === "casterEnemies") return { ...skill, targetType: "enemies", ignoreTargetTypeModifiers: true };
  if (skill.targetType === "enemies") return { ...skill, targetType: "allies", ignoreTargetTypeModifiers: true };
  return { ...skill, targetType: "self", ignoreTargetTypeModifiers: true };
}

export function reflectedEffect(effect, skill, reflectStatus) {
  const reflectTo = reflectStatus?.reflectTo || "caster";
  if (reflectTo === "caster" && skill.targetType === "enemies" && effect.targets === "enemies") {
    return { ...effect, targets: "allies" };
  }
  return effect;
}

function battleStartPassiveSkills(character) {
  return (character?.skills || []).filter((skill) => (
    skill.passive === true
    && (skill.trigger === "battleStart" || skill.activate === "battleStart" || skill.startsActive === true)
  ));
}

function applyBattleStartPassives(room) {
  const events = [];
  for (const player of room.players) {
    for (const actor of aliveMembers(player)) {
      const character = getCharacterById(actor.characterId);
      for (const skill of battleStartPassiveSkills(character)) {
        events.push(applyQueuedSkill(room, player, {
          id: randomUUID(),
          passive: true,
          actorId: actor.id,
          targetId: actor.id,
          skillId: skill.id,
          actorName: character.name,
          targetName: character.name,
          skillName: skill.name
        }));
      }
    }
  }
  return events;
}

export function applyQueuedSkill(room, player, action) {
  const opponent = opponentOf(room, player.id);
  const actor = getMember(player, action.actorId);
  if (!actor || actor.hp <= 0) {
    return `${action.skillName} se descarto: ${action.actorName} ya no puede actuar.`;
  }

  const actorCharacter = getCharacterById(actor.characterId);
  const skill = activeSkillForMember(actor, actorCharacter, action.skillId)
    || (action.passive === true ? battleStartPassiveSkills(actorCharacter).find((item) => item.id === action.skillId) : null);
  if (!skill) {
    return `${action.skillName} se descarto: habilidad invalida.`;
  }

  if (isSkillStunned(actor, skill)) {
    return `${action.skillName} se descarto: ${action.actorName} esta aturdido para esa habilidad.`;
  }

  const effectiveSkill = {
    ...skill,
    targetType: modifiedTargetType(actor, skill, skill.targetType, room.turn)
  };
  const selectedTargets = targetsForSkill(room, player, actor, action.targetId, effectiveSkill);
  if (selectedTargets.length === 0 || selectedTargets.every((target) => target.hp <= 0)) {
    return `${actorCharacter.name} desperdicio ${skill.name}: el objetivo ya no es valido.`;
  }

  const counter = firstCounterForAction(actor, selectedTargets, effectiveSkill, room.turn);
  if (counter) {
    const triggeredEvents = consumeReactiveStatus(room, counter.member, counter.status, room.turn);
    addCounteredNotice(actor, counter.status, room.turn);
    setSkillCooldown(actor, skill.id, skill.cooldown || 0);
    return [
      `${actorCharacter.name} uso ${skill.name}, pero fue cancelada por un counter.`,
      ...(triggeredEvents || [])
    ].join(" ");
  }

  const reflect = firstReflectForAction(actor, selectedTargets, effectiveSkill, room.turn);
  const resolvedTargetId = reflect ? reflectedTargetId(room, player, actor, reflect.status) : action.targetId;
  const resolvedSkill = reflect ? reflectedSkill(effectiveSkill, reflect.status) : effectiveSkill;
  const effectSourcePlayer = reflect ? ownerOfMember(room, reflect.member) : player;
  if (reflect) {
    consumeReactiveStatus(room, reflect.member, reflect.status, room.turn);
  }

  const events = [];
  let totalDamage = 0;
  let totalLifePaid = 0;
  let totalInstakill = 0;
  let totalHeal = 0;
  let totalShield = 0;
  let totalStun = 0;
  let totalInvulnerable = 0;
  let totalDamageReduction = 0;
  let totalDamageModifier = 0;
  let totalDamageTypeModifiers = 0;
  let totalAddedBaseEffects = 0;
  let totalSkillReplacements = 0;
  let totalChakraCostModifiers = 0;
  let gainedChakra = emptyChakra();
  let removedChakra = emptyChakra();
  const reflectedNoticeTargetIds = new Set();

  const baseEffects = replacementEffectsForSkill(actor, skill, room.turn) || (skill.effects || []);
  const activeEffects = [...baseEffects, ...addedEffectsForSkill(actor, skill, room.turn)]
    .map((effect) => (reflect ? reflectedEffect(effect, effectiveSkill, reflect.status) : effect));

  for (const effect of activeEffects) {
    if (!supportedEffectTypes.includes(effect.type)) {
      events.push(`${effect.type} no esta implementado.`);
      continue;
    }

    const targets = resolveEffectTargets(room, player, actor, resolvedTargetId, resolvedSkill, effect)
      .filter((target) => target.hp > 0)
      .filter((target) => canEffectAffectTarget(room, effectSourcePlayer, target, effect));
    if (targets.length === 0) continue;
    if (reflect) {
      for (const target of targets) {
        if (reflectedNoticeTargetIds.has(target.id)) continue;
        addReflectedNotice(target, reflect.status, room.turn);
        reflectedNoticeTargetIds.add(target.id);
      }
    }

    if (effect.type === "complex") {
      for (const target of targets) {
        const statusEffects = effectsAllowedByTargetImmunity(Array.isArray(effect.effects) ? effect.effects : [], target);
        if (statusEffects.length === 0 && effect.showStatusEffect !== true && !hasCustomDescriptions(effect)) continue;
        addStatus(target, {
          id: randomUUID(),
          type: "complex",
          turns: effect.duration,
          mode: effect.mode,
          interruptFamilies: effect.interruptFamilies,
          activationDelayTurns: effect.activationDelayTurns,
          cancelIfOriginStunned: effect.cancelIfOriginStunned,
          statusLinkId: effect.statusLinkId,
          suppressSecretEndNotice: effect.suppressSecretEndNotice,
          showStatusEffect: effect.showStatusEffect,
          isSecret: Boolean(skill.isSecret || effect.isSecret || effect.type === "counter" || effect.type === "reflect"),
          descriptions: effect.descriptions,
          tooltipDescription: tooltipDescriptionForEffect(effect),
          effects: snapshotComplexEffects(
            statusEffects,
            actor,
            skill,
            target,
            room.turn
          ),
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          remainingReductions: {}
        });
      }
      continue;
    }

    if (effect.type === "damage") {
      const buffedDamage = positiveEffectValue(effect) + damageBuffValue(actor, skill, room.turn);
      const damageType = modifiedDamageType(actor, skill, effect.damageType || "basic", room.turn);
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, actor)) continue;
        const targetDamage = buffedDamage + damageBonusForTarget(effect, target, actor);
        const dealt = applyDamage(target, targetDamage, damageType);
        totalDamage += dealt;
      }
      continue;
    }

    if (effect.type === "payLife") {
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, actor)) continue;
        totalLifePaid += payLife(target, positiveEffectValue(effect), { notKill: effect.notKill === true });
      }
      continue;
    }

    if (effect.type === "instakill") {
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, actor)) continue;
        if (target.hp > 0) {
          target.hp = 0;
          totalInstakill += 1;
        }
      }
      continue;
    }

    if (effect.type === "heal" || effect.type === "self-heal") {
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, actor)) continue;
        const targetCharacter = getCharacterById(target.characterId);
        const before = target.hp;
        target.hp = Math.min(targetCharacter.maxHp, target.hp + healValueForTarget(effect, target));
        totalHeal += target.hp - before;
      }
      continue;
    }

    if (effect.type === "damage-reduction") {
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, actor)) continue;
        const appliedEffect = effectForTargetImmunity(effect, target);
        const value = positiveEffectValue(effect);
        addStatus(target, {
          id: randomUUID(),
          type: "damage-reduction",
          turns: appliedEffect.duration,
          value,
          remainingReduction: value,
          percent: appliedEffect.percent === true,
          restoresEachTurn: appliedEffect.restoresEachTurn !== false,
          ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription({ ...appliedEffect, remainingReduction: value }, actorCharacter)],
          tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
        });
        if (appliedEffect.ignoredByEffectImmunity !== true) totalDamageReduction += value;
      }
      continue;
    }

    if (effect.type === "allyCountStatus") {
      const aliveAllyCount = aliveMembers(player)
        .filter((member) => effect.excludeSelf === false || member.id !== actor.id)
        .length;
      const damageReductionValue = Math.max(0, aliveAllyCount * Number(effect.damageReductionPerAlly || 0));
      const maxShieldCap = Math.min(
        Number.isFinite(Number(effect.maxShield)) ? Number(effect.maxShield) : Infinity,
        Number(effect.maxShieldPerAlly || 0) > 0 ? aliveAllyCount * Number(effect.maxShieldPerAlly || 0) : Infinity
      );
      const shieldValueTotal = Math.min(
        maxShieldCap,
        Math.max(0, aliveAllyCount * Number(effect.shieldPerAlly || 0))
      );
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, actor)) continue;
        const appliedEffect = effectForTargetImmunity(effect, target);
        if (damageReductionValue > 0) {
          addStatus(target, {
            id: randomUUID(),
            type: "damage-reduction",
            turns: appliedEffect.duration,
            value: damageReductionValue,
            remainingReduction: damageReductionValue,
            percent: appliedEffect.percent === true,
            restoresEachTurn: appliedEffect.restoresEachTurn !== false,
            dynamicAllyCountStatus: true,
            damageReductionPerAlly: Number(effect.damageReductionPerAlly || 0),
            shieldPerAlly: Number(effect.shieldPerAlly || 0),
            maxShield: effect.maxShield,
            maxShieldPerAlly: effect.maxShieldPerAlly,
            excludeSelf: effect.excludeSelf,
            ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
            sourceSkillId: skill.id,
            sourceSkillName: skill.name,
            sourceActorName: actorCharacter.name,
            ...statusOrigin(actor),
            createdTurn: room.turn,
            descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription({ type: "damage-reduction", value: damageReductionValue, remainingReduction: damageReductionValue }, actorCharacter)],
            tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
          });
          if (appliedEffect.ignoredByEffectImmunity !== true) totalDamageReduction += damageReductionValue;
        }
        if (shieldValueTotal > 0) {
          const shieldBefore = shieldValue(target);
          addStatus(target, {
            id: randomUUID(),
            type: "shield",
            turns: null,
            value: shieldValueTotal,
            remainingShield: shieldValueTotal,
            isStackable: effect.isStackable === true,
            ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
            sourceSkillId: skill.id,
            sourceSkillName: skill.name,
            sourceActorName: actorCharacter.name,
            ...statusOrigin(actor),
            createdTurn: room.turn,
            descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription({ type: "shield", value: shieldValueTotal, remainingShield: shieldValueTotal }, actorCharacter)],
            tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
          });
          target.shield = shieldValue(target);
          if (appliedEffect.ignoredByEffectImmunity !== true) totalShield += Math.max(0, target.shield - shieldBefore);
        }
      }
      continue;
    }

    if (effect.type === "modifyDamage" || effect.type === "modifyDamageByMissingHp") {
      for (const target of targets) {
        const appliedEffect = effectForTargetImmunity(effect, target);
        addStatus(target, {
          id: randomUUID(),
          type: appliedEffect.type,
          turns: appliedEffect.duration,
          value: appliedEffect.value,
          amountPerStep: appliedEffect.amountPerStep,
          hpStep: appliedEffect.hpStep,
          skillIds: Array.isArray(appliedEffect.skillIds) ? appliedEffect.skillIds : [],
          isStackable: appliedEffect.isStackable,
          ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription(appliedEffect, actorCharacter)],
          tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
        });
        if (appliedEffect.ignoredByEffectImmunity !== true) totalDamageModifier += Number(appliedEffect.value || 0);
      }
      continue;
    }

    if (effect.type === "modifyDamageType") {
      for (const target of targets) {
        const appliedEffect = effectForTargetImmunity(effect, target);
        addStatus(target, {
          id: randomUUID(),
          type: "modifyDamageType",
          turns: appliedEffect.duration,
          damageType: appliedEffect.damageType,
          skillIds: Array.isArray(appliedEffect.skillIds) ? appliedEffect.skillIds : [],
          ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription(appliedEffect, actorCharacter)],
          tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
        });
        if (appliedEffect.ignoredByEffectImmunity !== true) totalDamageTypeModifiers += 1;
      }
      continue;
    }

    if (["modifyTargetType", "modifyTargetCount", "addEffectToBase", "addUncountereable", "addNonReflectable", "replaceEffects", "counter", "reflect"].includes(effect.type)) {
      for (const target of targets) {
        const appliedEffect = effectForTargetImmunity(effect, target);
        addStatus(target, {
          id: randomUUID(),
          type: appliedEffect.type,
          turns: appliedEffect.duration,
          targetType: appliedEffect.targetType,
          count: appliedEffect.count ?? appliedEffect.value,
          random: appliedEffect.random,
          effects: Array.isArray(appliedEffect.effects) ? appliedEffect.effects : [],
          skillIds: Array.isArray(appliedEffect.skillIds) ? appliedEffect.skillIds : [],
          familiesAffected: appliedEffect.familiesAffected,
          trigger: appliedEffect.trigger,
          charges: appliedEffect.charges ?? appliedEffect.value ?? 1,
          reflectTo: appliedEffect.reflectTo,
          showStatusEffect: appliedEffect.showStatusEffect ?? (appliedEffect.type === "counter" || appliedEffect.type === "reflect" ? false : undefined),
          isSecret: Boolean(skill.isSecret || appliedEffect.isSecret || appliedEffect.type === "counter" || appliedEffect.type === "reflect"),
          ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription(appliedEffect, actorCharacter)],
          tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
        });
        if (appliedEffect.ignoredByEffectImmunity !== true && (appliedEffect.type === "addEffectToBase" || appliedEffect.type === "addUncountereable" || appliedEffect.type === "addNonReflectable")) totalAddedBaseEffects += 1;
        if (appliedEffect.ignoredByEffectImmunity !== true && appliedEffect.type === "replaceEffects") totalAddedBaseEffects += 1;
      }
      continue;
    }

    if (effect.type === "replaceSkill") {
      totalSkillReplacements += applyReplaceSkillEffect({
        targets,
        effect,
        skill,
        actor,
        actorCharacter,
        currentTurn: room.turn,
        addStatus,
        statusOrigin
      });
      continue;
    }

    if (effect.type === "modifyChakraCost" || effect.type === "substituteChakraCost") {
      totalChakraCostModifiers += applyChakraCostModifierEffect({
        targets,
        effect,
        skill,
        actor,
        actorCharacter,
        currentTurn: room.turn,
        addStatus,
        statusOrigin
      });
      continue;
    }

    if (effect.type === "shield") {
      for (const target of targets) {
        const appliedEffect = effectForTargetImmunity(effect, target);
        const shieldBefore = shieldValue(target);
        const value = positiveEffectValue(appliedEffect);
        addStatus(target, {
          id: randomUUID(),
          type: "shield",
          turns: null,
          value,
          remainingShield: value,
          isStackable: appliedEffect.isStackable,
          ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription({ ...appliedEffect, remainingShield: value }, actorCharacter)],
          tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
        });
        target.shield = shieldValue(target);
        if (appliedEffect.ignoredByEffectImmunity !== true) totalShield += Math.max(0, target.shield - shieldBefore);
      }
      continue;
    }

    if (effect.type === "stun") {
      for (const target of targets) {
        if (!effectAppliesToTarget(effect, target, actor)) continue;
        const appliedEffect = effectForTargetImmunity(effect, target);
        const value = positiveEffectValue(appliedEffect);
        addStatus(target, {
          id: randomUUID(),
          type: "stun",
          turns: value,
          familiesAffected: stunFamiliesAffected(appliedEffect),
          ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription(appliedEffect, actorCharacter)],
          tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
        });
        if (appliedEffect.ignoredByEffectImmunity !== true) totalStun += value;
      }
    }

    if (effect.type === "invulnerable") {
      totalInvulnerable += applyInvulnerableEffect({
        targets,
        effect,
        skill,
        actor,
        actorCharacter,
        currentTurn: room.turn,
        addStatus,
        statusOrigin,
        positiveEffectValue,
        effectForTargetImmunity
      });
    }

    if (effect.type === "ignoreEffects") {
      for (const target of targets) {
        const appliedEffect = effectForTargetImmunity(effect, target);
        addStatus(target, {
          id: randomUUID(),
          type: "ignoreEffects",
          turns: appliedEffect.duration,
          ignoreEffects: Array.isArray(appliedEffect.ignoreEffects) ? appliedEffect.ignoreEffects : [],
          ignoredByEffectImmunity: appliedEffect.ignoredByEffectImmunity === true,
          sourceSkillId: skill.id,
          sourceSkillName: skill.name,
          sourceActorName: actorCharacter.name,
          ...statusOrigin(actor),
          createdTurn: room.turn,
          descriptions: appliedEffect.ignoredByEffectImmunity === true ? appliedEffect.descriptions : [statusDescription(appliedEffect, actorCharacter)],
          tooltipDescription: tooltipDescriptionForEffect(appliedEffect)
        });
      }
    }

    if (effect.type === "gain-chakra" || effect.type === "remove-chakra") {
      const activeTargets = targets.filter((target) => effectForTargetImmunity(effect, target).ignoredByEffectImmunity !== true);
      if (activeTargets.length === 0) continue;
      const affectedPlayers = affectedPlayersForChakraEffect(room, player, activeTargets, effect);
      const amount = positiveEffectValue(effect);
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
  if (totalLifePaid > 0) events.push(`${actorCharacter.name} pago ${totalLifePaid} de vida.`);
  if (totalInstakill > 0) events.push(`${actorCharacter.name} elimino ${totalInstakill} objetivo(s).`);
  if (totalHeal > 0) events.push(`${actorCharacter.name} curo ${totalHeal} de vida.`);
  if (totalShield > 0) events.push(`${actorCharacter.name} gano ${totalShield} de escudo.`);
  if (totalDamageReduction > 0) events.push(`${actorCharacter.name} otorgo ${totalDamageReduction} de reduccion de dano.`);
  if (totalDamageModifier !== 0) {
    const amount = Math.abs(totalDamageModifier);
    events.push(`${actorCharacter.name} ${totalDamageModifier < 0 ? "redujo" : "aumento"} ${amount} de dano.`);
  }
  if (totalDamageTypeModifiers > 0) events.push(`${actorCharacter.name} modifico tipos de dano.`);
  if (totalAddedBaseEffects > 0) events.push(`${actorCharacter.name} agrego efectos a habilidades.`);
  if (totalSkillReplacements > 0) events.push(`${actorCharacter.name} reemplazo habilidades.`);
  if (totalChakraCostModifiers > 0) events.push(`${actorCharacter.name} modifico costes de chakra.`);
  if (totalStun > 0) events.push(`${actorCharacter.name} aturdio por ${totalStun} turno(s).`);
  if (totalInvulnerable > 0) events.push(`${actorCharacter.name} gano invulnerabilidad por ${totalInvulnerable} turno(s).`);
  if (totalChakra(gainedChakra) > 0) events.push(`${actorCharacter.name} gano ${chakraLabel(gainedChakra)}.`);
  if (totalChakra(removedChakra) > 0) events.push(`${actorCharacter.name} elimino ${chakraLabel(removedChakra)}.`);

  setSkillCooldown(actor, skill.id, skill.cooldown || 0);
  if (skillUsesLimit(skill) > 0 && action.passive !== true) {
    actor.skillUses = { ...(actor.skillUses || {}), [skill.id]: (actor.skillUses?.[skill.id] || 0) + 1 };
    updateSkillUsesStatus(actor, skill, actorCharacter, room.turn);
  }

  return skillLogEntry(player, skill, events.join(" ") || `${actorCharacter.name} uso ${skill.name}.`);
}

export function resolveTurn(room, playerId, neutralChakraPayment = {}) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";
  const beforeDeathsByPlayerId = deathSnapshotsForRoom(room);

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
  }

  reduceCooldowns(player);

  const queue = player.queue.splice(0);

  if (queue.length === 0) {
    room.log.unshift(`${player.name} finalizo su turno.`);
  }

  for (const action of queue) {
    room.log.unshift(applyQueuedSkill(room, player, action));
    clearDefeatedStatusEffects(room);
    if (!teamAlive(opponent)) break;
  }

  if (!teamAlive(opponent)) {
    room.phase = "finished";
    room.winnerId = playerId;
    room.finishReason = null;
    room.log.unshift(`${player.name} gano la partida.`);
  } else {
    expireStatusEffects(player, room.turn, room);
    advanceTurn(room);
    expireStartTurnSecretEffects(findPlayer(room, room.activePlayerId), room.turn, room);
    applyStartTurnEffects(room);
  }

  room.botMessage = botTauntForDeaths(room, beforeDeathsByPlayerId);
  return null;
}

function surrender(room, playerId) {
  if (room.phase !== "battle") return "Solo puedes rendirte durante una partida activa.";
  const player = findPlayer(room, playerId);
  const opponent = opponentOf(room, playerId);
  if (!player || !opponent || player.isBot) return "No puedes rendirte ahora.";

  room.phase = "finished";
  room.winnerId = opponent.id;
  room.finishReason = null;
  room.botTurnInProgress = false;
  room.log.unshift(`${player.name} se rindio. ${opponent.name} gano la partida.`);
  return null;
}

function botEngine() {
  return {
    aliveMembers,
    activeSkillsForMember,
    broadcast,
    canBeTargetedBy,
    damageBonusForTarget,
    damageBuffValue,
    getRoomMember,
    queueSkill,
    resolveEffectTargets,
    resolveTurn,
    rooms,
    shieldValue,
    validateSkillAction
  };
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

registerSocketHandlers(io, {
  rooms,
  socketRooms,
  publicRoom,
  broadcast,
  botEngine,
  maybeStart,
  queueSkill,
  resolveTurn,
  surrender,
  exchangeChakra,
  undoChakraExchange,
  removeQueuedSkill,
  moveQueuedSkill
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, () => {
    console.log(`Shinobi Arena server running on http://127.0.0.1:${PORT}`);
  });
}
