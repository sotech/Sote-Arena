export const chakraTypes = [
  { id: "verde", label: "Verde", shortLabel: "", className: "tai" },
  { id: "azul", label: "Azul", shortLabel: "", className: "nin" },
  { id: "rojo", label: "Rojo", shortLabel: "", className: "blood" },
  { id: "blanco", label: "Blanco", shortLabel: "", className: "gen" }
];

export function emptyChakra() {
  return { verde: 0, azul: 0, rojo: 0, blanco: 0 };
}

export function totalChakra(chakra = {}) {
  return chakraTypes.reduce((total, type) => total + (chakra?.[type.id] || 0), 0);
}

export function negroCost(chakra = {}) {
  return Math.max(0, Number(chakra?.negro || 0));
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
  return canPayChakra(available, specificCost) && totalChakra(available) >= reservedNeutral + totalChakra(specificCost) + negroCost(cost);
}
