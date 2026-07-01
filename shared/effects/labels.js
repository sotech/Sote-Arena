const skillFamilyLabels = {
  physical: "fisicas",
  special: "especiales",
  mental: "mental",
  channeled: "canalizadas",
  offensive: "ofensivas",
  strategic: "estrategicas",
  instant: "instantaneas"
};

const skillClassLabels = {
  physical: "fisica",
  special: "especial",
  mental: "mental",
  channeled: "canalizada",
  offensive: "ofensiva",
  strategic: "estrategica",
  instant: "instantanea"
};

const stunTypeFamilies = ["physical", "special", "mental"];

export function skillFamilyLabel(family) {
  return skillFamilyLabels[family] || family;
}

export function skillFamiliesLabel(families = []) {
  return families.map(skillFamilyLabel).join(", ");
}

export function skillClassLabel(family) {
  return skillClassLabels[family] || family;
}

export function skillClassesLabel(families = []) {
  return families.map(skillClassLabel).join(", ");
}

function joinSpanishList(items = []) {
  if (items.length <= 1) return items.join("");
  if (items.length === 2) return `${items[0]} ni ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} ni ${items.at(-1)}`;
}

function stunExcludedFamilyLabel(family) {
  if (family === "mental") return "de tipo mental";
  return skillFamilyLabel(family);
}

export function stunScopeLabel(families = []) {
  const affectedFamilies = Array.isArray(families) ? families : [];
  if (affectedFamilies.length === 0) return "Aturde todas las habilidades.";

  const affectedTypes = affectedFamilies.filter((family) => stunTypeFamilies.includes(family));
  const unaffectedTypes = stunTypeFamilies.filter((family) => !affectedTypes.includes(family));
  const affectedScope = skillFamiliesLabel(affectedFamilies);

  if (affectedTypes.length > 0 && unaffectedTypes.length > 0) {
    return `Aturde habilidades ${affectedScope}. No aturde habilidades ${joinSpanishList(unaffectedTypes.map(stunExcludedFamilyLabel))}.`;
  }

  return `Aturde habilidades ${affectedScope}.`;
}
