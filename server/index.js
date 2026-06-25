import express from "express";
import cors from "cors";
import http from "http";
import { randomUUID } from "node:crypto";
import { Server } from "socket.io";
import { characters, getCharacterById } from "../shared/characters.js";
import { supportedEffectTypes } from "../shared/effects.js";

const PORT = process.env.PORT || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://127.0.0.1:5173";

const app = express();
app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: CLIENT_ORIGIN,
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const socketRooms = new Map();
const CHAKRA_TYPES = ["taijutsu", "ninjutsu", "bloodline", "genjutsu"];

function emptyChakra() {
  return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
}

function cloneChakra(chakra) {
  return { ...emptyChakra(), ...chakra };
}

function chakraLabel(cost) {
  return Object.entries(cost)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => `${amount} ${type}`)
    .join(", ");
}

function canPay(chakra, cost) {
  return Object.entries(cost).every(([type, amount]) => (chakra[type] || 0) >= amount);
}

function payChakra(player, cost) {
  for (const [type, amount] of Object.entries(cost)) {
    player.chakra[type] = Math.max(0, (player.chakra[type] || 0) - amount);
  }
}

function refundChakra(player, cost) {
  for (const [type, amount] of Object.entries(cost)) {
    player.chakra[type] = (player.chakra[type] || 0) + amount;
  }
}

function grantPlayerRandomChakra(player) {
  const type = CHAKRA_TYPES[Math.floor(Math.random() * CHAKRA_TYPES.length)];
  player.chakra[type] = (player.chakra[type] || 0) + 1;
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

function publicRoom(room) {
  return {
    code: room.code,
    phase: room.phase,
    activePlayerId: room.activePlayerId,
    winnerId: room.winnerId,
    turn: room.turn,
    log: room.log.slice(0, 8),
    players: room.players.map((player) => ({
      id: player.id,
      name: player.name,
      side: player.side,
      ready: player.ready,
      connected: player.connected,
      chakra: cloneChakra(player.chakra),
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

function createTeam(characterIds) {
  return characterIds.map((characterId) => {
    const character = getCharacterById(characterId);
    return {
      id: `${characterId}-${randomUUID()}`,
      characterId,
      hp: character.maxHp,
      shield: 0,
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
  });
  grantTurnChakra(room.players[0], );
  room.log.unshift("La batalla comenzo. Cada turno otorga 1 chakra aleatorio por cada personaje vivo del jugador activo.");
}

function removeQueuedSkill(room, playerId, actionId) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const index = player.queue.findIndex((item) => item.id === actionId);
  if (index === -1) return "Esa habilidad ya no esta en cola.";

  const [action] = player.queue.splice(index, 1);
  refundChakra(player, action.chakra);
  room.log.unshift(`${player.name} quito ${action.skillName} de la cola y recupero ${chakraLabel(action.chakra)}.`);

  return null;
}

function advanceTurn(room) {
  const currentIndex = room.players.findIndex((player) => player.id === room.activePlayerId);
  const next = room.players[(currentIndex + 1) % room.players.length];
  next.queue = [];
  grantTurnChakra(next);
  room.activePlayerId = next.id;
  room.turn += 1;
}

function expireStatusEffects(player, currentTurn) {
  player.team.forEach((member) => {
    member.statusEffects = (member.statusEffects || [])
      .map((effect) => (effect.createdTurn === currentTurn ? effect : { ...effect, turns: effect.turns - 1 }))
      .filter((effect) => effect.turns > 0);
  });
}

function hasStatus(member, type) {
  return (member.statusEffects || []).some((effect) => effect.type === type && effect.turns > 0);
}

function addStatus(member, status) {
  const existing = (member.statusEffects || []).find((effect) => effect.type === status.type && effect.sourceSkillId === status.sourceSkillId);
  if (existing) {
    existing.turns = Math.max(existing.turns, status.turns);
    existing.descriptions = status.descriptions;
    existing.createdTurn = status.createdTurn;
    return;
  }
  member.statusEffects = [...(member.statusEffects || []), status];
}

function statusDescription(effect, actorCharacter) {
  if (effect.type === "stun") return `${actorCharacter.name} ha aturdido a este personaje.`;
  if (effect.type === "invulnerable") return `${actorCharacter.name} ha vuelto invulnerable a este personaje.`;
  return `${actorCharacter.name} ha aplicado ${effect.type} a este personaje.`;
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
  if (!canPay(player.chakra, skill.chakra)) return `No tienes chakra suficiente: requiere ${chakraLabel(skill.chakra)}.`;

  const targets = targetsForSkill(room, player, actor, targetId, skill);
  if (targets.length === 0 || targets.some((target) => target.hp <= 0)) return "Objetivo invalido.";

  return { player, opponent, actor, actorCharacter, skill, targetName: targetNameForSkill(room, player, actor, targetId, skill) };
}

function queueSkill(room, playerId, actorId, targetId, skillId) {
  const validation = validateSkillAction(room, playerId, actorId, targetId, skillId);
  if (typeof validation === "string") return validation;

  const { player, actorCharacter, skill, targetName } = validation;
  payChakra(player, skill.chakra);
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
  room.log.unshift(`${player.name} encolo ${skill.name}.`);

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

  for (const effect of skill.effects || []) {
    if (!supportedEffectTypes.includes(effect.type)) {
      events.push(`${effect.type} no esta implementado.`);
      continue;
    }

    const targets = resolveEffectTargets(room, player, actor, action.targetId, skill, effect).filter((target) => target.hp > 0);
    if (targets.length === 0) continue;

    if (effect.type === "damage") {
      for (const target of targets) {
        const blocked = Math.min(target.shield, effect.value);
        target.shield -= blocked;
        const dealt = effect.value - blocked;
        target.hp = Math.max(0, target.hp - dealt);
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

    if (effect.type === "leech") {
      const leechTarget = targets[0];
      const blocked = Math.min(leechTarget.shield, effect.value);
      leechTarget.shield -= blocked;
      const dealt = effect.value - blocked;
      leechTarget.hp = Math.max(0, leechTarget.hp - dealt);
      totalDamage += dealt;

      const actorCharacterMax = getCharacterById(actor.characterId).maxHp;
      const before = actor.hp;
      actor.hp = Math.min(actorCharacterMax, actor.hp + (effect.heal ?? dealt));
      totalHeal += actor.hp - before;
      continue;
    }

    if (effect.type === "shield") {
      for (const target of targets) {
        target.shield = Math.min(45, target.shield + effect.value);
        totalShield += effect.value;
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
  }

  if (totalDamage > 0) events.push(`${actorCharacter.name} uso ${skill.name} e hizo ${totalDamage} dano.`);
  if (totalHeal > 0) events.push(`${actorCharacter.name} curo ${totalHeal} de vida.`);
  if (totalShield > 0) events.push(`${actorCharacter.name} otorgo ${totalShield} de escudo.`);
  if (totalStun > 0) events.push(`${actorCharacter.name} aturdio por ${totalStun} turno(s).`);
  if (totalInvulnerable > 0) events.push(`${actorCharacter.name} gano invulnerabilidad por ${totalInvulnerable} turno(s).`);

  return events.join(" ") || `${actorCharacter.name} uso ${skill.name}.`;
}

function resolveTurn(room, playerId) {
  if (room.phase !== "battle") return "La batalla todavia no esta activa.";
  if (room.activePlayerId !== playerId) return "No es tu turno.";

  const player = findPlayer(room, playerId);
  const opponent = opponentOf(room, playerId);
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
    const code = createRoomCode();
    const player = {
      id: socket.id,
      name: String(name || "Jugador 1").slice(0, 18),
      side: "red",
      connected: true,
      ready: false,
      chakra: emptyChakra(),
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
      log: ["Sala creada. Esperando al segundo jugador."]
    };
    rooms.set(code, room);
    socketRooms.set(socket.id, code);
    socket.join(code);
    callback?.({ ok: true, room: publicRoom(room), playerId: socket.id });
    broadcast(room);
  });

  socket.on("room:join", ({ code, name }, callback) => {
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
      name: String(name || "Jugador 2").slice(0, 18),
      side: "blue",
      connected: true,
      ready: false,
      chakra: emptyChakra(),
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

  socket.on("battle:endTurn", (_payload, callback) => {
    const code = socketRooms.get(socket.id);
    const room = rooms.get(code);
    if (!room) {
      callback?.({ ok: false, error: "No estas en una sala." });
      return;
    }

    const error = resolveTurn(room, socket.id);
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
