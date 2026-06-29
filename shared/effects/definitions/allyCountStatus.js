export const allyCountStatusEffect = {
  description: "Aplica escudo y/o reduccion de dano segun la cantidad de aliados vivos del lanzador. excludeSelf evita contar al lanzador. maxShield limita el escudo total y maxShieldPerAlly limita el escudo por aliado vivo.",
  fields: ["type", "duration", "targets", "excludeSelf", "damageReductionPerAlly", "shieldPerAlly", "maxShieldPerAlly", "maxShield"]
};
