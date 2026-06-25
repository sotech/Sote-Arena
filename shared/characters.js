import { naruto } from "./characters/naruto/index.js";
import { sasuke } from "./characters/sasuke/index.js";
import { sakura } from "./characters/sakura/index.js";
import { kakashi } from "./characters/kakashi/index.js";
import { hinata } from "./characters/hinata/index.js";
import { gaara } from "./characters/gaara/index.js";
import { kankurou } from "./characters/kankurou/index.js";

function withSkillDefaults(character) {
  return {
    ...character,
    skills: character.skills.map((skill) => ({ cooldown: 0, ...skill }))
  };
}

export const characters = [naruto, sasuke, sakura, kakashi, hinata, gaara, kankurou].map(withSkillDefaults);

export function getCharacterById(id) {
  return characters.find((character) => character.id === id);
}
