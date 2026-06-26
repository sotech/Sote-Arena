import { characters, getCharacterById } from "../shared/characters.js";
import { CHAKRA_TYPES, emptyChakra, queuedNeutralChakraCost } from "./chakra.js";
import { createTeam, findPlayer, opponentOf } from "./players.js";

const BOT_NAME = "Sote IA";
const BOT_TURN_DELAY_MS = 2000;

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

export function createBotPlayer(roomCode) {
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

function botTargetIdsForSkill(room, bot, actor, skill, engine) {
  const opponent = opponentOf(room, bot.id);
  if (skill.targetType === "self") return [actor.id];
  if (skill.targetType === "ally") return engine.aliveMembers(bot).map((member) => member.id);
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
    + engine.damageBonusForTarget(effect, target);
  const damageType = effect.damageType || "basic";
  const shield = damageType === "basic" || damageType === "piercing" ? engine.shieldValue(target) : 0;
  return Math.max(0, rawDamage - shield);
}

function botSkillCanKill(room, bot, actor, skill, targetId, engine) {
  const targets = engine.resolveEffectTargets(room, bot, actor, targetId, skill, { targets: "target" })
    .filter((target) => target.hp > 0);
  return (skill.effects || [])
    .filter((effect) => effect.type === "damage")
    .some((effect) => targets.some((target) => estimateDamageAgainstTarget(actor, skill, effect, target, room.turn, engine) >= target.hp));
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
  if (effectiveHealing > 0) {
    priority = Math.max(priority, 1 + Math.floor(effectiveHealing / 4));
    if (effectiveHealing >= 20) priority += 8;
    if (effectiveHealing >= 40) priority += 8;
  }
  return priority;
}

function botSkillOptions(room, bot, engine) {
  const options = [];
  for (const actor of engine.aliveMembers(bot)) {
    const actorCharacter = getCharacterById(actor.characterId);
    for (const skill of actorCharacter.skills) {
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

function playBotTurn(room, engine) {
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
  if (room?.phase !== "battle" || !activePlayer?.isBot || room.botTurnInProgress) return;

  room.botTurnInProgress = true;
  playBotTurn(room, engine);
  engine.broadcast(room);

  setTimeout(() => {
    const currentRoom = engine.rooms.get(room.code);
    const bot = currentRoom ? findPlayer(currentRoom, currentRoom.activePlayerId) : null;
    if (!currentRoom) return;
    if (currentRoom.phase !== "battle" || !bot?.isBot) {
      currentRoom.botTurnInProgress = false;
      return;
    }

    engine.resolveTurn(currentRoom, bot.id, botNeutralPayment(bot));
    bot.botSkillPlan = [];
    currentRoom.botTurnInProgress = false;
    engine.broadcast(currentRoom);
    scheduleBotIfNeeded(currentRoom, engine);
  }, BOT_TURN_DELAY_MS);
}
