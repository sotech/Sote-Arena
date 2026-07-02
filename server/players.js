import { randomUUID } from "node:crypto";
import { getCharacterById } from "../shared/characters.js";
import { chooseDeckSkillIds } from "../shared/deckSkills.js";

function skillUsesLimit(skill) {
  return Math.max(0, Number(skill?.uses ?? skill?.maxUses ?? 0));
}

function shouldShowSkillUses(skill) {
  return skill?.hideSkillUses !== true;
}

function skillUsesStatus(character, skill, remainingUses) {
  return {
    id: `uses-${skill.id}`,
    type: "skill-uses",
    turns: -1,
    value: remainingUses,
    remainingUses,
    showStatusEffect: true,
    sourceSkillId: skill.id,
    sourceSkillName: skill.name,
    sourceActorName: character.name,
    createdTurn: 0,
    descriptions: [`${skill.name} puede usarse ${remainingUses} veces mas.`]
  };
}

function initialDeckReplacementStatuses(character, member) {
  const deck = character.initialSkillDeck;
  const baseSkillIds = Array.isArray(deck?.baseSkillIds) ? deck.baseSkillIds : [];
  if (baseSkillIds.length === 0) return [];

  const skillIds = chooseDeckSkillIds({
    deckSkillIds: deck.deckSkillIds,
    count: baseSkillIds.length,
    cooldowns: member.skillCooldowns,
    avoidCooldown: deck.avoidCooldown !== false
  });

  return baseSkillIds.flatMap((baseSkillId, index) => {
    const skillId = skillIds[index];
    if (!skillId) return [];
    return [{
      id: randomUUID(),
      type: "replaceSkill",
      turns: -1,
      baseSkillId,
      skillId,
      showStatusEffect: deck.showStatusEffect ?? false,
      sourceSkillId: deck.sourceSkillId || "skill-deck",
      sourceSkillName: deck.sourceSkillName || "Mazo de habilidades",
      sourceActorName: character.name,
      originActorId: member.id,
      originCharacterId: member.characterId,
      createdTurn: 0,
      descriptions: deck.descriptions
    }];
  });
}

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
    const usesStatuses = (character.skills || [])
      .map((skill) => ({ skill, limit: skillUsesLimit(skill) }))
      .filter(({ skill, limit }) => limit > 0 && shouldShowSkillUses(skill))
      .map(({ skill, limit }) => skillUsesStatus(character, skill, limit));
    const member = {
      id: `${characterId}-${randomUUID()}`,
      characterId,
      hp: character.maxHp,
      shield: 0,
      skillCooldowns: {},
      skillUses: {},
      statusEffects: usesStatuses
    };
    member.statusEffects = [
      ...member.statusEffects,
      ...initialDeckReplacementStatuses(character, member)
    ];
    return member;
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
