const skillFamilyLabels = {
  physical: "fisicas",
  chakra: "energia",
  mental: "mental",
  special: "especiales",
  channeled: "canalizadas",
  defensive: "defensivas",
  offensive: "ofensivas",
  strategic: "estrategicas",
  instant: "instantaneas"
};

const skillClassLabels = {
  physical: "fisica",
  chakra: "energia",
  mental: "mental",
  special: "especial",
  channeled: "canalizada",
  defensive: "defensiva",
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
