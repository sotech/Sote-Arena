import { addEffectToBaseEffect } from "./addEffectToBase.js";
import { addNonReflectableEffect } from "./addNonReflectable.js";
import { addUncountereableEffect } from "./addUncountereable.js";
import { allyCountStatusEffect } from "./allyCountStatus.js";
import { complexEffect } from "./complex.js";
import { counterEffect } from "./counter.js";
import { damageEffect } from "./damage.js";
import { damageReductionEffect } from "./damageReduction.js";
import { gainChakraEffect } from "./gainChakra.js";
import { healEffect } from "./heal.js";
import { instakillEffect } from "./instakill.js";
import { invulnerableEffect } from "./invulnerable.js";
import { modifyChakraCostEffect } from "./modifyChakraCost.js";
import { modifyDamageEffect } from "./modifyDamage.js";
import { modifyDamageByMissingHpEffect } from "./modifyDamageByMissingHp.js";
import { modifyDamageTypeEffect } from "./modifyDamageType.js";
import { modifyTargetCountEffect } from "./modifyTargetCount.js";
import { modifyTargetTypeEffect } from "./modifyTargetType.js";
import { reflectEffect } from "./reflect.js";
import { removeChakraEffect } from "./removeChakra.js";
import { replaceEffectsEffect } from "./replaceEffects.js";
import { replaceSkillEffect } from "./replaceSkill.js";
import { selfHealEffect } from "./selfHeal.js";
import { shieldEffect } from "./shield.js";
import { stunEffect } from "./stun.js";
import { substituteChakraCostEffect } from "./substituteChakraCost.js";

export const effectTypes = {
  damage: damageEffect,
  instakill: instakillEffect,
  heal: healEffect,
  "self-heal": selfHealEffect,
  shield: shieldEffect,
  "damage-reduction": damageReductionEffect,
  allyCountStatus: allyCountStatusEffect,
  modifyDamage: modifyDamageEffect,
  modifyDamageByMissingHp: modifyDamageByMissingHpEffect,
  modifyDamageType: modifyDamageTypeEffect,
  modifyTargetType: modifyTargetTypeEffect,
  modifyTargetCount: modifyTargetCountEffect,
  addEffectToBase: addEffectToBaseEffect,
  addUncountereable: addUncountereableEffect,
  addNonReflectable: addNonReflectableEffect,
  replaceEffects: replaceEffectsEffect,
  replaceSkill: replaceSkillEffect,
  modifyChakraCost: modifyChakraCostEffect,
  substituteChakraCost: substituteChakraCostEffect,
  stun: stunEffect,
  invulnerable: invulnerableEffect,
  counter: counterEffect,
  reflect: reflectEffect,
  "gain-chakra": gainChakraEffect,
  "remove-chakra": removeChakraEffect,
  complex: complexEffect
};
