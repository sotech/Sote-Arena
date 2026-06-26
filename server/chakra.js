export const CHAKRA_TYPES = ["taijutsu", "ninjutsu", "bloodline", "genjutsu"];
export const NEUTRAL_CHAKRA = "neutralChakra";

export function emptyChakra() {
  return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
}

export function cloneChakra(chakra) {
  return { ...emptyChakra(), ...chakra };
}

export function totalChakra(chakra) {
  return CHAKRA_TYPES.reduce((total, type) => total + (chakra?.[type] || 0), 0);
}

export function cleanChakraSelection(chakra = {}) {
  return CHAKRA_TYPES.reduce((selection, type) => {
    const amount = Number(chakra[type] || 0);
    selection[type] = Number.isInteger(amount) && amount > 0 ? amount : 0;
    return selection;
  }, emptyChakra());
}

export function chakraLabel(cost) {
  return Object.entries(cost)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => `${amount} ${type === NEUTRAL_CHAKRA ? "neutral" : type}`)
    .join(", ");
}

export function canPay(chakra, cost) {
  return CHAKRA_TYPES.every((type) => (chakra?.[type] || 0) >= (cost?.[type] || 0));
}

export function specificChakraCost(cost = {}) {
  return CHAKRA_TYPES.reduce((specific, type) => {
    specific[type] = Math.max(0, Number(cost[type] || 0));
    return specific;
  }, emptyChakra());
}

export function neutralChakraCost(cost = {}) {
  return Math.max(0, Number(cost[NEUTRAL_CHAKRA] || 0));
}

export function requiredChakraTotal(cost = {}) {
  return totalChakra(specificChakraCost(cost)) + neutralChakraCost(cost);
}

export function queuedNeutralChakraCost(player) {
  return (player?.queue || []).reduce((total, action) => total + neutralChakraCost(action.chakra), 0);
}

export function canPaySkillCost(chakra, cost = {}, reservedNeutral = 0) {
  return canPay(chakra, specificChakraCost(cost)) && totalChakra(chakra) >= reservedNeutral + requiredChakraTotal(cost);
}

export function payChakra(player, cost) {
  for (const type of CHAKRA_TYPES) {
    const amount = Math.max(0, Number(cost?.[type] || 0));
    player.chakra[type] = Math.max(0, (player.chakra[type] || 0) - amount);
  }
}

export function refundChakra(player, cost) {
  for (const type of CHAKRA_TYPES) {
    const amount = Math.max(0, Number(cost?.[type] || 0));
    player.chakra[type] = (player.chakra[type] || 0) + amount;
  }
}

export function grantPlayerRandomChakra(player) {
  const type = CHAKRA_TYPES[Math.floor(Math.random() * CHAKRA_TYPES.length)];
  player.chakra[type] = (player.chakra[type] || 0) + 1;
}

export function randomAvailableChakraType(chakra) {
  const availableTypes = CHAKRA_TYPES.filter((type) => (chakra?.[type] || 0) > 0);
  if (!availableTypes.length) return null;
  return availableTypes[Math.floor(Math.random() * availableTypes.length)];
}

export function applyChakraGain(player, amount, chakraType) {
  const gained = emptyChakra();
  for (let i = 0; i < amount; i += 1) {
    const type = CHAKRA_TYPES.includes(chakraType)
      ? chakraType
      : CHAKRA_TYPES[Math.floor(Math.random() * CHAKRA_TYPES.length)];
    player.chakra[type] = (player.chakra[type] || 0) + 1;
    gained[type] += 1;
  }
  return gained;
}

export function applyChakraRemoval(player, amount, chakraType) {
  const removed = emptyChakra();
  for (let i = 0; i < amount; i += 1) {
    const type = CHAKRA_TYPES.includes(chakraType) ? chakraType : randomAvailableChakraType(player.chakra);
    if (!type || (player.chakra[type] || 0) <= 0) break;
    player.chakra[type] -= 1;
    removed[type] += 1;
  }
  return removed;
}

export function grantTurnChakra(player, setAmount) {
  if (setAmount) {
    grantPlayerRandomChakra(player);
    return;
  }

  const aliveCount = player.team.filter((member) => member.hp > 0).length;
  for (let i = 0; i < aliveCount; i += 1) {
    grantPlayerRandomChakra(player);
  }
}
