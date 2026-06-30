import test from "node:test";
import assert from "node:assert/strict";
import { characters, getCharacterById, getSkillNameById } from "../shared/characters.js";
import { naruto } from "../shared/characters/naruto/index.js";
import { effectTypes, skillClassesLabel, supportedEffectTypes } from "../shared/effects.js";
import { addStatus, addedEffectsForSkill, applyQueuedSkill, canEffectAffectTarget, damageBonusForTarget, damageBuffValue, exchangeChakra, expireStartTurnSecretEffects, expireStatusEffects, isSkillCountereable, isSkillReflectable, isSkillStunned, modifiedDamageType, modifiedTargetCount, modifiedTargetType, publicRoom, reflectedEffect, reflectedSkill, replacementEffectsForSkill, resolveTurn, undoChakraExchange } from "../server/index.js";
import { modifiedSkillChakraCost } from "../shared/chakraCostModifiers.js";
import { createTeam } from "../server/players.js";
import { actionSkillsForMember, activeSkillsForMember, allSkillsForCharacter, baseSkillsForCharacter, inspectableSkillsForCharacter, visibleBaseSkillsForCharacter, visibleSkillsForMember } from "../shared/skillReplacements.js";
import { eligibleTargetsForSkill, isSkillOutOfUses, meetsSkillRequirements, playerHealthShare, skillUsesRemaining } from "../src/game/battleRules.js";
import { effectDescription, groupStatusEffects, statusEffectGroupValue } from "../src/game/labels.js";

const chakraTypes = ["taijutsu", "ninjutsu", "bloodline", "genjutsu"];

test("catalog exposes the playable characters", () => {
  assert.equal(characters.length, 12);
  assert.equal(new Set(characters.map((character) => character.id)).size, 12);
});

test("characters can be imported from individual folders", () => {
  assert.equal(naruto.id, "naruto");
  assert.equal(naruto.skills.length, 4);
});

test("hideSkillInInspect hides skills only from inspection lists", () => {
  const character = {
    skills: [
      { id: "visible-skill" },
      { id: "hidden-skill", hideSkillInInspect: true }
    ]
  };

  assert.deepEqual(allSkillsForCharacter(character).map((skill) => skill.id), ["visible-skill", "hidden-skill"]);
  assert.deepEqual(inspectableSkillsForCharacter(character).map((skill) => skill.id), ["visible-skill"]);
});

test("hideSkillUses hides only the remaining uses tooltip", () => {
  const sakura = getCharacterById("sakura");
  const strengthSeal = sakura.skills.find((skill) => skill.id === "strength-seal-100");
  const previousHideSkillUses = strengthSeal.hideSkillUses;

  try {
    strengthSeal.hideSkillUses = true;
    const [sakuraMember] = createTeam(["sakura"]);
    const enemyMember = { id: "enemy", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
    const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [sakuraMember] };
    const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [enemyMember] };
    const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

    assert.equal(sakuraMember.statusEffects.some((effect) => effect.type === "skill-uses" && effect.sourceSkillId === "strength-seal-100"), false);

    applyQueuedSkill(room, player, {
      actorId: sakuraMember.id,
      targetId: sakuraMember.id,
      skillId: "strength-seal-100",
      actorName: "Sakura Haruno",
      targetName: "Sakura Haruno",
      skillName: "Sello de Fuerza de 100"
    });

    assert.equal(sakuraMember.skillUses["strength-seal-100"], 1);
    assert.equal(sakuraMember.statusEffects.some((effect) => effect.type === "skill-uses" && effect.sourceSkillId === "strength-seal-100"), false);
  } finally {
    if (previousHideSkillUses === undefined) {
      delete strengthSeal.hideSkillUses;
    } else {
      strengthSeal.hideSkillUses = previousHideSkillUses;
    }
  }
});

test("skill families have class labels for descriptions", () => {
  assert.equal(skillClassesLabel(["physical", "offensive", "instant"]), "fisica, ofensiva, instantanea");
  assert.equal(skillClassesLabel(["special", "strategic", "channeled"]), "especial, estrategica, canalizada");
});

test("every skill uses the current family axes", () => {
  const familyAxes = {
    type: ["physical", "special", "mental"],
    nature: ["strategic", "offensive"],
    time: ["instant", "channeled"]
  };
  const supportedFamilies = Object.values(familyAxes).flat();

  for (const character of characters) {
    for (const skill of character.skills) {
      const family = skill.family || [];
      assert.deepEqual(
        family.filter((item) => !supportedFamilies.includes(item)),
        [],
        `${character.id}.${skill.id} has unsupported families`
      );
      for (const [axis, values] of Object.entries(familyAxes)) {
        assert.equal(
          family.filter((item) => values.includes(item)).length,
          1,
          `${character.id}.${skill.id} must have exactly one ${axis} family`
        );
      }
    }
  }
});

test("player health share uses current HP and ignores shields", () => {
  const player = { team: [{ hp: 100, shield: 50 }, { hp: 100 }, { hp: 100 }] };
  const opponent = { team: [{ hp: 50 }, { hp: 50 }, { hp: 50 }] };

  assert.equal(playerHealthShare(player, opponent), 2 / 3);
  assert.equal(playerHealthShare({ team: [{ hp: 0 }] }, { team: [{ hp: 0 }] }), 0.5);
});

test("skill use limits disable exhausted skills in UI rules", () => {
  const skill = { id: "limited", uses: 2 };
  assert.equal(skillUsesRemaining({ skillUses: {} }, skill), 2);
  assert.equal(isSkillOutOfUses({ skillUses: { limited: 1 } }, skill), false);
  assert.equal(skillUsesRemaining({ skillUses: { limited: 2 } }, skill), 0);
  assert.equal(isSkillOutOfUses({ skillUses: { limited: 2 } }, skill), true);
  assert.equal(isSkillOutOfUses({ skillUses: { limited: 999 } }, { id: "limited" }), true);
});

test("chakra exchange can be retried after undoing it", () => {
  const player = {
    id: "p1",
    chakra: { taijutsu: 5, ninjutsu: 0, bloodline: 0, genjutsu: 0 },
    queue: [],
    team: []
  };
  const room = {
    phase: "battle",
    activePlayerId: "p1",
    turn: 1,
    players: [player]
  };

  assert.equal(exchangeChakra(room, "p1", "ninjutsu", { taijutsu: 5 }), null);
  assert.deepEqual(player.chakra, { taijutsu: 0, ninjutsu: 1, bloodline: 0, genjutsu: 0 });
  assert.equal(undoChakraExchange(room, "p1"), null);
  assert.deepEqual(player.chakra, { taijutsu: 5, ninjutsu: 0, bloodline: 0, genjutsu: 0 });
  assert.equal(exchangeChakra(room, "p1", "bloodline", { taijutsu: 5 }), null);
  assert.deepEqual(player.chakra, { taijutsu: 0, ninjutsu: 0, bloodline: 1, genjutsu: 0 });
});

test("every character can fight with four configured skills", () => {
  for (const character of characters) {
    const baseSkills = baseSkillsForCharacter(character);
    const expectedMaxHp = character.id === "cacho" ? 150 : character.id === "mai" ? 70 : 100;
    assert.equal(character.maxHp, expectedMaxHp);
    assert.equal(character.role, undefined);
    assert.equal(baseSkills.length, ["cacho", "mai"].includes(character.id) ? 3 : 4);
    assert.ok(character.skills.every((skill) => skill.passive === true || Object.values(skill.chakra).some((amount) => amount > 0)));
    assert.ok(character.skills.every((skill) => Array.isArray(skill.effects) && skill.effects.length > 0));
  }
});

test("every character has a final self-defense skill with invulnerability", () => {
  for (const character of characters.filter((character) => !["kankuro", "cacho", "mai"].includes(character.id))) {
    const lastSkill = baseSkillsForCharacter(character).at(-1);
    assert.equal(lastSkill.targetType, "self");
    assert.equal(lastSkill.cooldown, 4);
    assert.ok(lastSkill.effects.some((effect) => (
      effect.type === "complex"
      && effect.duration === 1
      && effect.effects.some((child) => child.type === "invulnerable" && child.value === 1 && child.targets === "self")
    )));
  }
});

test("skill descriptions expose their gameplay values", () => {
  for (const character of characters) {
    for (const skill of character.skills) {
      const visibleEffects = skill.effects.flatMap((effect) => [effect, ...(effect.effects || [])])
        .filter((effect) => effect.type !== "gain-chakra" && effect.type !== "remove-chakra");
      const values = visibleEffects
        .map((effect) => effect.value ?? (effect.type === "reflect" ? effect.duration : undefined))
        .filter(Boolean);
      if (values.length > 0) {
        assert.ok(values.every((value) => skill.description.includes(String(value))));
      }
    }
  }
});

test("skill effects use the documented effect system", () => {
  assert.deepEqual(Object.keys(effectTypes), supportedEffectTypes);
  for (const character of characters) {
    for (const skill of character.skills) {
      for (const parentEffect of skill.effects) {
        for (const effect of [parentEffect, ...(parentEffect.effects || [])]) {
        assert.ok(supportedEffectTypes.includes(effect.type));
        if (effect.type === "complex") {
          assert.ok(effect.duration > 0);
        } else if (effect.type === "instakill") {
          assert.equal(effect.value, undefined);
        } else if (effect.type === "modifyDamage") {
          assert.notEqual(effect.value, 0);
          if (effect.isStackable !== undefined) assert.equal(typeof effect.isStackable, "boolean");
        } else if (effect.type === "modifyDamageByMissingHp") {
          assert.notEqual(Number(effect.amountPerStep ?? effect.value ?? 0), 0);
          assert.ok(Number(effect.hpStep || 0) > 0);
        } else if (effect.type === "modifyDamageMultiplier") {
          assert.ok(Number(effect.multiplier ?? effect.value ?? 0) > 0);
          assert.ok(effect.duration > 0 || effect.duration === -1);
        } else if (effect.type === "modifyDamageType") {
          assert.ok(["basic", "normal", "piercing", "affliction"].includes(effect.damageType));
        } else if (effect.type === "modifyTargetType") {
          assert.ok(["self", "enemy", "ally", "otherAlly", "enemies", "allies", "allPlayers"].includes(effect.targetType));
        } else if (effect.type === "modifyTargetCount") {
          assert.ok(Number(effect.count ?? effect.value) > 0);
        } else if (effect.type === "addEffectToBase" || effect.type === "replaceEffects") {
          assert.ok(Array.isArray(effect.effects) && effect.effects.length > 0);
        } else if (effect.type === "addUncountereable" || effect.type === "addNonReflectable") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
        } else if (effect.type === "replaceSkill") {
          assert.ok(effect.duration > 0 || effect.duration === -1 || effect.duration === "lastUntilShieldBroken" || (effect.duration === undefined && parentEffect !== effect && parentEffect.duration > 0));
          assert.ok(effect.skillId);
          if (effect.showStatusEffect !== undefined) assert.equal(typeof effect.showStatusEffect, "boolean");
        } else if (effect.type === "allyCountStatus") {
          assert.ok(Number(effect.damageReductionPerAlly || 0) > 0 || Number(effect.shieldPerAlly || 0) > 0);
        } else if (effect.type === "counter" || effect.type === "reflect") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
        } else if (effect.type === "modifyChakraCost" || effect.type === "substituteChakraCost") {
          assert.ok(effect.chakra && Object.values(effect.chakra).some((value) => Number(value || 0) !== 0));
        } else if (effect.type === "triggerSkills") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
          assert.ok(effect.condition);
          assert.ok(Array.isArray(effect.effects) && effect.effects.length > 0);
        } else if (effect.type === "applyEffectsOntriggerEvent") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
          assert.ok(effect.triggerEvent);
          assert.ok(effect.condition);
          assert.ok(Array.isArray(effect.effects) && effect.effects.length > 0);
        } else if (effect.type === "onEnemyDeath") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
          assert.ok(Array.isArray(effect.effects) && effect.effects.length > 0);
        } else if (effect.type === "changeAvatarImage") {
          assert.ok(effect.duration > 0 || effect.duration === -1 || effect.duration === "lastUntilShieldBroken");
          assert.ok(effect.avatarImage || effect.avatarImageId || effect.avatar || effect.image || effect.characterImage);
        } else {
          assert.ok(effect.value > 0);
        }
        assert.ok(effect.targets);
        if (effect.type === "damage") assert.ok(!effect.damageType || ["basic", "normal", "piercing", "affliction"].includes(effect.damageType));
        if (effect.type === "shield") {
          assert.equal(typeof effect.isStackable, "boolean");
          if (effect.duration !== undefined) assert.ok(effect.duration > 0 || effect.duration === -1 || effect.duration === "lastUntilShieldBroken");
        }
        if (effect.type === "damage-reduction" && skill.effects.includes(effect)) assert.ok(effect.duration > 0);
        if (effect.type === "gain-chakra" || effect.type === "remove-chakra") {
          assert.ok(!effect.chakraType || chakraTypes.includes(effect.chakraType));
        }
      }
      }
    }
  }
});

test("skills cover the supported target categories", () => {
  const targetTypes = new Set(characters.flatMap((character) => character.skills.map((skill) => skill.targetType)));
  for (const type of ["self", "enemy", "ally", "otherAlly", "enemies", "allies"]) {
    assert.ok(targetTypes.has(type));
  }
});

test("character lookup returns the requested character", () => {
  assert.equal(getCharacterById("naruto").name, "Naruto Uzumaki");
  assert.equal(getCharacterById("missing"), undefined);
  assert.equal(getSkillNameById("puppet-ambush"), "Emboscada de marionetas");
});

test("complex effects from the same skill stack as separate applications", () => {
  const member = { statusEffects: [] };
  const status = {
    type: "complex",
    turns: 3,
    effects: [{ type: "modifyDamage", value: 15, targets: "self", skillIds: ["chidori"] }],
    sourceSkillId: "sharingan",
    sourceSkillName: "Sharingan",
    sourceActorName: "Sasuke Uchiha",
    createdTurn: 1,
    remainingReductions: {}
  };

  addStatus(member, { ...status, id: "first" });
  addStatus(member, { ...status, id: "second", createdTurn: 2 });

  assert.equal(member.statusEffects.length, 2);
  assert.equal(damageBuffValue(member, { id: "chidori", name: "Chidori" }, 3), 30);
  assert.ok(member.statusEffects.every((effect) => effect.descriptions.some((description) => description.includes("Chidori"))));
});

test("status effect instances keep separate visual groups", () => {
  const groups = groupStatusEffects([
    { id: "first", type: "complex", turns: 3, sourceSkillId: "sharingan", sourceSkillName: "Sharingan", effects: [] },
    { id: "second", type: "complex", turns: 1, sourceSkillId: "sharingan", sourceSkillName: "Sharingan", effects: [] }
  ]);

  assert.equal(groups.length, 2);
  assert.deepEqual(groups.map(statusEffectGroupValue), [3, 1]);
});

test("stacked damage status groups show their current damage modifier", () => {
  const groups = groupStatusEffects([
    {
      id: "cat-scratch-stack",
      type: "modifyDamage",
      turns: -1,
      value: 10,
      sourceSkillId: "cat-scratch",
      sourceSkillName: "Aranazo de gato",
      skillIds: ["cat-scratch"]
    }
  ]);

  assert.equal(statusEffectGroupValue(groups[0]), "+10");
});

test("stacked damage status descriptions show the accumulated modifier", () => {
  const member = { statusEffects: [] };
  const status = {
    id: "cat-scratch-stack",
    type: "modifyDamage",
    turns: -1,
    value: 5,
    sourceSkillId: "cat-scratch",
    sourceSkillName: "Aranazo de gato",
    sourceActorName: "Mai",
    skillIds: ["cat-scratch"],
    isStackable: true,
    createdTurn: 1
  };

  addStatus(member, status);
  addStatus(member, { ...status, id: "cat-scratch-stack-2", createdTurn: 2 });

  assert.equal(member.statusEffects.length, 1);
  assert.equal(member.statusEffects[0].value, 10);
  assert.ok(member.statusEffects[0].descriptions.some((description) => description.includes("10")));
});

test("named stack groups share max stack limits across source skills", () => {
  const member = { statusEffects: [] };
  const baseStatus = {
    type: "modifyDamage",
    turns: -1,
    value: 15,
    sourceSkillName: "Acumulaciones de La Zona",
    sourceActorName: "Nagi Seishiro",
    skillIds: ["five-stage-volley"],
    isStackable: true,
    stackCount: 1,
    maxStacks: 3,
    createdTurn: 1
  };

  addStatus(member, { ...baseStatus, id: "flow-1", sourceSkillId: "flow-stacks-a" });
  addStatus(member, { ...baseStatus, id: "flow-2", sourceSkillId: "flow-stacks-a", createdTurn: 2 });
  addStatus(member, { ...baseStatus, id: "flow-3", sourceSkillId: "flow-stacks-b", createdTurn: 3 });
  addStatus(member, { ...baseStatus, id: "flow-4", sourceSkillId: "flow-stacks-b", createdTurn: 4 });

  assert.equal(member.statusEffects.reduce((total, effect) => total + Number(effect.stackCount || 0), 0), 3);
  assert.equal(damageBuffValue(member, { id: "five-stage-volley", name: "Remate de Cinco Etapas" }, 5), 45);
});

test("black feather visual group counts one stack per death", () => {
  const groups = groupStatusEffects([
    {
      id: "black-feather-reduction",
      type: "damage-reduction",
      turns: -1,
      stackCount: 2,
      sourceSkillId: "black-feather",
      sourceSkillName: "Pluma negra"
    },
    {
      id: "black-feather-masamune",
      type: "modifyDamage",
      turns: -1,
      stackCount: 2,
      sourceSkillId: "black-feather-masamune",
      sourceSkillName: "Pluma negra",
      skillIds: ["masamune"]
    },
    {
      id: "black-feather-supernova",
      type: "modifyDamage",
      turns: -1,
      stackCount: 2,
      sourceSkillId: "black-feather-supernova",
      sourceSkillName: "Pluma negra",
      skillIds: ["supernova"]
    }
  ]);

  assert.equal(groups.length, 1);
  assert.equal(statusEffectGroupValue(groups[0]), 2);
});

test("reflected notices keep every reflected skill description", () => {
  const member = { statusEffects: [] };
  const baseNotice = {
    type: "reflected",
    turns: 1,
    showStatusEffect: true,
    sourceSkillId: "sharingan",
    sourceSkillName: "Habilidad reflejada",
    sourceActorName: "Kakashi Hatake",
    createdTurn: 3
  };

  addStatus(member, {
    ...baseNotice,
    id: "reflected-1",
    descriptions: ["Sharingan de Kakashi ha reflejado Patada de sombra sobre este personaje."]
  });
  addStatus(member, {
    ...baseNotice,
    id: "reflected-2",
    descriptions: ["Sharingan de Kakashi ha reflejado Rasengan sobre este personaje."]
  });

  const groups = groupStatusEffects(member.statusEffects);
  assert.equal(member.statusEffects.length, 1);
  assert.equal(groups.length, 1);
  assert.deepEqual(member.statusEffects[0].descriptions, [
    "Sharingan de Kakashi ha reflejado Patada de sombra sobre este personaje.",
    "Sharingan de Kakashi ha reflejado Rasengan sobre este personaje."
  ]);
});

test("skill ids are shown as skill names in descriptions", () => {
  assert.equal(
    effectDescription({ type: "modifyDamage", value: 10, duration: 4, targets: "self", skillIds: ["puppet-ambush"] }),
    "Aumenta dano: +10 por 4 turno(s) (Emboscada de marionetas)"
  );
});

test("modifyDamage accepts negative values as damage reduction", () => {
  const member = { statusEffects: [] };
  addStatus(member, {
    id: "weakness",
    type: "modifyDamage",
    turns: 2,
    value: -10,
    skillIds: ["chidori"],
    sourceSkillId: "weakness",
    sourceSkillName: "Debilidad",
    sourceActorName: "Un personaje",
    createdTurn: 1
  });

  assert.equal(damageBuffValue(member, { id: "chidori", name: "Chidori" }, 2), -10);
  assert.equal(
    effectDescription({ type: "modifyDamage", value: -10, duration: 2, targets: "self", skillIds: ["chidori"] }),
    "Reduce dano: -10 por 2 turno(s) (Chidori)"
  );
});

test("Hinata skills match the requested effects", () => {
  const hinata = getCharacterById("hinata");
  const gentleFist = hinata.skills.find((skill) => skill.id === "gentle-fist");
  const byakuganGuard = hinata.skills.find((skill) => skill.id === "byakugan-guard");
  const chakraSeal = hinata.skills.find((skill) => skill.id === "chakra-seal");

  assert.equal(gentleFist.cooldown, 1);
  assert.deepEqual(gentleFist.chakra, { taijutsu: 1, neutralChakra: 1 });
  assert.deepEqual(gentleFist.effects, [
    { type: "complex", duration: 2, targets: "target", effects: [{ type: "damage", value: 15, targets: "self" }] }
  ]);
  assert.equal(byakuganGuard.cooldown, 4);
  assert.deepEqual(byakuganGuard.chakra, { bloodline: 1 });
  assert.equal(byakuganGuard.targetType, "self");
  assert.deepEqual(chakraSeal.chakra, { bloodline: 1, neutralChakra: 1 });
  assert.deepEqual(chakraSeal.effects, [{ type: "damage", value: 15, targets: "target" }]);
});

test("Byakugan Guard modifies Hinata skills through reusable effects", () => {
  const hinataMember = { id: "hinata", characterId: "hinata", hp: 100, statusEffects: [], skillCooldowns: {} };
  const ally = { id: "ally", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const enemy = { id: "enemy", characterId: "sakura", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [hinataMember, ally] };
  const opponent = { id: "p2", name: "P2", chakra: { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 }, queue: [], team: [enemy] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "hinata",
    targetId: "hinata",
    skillId: "byakugan-guard",
    actorName: "Hinata Hyuga",
    targetName: "Hinata Hyuga",
    skillName: "Guardia Byakugan"
  });

  const chakraSeal = getCharacterById("hinata").skills.find((skill) => skill.id === "chakra-seal");
  assert.equal(damageBuffValue(hinataMember, chakraSeal, 2), 5);
  assert.deepEqual(modifiedSkillChakraCost(hinataMember, chakraSeal), {
    taijutsu: 0,
    ninjutsu: 0,
    bloodline: 1,
    genjutsu: 0,
    neutralChakra: 0
  });
  assert.deepEqual(addedEffectsForSkill(hinataMember, chakraSeal, 2), [
    { type: "shield", value: 15, targets: "allies", isStackable: false }
  ]);

  room.turn = 2;
  applyQueuedSkill(room, player, {
    actorId: "hinata",
    targetId: "enemy",
    skillId: "gentle-fist",
    actorName: "Hinata Hyuga",
    targetName: "Sakura Haruno",
    skillName: "Puno suave"
  });

  assert.equal(enemy.statusEffects.filter((effect) => effect.type === "complex").length, 2);
  resolveTurn(room, "p1");
  assert.equal(enemy.hp, 85);
  assert.equal(Object.values(opponent.chakra).reduce((total, amount) => total + amount, 0), 0);
});

test("Aizen skills match the requested effects", () => {
  const aizen = getCharacterById("aizen");
  const massacre = aizen.skills.find((skill) => skill.id === "flash-step-massacre");
  const kyouka = aizen.skills.find((skill) => skill.id === "kyouka-suijetsu-scatter");
  const hado = aizen.skills.find((skill) => skill.id === "hado-90-black-coffin");
  const corpse = aizen.skills.find((skill) => skill.id === "false-corpse");

  assert.equal(aizen.maxHp, 100);
  assert.deepEqual(massacre.chakra, { genjutsu: 1, neutralChakra: 1 });
  assert.equal(massacre.cooldown, 1);
  assert.equal(massacre.family.includes("physical"), true);
  assert.deepEqual(kyouka.chakra, { bloodline: 1, neutralChakra: 1 });
  assert.equal(kyouka.isSecret, true);
  assert.equal(kyouka.effects[1].type, "counter");
  assert.deepEqual(kyouka.effects[1].familiesAffected, ["offensive"]);
  assert.deepEqual(kyouka.effects[1].effects, [{
    type: "damage",
    value: 30,
    targets: "enemies",
    damageType: "piercing",
    ignoreInvulnerable: true,
    randomTargetCount: 1,
    statusNoticeDescription: "Este objetivo recibio dano de Dispersate, Kyouka Suijetsu de Aizen."
  }]);
  assert.deepEqual(hado.chakra, { ninjutsu: 1, neutralChakra: 1 });
  assert.equal(hado.cooldown, 3);
  assert.equal(hado.effects[0].mode, "cancelable");
  assert.equal(hado.effects[1].cancelIfOriginStunned, true);
  assert.deepEqual(corpse.chakra, { neutralChakra: 1 });
  assert.equal(corpse.cooldown, 4);
});

test("Aizen Flash Step Massacre has an owner-visible secret delayed mark that ignores invulnerability on damage", () => {
  const aizenMember = { id: "aizen", characterId: "aizen", hp: 100, statusEffects: [], skillCooldowns: {} };
  const target = { id: "target", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [aizenMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [target] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "aizen",
    targetId: "target",
    skillId: "flash-step-massacre",
    actorName: "Aizen Sosuke",
    targetName: "Naruto Uzumaki",
    skillName: "Masacre paso flash"
  });

  assert.equal(aizenMember.statusEffects.some((effect) => effect.type === "complex" && effect.effects.some((child) => child.type === "invulnerable")), true);
  assert.equal(target.statusEffects.some((effect) => effect.isSecret && effect.sourceSkillId === "flash-step-massacre"), true);
  assert.equal(publicRoom(room, "p1").players[1].team[0].statusEffects.length, 1);
  assert.equal(publicRoom(room, "p2").players[1].team[0].statusEffects.length, 0);

  resolveTurn(room, "p1");
  assert.equal(target.hp, 100);

  resolveTurn(room, "p2");
  assert.equal(target.hp, 100);

  addStatus(target, {
    id: "temporary-invulnerable",
    type: "invulnerable",
    turns: 1,
    sourceSkillId: "test-invulnerable",
    sourceSkillName: "Invulnerable",
    createdTurn: 3
  });
  resolveTurn(room, "p1");

  assert.equal(target.hp, 65);
  assert.equal(aizenMember.statusEffects.some((effect) => effect.type === "secret-ended" && effect.sourceSkillId === "flash-step-massacre"), false);
});

test("Aizen Kyouka Suijetsu counters and damages a random enemy with a visible notice", () => {
  const aizenMember = { id: "aizen", characterId: "aizen", hp: 100, statusEffects: [], skillCooldowns: {} };
  const enemy = { id: "enemy", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [aizenMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [enemy] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "aizen",
    targetId: "enemy",
    skillId: "kyouka-suijetsu-scatter",
    actorName: "Aizen Sosuke",
    targetName: "Naruto Uzumaki",
    skillName: "Dispersate, Kyouka Suijetsu"
  });
  assert.equal(publicRoom(room, "p2").players[1].team[0].statusEffects.length, 0);

  room.turn = 2;
  const message = applyQueuedSkill(room, opponent, {
    actorId: "enemy",
    targetId: "aizen",
    skillId: "rasengan",
    actorName: "Naruto Uzumaki",
    targetName: "Aizen Sosuke",
    skillName: "Rasengan"
  });

  assert.match(message, /cancelada por un counter/);
  assert.match(message, /Dispersate, Kyouka Suijetsu hizo 30 dano/);
  assert.equal(enemy.hp, 70);
  assert.ok(enemy.statusEffects.some((effect) => (
    effect.type === "triggered-effect-notice"
    && effect.descriptions.includes("Este objetivo recibio dano de Dispersate, Kyouka Suijetsu de Aizen.")
  )));
  room.activePlayerId = "p2";
  resolveTurn(room, "p2");
  resolveTurn(room, "p1");
  assert.equal(aizenMember.statusEffects.some((effect) => effect.type === "secret-ended"), false);
});

test("Aizen Hado 90 creates a cancelable channel on Aizen and a damaging stun on the target", () => {
  const aizenMember = { id: "aizen", characterId: "aizen", hp: 100, statusEffects: [], skillCooldowns: {} };
  const target = { id: "target", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [aizenMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [target] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "aizen",
    targetId: "target",
    skillId: "hado-90-black-coffin",
    actorName: "Aizen Sosuke",
    targetName: "Naruto Uzumaki",
    skillName: "Hado 90: Cofre negro"
  });

  assert.ok(aizenMember.statusEffects.some((effect) => effect.type === "complex" && effect.mode === "cancelable"));
  assert.equal(isSkillStunned(target, { id: "rasengan", family: ["special", "offensive", "instant"] }), true);
  assert.ok(target.statusEffects.some((effect) => effect.type === "complex" && effect.cancelIfOriginStunned === true));

  resolveTurn(room, "p1");
  assert.equal(target.hp, 75);

  resolveTurn(room, "p2");
  resolveTurn(room, "p1");
  resolveTurn(room, "p2");

  assert.equal(aizenMember.statusEffects.some((effect) => effect.sourceSkillId === "hado-90-black-coffin"), false);
  assert.equal(target.statusEffects.some((effect) => effect.sourceSkillId === "hado-90-black-coffin"), false);
});

test("Aizen Hado 90 cancellation removes the channel and target status", () => {
  const aizenMember = { id: "aizen", characterId: "aizen", hp: 100, statusEffects: [], skillCooldowns: {} };
  const target = { id: "target", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [aizenMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [target] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "aizen",
    targetId: "target",
    skillId: "hado-90-black-coffin",
    actorName: "Aizen Sosuke",
    targetName: "Naruto Uzumaki",
    skillName: "Hado 90: Cofre negro"
  });
  addStatus(aizenMember, {
    id: "stunned-aizen",
    type: "stun",
    turns: 1,
    familiesAffected: ["special"],
    sourceSkillId: "test-stun",
    sourceSkillName: "Test stun",
    createdTurn: 1
  });

  resolveTurn(room, "p1");

  assert.equal(aizenMember.statusEffects.some((effect) => effect.sourceSkillId === "hado-90-black-coffin"), false);
  assert.equal(target.statusEffects.some((effect) => effect.sourceSkillId === "hado-90-black-coffin"), false);
  assert.equal(target.hp, 100);
});

test("Cacho Bloodlust is hidden and dynamically buffs Lariat by missing HP", () => {
  const cacho = getCharacterById("cacho");
  const lariat = cacho.skills.find((skill) => skill.id === "cacho-lariat");
  const cachoMember = { id: "cacho-member", characterId: "cacho", hp: 150, statusEffects: [], skillCooldowns: {} };
  const enemyMember = { id: "enemy-member", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", team: [cachoMember] };
  const opponent = { id: "p2", name: "P2", team: [enemyMember] };
  const room = { players: [player, opponent], turn: 1 };

  assert.deepEqual(activeSkillsForMember(cachoMember, cacho).map((skill) => skill.id), ["cacho-lariat", "smoke-hazard", "cigarrette-care"]);

  applyQueuedSkill(room, player, {
    passive: true,
    actorId: "cacho-member",
    targetId: "cacho-member",
    skillId: "cacho-bloodlust",
    actorName: cacho.name,
    targetName: cacho.name,
    skillName: "Ira de Cacho"
  });

  assert.equal(cachoMember.statusEffects.length, 1);
  assert.equal(cachoMember.statusEffects[0].type, "modifyDamageByMissingHp");
  assert.equal(cachoMember.statusEffects[0].turns, -1);
  assert.equal(damageBuffValue(cachoMember, lariat, 2), 0);

  cachoMember.hp = 141;
  assert.equal(damageBuffValue(cachoMember, lariat, 2), 0);

  cachoMember.hp = 140;
  assert.equal(damageBuffValue(cachoMember, lariat, 2), 5);

  cachoMember.hp = 130;
  assert.equal(damageBuffValue(cachoMember, lariat, 2), 10);
});

test("Mai skills match the requested effects", () => {
  const mai = getCharacterById("mai");
  const scratch = mai.skills.find((skill) => skill.id === "cat-scratch");
  const prrr = mai.skills.find((skill) => skill.id === "prrr");
  const licks = mai.skills.find((skill) => skill.id === "licks");
  const protection = mai.skills.find((skill) => skill.id === "ally-protection");

  assert.equal(mai.maxHp, 70);
  assert.deepEqual(scratch.effects, [
    { type: "damage", value: 15, damageType: "piercing", targets: "target" },
    { type: "modifyDamage", value: 5, duration: -1, targets: "self", skillIds: ["cat-scratch"], isStackable: true }
  ]);
  assert.deepEqual(prrr.effects, [
    { type: "modifyChakraCost", chakra: { neutralChakra: -1 }, duration: 4, targets: "target" }
  ]);
  assert.equal(prrr.cooldown, 5);
  assert.equal(licks.targetType, "otherAlly");
  assert.equal(licks.cooldown, 3);
  assert.deepEqual(licks.effects, [
    { type: "complex", duration: 2, targets: "target", mode: "interruptible", effects: [{ type: "heal", value: 10, targets: "self" }] }
  ]);
  assert.equal(protection.passive, true);
  assert.equal(protection.trigger, "battleStart");
  assert.deepEqual(protection.effects, [
    { type: "allyCountStatus", duration: -1, targets: "self", excludeSelf: true, damageReductionPerAlly: 10, shieldPerAlly: 10, maxShield: 40 }
  ]);
});

test("Mai Cat Scratch permanently stacks its own damage", () => {
  const maiMember = { id: "mai", characterId: "mai", hp: 70, statusEffects: [], skillCooldowns: {} };
  const target = { id: "target", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", team: [maiMember] };
  const opponent = { id: "p2", name: "P2", team: [target] };
  const room = { players: [player, opponent], turn: 1 };

  applyQueuedSkill(room, player, {
    actorId: "mai",
    targetId: "target",
    skillId: "cat-scratch",
    actorName: "Mai",
    targetName: "Naruto Uzumaki",
    skillName: "Aranazo de gato"
  });
  assert.equal(target.hp, 85);
  assert.equal(damageBuffValue(maiMember, { id: "cat-scratch" }, 2), 5);

  room.turn = 2;
  applyQueuedSkill(room, player, {
    actorId: "mai",
    targetId: "target",
    skillId: "cat-scratch",
    actorName: "Mai",
    targetName: "Naruto Uzumaki",
    skillName: "Aranazo de gato"
  });
  assert.equal(target.hp, 65);
  assert.equal(damageBuffValue(maiMember, { id: "cat-scratch" }, 3), 10);
});

test("Mai Licks can only target another ally", () => {
  const mai = getCharacterById("mai");
  const maiMember = { id: "mai", characterId: "mai", character: mai, hp: 70, statusEffects: [], skillCooldowns: {} };
  const ally = { id: "ally", characterId: "naruto", character: getCharacterById("naruto"), hp: 80, statusEffects: [], skillCooldowns: {} };
  const me = { id: "p1", team: [maiMember, ally] };
  const opponent = { id: "p2", team: [] };
  const licks = mai.skills.find((skill) => skill.id === "licks");

  assert.deepEqual(
    eligibleTargetsForSkill(licks, me, opponent, maiMember).map((member) => member.id),
    ["ally"]
  );
});

test("Mai Prrr reduces neutral costs and Ally Protection scales with living allies", () => {
  const maiMember = { id: "mai", characterId: "mai", hp: 70, statusEffects: [], skillCooldowns: {} };
  const allyOne = { id: "ally-one", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const allyTwo = { id: "ally-two", characterId: "sakura", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", team: [maiMember, allyOne, allyTwo] };
  const opponent = { id: "p2", name: "P2", team: [] };
  const room = { players: [player, opponent], turn: 1 };

  applyQueuedSkill(room, player, {
    actorId: "mai",
    targetId: "ally-one",
    skillId: "prrr",
    actorName: "Mai",
    targetName: "Naruto Uzumaki",
    skillName: "Prrr"
  });
  assert.deepEqual(modifiedSkillChakraCost(allyOne, { id: "rasengan", chakra: { ninjutsu: 1, neutralChakra: 1 } }), {
    taijutsu: 0,
    ninjutsu: 1,
    bloodline: 0,
    genjutsu: 0,
    neutralChakra: 0
  });

  applyQueuedSkill(room, player, {
    passive: true,
    actorId: "mai",
    targetId: "mai",
    skillId: "ally-protection",
    actorName: "Mai",
    targetName: "Mai",
    skillName: "Proteccion de aliado"
  });
  assert.equal(maiMember.shield, 20);
  assert.ok(maiMember.statusEffects.some((effect) => effect.type === "damage-reduction" && effect.value === 20 && effect.turns === -1));
});

test("bonusWhen can check target or self conditions", () => {
  const actor = { hp: 40, statusEffects: [] };
  const target = { hp: 100, statusEffects: [] };

  assert.equal(
    damageBonusForTarget({ bonusWhen: [{ bonus: 15, require: { type: "hasMaxHp", hp: 50 } }] }, target, actor),
    0
  );
  assert.equal(
    damageBonusForTarget({ bonusWhen: [{ bonus: 15, require: { scope: "self", type: "hasMaxHp", hp: 50 } }] }, target, actor),
    15
  );
  assert.equal(
    effectDescription({ type: "damage", value: 20, bonusWhen: [{ bonus: 15, require: { scope: "self", type: "hasMaxHp", hp: 50 } }] }),
    "Dano normal: 20 | +15 si lanzador tiene maximo 50 HP"
  );
});

test("modifyDamageType changes matching skill damage type", () => {
  const member = { statusEffects: [] };
  addStatus(member, {
    id: "piercing-shadow-kick",
    type: "modifyDamageType",
    turns: 3,
    damageType: "piercing",
    skillIds: ["shadow-kick"],
    sourceSkillId: "cats-blessing",
    sourceSkillName: "Bendicion de gato",
    sourceActorName: "Daniel-san",
    createdTurn: 1
  });

  assert.equal(
    modifiedDamageType(member, { id: "shadow-kick", name: "Patada de sombra" }, "basic", 2),
    "piercing"
  );
  assert.equal(
    modifiedDamageType(member, { id: "nine-lives", name: "Nueve vidas" }, "basic", 2),
    "basic"
  );
  assert.equal(
    effectDescription({ type: "modifyDamageType", damageType: "piercing", duration: 3, targets: "self", skillIds: ["shadow-kick"] }),
    "Cambia tipo de dano: Dano perforante por 3 turno(s) (Patada de sombra)"
  );
});

test("addEffectToBase adds effects to matching skills", () => {
  const member = { statusEffects: [] };
  addStatus(member, {
    id: "shadow-kick-stun",
    type: "addEffectToBase",
    turns: 3,
    skillIds: ["shadow-kick"],
    effects: [{ type: "stun", value: 1, targets: "target" }],
    sourceSkillId: "cats-blessing",
    sourceSkillName: "Bendicion de gato",
    sourceActorName: "Daniel-san",
    createdTurn: 1
  });

  assert.deepEqual(
    addedEffectsForSkill(member, { id: "shadow-kick", name: "Patada de sombra" }, 2),
    [{ type: "stun", value: 1, targets: "target" }]
  );
  assert.deepEqual(
    addedEffectsForSkill(member, { id: "nine-lives", name: "Nueve vidas" }, 2),
    []
  );
  assert.equal(
    effectDescription({ type: "addEffectToBase", duration: 3, targets: "self", skillIds: ["shadow-kick"], effects: [{ type: "stun", value: 1, targets: "target" }] }),
    "Agrega efecto por 3 turno(s) (Patada de sombra): Aturde: 1 turno(s)"
  );
});

test("stun can affect specific skill families", () => {
  const member = {
    statusEffects: [{
      id: "special-stun",
      type: "stun",
      turns: 1,
      familiesAffected: ["special"]
    }]
  };

  assert.equal(isSkillStunned(member, { id: "rasengan", family: ["special", "offensive", "instant"] }), true);
  assert.equal(isSkillStunned(member, { id: "shadow-clones", family: ["physical", "offensive", "instant"] }), false);
  assert.equal(effectDescription({ type: "stun", value: 1, targets: "target", familiesAffected: ["physical", "instant"] }), "Aturde: 1 turno(s) (fisicas, instantaneas)");
});

test("offensive-only counters ignore strategic skills", () => {
  const joseph = getCharacterById("joseph");
  const yourNextLine = joseph.skills.find((skill) => skill.id === "your-next-line");
  assert.deepEqual(yourNextLine.effects[0].familiesAffected, ["offensive"]);

  const aizenMember = { id: "aizen", characterId: "aizen", hp: 100, statusEffects: [], skillCooldowns: {} };
  const enemy = { id: "enemy", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [aizenMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [enemy] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "aizen",
    targetId: "enemy",
    skillId: "kyouka-suijetsu-scatter",
    actorName: "Aizen Sosuke",
    targetName: "Naruto Uzumaki",
    skillName: "Dispersate, Kyouka Suijetsu"
  });

  room.turn = 2;
  const message = applyQueuedSkill(room, opponent, {
    actorId: "enemy",
    targetId: "enemy",
    skillId: "substitution-jutsu",
    actorName: "Naruto Uzumaki",
    targetName: "Naruto Uzumaki",
    skillName: "Jutsu de sustitucion"
  });

  assert.doesNotMatch(message, /cancelada por un counter/);
  assert.equal(enemy.statusEffects.some((effect) => effect.type === "counter"), true);
  assert.equal(enemy.statusEffects.some((effect) => effect.type === "countered"), false);
});

test("secret pending tooltips are visible only to the owner", () => {
  const josephMember = { id: "joseph", characterId: "joseph", hp: 100, statusEffects: [], skillCooldowns: {} };
  const enemyMember = { id: "enemy", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", side: "red", chakra: {}, queue: [], team: [josephMember] };
  const opponent = { id: "p2", name: "P2", side: "blue", chakra: {}, queue: [], team: [enemyMember] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "joseph",
    targetId: "enemy",
    skillId: "your-next-line",
    actorName: "Joseph Joestar",
    targetName: "Naruto Uzumaki",
    skillName: "Tu siguiente frase es..."
  });

  const ownerTargetEffects = publicRoom(room, "p1").players[1].team[0].statusEffects;
  assert.ok(ownerTargetEffects.some((effect) => (
    effect.type === "counter"
    && effect.showStatusEffect === true
    && effect.isSecret === true
    && effect.descriptions.includes("Tu siguiente frase es... fue usada en este personaje.")
  )));
  assert.equal(publicRoom(room, "p2").players[1].team[0].statusEffects.some((effect) => effect.type === "counter"), false);

  applyQueuedSkill(room, opponent, {
    actorId: "enemy",
    targetId: "joseph",
    skillId: "oodama-rasengan",
    actorName: "Naruto Uzumaki",
    targetName: "Joseph Joestar",
    skillName: "Oodama Rasengan"
  });

  assert.ok(enemyMember.statusEffects.some((effect) => (
    effect.type === "countered"
    && effect.descriptions.includes("Tu siguiente frase es: Oodama Rasengan")
  )));
});

test("Naruto Kurama possession triggers at low health", () => {
  const naruto = getCharacterById("naruto");
  const possession = naruto.skills.find((skill) => skill.id === "kurama-possession");
  assert.equal(possession.passive, true);
  assert.equal(possession.hideSkillInInspect, true);
  assert.equal(possession.effects[0].type, "triggerSkills");

  const narutoMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const enemyMember = { id: "enemy", characterId: "sakura", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", side: "red", chakra: {}, queue: [], team: [narutoMember] };
  const opponent = { id: "p2", name: "P2", side: "blue", chakra: {}, queue: [], team: [enemyMember] };
  const room = { phase: "battle", activePlayerId: "p2", players: [player, opponent], turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    id: "passive",
    passive: true,
    actorId: "naruto",
    targetId: "naruto",
    skillId: "kurama-possession",
    actorName: "Naruto Uzumaki",
    targetName: "Naruto Uzumaki",
    skillName: "Posesion Kurama"
  });

  assert.equal(narutoMember.statusEffects.some((effect) => effect.type === "triggerSkills"), true);

  applyQueuedSkill(room, opponent, {
    actorId: "enemy",
    targetId: "naruto",
    skillId: "chakra-punch",
    actorName: "Sakura Haruno",
    targetName: "Naruto Uzumaki",
    skillName: "Puno de chakra"
  });

  assert.equal(narutoMember.hp, 75);
  assert.equal(narutoMember.statusEffects.some((effect) => effect.type === "triggerSkills"), true);

  applyQueuedSkill(room, opponent, {
    actorId: "enemy",
    targetId: "naruto",
    skillId: "chakra-punch",
    actorName: "Sakura Haruno",
    targetName: "Naruto Uzumaki",
    skillName: "Puno de chakra"
  });
  applyQueuedSkill(room, opponent, {
    actorId: "enemy",
    targetId: "naruto",
    skillId: "chakra-punch",
    actorName: "Sakura Haruno",
    targetName: "Naruto Uzumaki",
    skillName: "Puno de chakra"
  });

  assert.equal(narutoMember.hp, 25);
  assert.equal(narutoMember.statusEffects.some((effect) => effect.type === "triggerSkills"), false);
  assert.ok(narutoMember.statusEffects.some((effect) => (
    effect.type === "damage-reduction"
    && effect.percent === true
    && effect.value === 50
    && effect.turns === -1
  )));
  assert.ok(narutoMember.statusEffects.some((effect) => (
    effect.type === "changeAvatarImage"
    && effect.avatarImage === "naruto-kurama"
    && effect.turns === -1
  )));
  assert.equal(publicRoom(room, "p1").players[0].team[0].avatarImageId, "naruto-kurama");
});

test("Ichigo Hollow possession replaces skills until its shield breaks", () => {
  const ichigo = getCharacterById("ichigo");
  const possession = ichigo.skills.find((skill) => skill.id === "hollow-possession");
  assert.equal(possession.isSecret, true);
  assert.equal(possession.requires, undefined);
  assert.equal(possession.effects[0].type, "applyEffectsOntriggerEvent");
  assert.equal(possession.effects[0].triggerEvent, "reachHp");

  const ichigoMember = { id: "ichigo", characterId: "ichigo", hp: 70, statusEffects: [], skillCooldowns: {}, skillUses: {} };
  const enemyMember = { id: "enemy", characterId: "sakura", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", side: "red", chakra: {}, queue: [], team: [ichigoMember] };
  const opponent = { id: "p2", name: "P2", side: "blue", chakra: {}, queue: [], team: [enemyMember] };
  const room = { phase: "battle", activePlayerId: "p1", players: [player, opponent], turn: 1, log: [] };

  assert.deepEqual(activeSkillsForMember(ichigoMember, ichigo).map((skill) => skill.id), [
    "combo-zangetsu",
    "getsuga-tensho",
    "hollow-possession",
    "bankai-block"
  ]);

  applyQueuedSkill(room, player, {
    actorId: "ichigo",
    targetId: "ichigo",
    skillId: "hollow-possession",
    actorName: "Kurosaki Ichigo",
    targetName: "Kurosaki Ichigo",
    skillName: "Posesion Hueco"
  });

  assert.equal(ichigoMember.shield || 0, 0);
  assert.equal(ichigoMember.statusEffects.some((effect) => effect.type === "applyEffectsOntriggerEvent"), true);
  assert.ok(publicRoom(room, "p1").players[0].team[0].statusEffects.some((effect) => (
    effect.type === "applyEffectsOntriggerEvent"
    && effect.showStatusEffect === true
    && effect.isSecret === true
    && effect.descriptions.includes("Posesion Hueco espera a ser activada.")
  )));
  assert.equal(publicRoom(room, "p2").players[0].team[0].statusEffects.some((effect) => effect.type === "applyEffectsOntriggerEvent"), false);
  assert.deepEqual(activeSkillsForMember(ichigoMember, ichigo).map((skill) => skill.id), [
    "combo-zangetsu",
    "getsuga-tensho",
    "hollow-possession",
    "bankai-block"
  ]);

  applyQueuedSkill(room, opponent, {
    actorId: "enemy",
    targetId: "ichigo",
    skillId: "chakra-punch",
    actorName: "Sakura Haruno",
    targetName: "Kurosaki Ichigo",
    skillName: "Puno de chakra"
  });

  assert.equal(ichigoMember.hp, 45);
  assert.equal(ichigoMember.shield, 70);
  assert.equal(ichigoMember.skillUses["hollow-possession"], 999);
  assert.equal(ichigoMember.statusEffects.some((effect) => effect.type === "applyEffectsOntriggerEvent"), false);
  assert.ok(ichigoMember.statusEffects.some((effect) => (
    effect.type === "changeAvatarImage"
    && effect.avatarImage === "ichigo-hollow"
    && effect.turns === -1
    && effect.statusLinkId === "hollow-possession-effect"
  )));
  assert.equal(publicRoom(room, "p1").players[0].team[0].avatarImageId, "ichigo-hollow");
  assert.deepEqual(activeSkillsForMember(ichigoMember, ichigo).map((skill) => skill.id), [
    "black-vortex",
    "black-getsuga-tensho",
    "hollow-possession",
    "bankai-block"
  ]);

  for (let index = 0; index < 3; index += 1) {
    applyQueuedSkill(room, opponent, {
      actorId: "enemy",
      targetId: "ichigo",
      skillId: "chakra-punch",
      actorName: "Sakura Haruno",
      targetName: "Kurosaki Ichigo",
      skillName: "Puno de chakra"
    });
  }

  assert.equal(ichigoMember.shield, 0);
  assert.equal(ichigoMember.statusEffects.some((effect) => effect.statusLinkId === "hollow-possession-effect"), false);
  assert.equal(ichigoMember.skillUses["hollow-possession"], 999);
  assert.equal(publicRoom(room, "p1").players[0].team[0].avatarImageId, "ichigo");
  assert.deepEqual(activeSkillsForMember(ichigoMember, ichigo).map((skill) => skill.id), [
    "combo-zangetsu",
    "getsuga-tensho",
    "hollow-possession",
    "bankai-block"
  ]);
});

test("Ichigo family invulnerability blocks only matching skill families", () => {
  const sourcePlayer = { id: "p1", team: [] };
  const target = {
    id: "ichigo",
    hp: 100,
    statusEffects: [{
      id: "physical-invulnerable",
      type: "invulnerable",
      turns: 1,
      familiesAffected: ["physical"]
    }]
  };
  const targetPlayer = { id: "p2", team: [target] };
  const room = { players: [sourcePlayer, targetPlayer] };

  assert.equal(
    canEffectAffectTarget(room, sourcePlayer, target, { type: "damage" }, { id: "combo", family: ["physical", "offensive", "instant"] }),
    false
  );
  assert.equal(
    canEffectAffectTarget(room, sourcePlayer, target, { type: "damage" }, { id: "mind", family: ["mental", "offensive", "instant"] }),
    true
  );
});

test("Cacho smoke hazard only stuns physical skills", () => {
  const cacho = getCharacterById("cacho");
  const smokeHazard = cacho.skills.find((skill) => skill.id === "smoke-hazard");
  const stun = smokeHazard.effects
    .find((effect) => effect.type === "complex")
    .effects.find((effect) => effect.type === "stun");
  const member = {
    statusEffects: [{
      id: "smoke-stun",
      type: "complex",
      turns: 1,
      effects: [stun]
    }]
  };

  assert.deepEqual(stun.familiesAffected, ["physical"]);
  assert.equal(isSkillStunned(member, { id: "cats-blessing", family: ["special", "strategic", "instant"] }), false);
  assert.equal(isSkillStunned(member, { id: "shadow-kick", family: ["physical", "offensive", "instant"] }), true);
  assert.equal(effectDescription(stun), "Aturde: 1 turno(s) (fisicas)");
});

test("stun without familiesAffected affects every skill", () => {
  const member = {
    statusEffects: [{
      id: "global-stun",
      type: "stun",
      turns: 1
    }]
  };

  assert.equal(isSkillStunned(member, { id: "rasengan", family: ["special", "offensive", "instant"] }), true);
  assert.equal(isSkillStunned(member, { id: "shadow-clones", family: ["physical", "offensive", "instant"] }), true);
});

test("invulnerable blocks enemy effects unless they explicitly ignore it", () => {
  const sourcePlayer = { id: "source", team: [{ id: "source-member", hp: 100, statusEffects: [] }] };
  const target = { id: "target-member", hp: 100, statusEffects: [{ type: "invulnerable", turns: 1 }] };
  const targetPlayer = { id: "target", team: [target] };
  const room = { players: [sourcePlayer, targetPlayer] };

  assert.equal(canEffectAffectTarget(room, sourcePlayer, target, { type: "damage" }), false);
  assert.equal(canEffectAffectTarget(room, sourcePlayer, target, { type: "damage", ignoreInvulnerable: true }), true);
  assert.equal(canEffectAffectTarget(room, targetPlayer, target, { type: "heal" }), true);
});

test("complex damage from an enemy source is blocked while the target is invulnerable", () => {
  const kankuro = { id: "kankuro-member", hp: 100, statusEffects: [] };
  const target = {
    id: "target-member",
    hp: 100,
    statusEffects: [
      { type: "invulnerable", turns: 1 },
      {
        id: "poison",
        type: "complex",
        turns: 3,
        sourceSkillId: "iron-puppet-barrage",
        sourceSkillName: "Rafaga de marionetas de hierro",
        originActorId: "kankuro-member",
        effects: [{ type: "damage", value: 10, targets: "self", damageType: "affliction" }]
      }
    ]
  };
  const sourcePlayer = { id: "source", team: [kankuro] };
  const targetPlayer = { id: "target", team: [target] };
  const room = { players: [sourcePlayer, targetPlayer] };
  const sourceMember = sourcePlayer.team[0];
  const sourceOwner = sourceMember ? sourcePlayer : targetPlayer;
  const damageEffect = target.statusEffects[1].effects[0];

  assert.equal(canEffectAffectTarget(room, sourceOwner, target, damageEffect), false);
});

test("continuous damage triggers when the affected player turn starts", () => {
  const kankuroMember = { id: "kankuro", characterId: "kankuro", hp: 100, statusEffects: [], skillCooldowns: {} };
  const narutoMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [kankuroMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [narutoMember] };
  const room = { players: [player, opponent], activePlayerId: "p1", phase: "battle", turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "kankuro",
    targetId: "naruto",
    skillId: "iron-puppet-barrage",
    actorName: "Kankuro",
    targetName: "Naruto Uzumaki",
    skillName: "Rafaga de marionetas de hierro"
  });

  assert.equal(narutoMember.hp, 100);
  resolveTurn(room, "p1");

  assert.equal(room.activePlayerId, "p2");
  assert.equal(narutoMember.hp, 90);
  assert.ok(room.log.some((entry) => String(entry).includes("Rafaga de marionetas de hierro hizo 10 dano continuo.")));
});

test("Jotaro ORA ORA ORA deals extra shield-only damage without overflow", () => {
  const jotaroMember = { id: "jotaro", characterId: "jotaro", hp: 100, statusEffects: [], skillCooldowns: {} };
  const ichigoMember = { id: "ichigo", characterId: "ichigo", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [jotaroMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [ichigoMember] };
  const room = { players: [player, opponent], activePlayerId: "p1", phase: "battle", turn: 1, log: [] };

  addStatus(ichigoMember, {
    id: "linked-shield",
    type: "shield",
    turns: -1,
    value: 5,
    remainingShield: 5,
    isStackable: false,
    statusLinkId: "hollow-possession-effect",
    sourceSkillId: "hollow-possession-effect",
    sourceSkillName: "Posesion Hueco - Efecto",
    sourceActorName: "Kurosaki Ichigo",
    originActorId: "ichigo",
    originCharacterId: "ichigo",
    createdTurn: 1
  });
  addStatus(ichigoMember, {
    id: "linked-avatar",
    type: "changeAvatarImage",
    turns: -1,
    avatarImage: "ichigo-hollow",
    statusLinkId: "hollow-possession-effect",
    sourceSkillId: "hollow-possession-effect",
    sourceSkillName: "Posesion Hueco - Efecto",
    sourceActorName: "Kurosaki Ichigo",
    originActorId: "ichigo",
    originCharacterId: "ichigo",
    createdTurn: 1,
    showStatusEffect: false
  });

  applyQueuedSkill(room, player, {
    actorId: "jotaro",
    targetId: "ichigo",
    skillId: "ora-ora-ora",
    actorName: "Jotaro Kujo",
    targetName: "Kurosaki Ichigo",
    skillName: "ORA ORA ORA"
  });

  resolveTurn(room, "p1");

  assert.equal(ichigoMember.hp, 85);
  assert.equal(ichigoMember.shield, 0);
  assert.equal(ichigoMember.statusEffects.some((effect) => effect.statusLinkId === "hollow-possession-effect"), false);
  assert.equal(publicRoom(room, "p1").players[1].team[0].avatarImageId, "ichigo");
  assert.ok(room.log.some((entry) => String(entry).includes("ORA ORA ORA hizo 5 de dano a escudos.")));
});

test("complex stun can affect specific skill families", () => {
  const member = {
    statusEffects: [{
      id: "complex-mental-stun",
      type: "complex",
      turns: 1,
      effects: [{ type: "stun", value: 1, targets: "self", familiesAffected: ["mental"] }]
    }]
  };

  assert.equal(isSkillStunned(member, { id: "uzumaki-resolve", family: ["mental", "strategic", "instant"] }), true);
  assert.equal(isSkillStunned(member, { id: "rasengan", family: ["special", "offensive", "instant"] }), false);
});

test("replaceSkill swaps a base skill with an extra skill while active", () => {
  const gaara = getCharacterById("gaara");
  const member = { statusEffects: [], character: gaara };

  assert.deepEqual(baseSkillsForCharacter(gaara).map((skill) => skill.id), ["sand-coffin", "sand-shield", "sand-armor", "substitution-jutsu"]);
  assert.ok(gaara.skills.find((skill) => skill.id === "sand-storm")?.isExtraSkill);
  assert.deepEqual(activeSkillsForMember(member, gaara).map((skill) => skill.id), ["sand-coffin", "sand-shield", "sand-armor", "substitution-jutsu"]);

  addStatus(member, {
    id: "sand-armor-replacement",
    type: "replaceSkill",
    turns: 2,
    baseSkillId: "sand-armor",
    skillId: "sand-storm",
    sourceSkillId: "sand-armor",
    sourceSkillName: "Armadura de arena",
    sourceActorName: "Gaara",
    createdTurn: 1
  });

  assert.deepEqual(activeSkillsForMember(member, gaara).map((skill) => skill.id), ["sand-coffin", "sand-shield", "sand-storm", "substitution-jutsu"]);
  assert.equal(
    effectDescription({ type: "replaceSkill", duration: 2, targets: "self", baseSkillId: "sand-armor", skillId: "sand-storm" }),
    "Reemplaza habilidad por 2 turno(s): Armadura de arena -> Tormenta de arena"
  );
});

test("replaceSkill duration -1 swaps a base skill permanently", () => {
  const kakuzu = getCharacterById("kakuzu");
  const member = { statusEffects: [], character: kakuzu };

  addStatus(member, {
    id: "fuuton-permanent-replacement",
    type: "replaceSkill",
    turns: -1,
    baseSkillId: "fuuton-pressure-damage",
    skillId: "katon-inferno-fire",
    sourceSkillId: "fuuton-pressure-damage",
    sourceSkillName: "Estilo de viento: Presion de dano",
    sourceActorName: "Kakuzu",
    createdTurn: 1
  });

  assert.deepEqual(activeSkillsForMember(member, kakuzu).map((skill) => skill.id), ["katon-inferno-fire", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]);
  assert.equal(
    effectDescription({ type: "replaceSkill", duration: -1, targets: "self", baseSkillId: "fuuton-pressure-damage", skillId: "katon-inferno-fire" }),
    "Reemplaza habilidad permanentemente: Estilo de viento: Presion -> Estilo de fuego: Fuego infernal"
  );
  assert.equal(
    effectDescription({ type: "replaceSkill", duration: -1, targets: "self", skillId: "fuuton-pressure-damage" }),
    "Reemplaza habilidad permanentemente: habilidad actual -> Estilo de viento: Presion"
  );
});

test("replaceSkill can hide its status effect without disabling the replacement", () => {
  const gaara = getCharacterById("gaara");
  const member = { statusEffects: [], character: gaara };

  addStatus(member, {
    id: "hidden-sand-armor-replacement",
    type: "replaceSkill",
    turns: -1,
    baseSkillId: "sand-armor",
    skillId: "sand-storm",
    showStatusEffect: false,
    sourceSkillId: "sand-armor",
    sourceSkillName: "Armadura de arena",
    sourceActorName: "Gaara",
    createdTurn: 1
  });

  assert.deepEqual(activeSkillsForMember(member, gaara).map((skill) => skill.id), ["sand-coffin", "sand-shield", "sand-storm", "substitution-jutsu"]);
  assert.deepEqual(groupStatusEffects(member.statusEffects), []);
});

test("permanent replaceSkill statuses are hidden by default and latest use wins", () => {
  const kakuzu = getCharacterById("kakuzu");
  const member = { statusEffects: [], character: kakuzu };

  addStatus(member, {
    id: "fuuton-to-katon",
    type: "replaceSkill",
    turns: -1,
    baseSkillId: "fuuton-pressure-damage",
    skillId: "katon-inferno-fire",
    sourceSkillId: "fuuton-pressure-damage",
    sourceSkillName: "Estilo de viento: Presion",
    sourceActorName: "Kakuzu",
    createdTurn: 1
  });
  assert.deepEqual(activeSkillsForMember(member, kakuzu).map((skill) => skill.id), ["katon-inferno-fire", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]);
  assert.deepEqual(groupStatusEffects(member.statusEffects), []);

  addStatus(member, {
    id: "katon-to-fuuton",
    type: "replaceSkill",
    turns: -1,
    baseSkillId: "fuuton-pressure-damage",
    skillId: "fuuton-pressure-damage",
    sourceSkillId: "katon-inferno-fire",
    sourceSkillName: "Estilo de fuego: Fuego infernal",
    sourceActorName: "Kakuzu",
    createdTurn: 2
  });
  assert.deepEqual(activeSkillsForMember(member, kakuzu).map((skill) => skill.id), ["fuuton-pressure-damage", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]);

  addStatus(member, {
    id: "fuuton-to-katon-again",
    type: "replaceSkill",
    turns: -1,
    baseSkillId: "fuuton-pressure-damage",
    skillId: "katon-inferno-fire",
    sourceSkillId: "fuuton-pressure-damage",
    sourceSkillName: "Estilo de viento: Presion",
    sourceActorName: "Kakuzu",
    createdTurn: 3
  });
  assert.deepEqual(activeSkillsForMember(member, kakuzu).map((skill) => skill.id), ["katon-inferno-fire", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]);
});

test("Kakuzu replacement skills are hidden until active", () => {
  const kakuzu = getCharacterById("kakuzu");
  const member = { statusEffects: [], character: kakuzu };

  assert.equal(kakuzu.skills.find((skill) => skill.id === "katon-inferno-fire").hideUntilReplaced, true);
  assert.equal(kakuzu.skills.find((skill) => skill.id === "suiton-suijenki").hideUntilReplaced, true);
  assert.deepEqual(
    visibleBaseSkillsForCharacter(kakuzu).map((skill) => skill.id),
    ["fuuton-pressure-damage", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]
  );
  assert.deepEqual(
    visibleSkillsForMember(member, kakuzu).map((skill) => skill.id),
    ["fuuton-pressure-damage", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]
  );
  assert.deepEqual(
    actionSkillsForMember(member, kakuzu).map((skill) => skill.id),
    ["fuuton-pressure-damage", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]
  );

  addStatus(member, {
    id: "fuuton-to-katon",
    type: "replaceSkill",
    turns: -1,
    baseSkillId: "fuuton-pressure-damage",
    skillId: "katon-inferno-fire",
    sourceSkillId: "fuuton-pressure-damage",
    sourceSkillName: "Estilo de viento: Presion",
    sourceActorName: "Kakuzu",
    createdTurn: 1
  });

  assert.deepEqual(
    visibleSkillsForMember(member, kakuzu).map((skill) => skill.id),
    ["fuuton-pressure-damage", "raiton-false-lightning", "heart-steal", "substitution-jutsu", "katon-inferno-fire"]
  );
  assert.deepEqual(
    actionSkillsForMember(member, kakuzu).map((skill) => skill.id),
    ["katon-inferno-fire", "raiton-false-lightning", "heart-steal", "substitution-jutsu"]
  );
});

test("Kakuzu skills match the requested effects and swaps", () => {
  const kakuzu = getCharacterById("kakuzu");
  const fuuton = kakuzu.skills.find((skill) => skill.id === "fuuton-pressure-damage");
  const raiton = kakuzu.skills.find((skill) => skill.id === "raiton-false-lightning");
  const heartSteal = kakuzu.skills.find((skill) => skill.id === "heart-steal");
  const substitution = kakuzu.skills.find((skill) => skill.id === "substitution-jutsu");
  const katon = kakuzu.skills.find((skill) => skill.id === "katon-inferno-fire");
  const suiton = kakuzu.skills.find((skill) => skill.id === "suiton-suijenki");

  assert.deepEqual(fuuton.effects, [
    { type: "damage", value: 25, targets: "target" },
    { type: "complex", duration: 1, targets: "target", effects: [{ type: "stun", value: 1, targets: "self" }] },
    { type: "replaceSkill", baseSkillId: "fuuton-pressure-damage", skillId: "katon-inferno-fire", targets: "self", duration: -1 }
  ]);
  assert.deepEqual(raiton.effects, [
    { type: "damage", value: 30, damageType: "piercing", targets: "target" },
    { type: "replaceSkill", baseSkillId: "raiton-false-lightning", skillId: "suiton-suijenki", targets: "self", duration: -1, showStatusEffect: false }
  ]);
  assert.deepEqual(heartSteal.requires, [{ scope: "target", type: "hp", operator: "lte", value: 20, message: "Robo de corazones requiere un objetivo enemigo con 20 de vida o menos." }]);
  assert.deepEqual(heartSteal.effects, [
    { type: "instakill", targets: "target" },
    { type: "heal", value: 50, targets: "self" }
  ]);
  assert.ok(substitution.effects.some((effect) => (
    effect.type === "complex"
    && effect.duration === 1
    && effect.effects.some((child) => child.type === "invulnerable" && child.value === 1)
  )));
  assert.deepEqual(katon.effects, [
    { type: "damage", value: 15, damageType: "affliction", targets: "target" },
    { type: "replaceSkill", baseSkillId: "fuuton-pressure-damage", skillId: "fuuton-pressure-damage", targets: "self", duration: -1 }
  ]);
  assert.deepEqual(suiton.effects, [
    { type: "shield", value: 30, targets: "target", isStackable: false },
    { type: "replaceSkill", baseSkillId: "raiton-false-lightning", skillId: "raiton-false-lightning", targets: "self", duration: -1, showStatusEffect: false }
  ]);
});

test("Kakashi skills match Raikiri, Sharingan, and Ninken Trap rules", () => {
  const kakashi = getCharacterById("kakashi");
  const raikiri = kakashi.skills.find((skill) => skill.id === "raikiri");
  const sharingan = kakashi.skills.find((skill) => skill.id === "kakashi-sharingan");
  const ninkenTrap = kakashi.skills.find((skill) => skill.id === "ninken-trap");

  assert.deepEqual(raikiri.effects, [
    { type: "damage", value: 50, damageType: "piercing", targets: "target" },
    { type: "instakill", targets: "target", when: { type: "hasStatusEffect", effectId: "ninken-trap" } }
  ]);
  assert.deepEqual(sharingan.effects, [
    { type: "reflect", duration: 1, targets: "self", trigger: "incoming", charges: -1, reflectTo: "caster", showStatusEffect: false }
  ]);
  assert.equal(sharingan.isSecret, true);
  assert.equal(ninkenTrap.targetType, "enemy");
  assert.deepEqual(ninkenTrap.effects, [
    { type: "damage", value: 10, targets: "target" },
    { type: "complex", duration: 2, targets: "target", effects: [{ type: "stun", value: 2, targets: "self" }] }
  ]);
});

test("Kankuro Puppet Substitution is a secret outgoing counter trap", () => {
  const kankuro = getCharacterById("kankuro");
  const puppetSubstitution = kankuro.skills.find((skill) => skill.id === "puppet-substitution");

  assert.equal(puppetSubstitution.targetType, "enemy");
  assert.equal(puppetSubstitution.isSecret, true);
  assert.equal(
    puppetSubstitution.description,
    "Coloca una trampa de marionetas en un objetivo. Durante el siguiente turno, la primera habilidad usada por ese objetivo sera countereada."
  );
  assert.deepEqual(puppetSubstitution.effects, [
    { type: "counter", duration: 1, targets: "target", trigger: "outgoing", charges: 1 }
  ]);
});

test("Puppet Substitution counters the target next skill and shows both notices", () => {
  const kankuroMember = { id: "kankuro", characterId: "kankuro", hp: 100, statusEffects: [], skillCooldowns: {} };
  const narutoMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [kankuroMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [narutoMember] };
  const room = { players: [player, opponent], turn: 1, log: [] };

  const trapLog = applyQueuedSkill(room, player, {
    actorId: "kankuro",
    targetId: "naruto",
    skillId: "puppet-substitution",
    actorName: "Kankuro",
    targetName: "Naruto Uzumaki",
    skillName: "Jutsu de sustitucion de marionetas"
  });

  assert.deepEqual(trapLog.visibleTo, ["p1"]);
  assert.equal(narutoMember.statusEffects.length, 1);
  assert.equal(narutoMember.statusEffects[0].type, "counter");
  assert.equal(narutoMember.statusEffects[0].showStatusEffect, true);
  assert.equal(narutoMember.statusEffects[0].isSecret, true);
  assert.ok(narutoMember.statusEffects[0].descriptions.includes("Jutsu de sustitucion de marionetas fue usada en este personaje."));
  assert.equal(publicRoom(room, "p1").players[1].team[0].statusEffects.some((effect) => effect.type === "counter"), true);
  assert.equal(publicRoom(room, "p2").players[1].team[0].statusEffects.some((effect) => effect.type === "counter"), false);

  const counteredLog = applyQueuedSkill(room, opponent, {
    actorId: "naruto",
    targetId: "kankuro",
    skillId: "oodama-rasengan",
    actorName: "Naruto Uzumaki",
    targetName: "Kankuro",
    skillName: "Oodama Rasengan"
  });

  assert.equal(counteredLog, "Naruto Uzumaki uso Oodama Rasengan, pero fue cancelada por un counter.");
  assert.equal(kankuroMember.hp, 100);
  assert.equal(narutoMember.skillCooldowns["oodama-rasengan"], 1);
  assert.equal(narutoMember.statusEffects.some((effect) => effect.type === "counter"), false);
  assert.ok(narutoMember.statusEffects.some((effect) => (
    effect.type === "countered"
    && effect.turns === 1
    && effect.descriptions.includes("Kankuro de Jutsu de sustitucion de marionetas ha contrarrestado a este personaje.")
  )));
  assert.ok(kankuroMember.statusEffects.some((effect) => (
    effect.type === "secret-ended"
    && effect.sourceSkillId === "puppet-substitution"
    && effect.descriptions.includes("Jutsu de sustitucion de marionetas ha finalizado.")
  )));
});

test("Cacho Lariat cannot be countered by Puppet Substitution", () => {
  const kankuroMember = { id: "kankuro", characterId: "kankuro", hp: 100, statusEffects: [], skillCooldowns: {} };
  const cachoMember = { id: "cacho", characterId: "cacho", hp: 150, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", team: [kankuroMember] };
  const opponent = { id: "p2", name: "P2", team: [cachoMember] };
  const room = { players: [player, opponent], turn: 1 };
  const cacho = getCharacterById("cacho");
  const lariat = cacho.skills.find((skill) => skill.id === "cacho-lariat");

  assert.equal(lariat.uncountereable, true);

  applyQueuedSkill(room, player, {
    actorId: "kankuro",
    targetId: "cacho",
    skillId: "puppet-substitution",
    actorName: "Kankuro",
    targetName: "Cacho",
    skillName: "Jutsu de sustitucion de marionetas"
  });

  const lariatLog = applyQueuedSkill(room, opponent, {
    actorId: "cacho",
    targetId: "kankuro",
    skillId: "cacho-lariat",
    actorName: "Cacho",
    targetName: "Kankuro",
    skillName: "Lariat de Cacho"
  });

  assert.equal(lariatLog, "Cacho uso Lariat de Cacho e hizo 30 dano.");
  assert.equal(kankuroMember.hp, 70);
  assert.equal(cachoMember.statusEffects.some((effect) => effect.type === "counter"), true);
  assert.equal(cachoMember.statusEffects.some((effect) => effect.type === "countered"), false);
});

test("Chidori cannot be reflected", () => {
  const sasukeMember = { id: "sasuke", characterId: "sasuke", hp: 100, statusEffects: [], skillCooldowns: {} };
  const kakashiMember = {
    id: "kakashi",
    characterId: "kakashi",
    hp: 100,
    statusEffects: [{
      id: "reflect",
      type: "reflect",
      turns: 1,
      trigger: "incoming",
      charges: 1,
      reflectTo: "caster"
    }],
    skillCooldowns: {}
  };
  const player = { id: "p1", name: "P1", team: [sasukeMember] };
  const opponent = { id: "p2", name: "P2", team: [kakashiMember] };
  const room = { players: [player, opponent], turn: 1 };
  const sasuke = getCharacterById("sasuke");
  const chidori = sasuke.skills.find((skill) => skill.id === "chidori");

  assert.equal(chidori.nonReflectable, true);

  const log = applyQueuedSkill(room, player, {
    actorId: "sasuke",
    targetId: "kakashi",
    skillId: "chidori",
    actorName: "Sasuke Uchiha",
    targetName: "Kakashi",
    skillName: "Chidori"
  });

  assert.equal(log, "Sasuke Uchiha uso Chidori e hizo 35 dano.");
  assert.equal(kakashiMember.hp, 65);
  assert.equal(sasukeMember.hp, 100);
  assert.equal(kakashiMember.statusEffects.some((effect) => effect.type === "reflect"), true);
  assert.equal(sasukeMember.statusEffects.some((effect) => effect.type === "reflected"), false);
});

test("addUncountereable and addNonReflectable modify matching skills", () => {
  const member = {
    statusEffects: [{
      id: "anti-counter",
      type: "addUncountereable",
      turns: 2,
      skillIds: ["rasengan"]
    }, {
      id: "anti-reflect",
      type: "addNonReflectable",
      turns: 2,
      skillIds: ["chidori"]
    }]
  };

  assert.equal(isSkillCountereable(member, { id: "rasengan", name: "Rasengan" }, 1), false);
  assert.equal(isSkillCountereable(member, { id: "shadow-clones", name: "Clones de sombra" }, 1), true);
  assert.equal(isSkillReflectable(member, { id: "chidori", name: "Chidori" }, 1), false);
  assert.equal(isSkillReflectable(member, { id: "rasengan", name: "Rasengan" }, 1), true);
  assert.equal(effectDescription({ type: "addUncountereable", duration: 2, targets: "self", skillIds: ["rasengan"] }), "No countereable por 2 turno(s) (Rasengan)");
  assert.equal(effectDescription({ type: "addNonReflectable", duration: 2, targets: "self", skillIds: ["chidori"] }), "No reflejable por 2 turno(s) (Chidori)");
});

test("secret statuses are only serialized as visible for the owner that placed them", () => {
  const kankuroMember = { id: "kankuro", characterId: "kankuro", hp: 100, statusEffects: [], skillCooldowns: {} };
  const narutoMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", side: "red", ready: true, connected: true, chakra: {}, queue: [], team: [kankuroMember] };
  const opponent = { id: "p2", name: "P2", side: "blue", ready: true, connected: true, chakra: {}, queue: [], team: [narutoMember] };
  const room = {
    code: "TEST",
    mode: "pvp",
    phase: "battle",
    activePlayerId: "p1",
    winnerId: null,
    finishReason: null,
    turn: 1,
    chat: [],
    log: [],
    players: [player, opponent]
  };

  applyQueuedSkill(room, player, {
    actorId: "kankuro",
    targetId: "naruto",
    skillId: "puppet-substitution",
    actorName: "Kankuro",
    targetName: "Naruto Uzumaki",
    skillName: "Jutsu de sustitucion de marionetas"
  });

  const ownerViewTarget = publicRoom(room, "p1").players[1].team[0];
  const opponentViewTarget = publicRoom(room, "p2").players[1].team[0];

  assert.equal(ownerViewTarget.statusEffects.length, 1);
  assert.equal(ownerViewTarget.statusEffects[0].showStatusEffect, true);
  assert.deepEqual(ownerViewTarget.statusEffects[0].descriptions, ["Jutsu de sustitucion de marionetas se ha colocado sobre este personaje."]);
  assert.deepEqual(opponentViewTarget.statusEffects, []);
});

test("Sharingan secret status is only visible to Kakashi owner", () => {
  const kakashiMember = { id: "kakashi", characterId: "kakashi", hp: 100, statusEffects: [], skillCooldowns: {} };
  const enemyMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", side: "red", ready: true, connected: true, chakra: {}, queue: [], team: [kakashiMember] };
  const opponent = { id: "p2", name: "P2", side: "blue", ready: true, connected: true, chakra: {}, queue: [], team: [enemyMember] };
  const room = {
    code: "TEST",
    mode: "pvp",
    phase: "battle",
    activePlayerId: "p1",
    winnerId: null,
    finishReason: null,
    turn: 1,
    chat: [],
    log: [],
    players: [player, opponent]
  };

  applyQueuedSkill(room, player, {
    actorId: "kakashi",
    targetId: "kakashi",
    skillId: "kakashi-sharingan",
    actorName: "Kakashi Hatake",
    targetName: "Kakashi Hatake",
    skillName: "Sharingan de Kakashi"
  });

  const ownerViewKakashi = publicRoom(room, "p1").players[0].team[0];
  const opponentViewKakashi = publicRoom(room, "p2").players[0].team[0];

  assert.equal(ownerViewKakashi.statusEffects.length, 1);
  assert.equal(ownerViewKakashi.statusEffects[0].showStatusEffect, true);
  assert.deepEqual(ownerViewKakashi.statusEffects[0].descriptions, ["Sharingan de Kakashi se ha colocado sobre este personaje."]);
  assert.deepEqual(opponentViewKakashi.statusEffects, []);
});

test("secret skill logs are only visible to the skill owner", () => {
  const room = {
    code: "TEST",
    mode: "pvp",
    phase: "battle",
    activePlayerId: "p1",
    winnerId: null,
    finishReason: null,
    turn: 1,
    chat: [],
    log: [
      { message: "Kakashi Hatake uso Sharingan de Kakashi.", visibleTo: ["p1"] },
      "Naruto Uzumaki uso Rasengan."
    ],
    players: [
      { id: "p1", name: "P1", side: "red", ready: true, connected: true, chakra: {}, queue: [], team: [] },
      { id: "p2", name: "P2", side: "blue", ready: true, connected: true, chakra: {}, queue: [], team: [] }
    ]
  };

  assert.deepEqual(publicRoom(room, "p1").log, [
    "Kakashi Hatake uso Sharingan de Kakashi.",
    "Naruto Uzumaki uso Rasengan."
  ]);
  assert.deepEqual(publicRoom(room, "p2").log, ["Naruto Uzumaki uso Rasengan."]);
  assert.deepEqual(publicRoom(room).log, ["Naruto Uzumaki uso Rasengan."]);
});

test("expired secret statuses leave a visible one-turn end notice", () => {
  const player = {
    team: [{
      statusEffects: [{
        id: "secret-reflect",
        type: "reflect",
        turns: 1,
        isSecret: true,
        sourceSkillId: "kakashi-sharingan",
        sourceSkillName: "Sharingan de Kakashi",
        sourceActorName: "Kakashi Hatake",
        createdTurn: 1
      }]
    }]
  };

  expireStatusEffects(player, 2);

  assert.equal(player.team[0].statusEffects.length, 1);
  assert.equal(player.team[0].statusEffects[0].type, "secret-ended");
  assert.equal(player.team[0].statusEffects[0].turns, 1);
  assert.equal(player.team[0].statusEffects[0].showStatusEffect, true);
  assert.equal(player.team[0].statusEffects[0].sourceSkillId, "kakashi-sharingan");
  assert.deepEqual(player.team[0].statusEffects[0].descriptions, ["Sharingan de Kakashi ha finalizado."]);
});

test("start of owner turn ends expired secret reactive statuses visibly", () => {
  const player = {
    team: [{
      statusEffects: [{
        id: "secret-reflect",
        type: "reflect",
        turns: 1,
        isSecret: true,
        sourceSkillId: "kakashi-sharingan",
        sourceSkillName: "Sharingan de Kakashi",
        sourceActorName: "Kakashi Hatake",
        createdTurn: 1
      }]
    }]
  };

  expireStartTurnSecretEffects(player, 3);

  assert.equal(player.team[0].statusEffects.length, 1);
  assert.equal(player.team[0].statusEffects[0].type, "secret-ended");
  assert.equal(player.team[0].statusEffects[0].sourceSkillName, "Sharingan de Kakashi ha finalizado");
  assert.deepEqual(player.team[0].statusEffects[0].descriptions, ["Sharingan de Kakashi ha finalizado."]);
});

test("reflected enemy-team skills target the original caster team", () => {
  const skill = { id: "iron-puppet-barrage", targetType: "enemies" };
  const reflected = reflectedSkill(skill, { reflectTo: "caster" });
  const reflectedOuterEffect = reflectedEffect({ type: "complex", targets: "enemies" }, skill, { reflectTo: "caster" });

  assert.equal(reflected.targetType, "allies");
  assert.equal(reflectedOuterEffect.targets, "allies");
});

test("reflected modified enemy-team skills affect the original caster allies", () => {
  const daniel = getCharacterById("daniel");
  const kakashi = getCharacterById("kakashi");
  const danielMember = {
    id: "daniel",
    characterId: "daniel",
    hp: 100,
    statusEffects: [{
      id: "cats-blessing",
      type: "complex",
      turns: 3,
      sourceSkillId: "cats-blessing",
      sourceSkillName: "Bendicion de gato",
      createdTurn: 1,
      effects: [{ type: "modifyTargetType", targetType: "enemies", targets: "self", skillIds: ["shadow-kick"] }]
    }],
    skillCooldowns: {}
  };
  const vulnerableAlly = { id: "daniel-ally", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const invulnerableAlly = {
    id: "daniel-invulnerable-ally",
    characterId: "sakura",
    hp: 100,
    statusEffects: [{ type: "invulnerable", turns: 1 }],
    skillCooldowns: {}
  };
  const kakashiMember = {
    id: "kakashi",
    characterId: "kakashi",
    hp: 100,
    statusEffects: [{
      id: "sharingan",
      type: "reflect",
      turns: 1,
      trigger: "incoming",
      charges: -1,
      reflectTo: "caster",
      sourceSkillId: "kakashi-sharingan",
      sourceSkillName: "Sharingan de Kakashi",
      sourceActorName: "Kakashi Hatake",
      isSecret: true
    }],
    skillCooldowns: {}
  };
  const player = { id: "p1", name: "P1", team: [danielMember, vulnerableAlly, invulnerableAlly] };
  const opponent = { id: "p2", name: "P2", team: [kakashiMember] };
  const room = { players: [player, opponent], turn: 2 };
  const message = applyQueuedSkill(room, player, {
    actorId: "daniel",
    targetId: "kakashi",
    skillId: "shadow-kick",
    actorName: daniel.name,
    targetName: kakashi.name,
    skillName: "Patada de sombra"
  });

  assert.equal(danielMember.hp, 70);
  assert.equal(vulnerableAlly.hp, 70);
  assert.equal(invulnerableAlly.hp, 100);
  assert.equal(kakashiMember.hp, 100);
  assert.ok(danielMember.statusEffects.some((effect) => (
    effect.type === "reflected"
    && effect.descriptions.includes("Sharingan de Kakashi ha reflejado Patada de sombra sobre este personaje.")
  )));
  assert.ok(vulnerableAlly.statusEffects.some((effect) => (
    effect.type === "reflected"
    && effect.descriptions.includes("Sharingan de Kakashi ha reflejado Patada de sombra sobre este personaje.")
  )));
  assert.equal(invulnerableAlly.statusEffects.some((effect) => effect.type === "reflected"), false);
  assert.match(message, /hizo 60 dano/);
});

test("Heart Steal target requirement only passes for enemies at 20 HP or less", () => {
  const kakuzu = getCharacterById("kakuzu");
  const heartSteal = kakuzu.skills.find((skill) => skill.id === "heart-steal");
  const actor = { hp: 100, character: kakuzu, statusEffects: [] };
  const me = { team: [actor] };
  const healthyEnemy = { hp: 21, character: getCharacterById("naruto"), statusEffects: [] };
  const weakEnemy = { hp: 20, character: getCharacterById("naruto"), statusEffects: [] };
  const opponent = { team: [healthyEnemy, weakEnemy] };

  assert.equal(meetsSkillRequirements(heartSteal, me, opponent, actor, [healthyEnemy]), false);
  assert.equal(meetsSkillRequirements(heartSteal, me, opponent, actor, [weakEnemy]), true);
});

test("chakra cost modifiers clamp skill costs at zero", () => {
  const member = {
    statusEffects: [{
      id: "cheap-gentle-fist",
      type: "modifyChakraCost",
      turns: 2,
      chakra: { taijutsu: -2, neutralChakra: 1 },
      skillIds: ["gentle-fist"]
    }]
  };

  assert.deepEqual(
    modifiedSkillChakraCost(member, { id: "gentle-fist", name: "Puno suave", chakra: { taijutsu: 1, neutralChakra: 1 } }),
    { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0, neutralChakra: 2 }
  );
});

test("substituteChakraCost replaces the original skill cost", () => {
  const member = {
    statusEffects: [{
      id: "replacement-cost",
      type: "substituteChakraCost",
      turns: 2,
      chakra: { taijutsu: 0, ninjutsu: 2, bloodline: 0, genjutsu: 0, neutralChakra: 1 },
      skillIds: ["gentle-fist"]
    }]
  };

  assert.deepEqual(
    modifiedSkillChakraCost(member, { id: "gentle-fist", name: "Puno suave", chakra: { taijutsu: 1, neutralChakra: 1 } }),
    { taijutsu: 0, ninjutsu: 2, bloodline: 0, genjutsu: 0, neutralChakra: 1 }
  );
  assert.equal(
    effectDescription({ type: "substituteChakraCost", chakra: { ninjutsu: 2, neutralChakra: 1 }, targets: "self", skillIds: ["gentle-fist"] }),
    "Sustituye coste: 2 de ninjutsu, 1 neutral (Puño suave)"
  );
});

test("skill modifiers can change target type, target count, and replace effects", () => {
  const member = { statusEffects: [] };
  const skill = { id: "shadow-clones", name: "Clones de sombra", targetType: "enemies" };

  addStatus(member, {
    id: "single-clone-target",
    type: "modifyTargetCount",
    turns: 2,
    count: 1,
    random: true,
    skillIds: ["shadow-clones"],
    sourceSkillId: "test-modifier",
    sourceSkillName: "Modificador",
    sourceActorName: "Tester",
    createdTurn: 1
  });
  addStatus(member, {
    id: "clone-allies",
    type: "modifyTargetType",
    turns: 2,
    targetType: "allies",
    skillIds: ["shadow-clones"],
    sourceSkillId: "test-target-type",
    sourceSkillName: "Objetivos",
    sourceActorName: "Tester",
    createdTurn: 1
  });
  addStatus(member, {
    id: "clone-replace-effects",
    type: "replaceEffects",
    turns: 2,
    effects: [{ type: "heal", value: 20, targets: "target" }],
    skillIds: ["shadow-clones"],
    sourceSkillId: "test-replace",
    sourceSkillName: "Reemplazo",
    sourceActorName: "Tester",
    createdTurn: 1
  });

  assert.deepEqual(modifiedTargetCount(member, skill, 2), { count: 1, random: true });
  assert.equal(modifiedTargetType(member, skill, "enemies", 2), "allies");
  assert.deepEqual(replacementEffectsForSkill(member, skill, 2), [{ type: "heal", value: 20, targets: "target" }]);
  assert.equal(effectDescription({ type: "modifyTargetType", duration: 2, targets: "self", targetType: "allies", skillIds: ["shadow-clones"] }), "Cambia objetivos: Todos los aliados por 2 turno(s) (Clones de sombra)");
  assert.equal(effectDescription({ type: "replaceEffects", duration: 2, targets: "self", skillIds: ["shadow-clones"], effects: [{ type: "heal", value: 20, targets: "target" }] }), "Reemplaza efectos por 2 turno(s) (Clones de sombra): Cura: 20");
});

test("modifyTargetType updates active skill target type", () => {
  const daniel = getCharacterById("daniel");
  const member = {
    character: daniel,
    statusEffects: [{
      id: "cats-blessing",
      type: "complex",
      turns: 3,
      sourceSkillId: "cats-blessing",
      sourceSkillName: "Bendicion de gato",
      createdTurn: 1,
      effects: [{ type: "modifyTargetType", targetType: "enemies", targets: "self", skillIds: ["shadow-kick"] }]
    }]
  };
  const shadowKick = daniel.skills.find((skill) => skill.id === "shadow-kick");

  assert.equal(modifiedTargetType(member, shadowKick, shadowKick.targetType, 2), "enemies");
  assert.equal(activeSkillsForMember(member, daniel).find((skill) => skill.id === "shadow-kick").targetType, "enemies");
  assert.equal(effectDescription({ type: "modifyTargetType", duration: 3, targets: "self", targetType: "enemies", skillIds: ["shadow-kick"] }), "Cambia objetivos: Todos los enemigos por 3 turno(s) (Patada de sombra)");
});

test("hp requirements can use comparison operators in bonus descriptions", () => {
  assert.equal(
    effectDescription({ type: "damage", value: 20, bonusWhen: [{ bonus: 10, require: { scope: "self", type: "hp", operator: "lt", value: 50 } }] }),
    "Dano normal: 20 | +10 si lanzador tiene vida menor a 50"
  );
});
