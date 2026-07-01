import { addEffectToBaseEffect } from "./addEffectToBase.js";
import { addNonReflectableEffect } from "./addNonReflectable.js";
import { addUncountereableEffect } from "./addUncountereable.js";
import { applyEffectsOntriggerEventEffect } from "./applyEffectsOntriggerEvent.js";
import { allyCountStatusEffect } from "./allyCountStatus.js";
import { breakShieldEffect } from "./breakShield.js";
import { changeAvatarImageEffect } from "./changeAvatarImage.js";
import { complexEffect } from "./complex.js";
import { conditionalEffectsEffect } from "./conditionalEffects.js";
import { counterEffect } from "./counter.js";
import { damageEffect } from "./damage.js";
import { damageReductionEffect } from "./damageReduction.js";
import { effectImmunityEffect } from "./effectImmunity.js";
import { gainChakraEffect } from "./gainChakra.js";
import { healEffect } from "./heal.js";
import { ignoreEffectsEffect } from "./ignoreEffects.js";
import { instakillEffect } from "./instakill.js";
import { invulnerableEffect } from "./invulnerable.js";
import { modifyChakraCostEffect } from "./modifyChakraCost.js";
import { modifyDamageEffect } from "./modifyDamage.js";
import { modifyDamageByMissingHpEffect } from "./modifyDamageByMissingHp.js";
import { modifyDamageMultiplierEffect } from "./modifyDamageMultiplier.js";
import { modifyDamageTypeEffect } from "./modifyDamageType.js";
import { modifyTargetCountEffect } from "./modifyTargetCount.js";
import { modifyTargetTypeEffect } from "./modifyTargetType.js";
import { onEnemyDeathEffect } from "./onEnemyDeath.js";
import { payLifeEffect } from "./payLife.js";
import { reflectEffect } from "./reflect.js";
import { removeChakraEffect } from "./removeChakra.js";
import { removeStatusEffect } from "./removeStatus.js";
import { replaceEffectsEffect } from "./replaceEffects.js";
import { replaceSkillEffect } from "./replaceSkill.js";
import { reviveOnDeathEffect } from "./reviveOnDeath.js";
import { selfHealEffect } from "./selfHeal.js";
import { shieldEffect } from "./shield.js";
import { shieldDamageEffect } from "./shieldDamage.js";
import { spikeEffect } from "./spike.js";
import { stunEffect } from "./stun.js";
import { stunImmunityEffect } from "./stunImmunity.js";
import { substituteChakraCostEffect } from "./substituteChakraCost.js";
import { triggerSkillsEffect } from "./triggerSkills.js";

export const effectTypes = {
  damage: damageEffect,
  instakill: instakillEffect,
  heal: healEffect,
  "self-heal": selfHealEffect,
  payLife: payLifeEffect,
  breakShield: breakShieldEffect,
  shieldDamage: shieldDamageEffect,
  shield: shieldEffect,
  spike: spikeEffect,
  changeAvatarImage: changeAvatarImageEffect,
  "damage-reduction": damageReductionEffect,
  "effect-immunity": effectImmunityEffect,
  ignoreEffects: ignoreEffectsEffect,
  stunImmunity: stunImmunityEffect,
  allyCountStatus: allyCountStatusEffect,
  modifyDamage: modifyDamageEffect,
  modifyDamageByMissingHp: modifyDamageByMissingHpEffect,
  modifyDamageMultiplier: modifyDamageMultiplierEffect,
  modifyDamageType: modifyDamageTypeEffect,
  modifyTargetType: modifyTargetTypeEffect,
  modifyTargetCount: modifyTargetCountEffect,
  addEffectToBase: addEffectToBaseEffect,
  addUncountereable: addUncountereableEffect,
  applyEffectsOntriggerEvent: applyEffectsOntriggerEventEffect,
  addNonReflectable: addNonReflectableEffect,
  replaceEffects: replaceEffectsEffect,
  replaceSkill: replaceSkillEffect,
  removeStatus: removeStatusEffect,
  conditionalEffects: conditionalEffectsEffect,
  onEnemyDeath: onEnemyDeathEffect,
  triggerSkills: triggerSkillsEffect,
  modifyChakraCost: modifyChakraCostEffect,
  substituteChakraCost: substituteChakraCostEffect,
  stun: stunEffect,
  invulnerable: invulnerableEffect,
  counter: counterEffect,
  reflect: reflectEffect,
  reviveOnDeath: reviveOnDeathEffect,
  "gain-chakra": gainChakraEffect,
  "remove-chakra": removeChakraEffect,
  complex: complexEffect
};
