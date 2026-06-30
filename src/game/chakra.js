export const chakraTypes = [
  { id: "taijutsu", label: "Fisico", shortLabel: "Fis", className: "tai" },
  { id: "ninjutsu", label: "Energetico", shortLabel: "Ene", className: "nin" },
  { id: "bloodline", label: "Especial", shortLabel: "Esp", className: "blood" },
  { id: "genjutsu", label: "Mental", shortLabel: "Men", className: "gen" }
];

export function emptyChakra() {
  return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
}

export function totalChakra(chakra = {}) {
  return chakraTypes.reduce((total, type) => total + (chakra?.[type.id] || 0), 0);
}

export function neutralChakraCost(chakra = {}) {
  return Math.max(0, Number(chakra?.neutralChakra || 0));
}

export function specificChakraCost(chakra = {}) {
  return chakraTypes.reduce((cost, type) => {
    cost[type.id] = Math.max(0, Number(chakra?.[type.id] || 0));
    return cost;
  }, emptyChakra());
}

export function canPayChakra(available = {}, cost = {}) {
  return chakraTypes.every((type) => (available?.[type.id] || 0) >= (cost?.[type.id] || 0));
}

export function canPaySkillChakra(available = {}, cost = {}, reservedNeutral = 0) {
  const specificCost = specificChakraCost(cost);
  return canPayChakra(available, specificCost) && totalChakra(available) >= reservedNeutral + totalChakra(specificCost) + neutralChakraCost(cost);
}
