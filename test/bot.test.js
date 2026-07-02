import test from "node:test";
import assert from "node:assert/strict";
import { botActionPriority } from "../server/bot.js";
import { getCharacterById } from "../shared/characters.js";

function member(id, characterId, hp) {
  return {
    id,
    characterId,
    hp,
    statusEffects: [],
    skillCooldowns: {},
    character: getCharacterById(characterId)
  };
}

function testEngine(room) {
  return {
    aliveMembers(player) {
      return (player?.team || []).filter((item) => item.hp > 0);
    },
    getRoomMember(_room, memberId) {
      return room.players.flatMap((player) => player.team).find((item) => item.id === memberId);
    },
    resolveEffectTargets(_room, player, actor, targetId, _skill, effect) {
      if (effect.targets === "target") return [this.getRoomMember(_room, targetId)].filter(Boolean);
      if (effect.targets === "self") return [actor];
      return (player?.team || []).filter((item) => item.hp > 0);
    },
    damageBuffValue() {
      return 0;
    },
    damageBonusForTarget() {
      return 0;
    },
    shieldValue() {
      return 0;
    }
  };
}

function reincarnationPriority({ chiyoHp, allyHp, secondAllyHp = 100, enemyHp = [100, 100, 100] }) {
  const chiyo = member("chiyo", "chiyo", chiyoHp);
  const ally = member("ally", "naruto", allyHp);
  const secondAlly = member("ally-2", "sakura", secondAllyHp);
  const bot = { id: "bot", team: [chiyo, ally, secondAlly] };
  const opponent = { id: "opponent", team: enemyHp.map((hp, index) => member(`enemy-${index}`, "sasuke", hp)) };
  const room = { players: [bot, opponent], turn: 1 };
  const skill = getCharacterById("chiyo").skills.find((item) => item.id === "ones-own-life-reincarnation");

  return botActionPriority(room, bot, chiyo, skill, ally.id, testEngine(room));
}

test("Chiyo bot deprioritizes Life Reincarnation when allies are healthy", () => {
  const healthyPriority = reincarnationPriority({ chiyoHp: 100, allyHp: 95 });
  const woundedPriority = reincarnationPriority({ chiyoHp: 100, allyHp: 35 });

  assert.ok(healthyPriority < 10);
  assert.ok(woundedPriority > healthyPriority);
});

test("Chiyo bot strongly prioritizes Life Reincarnation when Chiyo and an ally are at half health", () => {
  const crisisPriority = reincarnationPriority({ chiyoHp: 50, allyHp: 50 });
  const healthyPriority = reincarnationPriority({ chiyoHp: 100, allyHp: 95 });

  assert.ok(crisisPriority >= 120);
  assert.ok(crisisPriority > healthyPriority);
});

test("Chiyo bot increases Life Reincarnation priority when outnumbered", () => {
  const evenPriority = reincarnationPriority({ chiyoHp: 80, allyHp: 40, enemyHp: [100, 100] });
  const outnumberedPriority = reincarnationPriority({ chiyoHp: 80, allyHp: 40, secondAllyHp: 0, enemyHp: [100, 100, 100] });

  assert.ok(outnumberedPriority > evenPriority);
});
