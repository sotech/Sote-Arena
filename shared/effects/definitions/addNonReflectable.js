export const addNonReflectableEffect = {
  description: "Hace que las habilidades indicadas del objetivo no puedan ser reflejadas durante una duracion en turnos. skillIds permite limitarlo a habilidades especificas; si se omite, afecta a todas.",
  fields: ["type", "duration", "targets", "skillIds"]
};
