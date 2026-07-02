export const substituteChakraCostEffect = {
  description: "Sobreescribe el coste de chakra de las habilidades del objetivo. chakra acepta verde, azul, rojo, blanco y negro con el nuevo coste final. skillIds permite limitarlo a habilidades especificas; si se omite, afecta a todas. El coste final nunca baja de 0.",
  fields: ["type", "chakra", "duration", "targets", "skillIds"]
};
