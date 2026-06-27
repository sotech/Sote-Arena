import test from "node:test";
import assert from "node:assert/strict";
import { characters, getCharacterById, getSkillNameById } from "../shared/characters.js";
import { naruto } from "../shared/characters/naruto/index.js";
import { effectTypes, skillClassesLabel, supportedEffectTypes } from "../shared/effects.js";
import { addStatus, addedEffectsForSkill, applyQueuedSkill, canEffectAffectTarget, damageBonusForTarget, damageBuffValue, expireStartTurnSecretEffects, expireStatusEffects, isSkillCountereable, isSkillReflectable, isSkillStunned, modifiedDamageType, modifiedTargetCount, modifiedTargetType, publicRoom, reflectedEffect, reflectedSkill, replacementEffectsForSkill, resolveTurn } from "../server/index.js";
import { modifiedSkillChakraCost } from "../shared/chakraCostModifiers.js";
import { actionSkillsForMember, activeSkillsForMember, baseSkillsForCharacter, visibleBaseSkillsForCharacter, visibleSkillsForMember } from "../shared/skillReplacements.js";
import { meetsSkillRequirements, playerHealthShare } from "../src/game/battleRules.js";
import { effectDescription, groupStatusEffects, statusEffectGroupValue } from "../src/game/labels.js";

const chakraTypes = ["taijutsu", "ninjutsu", "bloodline", "genjutsu"];

test("catalog exposes the playable characters", () => {
  assert.equal(characters.length, 10);
  assert.equal(new Set(characters.map((character) => character.id)).size, 10);
});

test("characters can be imported from individual folders", () => {
  assert.equal(naruto.id, "naruto");
  assert.equal(naruto.skills.length, 4);
});

test("skill families have class labels for descriptions", () => {
  assert.equal(skillClassesLabel(["physical", "instant"]), "fisica, instantanea");
});

test("player health share uses current HP and ignores shields", () => {
  const player = { team: [{ hp: 100, shield: 50 }, { hp: 100 }, { hp: 100 }] };
  const opponent = { team: [{ hp: 50 }, { hp: 50 }, { hp: 50 }] };

  assert.equal(playerHealthShare(player, opponent), 2 / 3);
  assert.equal(playerHealthShare({ team: [{ hp: 0 }] }, { team: [{ hp: 0 }] }), 0.5);
});

test("every character can fight with four configured skills", () => {
  for (const character of characters) {
    const baseSkills = baseSkillsForCharacter(character);
    assert.equal(character.maxHp, character.id === "cacho" ? 150 : 100);
    assert.equal(character.role, undefined);
    assert.equal(baseSkills.length, character.id === "cacho" ? 3 : 4);
    assert.ok(character.skills.every((skill) => skill.passive === true || Object.values(skill.chakra).some((amount) => amount > 0)));
    assert.ok(character.skills.every((skill) => Array.isArray(skill.effects) && skill.effects.length > 0));
  }
});

test("every character has a final self-defense skill with invulnerability", () => {
  for (const character of characters.filter((character) => !["kankurou", "cacho"].includes(character.id))) {
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
      for (const effect of skill.effects.flatMap((item) => [item, ...(item.effects || [])])) {
        assert.ok(supportedEffectTypes.includes(effect.type));
        if (effect.type === "complex") {
          assert.ok(effect.duration > 0);
        } else if (effect.type === "instakill") {
          assert.equal(effect.value, undefined);
        } else if (effect.type === "modifyDamage") {
          assert.notEqual(effect.value, 0);
        } else if (effect.type === "modifyDamageByMissingHp") {
          assert.notEqual(Number(effect.amountPerStep ?? effect.value ?? 0), 0);
          assert.ok(Number(effect.hpStep || 0) > 0);
        } else if (effect.type === "modifyDamageType") {
          assert.ok(["basic", "normal", "piercing", "affliction"].includes(effect.damageType));
        } else if (effect.type === "modifyTargetType") {
          assert.ok(["self", "enemy", "ally", "enemies", "allies", "allPlayers"].includes(effect.targetType));
        } else if (effect.type === "modifyTargetCount") {
          assert.ok(Number(effect.count ?? effect.value) > 0);
        } else if (effect.type === "addEffectToBase" || effect.type === "replaceEffects") {
          assert.ok(Array.isArray(effect.effects) && effect.effects.length > 0);
        } else if (effect.type === "addUncountereable" || effect.type === "addNonReflectable") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
        } else if (effect.type === "replaceSkill") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
          assert.ok(effect.skillId);
          if (effect.showStatusEffect !== undefined) assert.equal(typeof effect.showStatusEffect, "boolean");
        } else if (effect.type === "counter" || effect.type === "reflect") {
          assert.ok(effect.duration > 0 || effect.duration === -1);
        } else if (effect.type === "modifyChakraCost" || effect.type === "substituteChakraCost") {
          assert.ok(effect.chakra && Object.values(effect.chakra).some((value) => Number(value || 0) !== 0));
        } else {
          assert.ok(effect.value > 0);
        }
        assert.ok(effect.targets);
        if (effect.type === "damage") assert.ok(!effect.damageType || ["basic", "normal", "piercing", "affliction"].includes(effect.damageType));
        if (effect.type === "shield") assert.equal(typeof effect.isStackable, "boolean");
        if (effect.type === "damage-reduction" && skill.effects.includes(effect)) assert.ok(effect.duration > 0);
        if (effect.type === "gain-chakra" || effect.type === "remove-chakra") {
          assert.ok(!effect.chakraType || chakraTypes.includes(effect.chakraType));
        }
      }
    }
  }
});

test("skills cover the supported target categories", () => {
  const targetTypes = new Set(characters.flatMap((character) => character.skills.map((skill) => skill.targetType)));
  for (const type of ["self", "enemy", "ally", "enemies", "allies"]) {
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
      id: "chakra-stun",
      type: "stun",
      turns: 1,
      familiesAffected: ["chakra"]
    }]
  };

  assert.equal(isSkillStunned(member, { id: "rasengan", family: ["chakra", "instant"] }), true);
  assert.equal(isSkillStunned(member, { id: "shadow-clones", family: ["physical", "instant"] }), false);
  assert.equal(effectDescription({ type: "stun", value: 1, targets: "target", familiesAffected: ["physical", "instant"] }), "Aturde: 1 turno(s) (fisicas, instantaneas)");
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
  assert.equal(isSkillStunned(member, { id: "cats-blessing", family: ["chakra", "instant"] }), false);
  assert.equal(isSkillStunned(member, { id: "shadow-kick", family: ["physical", "instant"] }), true);
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

  assert.equal(isSkillStunned(member, { id: "rasengan", family: ["chakra", "instant"] }), true);
  assert.equal(isSkillStunned(member, { id: "shadow-clones", family: ["physical", "instant"] }), true);
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
  const kankurou = { id: "kankurou-member", hp: 100, statusEffects: [] };
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
        originActorId: "kankurou-member",
        effects: [{ type: "damage", value: 10, targets: "self", damageType: "affliction" }]
      }
    ]
  };
  const sourcePlayer = { id: "source", team: [kankurou] };
  const targetPlayer = { id: "target", team: [target] };
  const room = { players: [sourcePlayer, targetPlayer] };
  const sourceMember = sourcePlayer.team[0];
  const sourceOwner = sourceMember ? sourcePlayer : targetPlayer;
  const damageEffect = target.statusEffects[1].effects[0];

  assert.equal(canEffectAffectTarget(room, sourceOwner, target, damageEffect), false);
});

test("continuous damage triggers when the affected player turn starts", () => {
  const kankurouMember = { id: "kankurou", characterId: "kankurou", hp: 100, statusEffects: [], skillCooldowns: {} };
  const narutoMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", chakra: {}, queue: [], team: [kankurouMember] };
  const opponent = { id: "p2", name: "P2", chakra: {}, queue: [], team: [narutoMember] };
  const room = { players: [player, opponent], activePlayerId: "p1", phase: "battle", turn: 1, log: [] };

  applyQueuedSkill(room, player, {
    actorId: "kankurou",
    targetId: "naruto",
    skillId: "iron-puppet-barrage",
    actorName: "Kankurou",
    targetName: "Naruto Uzumaki",
    skillName: "Rafaga de marionetas de hierro"
  });

  assert.equal(narutoMember.hp, 100);
  resolveTurn(room, "p1");

  assert.equal(room.activePlayerId, "p2");
  assert.equal(narutoMember.hp, 90);
  assert.ok(room.log.some((entry) => String(entry).includes("Rafaga de marionetas de hierro hizo 10 dano continuo.")));
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

  assert.equal(isSkillStunned(member, { id: "uzumaki-resolve", family: ["mental", "instant"] }), true);
  assert.equal(isSkillStunned(member, { id: "rasengan", family: ["chakra", "instant"] }), false);
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

test("Kankurou Puppet Substitution is a secret outgoing counter trap", () => {
  const kankurou = getCharacterById("kankurou");
  const puppetSubstitution = kankurou.skills.find((skill) => skill.id === "puppet-substitution");

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
  const kankurouMember = { id: "kankurou", characterId: "kankurou", hp: 100, statusEffects: [], skillCooldowns: {} };
  const narutoMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", team: [kankurouMember] };
  const opponent = { id: "p2", name: "P2", team: [narutoMember] };
  const room = { players: [player, opponent], turn: 1 };

  const trapLog = applyQueuedSkill(room, player, {
    actorId: "kankurou",
    targetId: "naruto",
    skillId: "puppet-substitution",
    actorName: "Kankurou",
    targetName: "Naruto Uzumaki",
    skillName: "Jutsu de sustitucion de marionetas"
  });

  assert.deepEqual(trapLog.visibleTo, ["p1"]);
  assert.equal(narutoMember.statusEffects.length, 1);
  assert.equal(narutoMember.statusEffects[0].type, "counter");
  assert.equal(narutoMember.statusEffects[0].showStatusEffect, false);
  assert.equal(narutoMember.statusEffects[0].isSecret, true);

  const counteredLog = applyQueuedSkill(room, opponent, {
    actorId: "naruto",
    targetId: "kankurou",
    skillId: "rasengan",
    actorName: "Naruto Uzumaki",
    targetName: "Kankurou",
    skillName: "Rasengan"
  });

  assert.equal(counteredLog, "Naruto Uzumaki uso Rasengan, pero fue cancelada por un counter.");
  assert.equal(kankurouMember.hp, 100);
  assert.equal(narutoMember.skillCooldowns.rasengan, 1);
  assert.equal(narutoMember.statusEffects.some((effect) => effect.type === "counter"), false);
  assert.ok(narutoMember.statusEffects.some((effect) => (
    effect.type === "countered"
    && effect.turns === 1
    && effect.descriptions.includes("Kankurou de Jutsu de sustitucion de marionetas ha contrarrestado a este personaje.")
  )));
  assert.ok(kankurouMember.statusEffects.some((effect) => (
    effect.type === "secret-ended"
    && effect.sourceSkillId === "puppet-substitution"
    && effect.descriptions.includes("Jutsu de sustitucion de marionetas ha finalizado.")
  )));
});

test("Cacho Lariat cannot be countered by Puppet Substitution", () => {
  const kankurouMember = { id: "kankurou", characterId: "kankurou", hp: 100, statusEffects: [], skillCooldowns: {} };
  const cachoMember = { id: "cacho", characterId: "cacho", hp: 150, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", team: [kankurouMember] };
  const opponent = { id: "p2", name: "P2", team: [cachoMember] };
  const room = { players: [player, opponent], turn: 1 };
  const cacho = getCharacterById("cacho");
  const lariat = cacho.skills.find((skill) => skill.id === "cacho-lariat");

  assert.equal(lariat.uncountereable, true);

  applyQueuedSkill(room, player, {
    actorId: "kankurou",
    targetId: "cacho",
    skillId: "puppet-substitution",
    actorName: "Kankurou",
    targetName: "Cacho",
    skillName: "Jutsu de sustitucion de marionetas"
  });

  const lariatLog = applyQueuedSkill(room, opponent, {
    actorId: "cacho",
    targetId: "kankurou",
    skillId: "cacho-lariat",
    actorName: "Cacho",
    targetName: "Kankurou",
    skillName: "Lariat de Cacho"
  });

  assert.equal(lariatLog, "Cacho uso Lariat de Cacho e hizo 30 dano.");
  assert.equal(kankurouMember.hp, 70);
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
  const kankurouMember = { id: "kankurou", characterId: "kankurou", hp: 100, statusEffects: [], skillCooldowns: {} };
  const narutoMember = { id: "naruto", characterId: "naruto", hp: 100, statusEffects: [], skillCooldowns: {} };
  const player = { id: "p1", name: "P1", side: "red", ready: true, connected: true, chakra: {}, queue: [], team: [kankurouMember] };
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
    actorId: "kankurou",
    targetId: "naruto",
    skillId: "puppet-substitution",
    actorName: "Kankurou",
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
    && effect.descriptions.includes("Sharingan de Kakashi ha reflejado una habilidad sobre este personaje.")
  )));
  assert.ok(vulnerableAlly.statusEffects.some((effect) => (
    effect.type === "reflected"
    && effect.descriptions.includes("Sharingan de Kakashi ha reflejado una habilidad sobre este personaje.")
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
