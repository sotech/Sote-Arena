const skillFamilyLabels = {
  physical: "fisicas",
  chakra: "chakra",
  mental: "mental",
  instant: "instantaneas"
};

const skillClassLabels = {
  physical: "fisica",
  chakra: "chakra",
  mental: "mental",
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
