export const complexEffect = {
  description: "Crea un statusEffect duracional que aplica efectos simples mientras dure. duration -1 es indefinido. mode cancelOnStun o pauseOnStun controla interrupciones.",
  fields: ["type", "duration", "targets", "effects", "mode", "interruptFamilies", "showStatusEffect"]
};
