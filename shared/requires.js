export const requireScopes = ["self", "anyAlly", "anyEnemy"];
export const requireTypes = ["hasStatusEffect", "hasMinHp", "hasMaxHp"];

export function normalizeRequireScope(scope = "self") {
  const value = String(scope || "self").toLowerCase();
  if (value === "anyally" || value === "ally") return "anyAlly";
  if (value === "anyenemy" || value === "enemy") return "anyEnemy";
  return "self";
}

export function normalizeRequireType(type = "") {
  const value = String(type || "").toLowerCase();
  if (value === "hasstatuseffect" || value === "hasstatus" || value === "poseeciertoefecto") return "hasStatusEffect";
  if (value === "hasminhp" || value === "minhp" || value === "hpminima") return "hasMinHp";
  if (value === "hasmaxhp" || value === "maxhp" || value === "hpmaxima") return "hasMaxHp";
  return type;
}
