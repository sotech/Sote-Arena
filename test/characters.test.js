import test from "node:test";
import assert from "node:assert/strict";
import { characters, getCharacterById } from "../shared/characters.js";
import { naruto } from "../shared/characters/naruto/index.js";
import { effectTypes, supportedEffectTypes } from "../shared/effects.js";

test("catalog exposes exactly six playable characters", () => {
  assert.equal(characters.length, 6);
  assert.equal(new Set(characters.map((character) => character.id)).size, 6);
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
    assert.equal(lastSkill.id, "substitution-jutsu");
    assert.equal(lastSkill.name, "Jutsu de sustitucion");
    assert.equal(lastSkill.targetType, "self");
    assert.deepEqual(lastSkill.effects, [{ type: "invulnerable", value: 1, targets: "self" }]);
  }
});

test("skill descriptions expose their gameplay values", () => {
  for (const character of characters) {
    for (const skill of character.skills) {
      const values = skill.effects.map((effect) => effect.value).filter(Boolean);
      assert.ok(values.length > 0);
      assert.ok(values.every((value) => skill.description.includes(String(value))));
    }
  }
});

test("skill effects use the documented effect system", () => {
  assert.deepEqual(Object.keys(effectTypes), supportedEffectTypes);
  for (const character of characters) {
    for (const skill of character.skills) {
      for (const effect of skill.effects) {
        assert.ok(supportedEffectTypes.includes(effect.type));
        assert.ok(effect.value > 0);
        assert.ok(effect.targets);
        if (effect.type === "leech") assert.ok(effect.heal > 0);
      }
    }
  }
});

test("skills cover the supported target categories", () => {
  const targetTypes = new Set(characters.flatMap((character) => character.skills.map((skill) => skill.targetType)));
  for (const type of ["self", "enemy", "ally", "enemies", "allies", "allPlayers"]) {
    assert.ok(targetTypes.has(type));
  }
});

test("character lookup returns the requested character", () => {
  assert.equal(getCharacterById("naruto").name, "Naruto Uzumaki");
  assert.equal(getCharacterById("missing"), undefined);
});
