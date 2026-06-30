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
