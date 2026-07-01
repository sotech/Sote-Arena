import { characters, getCharacterById } from "../shared/characters.js";
import { BOT_TURN_DELAY_MS, BOT_VS_BOT_TURN_DELAY_MS } from "../shared/config.js";
import { CHAKRA_TYPES, emptyChakra, queuedNeutralChakraCost } from "./chakra.js";
import { createTeam, findPlayer, opponentOf } from "./players.js";

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

export function createBotPlayer(roomCode, { id = `bot-${roomCode}`, name = "Bot 2", side = "blue" } = {}) {
  return {
    id,
    name,
    side,
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

function botTargetIdsForSkill(room, bot, actor, skill, engine) {
  const opponent = opponentOf(room, bot.id);
  if (skill.targetType === "self") return [actor.id];
  if (skill.targetType === "ally") return engine.aliveMembers(bot).map((member) => member.id);
  if (skill.targetType === "otherAlly") return engine.aliveMembers(bot).filter((member) => member.id !== actor.id).map((member) => member.id);
  if (skill.targetType === "anyOtherAlly") return bot.team.filter((member) => member.id !== actor.id).map((member) => member.id);
  if (skill.targetType === "deadAlly") return bot.team.filter((member) => member.hp <= 0).map((member) => member.id);
  if (skill.targetType === "deadOtherAlly") return bot.team.filter((member) => member.id !== actor.id && member.hp <= 0).map((member) => member.id);
  if (skill.targetType === "anyCharacter") {
    return [
      ...engine.aliveMembers(bot).filter((member) => member.id !== actor.id),
      ...engine.aliveMembers(opponent).filter((member) => engine.canBeTargetedBy(bot, member))
    ].map((member) => member.id);
  }
  if (skill.targetType === "allies") return [engine.aliveMembers(bot)[0]?.id].filter(Boolean);
  if (skill.targetType === "enemy") {
    return engine.aliveMembers(opponent)
      .filter((member) => engine.canBeTargetedBy(bot, member))
      .map((member) => member.id);
  }
  if (skill.targetType === "enemies") {
    return [engine.aliveMembers(opponent).find((member) => engine.canBeTargetedBy(bot, member))?.id].filter(Boolean);
  }
  if (skill.targetType === "allPlayers") {
    return [
      engine.aliveMembers(bot)[0]?.id,
      engine.aliveMembers(opponent).find((member) => engine.canBeTargetedBy(bot, member))?.id
    ].filter(Boolean);
  }
  return [];
}

function estimateDamageAgainstTarget(actor, skill, effect, target, currentTurn, engine) {
  const rawDamage = Math.max(0, Number(effect.value || 0))
    + engine.damageBuffValue(actor, skill, currentTurn)
    + engine.damageBonusForTarget(effect, target, actor);
  const damageType = effect.damageType || "basic";
  const shield = damageType === "basic" || damageType === "piercing" ? engine.shieldValue(target) : 0;
  return Math.max(0, rawDamage - shield);
}

function botSkillCanKill(room, bot, actor, skill, targetId, engine) {
  const targets = engine.resolveEffectTargets(room, bot, actor, targetId, skill, { targets: "target" })
    .filter((target) => target.hp > 0);
  return (skill.effects || [])
    .some((effect) => {
      if (effect.type === "instakill") return targets.length > 0;
      return effect.type === "damage"
        && targets.some((target) => estimateDamageAgainstTarget(actor, skill, effect, target, room.turn, engine) >= target.hp);
    });
}

function botEffectiveHealing(room, bot, actor, skill, targetId, engine) {
  let totalHealing = 0;
  for (const effect of skill.effects || []) {
    if (effect.type !== "heal" && effect.type !== "self-heal") continue;
    const targets = engine.resolveEffectTargets(room, bot, actor, targetId, skill, effect).filter((target) => target.hp > 0);
    for (const target of targets) {
      const targetCharacter = getCharacterById(target.characterId);
      const missingHp = Math.max(0, targetCharacter.maxHp - target.hp);
      totalHealing += Math.min(missingHp, Math.max(0, Number(effect.value || 0)));
    }
  }
  return totalHealing;
}

function botSkillNeedsHealing(room, bot, actor, skill, targetId, engine) {
  const hasHealing = (skill.effects || []).some((effect) => effect.type === "heal" || effect.type === "self-heal");
  const hasNonHealingValue = (skill.effects || []).some((effect) => (
    effect.type !== "heal" && effect.type !== "self-heal" && effect.type !== "complex"
  ));
  return !hasHealing || hasNonHealingValue || botEffectiveHealing(room, bot, actor, skill, targetId, engine) > 0;
}

function isLongCooldownInvulnerability(skill) {
  return (skill.cooldown || 0) >= 4 && (skill.botDescription || "").includes("invulnerable-");
}

function botShouldConsiderSkill(actor, actorCharacter, skill) {
  if (!isLongCooldownInvulnerability(skill)) return true;
  const healthPercent = actorCharacter.maxHp > 0 ? actor.hp / actorCharacter.maxHp : 0;
  return healthPercent <= 0.5;
}

function botActionPriority(room, bot, actor, skill, targetId, engine) {
  let priority = 10;
  const description = skill.botDescription || "";
  const effectiveHealing = botEffectiveHealing(room, bot, actor, skill, targetId, engine);

  if (description.includes("invulnerable-")) {
    priority = 1;
    if (actor.hp <= 50) priority = 12;
    if (actor.hp <= 25) priority = 18;
  }

  if (botSkillCanKill(room, bot, actor, skill, targetId, engine)) {
    priority += 80;
  }

  if (description.includes("damage-")) priority += 8;
  if (description.includes("stun-") && targetHasInterruptibleStatus(room, targetId, engine)) {
    priority += 70;
  }
  if (effectiveHealing > 0) {
    priority = Math.max(priority, 1 + Math.floor(effectiveHealing / 4));
    if (effectiveHealing >= 20) priority += 8;
    if (effectiveHealing >= 40) priority += 8;
  }
  return priority;
}

function targetHasInterruptibleStatus(room, targetId, engine) {
  const target = engine.getRoomMember(room, targetId);
  return (target?.statusEffects || []).some((effect) => (
    effect.type === "complex"
    && (effect.turns > 0 || effect.turns === -1)
    && ["pauseOnStun", "interruptible", "cancelOnStun", "cancelable"].includes(effect.mode)
  ));
}

function botSkillOptions(room, bot, engine) {
  const options = [];
  for (const actor of engine.aliveMembers(bot)) {
    const actorCharacter = getCharacterById(actor.characterId);
    for (const skill of engine.activeSkillsForMember(actor, actorCharacter)) {
      if (!botShouldConsiderSkill(actor, actorCharacter, skill)) continue;
      for (const targetId of botTargetIdsForSkill(room, bot, actor, skill, engine)) {
        const validation = engine.validateSkillAction(room, bot.id, actor.id, targetId, skill.id);
        if (typeof validation !== "string" && botSkillNeedsHealing(room, bot, actor, skill, targetId, engine)) {
          options.push({
            actorId: actor.id,
            targetId,
            skillId: skill.id,
            botDescription: skill.botDescription,
            priority: botActionPriority(room, bot, actor, skill, targetId, engine)
          });
        }
      }
    }
  }
  return options;
}

export function botNeutralPayment(player) {
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

export function playBotTurn(room, engine) {
  const bot = findPlayer(room, room.activePlayerId);
  if (!bot?.isBot || room.phase !== "battle") return;

  const maxActions = engine.aliveMembers(bot).length;
  for (let actionIndex = 0; actionIndex < maxActions; actionIndex += 1) {
    bot.botSkillPlan = botSkillOptions(room, bot, engine);
    if (bot.botSkillPlan.length === 0) break;

    const action = weightedRandomItem(bot.botSkillPlan);
    const error = engine.queueSkill(room, bot.id, action.actorId, action.targetId, action.skillId);
    if (error) break;
  }
  bot.botSkillPlan = botSkillOptions(room, bot, engine);
}

export function scheduleBotIfNeeded(room, engine) {
  const activePlayer = findPlayer(room, room.activePlayerId);
  if (room?.phase !== "battle" || !activePlayer?.isBot || room.botTurnInProgress || room.botPaused) return;

  room.botTurnInProgress = true;
  playBotTurn(room, engine);
  engine.broadcast(room);

  setTimeout(() => {
    const currentRoom = engine.rooms.get(room.code);
    const bot = currentRoom ? findPlayer(currentRoom, currentRoom.activePlayerId) : null;
    if (!currentRoom) return;
    if (currentRoom.phase !== "battle" || !bot?.isBot || currentRoom.botPaused) {
      currentRoom.botTurnInProgress = false;
      return;
    }

    engine.resolveTurn(currentRoom, bot.id, botNeutralPayment(bot));
    bot.botSkillPlan = [];
    currentRoom.botTurnInProgress = false;
    engine.broadcast(currentRoom);
    scheduleBotIfNeeded(currentRoom, engine);
  }, room.mode === "bot-vs-bot" ? BOT_VS_BOT_TURN_DELAY_MS : BOT_TURN_DELAY_MS);
}
