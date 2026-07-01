const characterImages = import.meta.glob("../assets/characters/*.png", { eager: true, query: "?url", import: "default" });
const skillImages = import.meta.glob("../assets/skills/*.png", { eager: true, query: "?url", import: "default" });
const soundAssets = import.meta.glob("../assets/sounds/*.mp3", { eager: true, query: "?url", import: "default" });
const characterSoundAssets = import.meta.glob("../assets/character-sounds/*.mp3", { eager: true, query: "?url", import: "default" });
const bgmAssets = import.meta.glob("../assets/bgm/*.mp3", { eager: true, query: "?url", import: "default" });
const advantageBgmAssets = import.meta.glob("../assets/bgm-advantage/*.mp3", { eager: true, query: "?url", import: "default" });
const disadvantageBgmAssets = import.meta.glob("../assets/bgm-disadvantage/*.mp3", { eager: true, query: "?url", import: "default" });
const backgroundAssets = import.meta.glob("../assets/bgs/*.png", { eager: true, query: "?url", import: "default" });

export const backgroundImages = Object.values(backgroundAssets);

export const skullImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="10" fill="#111827"/>
    <path d="M40 12c-17 0-28 11-28 27 0 9 4 15 10 19v10h36V58c6-4 10-10 10-19 0-16-11-27-28-27Z" fill="#f8fafc"/>
    <circle cx="29" cy="39" r="7" fill="#111827"/>
    <circle cx="51" cy="39" r="7" fill="#111827"/>
    <path d="M40 44l-5 8h10l-5-8Z" fill="#111827"/>
    <path d="M28 61h24" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
  </svg>
`.replace(/\s+/g, " ").trim())}`;

export function characterImage(characterId) {
  return characterImages[`../assets/characters/${characterId}.png`] || fallbackCharacterImage(characterId);
}

export function skillImage(skillId) {
  return skillImages[`../assets/skills/${skillId}.png`] || fallbackSkillImage(skillId);
}

export const allAssetUrls = [
  ...Object.values(characterImages),
  ...Object.values(skillImages),
  ...Object.values(soundAssets),
  ...Object.values(characterSoundAssets),
  ...Object.values(bgmAssets),
  ...Object.values(advantageBgmAssets),
  ...Object.values(disadvantageBgmAssets),
  ...backgroundImages
];

export function characterSound(soundName) {
  return characterSoundAssets[`../assets/character-sounds/${soundName}.mp3`] || "";
}

function fallbackSkillImage(skillId) {
  const letter = (skillId || "?").slice(0, 1).toUpperCase();
  const hue = [...(skillId || "skill")].reduce((total, char) => total + char.charCodeAt(0), 0) % 360;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="10" fill="hsl(${hue}, 70%, 35%)"/>
      <circle cx="40" cy="40" r="24" fill="rgba(255,255,255,.9)"/>
      <text x="40" y="49" text-anchor="middle" font-family="Arial, sans-serif" font-size="28" font-weight="900" fill="hsl(${hue}, 70%, 30%)">${letter}</text>
    </svg>
  `.replace(/\s+/g, " ").trim())}`;
}

function fallbackCharacterImage(characterId) {
  const letter = (characterId || "?").slice(0, 1).toUpperCase();
  const hue = [...(characterId || "character")].reduce((total, char) => total + char.charCodeAt(0), 0) % 360;
  return `data:image/svg+xml;utf8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
      <rect width="80" height="80" rx="10" fill="hsl(${hue}, 65%, 28%)"/>
      <circle cx="40" cy="31" r="17" fill="rgba(255,255,255,.88)"/>
      <path d="M17 75c4-19 17-29 23-29s19 10 23 29H17Z" fill="rgba(255,255,255,.88)"/>
      <text x="40" y="41" text-anchor="middle" font-family="Arial, sans-serif" font-size="22" font-weight="900" fill="hsl(${hue}, 65%, 26%)">${letter}</text>
    </svg>
  `.replace(/\s+/g, " ").trim())}`;
}
