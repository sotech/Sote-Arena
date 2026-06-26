import express from "express";
import cors from "cors";
import http from "http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { characters, getCharacterById } from "../shared/characters.js";
import { supportedEffectTypes } from "../shared/effects.js";
import { normalizeRequireScope, normalizeRequireType } from "../shared/requires.js";
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
  cleanPlayerName,
  cloneCooldowns,
  createRoomCode,
  createTeam,
  findPlayer,
  getMember,
  getRoomMember,
  opponentOf,
  ownerOfMember,
  teamAlive,
  validateTeam
} from "./players.js";

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
const BOT_NAME = "Sote IA";

function publicRoom(room) {
  return {
    code: room.code,
    mode: room.mode || "pvp",
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

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function weightedRandomItem(items) {
  const totalWeight = items.reduce((total, item) => total + Math.max(1, item.priority || 1), 0);
  let pick = Math.random() * totalWeight;
  for (const item of items) {
    pick -= Math.max(1, item.priority || 1);
    if (pick <= 0) return item;
  }
  return items[items.length - 1];
}

function randomTeamIds() {
  return [...characters]
    .sort(() => Math.random() - 0.5)
    .slice(0, 3)
    .map((character) => character.id);
}

function createBotPlayer(roomCode) {
  return {
    id: `bot-${roomCode}`,
    name: BOT_NAME,
    side: "blue",
    isBot: true,
    connected: true,
    ready: true,
    chakra: emptyChakra(),
    chakraExchange: null,
    queue: [],
    botSkillPlan: [],
    team: createTeam(randomTeamIds())
  };
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

function expireStatusEffects(player, currentTurn) {
  player.team.forEach((member) => {
    member.statusEffects = (member.statusEffects || [])
      .map((effect) => {
        if (effect.type === "shield") return effect;
        const nextEffect = effect.createdTurn === currentTurn ? effect : { ...effect, turns: effect.turns - 1 };
        return nextEffect.type === "complex"
          ? { ...nextEffect, descriptions: complexDescriptions(nextEffect) }
          : nextEffect;
      })
      .filter((effect) => (effect.type === "shield" ? (effect.remainingShield || 0) > 0 : effect.turns > 0));
  });
}

function hasStatus(member, type) {
  return (member.statusEffects || []).some((effect) => {
    if (effect.type === type && effect.turns > 0) return true;
    return effect.type === "complex" && effect.turns > 0 && (effect.effects || []).some((childEffect) => childEffect.type === type);
  });
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
      existing.turns = Math.max(existing.turns, status.turns);
      existing.restoresEachTurn = status.restoresEachTurn;
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
  if (status.type === "buffDamage") {
    if (existing) {
      existing.value = status.value;
      existing.turns = Math.max(existing.turns, status.turns);
      existing.skillIds = status.skillIds;
      existing.descriptions = buffDamageDescriptions(status);
      existing.createdTurn = status.createdTurn;
      existing.originActorId = status.originActorId;
      existing.originCharacterId = status.originCharacterId;
      return;
    }
    status.descriptions = buffDamageDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  if (status.type === "complex") {
    if (existing) {
      existing.turns = Math.max(existing.turns, status.turns);
      existing.effects = status.effects;
      existing.descriptions = complexDescriptions(status);
      existing.createdTurn = status.createdTurn;
      existing.remainingReductions = status.remainingReductions || {};
      existing.originActorId = status.originActorId;
      existing.originCharacterId = status.originCharacterId;
      return;
    }
    status.descriptions = complexDescriptions(status);
    member.statusEffects = [...(member.statusEffects || []), status];
    return;
  }
  
  if (existing) {
    existing.turns = Math.max(existing.turns, status.turns);
    existing.descriptions = status.descriptions;
    existing.createdTurn = status.createdTurn;
    existing.originActorId = status.originActorId;
    existing.originCharacterId = status.originCharacterId;
    return;
  }
  member.statusEffects = [...(member.statusEffects || []), status];
}

function statusDescription(effect, actorCharacter) {
  if (effect.type === "shield") return `Este personaje tiene ${effect.remainingShield || effect.value} de escudo destruible.`;
  if (effect.type === "damage-reduction") return `${actorCharacter.name} ha obtenido ${effect.value} de reduccion de dano.`;
  if (effect.type === "buffDamage") return `${actorCharacter.name} ha aumentado el dano de este personaje en ${effect.value}.`;
  if (effect.type === "complex") return `${actorCharacter.name} ha aplicado un efecto complejo.`;
  if (effect.type === "stun") return `${actorCharacter.name} ha aturdido a este personaje.`;
  if (effect.type === "invulnerable") return `${actorCharacter.name} ha vuelto invulnerable a este personaje.`;
  return `${actorCharacter.name} ha aplicado ${effect.type} a este personaje.`;
}

function statusOrigin(actor) {
  return {
    originActorId: actor?.id,
    originCharacterId: actor?.characterId
  };
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

function simpleEffectDescription(effect) {
  if (effect.type === "damage") return `Inflige ${effect.value} de dano${effect.damageType ? ` ${effect.damageType}` : ""}.`;
  if (effect.type === "heal" || effect.type === "self-heal") return `Cura ${effect.value} de vida.`;
  if (effect.type === "shield") return `Otorga ${effect.value} de escudo destruible.`;
  if (effect.type === "damage-reduction") return `Otorga ${effect.value} de reduccion de dano.`;
  if (effect.type === "buffDamage") {
    const scope = effect.skillIds?.length ? ` a ${effect.skillIds.join(", ")}` : " a todas las habilidades";
    return `Aumenta ${effect.value} de dano${scope}.`;
  }
  if (effect.type === "invulnerable") return "Otorga invulnerabilidad.";
  if (effect.type === "stun") return "Aplica aturdimiento.";
  if (effect.type === "gain-chakra") return `Otorga ${effect.value} chakra.`;
  if (effect.type === "remove-chakra") return `Elimina ${effect.value} chakra.`;
  return `${effect.type}: ${effect.value || ""}`.trim();
}

function complexDescriptions(effect) {
  return [
    `${effect.sourceActorName || "Un personaje"} mantiene este efecto por ${effect.turns} turno(s).`,
    ...(effect.effects || []).map(simpleEffectDescription)
  ];
}

function appliesToBuffedSkill(effect, skill) {
  if (effect.type !== "buffDamage" || effect.turns <= 0) return false;
  if (!Array.isArray(effect.skillIds) || effect.skillIds.length === 0) return true;
  return effect.skillIds.includes(skill.id) || effect.skillIds.includes(skill.name);
}

function damageBuffValue(actor, skill, currentTurn) {
  const directBuffs = (actor.statusEffects || [])
    .filter((effect) => appliesToBuffedSkill(effect, skill))
    .filter((effect) => !(effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn))
    .reduce((total, effect) => total + Math.max(0, Number(effect.value || 0)), 0);
  const complexBuffs = (actor.statusEffects || [])
    .filter((effect) => effect.type === "complex" && effect.turns > 0)
    .filter((effect) => !(effect.sourceSkillId === skill.id && effect.createdTurn === currentTurn))
    .flatMap((effect) => effect.effects || [])
    .filter((effect) => appliesToBuffedSkill({ ...effect, turns: 1 }, skill))
    .reduce((total, effect) => total + Math.max(0, Number(effect.value || 0)), 0);
  return directBuffs + complexBuffs;
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
    if (remainingDamage <= 0) continue;
    if (effect.type === "damage-reduction") {
      const blocked = Math.min(effect.remainingReduction || 0, remainingDamage);
      effect.remainingReduction = (effect.remainingReduction || 0) - blocked;
      effect.descriptions = damageReductionDescriptions(effect);
      remainingDamage -= blocked;
      continue;
    }
    if (effect.type === "complex" && effect.turns > 0) {
      effect.remainingReductions = effect.remainingReductions || {};
      for (const [index, childEffect] of (effect.effects || []).entries()) {
        if (childEffect.type !== "damage-reduction" || remainingDamage <= 0) continue;
        const currentReduction = effect.remainingReductions[index] ?? childEffect.value;
        const blocked = Math.min(currentReduction || 0, remainingDamage);
        effect.remainingReductions[index] = Math.max(0, currentReduction - blocked);
        effect.descriptions = complexDescriptions(effect);
        remainingDamage -= blocked;
      }
    }
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
    }).map((effect) => {
      if (effect.type !== "complex") return effect;
      const remainingReductions = { ...(effect.remainingReductions || {}) };
      (effect.effects || []).forEach((childEffect, index) => {
        if (childEffect.type === "damage-reduction" && childEffect.restoresEachTurn !== false) {
          remainingReductions[index] = childEffect.value;
        }
      });
      return {
        ...effect,
        remainingReductions,
        descriptions: complexDescriptions({ ...effect, remainingReductions })
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

function memberHasStatusEffect(member, effectId) {
  return (member.statusEffects || []).some((effect) => {
    if (effect.id === effectId || effect.sourceSkillId === effectId || effect.type === effectId) return true;
    return effect.type === "complex" && (effect.effects || []).some((childEffect) => (
      childEffect.id === effectId || childEffect.sourceSkillId === effectId || childEffect.type === effectId
    ));
  });
}

function requireCandidates(requirement, player, opponent, actor) {
  const scope = normalizeRequireScope(requirement.scope || requirement.target);
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

function damageBonusForTarget(effect, target) {
  return (effect.bonusWhen || []).reduce((bonus, rule) => {
    const requirement = rule.require || rule.when || rule;
    return memberMeetsRequirement(target, requirement)
      ? bonus + Math.max(0, Number(rule.bonus ?? rule.value ?? 0))
      : bonus;
  }, 0);
}

function validateSkillRequirements(skill, player, opponent, actor) {
  for (const requirement of skill.requires || []) {
    const candidates = requireCandidates(requirement, player, opponent, actor);
    if (!candidates.some((member) => memberMeetsRequirement(member, requirement))) {
      return requirement.message || "No se cumplen los requisitos de la habilidad.";
    }
  }
  return null;
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
      members.push(...aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member)));
    }
  }
  return [...new Map(members.filter(Boolean).map((member) => [member.id, member])).values()];
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
      members.push(...aliveMembers(opponent).filter((member) => canBeTargetedBy(player, member)));
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

function applyComplexStatusEffects(room, player) {
  const events = [];
  for (const member of aliveMembers(player)) {
    const memberCharacter = getCharacterById(member.characterId);
    for (const status of member.statusEffects || []) {
      if (status.type !== "complex" || status.turns <= 0 || status.createdTurn === room.turn) continue;
      for (const effect of status.effects || []) {
        if (effect.type === "damage-reduction" || effect.type === "buffDamage" || effect.type === "invulnerable" || effect.type === "stun") {
          continue;
        }

        const targets = resolveComplexEffectTargets(room, player, member, effect, status).filter((target) => target.hp > 0);
        if (targets.length === 0) continue;

        if (effect.type === "damage") {
          let totalDamage = 0;
          for (const target of targets) {
            totalDamage += applyDamage(target, Math.max(0, Number(effect.value || 0)), effect.damageType || "basic");
          }
          if (totalDamage > 0) events.push(`${status.sourceSkillName} hizo ${totalDamage} dano continuo.`);
          continue;
        }

        if (effect.type === "heal" || effect.type === "self-heal") {
          let totalHeal = 0;
          for (const target of targets) {
            const targetCharacter = getCharacterById(target.characterId);
            const before = target.hp;
            target.hp = Math.min(targetCharacter.maxHp, target.hp + effect.value);
            totalHeal += target.hp - before;
          }
          if (totalHeal > 0) events.push(`${status.sourceSkillName} curo ${totalHeal} de vida.`);
          continue;
        }

        if (effect.type === "shield") {
          let totalShield = 0;
          for (const target of targets) {
            const shieldBefore = shieldValue(target);
            addStatus(target, {
              id: randomUUID(),
              type: "shield",
              turns: null,
              value: effect.value,
              remainingShield: effect.value,
              isStackable: effect.isStackable,
              sourceSkillId: `${status.id}-${effect.type}`,
              sourceSkillName: status.sourceSkillName,
              sourceActorName: status.sourceActorName,
              originActorId: status.originActorId,
              originCharacterId: status.originCharacterId,
              createdTurn: room.turn,
              descriptions: [statusDescription({ ...effect, remainingShield: effect.value }, memberCharacter)]
            });
            target.shield = shieldValue(target);
            totalShield += Math.max(0, target.shield - shieldBefore);
          }
          if (totalShield > 0) events.push(`${status.sourceSkillName} otorgo ${totalShield} de escudo.`);
          continue;
        }

        if (effect.type === "gain-chakra" || effect.type === "remove-chakra") {
          const affectedPlayers = [...new Set(targets.map((target) => ownerOfMember(room, target)).filter(Boolean))];
          const changedChakra = emptyChakra();
          for (const affectedPlayer of affectedPlayers) {
            const changed = effect.type === "gain-chakra"
              ? applyChakraGain(affectedPlayer, Math.max(0, Number(effect.value || 0)), effect.chakraType)
              : applyChakraRemoval(affectedPlayer, Math.max(0, Number(effect.value || 0)), effect.chakraType);
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
  if (hasStatus(actor, "stun")) return "Ese personaje esta aturdido y no puede usar habilidades.";

  const actorCharacter = getCharacterById(actor.characterId);
  const skill = actorCharacter.skills.find((item) => item.id === skillId);
  if (!skill) return "Habilidad invalida.";
  if (queuedActorFor(player, actor.id)) return `${actorCharacter.name} ya tiene una habilidad en cola este turno.`;
  if (skillCooldown(actor, skill.id) > 0) return `${skill.name} esta en cooldown.`;
  if (queuedSkillFor(player, actor.id, skill.id)) return `${skill.name} ya esta en cola.`;
  const requirementError = validateSkillRequirements(skill, player, opponent, actor);
  if (requirementError) return requirementError;
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

    if (effect.type === "complex") {
      for (const target of targets) {
        addStatus(target, {
          id: randomUUID(),
          type: "complex",
          turns: effect.duration,
          effects: Array.isArray(effect.effects) ? effect.effects : [],
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
      const buffedDamage = Math.max(0, Number(effect.value || 0)) + damageBuffValue(actor, skill, room.turn);
      for (const target of targets) {
        const targetDamage = buffedDamage + damageBonusForTarget(effect, target);
        const dealt = applyDamage(target, targetDamage, effect.damageType || "basic");
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
          ...statusOrigin(actor),
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
          ...statusOrigin(actor),
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
          ...statusOrigin(actor),
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
          ...statusOrigin(actor),
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
          ...statusOrigin(actor),
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
  }

  reduceCooldowns(player);
  for (const event of applyComplexStatusEffects(room, player)) {
    room.log.unshift(event);
  }
  if (!teamAlive(player)) {
    room.phase = "finished";
    room.winnerId = opponent.id;
    room.log.unshift(`${opponent.name} gano la partida.`);
    return null;
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

function surrender(room, playerId) {
  if (room.phase !== "battle") return "Solo puedes rendirte durante una partida activa.";
  const player = findPlayer(room, playerId);
  const opponent = opponentOf(room, playerId);
  if (!player || !opponent || player.isBot) return "No puedes rendirte ahora.";

  room.phase = "finished";
  room.winnerId = opponent.id;
  room.botTurnInProgress = false;
  room.log.unshift(`${player.name} se rindio. ${opponent.name} gano la partida.`);
  return null;
}

function botTargetIdsForSkill(room, bot, actor, skill) {
  const opponent = opponentOf(room, bot.id);
  if (skill.targetType === "self") return [actor.id];
  if (skill.targetType === "ally") return aliveMembers(bot).map((member) => member.id);
  if (skill.targetType === "allies") return [aliveMembers(bot)[0]?.id].filter(Boolean);
  if (skill.targetType === "enemy") {
    return aliveMembers(opponent)
      .filter((member) => canBeTargetedBy(bot, member))
      .map((member) => member.id);
  }
  if (skill.targetType === "enemies") {
    return [aliveMembers(opponent).find((member) => canBeTargetedBy(bot, member))?.id].filter(Boolean);
  }
  if (skill.targetType === "allPlayers") {
    return [
      aliveMembers(bot)[0]?.id,
      aliveMembers(opponent).find((member) => canBeTargetedBy(bot, member))?.id
    ].filter(Boolean);
  }
  return [];
}

function estimateDamageAgainstTarget(actor, skill, effect, target, currentTurn) {
  const rawDamage = Math.max(0, Number(effect.value || 0))
    + damageBuffValue(actor, skill, currentTurn)
    + damageBonusForTarget(effect, target);
  const damageType = effect.damageType || "basic";
  const shield = damageType === "basic" || damageType === "piercing" ? shieldValue(target) : 0;
  return Math.max(0, rawDamage - shield);
}

function botSkillCanKill(room, bot, actor, skill, targetId) {
  const targets = resolveEffectTargets(room, bot, actor, targetId, skill, { targets: "target" })
    .filter((target) => target.hp > 0);
  return (skill.effects || [])
    .filter((effect) => effect.type === "damage")
    .some((effect) => targets.some((target) => estimateDamageAgainstTarget(actor, skill, effect, target, room.turn) >= target.hp));
}

function botActionPriority(room, bot, actor, skill, targetId) {
  let priority = 10;
  const description = skill.botDescription || "";

  if (description.includes("invulnerable-")) {
    priority = 1;
    if (actor.hp <= 50) priority = 12;
    if (actor.hp <= 25) priority = 18;
  }

  if (botSkillCanKill(room, bot, actor, skill, targetId)) {
    priority += 80;
  }

  if (description.includes("damage-")) priority += 8;
  if (description.includes("heal-") && actor.hp <= 60) priority += 8;
  return priority;
}

function botSkillOptions(room, bot) {
  const options = [];
  for (const actor of aliveMembers(bot)) {
    const actorCharacter = getCharacterById(actor.characterId);
    for (const skill of actorCharacter.skills) {
      for (const targetId of botTargetIdsForSkill(room, bot, actor, skill)) {
        const validation = validateSkillAction(room, bot.id, actor.id, targetId, skill.id);
        if (typeof validation !== "string") {
          options.push({
            actorId: actor.id,
            targetId,
            skillId: skill.id,
            botDescription: skill.botDescription,
            priority: botActionPriority(room, bot, actor, skill, targetId)
          });
        }
      }
    }
  }
  return options;
}

function botNeutralPayment(player) {
  let remaining = queuedNeutralChakraCost(player);
  const payment = emptyChakra();
  for (const type of CHAKRA_TYPES) {
    if (remaining <= 0) break;
    const amount = Math.min(remaining, player.chakra[type] || 0);
    payment[type] = amount;
    remaining -= amount;
  }
  return payment;
}

function playBotTurn(room) {
  const bot = findPlayer(room, room.activePlayerId);
  if (!bot?.isBot || room.phase !== "battle") return;

  const maxActions = aliveMembers(bot).length;
  for (let actionIndex = 0; actionIndex < maxActions; actionIndex += 1) {
    bot.botSkillPlan = botSkillOptions(room, bot);
    if (bot.botSkillPlan.length === 0) break;

    const action = weightedRandomItem(bot.botSkillPlan);
    const error = queueSkill(room, bot.id, action.actorId, action.targetId, action.skillId);
    if (error) break;
  }
  bot.botSkillPlan = botSkillOptions(room, bot);
}

function scheduleBotIfNeeded(room) {
  const activePlayer = findPlayer(room, room.activePlayerId);
  if (room?.phase !== "battle" || !activePlayer?.isBot || room.botTurnInProgress) return;

  room.botTurnInProgress = true;
  playBotTurn(room);
  broadcast(room);

  setTimeout(() => {
    const currentRoom = rooms.get(room.code);
    const bot = currentRoom ? findPlayer(currentRoom, currentRoom.activePlayerId) : null;
    if (!currentRoom) return;
    if (currentRoom.phase !== "battle" || !bot?.isBot) {
      currentRoom.botTurnInProgress = false;
      return;
    }

    resolveTurn(currentRoom, bot.id, botNeutralPayment(bot));
    bot.botSkillPlan = [];
    currentRoom.botTurnInProgress = false;
    broadcast(currentRoom);
    scheduleBotIfNeeded(currentRoom);
  }, 2000);
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

    const code = createRoomCode(rooms);
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
      mode: "pvp",
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

  socket.on("room:createBot", ({ name }, callback) => {
    const playerName = cleanPlayerName(name) || "Jugador";
    const code = createRoomCode(rooms);
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
    const bot = createBotPlayer(code);
    const room = {
      code,
      mode: "bot",
      phase: "lobby",
      players: [player, bot],
      activePlayerId: null,
      winnerId: null,
      turn: 0,
      chat: [],
      log: ["Partida vs IA creada. Elige tu equipo."]
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
    scheduleBotIfNeeded(room);
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

    scheduleBotIfNeeded(room);
    callback?.({ ok: true });
    broadcast(room);
  });

  socket.on("battle:surrender", (_payload, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = surrender(room, socket.id);
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

    if (room.players.every((item) => item.isBot || !item.connected)) {
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
