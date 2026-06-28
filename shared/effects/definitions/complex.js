export const complexEffect = {
  description: "Crea un statusEffect duracional que aplica efectos simples mientras dure. duration -1 es indefinido. mode cancelOnStun o pauseOnStun controla interrupciones. activationDelayTurns retrasa la primera aplicacion. cancelIfOriginStunned cancela el estado si el lanzador original esta aturdido. statusLinkId vincula estados relacionados para eliminarlos juntos. suppressSecretEndNotice evita mostrar el aviso de finalizacion de secretos.",
  fields: ["type", "duration", "targets", "effects", "mode", "interruptFamilies", "activationDelayTurns", "cancelIfOriginStunned", "statusLinkId", "suppressSecretEndNotice", "showStatusEffect"]
};
