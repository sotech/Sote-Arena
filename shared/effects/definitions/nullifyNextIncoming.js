export const nullifyNextIncomingEffect = {
  description: "Estado que anula habilidades entrantes por turno. familiesAffected limita por familias. excludedDamageTypes evita anular habilidades cuyo dano sea de esos tipos. chargesPerTurn define cuantas anulaciones se recargan cada turno.",
  fields: ["type", "duration", "targets", "familiesAffected", "excludedDamageTypes", "chargesPerTurn", "charges", "showStatusEffect"]
};
