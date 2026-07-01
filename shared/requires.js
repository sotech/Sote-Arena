export const requireScopes = ["self", "target", "anyTarget", "anyAlly", "otherAlly", "anyEnemy"];
export const requireTypes = ["hasStatusEffect", "hasSkill", "hasMinHp", "hasMaxHp", "hp", "characterId"];

export function normalizeRequireScope(scope = "self") {
  const value = String(scope || "self").toLowerCase();
  if (value === "target" || value === "objective") return "target";
  if (value === "anytarget" || value === "targets") return "anyTarget";
  if (value === "anyally" || value === "ally") return "anyAlly";
  if (value === "otherally" || value === "otroaliado") return "otherAlly";
  if (value === "anyenemy" || value === "enemy") return "anyEnemy";
  return "self";
}

export function normalizeRequireType(type = "") {
  const value = String(type || "").toLowerCase();
  if (value === "hasstatuseffect" || value === "hasstatus" || value === "poseeciertoefecto") return "hasStatusEffect";
  if (value === "hasskill" || value === "hashabilidad" || value === "poseehabilidad") return "hasSkill";
  if (value === "hasminhp" || value === "minhp" || value === "hpminima") return "hasMinHp";
  if (value === "hasmaxhp" || value === "maxhp" || value === "hpmaxima") return "hasMaxHp";
  if (value === "characterid" || value === "character" || value === "personaje") return "characterId";
  if (value === "hp" || value === "health" || value === "vida") return "hp";
  return type;
}

export function normalizeHpOperator(operator = "gte") {
  const value = String(operator || "gte").toLowerCase();
  if (["=", "==", "eq", "equal", "igual"].includes(value)) return "eq";
  if ([">=", "gte", "min", "minimum", "igualomayor"].includes(value)) return "gte";
  if (["<=", "lte", "max", "maximum", "igualomenor"].includes(value)) return "lte";
  if ([">", "gt", "mayor"].includes(value)) return "gt";
  if (["<", "lt", "menor"].includes(value)) return "lt";
  if (["!=", "<>", "ne", "neq", "distinta", "distinto"].includes(value)) return "ne";
  return "gte";
}

export function compareHp(hp, operator, value) {
  const currentHp = Number(hp || 0);
  const expectedHp = Number(value || 0);
  const normalizedOperator = normalizeHpOperator(operator);
  if (normalizedOperator === "eq") return currentHp === expectedHp;
  if (normalizedOperator === "gte") return currentHp >= expectedHp;
  if (normalizedOperator === "lte") return currentHp <= expectedHp;
  if (normalizedOperator === "gt") return currentHp > expectedHp;
  if (normalizedOperator === "lt") return currentHp < expectedHp;
  if (normalizedOperator === "ne") return currentHp !== expectedHp;
  return false;
}
