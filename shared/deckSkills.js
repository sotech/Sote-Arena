function uniqueSkillIds(skillIds) {
  return [...new Set((Array.isArray(skillIds) ? skillIds : []).filter(Boolean))];
}

function skillIsReady(skillId, cooldowns) {
  return Math.max(0, Number(cooldowns?.[skillId] || 0)) <= 0;
}

export function chooseDeckSkillIds({ deckSkillIds, count, cooldowns = {}, avoidCooldown = true, avoidSkillIds = [], rng = Math.random }) {
  const deck = uniqueSkillIds(deckSkillIds);
  const desiredCount = Math.max(0, Math.min(Number(count || 0), deck.length));
  const avoided = new Set(uniqueSkillIds(avoidSkillIds));
  const chosen = [];

  while (chosen.length < desiredCount) {
    const remainingDeck = deck.filter((skillId) => !chosen.includes(skillId));
    if (remainingDeck.length === 0) break;

    const remainingCount = desiredCount - chosen.length;
    const readyDeck = remainingDeck.filter((skillId) => skillIsReady(skillId, cooldowns));
    const cooldownPool = avoidCooldown && readyDeck.length >= remainingCount ? readyDeck : remainingDeck;
    const freshPool = cooldownPool.filter((skillId) => !avoided.has(skillId));
    const pool = freshPool.length >= remainingCount ? freshPool : cooldownPool;
    const index = Math.floor(rng() * pool.length);
    chosen.push(pool[index]);
  }

  return chosen;
}
