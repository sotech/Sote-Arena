import { randomUUID } from "node:crypto";
import { getCharacterById } from "../shared/characters.js";

export function cloneCooldowns(cooldowns) {
  return { ...(cooldowns || {}) };
}

export function createRoomCode(rooms) {
  let code;
  do {
    code = Math.random().toString(36).slice(2, 7).toUpperCase();
  } while (rooms.has(code));
  return code;
}

export function cleanPlayerName(name) {
  const playerName = String(name || "").trim().slice(0, 18);
  return playerName || null;
}

export function findPlayer(room, playerId) {
  return room.players.find((player) => player.id === playerId);
}

export function opponentOf(room, playerId) {
  return room.players.find((player) => player.id !== playerId);
}

export function ownerOfMember(room, member) {
  return room.players.find((player) => player.team.includes(member));
}

export function createTeam(characterIds) {
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

export function teamAlive(player) {
  return player.team.some((member) => member.hp > 0);
}

export function getMember(player, memberId) {
  return player.team.find((member) => member.id === memberId);
}

export function getRoomMember(room, memberId) {
  return room.players.flatMap((player) => player.team).find((member) => member.id === memberId);
}

export function validateTeam(characterIds) {
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
