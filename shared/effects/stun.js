export function stunFamiliesAffected(effect) {
  if (Array.isArray(effect?.familiesAffected)) return effect.familiesAffected;
  if (Array.isArray(effect?.skillFamilies)) return effect.skillFamilies;
  return [];
}
