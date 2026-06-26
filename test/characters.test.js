import test from "node:test";
import assert from "node:assert/strict";
import { characters, getCharacterById, getSkillNameById } from "../shared/characters.js";
import { naruto } from "../shared/characters/naruto/index.js";
import { effectTypes, supportedEffectTypes } from "../shared/effects.js";
import { addStatus, damageBuffValue } from "../server/index.js";
import { modifiedSkillChakraCost } from "../shared/chakraCostModifiers.js";
import { effectDescription, groupStatusEffects, statusEffectGroupValue } from "../src/game/labels.js";

const chakraTypes = ["taijutsu", "ninjutsu", "bloodline", "genjutsu"];

test("catalog exposes exactly seven playable characters", () => {
  assert.equal(characters.length, 7);
  assert.equal(new Set(characters.map((character) => character.id)).size, 7);
});

test("characters can be imported from individual folders", () => {
  assert.equal(naruto.id, "naruto");
  assert.equal(naruto.skills.length, 4);
});

test("every character can fight with four configured skills", () => {
  for (const character of characters) {
    assert.equal(character.maxHp, 100);
    assert.equal(character.skills.length, 4);
    assert.ok(character.skills.every((skill) => Object.values(skill.chakra).some((amount) => amount > 0)));
    assert.ok(character.skills.every((skill) => Array.isArray(skill.effects) && skill.effects.length > 0));
  }
});

test("every character has substitution jutsu as the final skill", () => {
  for (const character of characters) {
    const lastSkill = character.skills.at(-1);
    assert.match(lastSkill.id, /substitution/);
    assert.match(lastSkill.name, /sustitucion/i);
    assert.equal(lastSkill.targetType, "self");
    assert.equal(lastSkill.cooldown, 4);
    assert.equal(lastSkill.effects.length, 1);
    assert.equal(lastSkill.effects[0].type, "complex");
    assert.equal(lastSkill.effects[0].duration, 1);
    assert.deepEqual(lastSkill.effects[0].effects, [{ type: "invulnerable", value: 1, targets: "self" }]);
  }
});

test("skill descriptions expose their gameplay values", () => {
  for (const character of characters) {
    for (const skill of character.skills) {
      const visibleEffects = skill.effects.flatMap((effect) => [effect, ...(effect.effects || [])])
        .filter((effect) => effect.type !== "gain-chakra" && effect.type !== "remove-chakra");
      const values = visibleEffects.map((effect) => effect.value).filter(Boolean);
      assert.ok(values.length > 0);
      assert.ok(values.every((value) => skill.description.includes(String(value))));
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
        } else if (effect.type === "modifyDamage") {
          assert.notEqual(effect.value, 0);
        } else if (effect.type === "modifyChakraCost" || effect.type === "substituteChakraCost") {
          assert.ok(effect.chakra && Object.values(effect.chakra).some((value) => Number(value || 0) !== 0));
        } else {
          assert.ok(effect.value > 0);
        }
        assert.ok(effect.targets);
        if (effect.type === "damage") assert.ok(!effect.damageType || ["basic", "piercing", "affliction"].includes(effect.damageType));
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
