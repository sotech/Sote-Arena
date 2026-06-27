export const addEffectToBaseEffect = {
  description: "Agrega efectos adicionales a las habilidades del objetivo durante una duracion en turnos. effects contiene los efectos a agregar. skillIds permite limitarlo a habilidades especificas; si se omite, afecta a todas.",
  fields: ["type", "duration", "targets", "skillIds", "effects"]
};
