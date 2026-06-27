export const modifyTargetCountEffect = {
  description: "Limita la cantidad de objetivos resueltos por una habilidad. count indica cuantos quedan; random true elige esos objetivos al azar. skillIds permite limitar el modificador.",
  fields: ["type", "count", "random", "duration", "targets", "skillIds"]
};
