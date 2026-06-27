import { randomUUID } from "node:crypto";
import { characters } from "../shared/characters.js";
import { createBotPlayer, scheduleBotIfNeeded } from "./bot.js";
import { emptyChakra } from "./chakra.js";
import {
  cleanPlayerName,
  createRoomCode,
  createTeam,
  findPlayer,
  opponentOf,
  validateTeam
} from "./players.js";

export function registerSocketHandlers(io, {
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
}) {
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
        finishReason: null,
        turn: 0,
        chat: [],
        log: ["Sala creada. Esperando al segundo jugador."]
      };
      rooms.set(code, room);
      socketRooms.set(socket.id, code);
      socket.join(code);
      callback?.({ ok: true, room: publicRoom(room, socket.id), playerId: socket.id });
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
        finishReason: null,
        turn: 0,
        chat: [],
        log: ["Partida vs IA creada. Elige tu equipo."]
      };
      rooms.set(code, room);
      socketRooms.set(socket.id, code);
      socket.join(code);
      callback?.({ ok: true, room: publicRoom(room, socket.id), playerId: socket.id });
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
      callback?.({ ok: true, room: publicRoom(room, socket.id), playerId: socket.id });
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
      scheduleBotIfNeeded(room, botEngine());
      callback?.({ ok: true });
      broadcast(room);
    });

    socket.on("team:unselect", (_payload, callback) => {
      const code = socketRooms.get(socket.id);
      const room = rooms.get(code);
      if (!room || room.phase !== "lobby") {
        callback?.({ ok: false, error: "No puedes desconfirmar equipo ahora." });
        return;
      }

      const player = findPlayer(room, socket.id);
      if (!player) {
        callback?.({ ok: false, error: "No estas en una sala." });
        return;
      }

      player.team = [];
      player.ready = false;
      room.log.unshift(`${player.name} desconfirmo su equipo.`);
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

      scheduleBotIfNeeded(room, botEngine());
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

      if (player && room.phase === "battle") {
        const opponent = opponentOf(room, socket.id);
        if (opponent) {
          room.phase = "finished";
          room.winnerId = opponent.id;
          room.finishReason = {
            type: "disconnect",
            loserId: player.id,
            loserName: player.name
          };
          room.botTurnInProgress = false;
          room.log.unshift(`${opponent.name} gano la partida por desconexion de ${player.name}.`);
        }
      }

      if (room.players.every((item) => item.isBot || !item.connected)) {
        rooms.delete(room.code);
      } else {
        broadcast(room);
      }
      socketRooms.delete(socket.id);
    });
  });
}
