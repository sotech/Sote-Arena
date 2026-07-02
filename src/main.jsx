import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { ArrowDown, ArrowLeftRight, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, Copy, LoaderCircle, Minus, Monitor, Plus, RefreshCw, RotateCcw, Search, Smartphone, Swords, Users, Shield, HeartPulse, X, Zap } from "lucide-react";
import messageSound from "./assets/sounds/message.mp3";
import ninjaSound from "./assets/sounds/ninja.mp3";
import notifierSound from "./assets/sounds/notifier.mp3";
import deathSound from "./assets/sounds/death.mp3";
import logoUrl from "./assets/logos/logo.png";
import { ChakraCost, ChakraIcon, ChakraPool, Health, SquareImage } from "./components/common.jsx";
import { ChatPanel, CollapsiblePanel } from "./components/ChatPanel.jsx";
import { MainMenu } from "./components/MainMenu.jsx";
import { OptionsModal, ResultModal } from "./components/Overlays.jsx";
import { PatchNotesView } from "./components/PatchNotesView.jsx";
import { StatusEffects } from "./components/StatusEffects.jsx";
import { allAssetUrls, backgroundImages, characterImage, characterSound, skillImage, skullImage } from "./game/assets.js";
import { canPaySkillChakra, chakraTypes, emptyChakra, negroCost, totalChakra } from "./game/chakra.js";
import { eligibleTargetsForSkill, hasStatus, isQueuedActor, isQueuedSkill, isSkillOutOfUses, isSkillStunned, meetsSkillRequirements, playerHealthShare, skillCooldownFor } from "./game/battleRules.js";
import { groupStatusEffects, targetTypeLabel } from "./game/labels.js";
import { modifiedSkillChakraCost } from "../shared/chakraCostModifiers.js";
import { skillClassesLabel } from "../shared/effects.js";
import { actionSkillsForMember, activeSkillsForMember, chakraUsageSkillsForCharacter, inspectableSkillsForCharacter } from "../shared/skillReplacements.js";
import {
  ADVANTAGE_HEALTH_SHARE,
  AUDIO_FADE_MS,
  BALANCE_TEST_FIGHT_COUNT,
  BGM_FADE_MS,
  BGM_VOLUME_RATIO,
  DEATH_AUDIO_FADE_MS,
  DEFAULT_BALANCE_SORT,
  GAME_VERSION,
  MESSAGE_SOUND_END_TIME,
  MESSAGE_SOUND_START_TIME,
  NOTIFIER_END_TIME,
  NOTIFIER_START_TIME,
  PATCH_NOTES_SEEN_KEY,
  RESULT_AUDIO_FADE_MS,
  SOCKET_PATH,
  SOCKET_URL
} from "./config.js";
import "./styles.css";

const socket = io(SOCKET_URL, { path: SOCKET_PATH });
const bgmTracks = Object.values(import.meta.glob("./assets/bgm/*.mp3", { eager: true, query: "?url", import: "default" }));
const advantageBgmTracks = Object.values(import.meta.glob("./assets/bgm-advantage/*.mp3", { eager: true, query: "?url", import: "default" }));
const disadvantageBgmTracks = Object.values(import.meta.glob("./assets/bgm-disadvantage/*.mp3", { eager: true, query: "?url", import: "default" }));

function randomBackground(exclude = "") {
  const candidates = backgroundImages.filter((url) => url && url !== exclude);
  const pool = candidates.length > 0 ? candidates : backgroundImages;
  return pool[Math.floor(Math.random() * pool.length)] || "";
}

function RotatingBackground() {
  const [backgroundState, setBackgroundState] = useState(() => ({
    activeLayer: 0,
    layers: [randomBackground(), ""]
  }));

  useEffect(() => {
    if (backgroundImages.length <= 1) return;
    const interval = window.setInterval(() => {
      setBackgroundState((current) => {
        const activeImage = current.layers[current.activeLayer];
        const nextLayer = current.activeLayer === 0 ? 1 : 0;
        const nextLayers = [...current.layers];
        nextLayers[nextLayer] = randomBackground(activeImage);
        return { activeLayer: nextLayer, layers: nextLayers };
      });
    }, 60000);
    return () => window.clearInterval(interval);
  }, []);

  if (backgroundImages.length === 0) return null;

  return (
    <div className="app-background" aria-hidden="true">
      {backgroundState.layers.map((image, index) => (
        <span
          key={index}
          className={`app-background-layer ${backgroundState.activeLayer === index ? "active" : ""}`}
          style={image ? { backgroundImage: `url(${image})` } : undefined}
        />
      ))}
    </div>
  );
}

function App() {
  const [characters, setCharacters] = useState([]);
  const [room, setRoom] = useState(null);
  const [homeView, setHomeView] = useState("menu");
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selected, setSelected] = useState([]);
  const [actorId, setActorId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [assetProgress, setAssetProgress] = useState({ loaded: 0, total: 0, done: false });
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const [mobilePreview, setMobilePreview] = useState(false);
  const [patchNotesPopupOpen, setPatchNotesPopupOpen] = useState(false);
  const [balanceTestLoading, setBalanceTestLoading] = useState(false);
  const [balanceTestResult, setBalanceTestResult] = useState(null);
  const turnAudioRef = useRef(null);
  const messageAudioRef = useRef(null);
  const resultAudioRef = useRef(null);
  const deathAudioRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const audioFadeFrameRef = useRef(0);
  const audioFadeOutTimeoutRef = useRef(null);
  const audioStopTimeoutRef = useRef(null);
  const messageStopTimeoutRef = useRef(null);
  const resultFadeFrameRef = useRef(0);
  const resultFadeOutTimeoutRef = useRef(null);
  const resultStopTimeoutRef = useRef(null);
  const deathFadeFrameRef = useRef(0);
  const deathFadeOutTimeoutRef = useRef(null);
  const deathStopTimeoutRef = useRef(null);
  const bgmFadeFrameRef = useRef(0);
  const bgmLoopFrameRef = useRef(0);
  const bgmBaseTrackRef = useRef("");
  const bgmCurrentTrackRef = useRef("");
  const bgmCurrentStateRef = useRef("idle");
  const bgmBattleKeyRef = useRef("");
  const playerBattleStateRef = useRef(new Map());
  const lastResultAudioKeyRef = useRef("");
  const lastChatRoomRef = useRef("");
  const lastChatMessageRef = useRef("");
  const lastNotifiedTurnRef = useRef("");
  const lastHpByMemberRef = useRef(new Map());

  useEffect(() => {
    socket.on("characters", setCharacters);
    socket.on("room:update", setRoom);
    return () => {
      socket.off("characters", setCharacters);
      socket.off("room:update", setRoom);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(PATCH_NOTES_SEEN_KEY) === "true") return;
    setPatchNotesPopupOpen(true);
  }, []);

  useEffect(() => {
    const urls = [...new Set(allAssetUrls.filter(Boolean))];
    let cancelled = false;
    setAssetProgress({ loaded: 0, total: urls.length, done: urls.length === 0 });

    async function preload(url) {
      try {
        const response = await fetch(url, { cache: "force-cache" });
        if (response.ok) await response.blob();
      } catch {
        await new Promise((resolve) => {
          const image = new Image();
          image.onload = resolve;
          image.onerror = resolve;
          image.src = url;
        });
      } finally {
        if (!cancelled) {
          setAssetProgress((current) => {
            const loaded = Math.min(current.total, current.loaded + 1);
            return { ...current, loaded, done: loaded >= current.total };
          });
        }
      }
    }

    urls.forEach((url) => preload(url));
    return () => {
      cancelled = true;
    };
  }, []);

  const me = room?.players.find((player) => player.id === playerId);
  const opponent = room?.players.find((player) => player.id !== playerId);
  const isMyTurn = room?.activePlayerId === playerId;
  const matchResult = room?.phase === "finished" ? (room.winnerId === playerId ? "Ganaste" : "Perdiste") : "";
  const matchResultReason = room?.finishReason?.type === "disconnect"
    ? (room.finishReason.loserId === playerId ? "Perdiste por: Desconexion" : `Ganaste por: Desconexion de ${room.finishReason.loserName || "tu rival"}`)
    : "";

  useEffect(() => {
    if (!actorId && me?.team?.length) {
      const firstAlive = me.team.find((member) => member.hp > 0);
      setActorId(firstAlive?.id || "");
    }
  }, [actorId, me]);

  useEffect(() => {
    if (!opponent?.team?.length) return;
    const currentTarget = opponent.team.find((member) => member.id === targetId);
    if (currentTarget?.hp > 0 && !hasStatus(currentTarget, "invulnerable")) return;
    const firstAlive = opponent.team.find((member) => member.hp > 0 && !hasStatus(member, "invulnerable"));
    setTargetId(firstAlive?.id || "");
  }, [targetId, opponent]);

  const selectedActor = useMemo(() => {
    return me?.team.find((member) => member.id === actorId);
  }, [actorId, me]);

  useEffect(() => {
    if (!room?.code) return;

    const messages = room.chat || [];
    const lastMessageId = messages[messages.length - 1]?.id || "";
    if (lastChatRoomRef.current !== room.code) {
      lastChatRoomRef.current = room.code;
      lastChatMessageRef.current = lastMessageId;
      return;
    }

    if (!lastMessageId || lastChatMessageRef.current === lastMessageId) return;
    lastChatMessageRef.current = lastMessageId;
    playMessageSound();
  }, [room?.code, room?.chat]);

  useEffect(() => {
    if (room?.phase !== "battle" || !room.activePlayerId || !room.turn) return;

    const turnKey = `${room.turn}:${room.activePlayerId}`;
    if (lastNotifiedTurnRef.current === turnKey) return;
    lastNotifiedTurnRef.current = turnKey;

    if (!turnAudioRef.current) {
      turnAudioRef.current = new Audio(notifierSound);
    }

    playTurnNotifier();
  }, [room?.phase, room?.turn, room?.activePlayerId]);

  useEffect(() => {
    if (turnAudioRef.current && turnAudioRef.current.paused) {
      setAudioVolume(turnAudioRef.current, sfxVolume);
    }
    if (messageAudioRef.current && messageAudioRef.current.paused) {
      setAudioVolume(messageAudioRef.current, sfxVolume);
    }
    if (bgmAudioRef.current && !bgmAudioRef.current.paused) {
      setAudioVolume(bgmAudioRef.current, musicVolume * BGM_VOLUME_RATIO);
    }
    if (resultAudioRef.current && resultAudioRef.current.paused) {
      setAudioVolume(resultAudioRef.current, sfxVolume);
    }
    if (deathAudioRef.current && deathAudioRef.current.paused) {
      setAudioVolume(deathAudioRef.current, sfxVolume);
    }
  }, [sfxVolume, musicVolume]);

  useEffect(() => {
    return () => {
      stopBgm(false);
      stopResultAudio(false);
      stopDeathAudio(false);
      clearAudioTimers();
      if (messageStopTimeoutRef.current) window.clearTimeout(messageStopTimeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (!room?.players?.length) {
      playerBattleStateRef.current.clear();
      return;
    }

    const states = new Map();
    for (const player of room.players) {
      const rival = room.players.find((item) => item.id !== player.id);
      states.set(player.id, battleAudioStateForPlayer(player, rival));
    }
    playerBattleStateRef.current = states;
  }, [room?.players]);

  useEffect(() => {
    if (room?.phase !== "battle" || !me || !opponent) {
      if (room?.phase !== "finished") {
        bgmBattleKeyRef.current = "";
        stopBgm(true);
      }
      return;
    }

    const battleKey = `${room.code}:${playerId}`;
    if (bgmBattleKeyRef.current !== battleKey) {
      bgmBattleKeyRef.current = battleKey;
      bgmBaseTrackRef.current = randomTrack(bgmTracks);
      bgmCurrentTrackRef.current = "";
      bgmCurrentStateRef.current = "idle";
    }

    const state = battleAudioStateForPlayer(me, opponent);
    const track = bgmTrackForState(state);
    if (track) switchBgm(track, state);
  }, [room?.phase, room?.code, room?.turn, room?.players, playerId, me, opponent]);

  useEffect(() => {
    if (room?.phase !== "finished" || !matchResult) return;

    const resultKey = `${room.code}:${room.winnerId}:${matchResult}`;
    if (lastResultAudioKeyRef.current === resultKey) return;
    lastResultAudioKeyRef.current = resultKey;
    stopBgm(true);
    playResultAudio();
  }, [room?.phase, room?.code, room?.winnerId, matchResult]);

  useEffect(() => {
    if (!room?.players?.length) {
      lastHpByMemberRef.current.clear();
      return;
    }

    const nextHp = new Map();
    for (const player of room.players) {
      for (const member of player.team || []) {
        const previousHp = lastHpByMemberRef.current.get(member.id);
        nextHp.set(member.id, member.hp);
        if (previousHp === undefined || previousHp <= 0 || member.hp > 0) continue;
        playDeathSound(member.character?.deathSound);
      }
    }
    lastHpByMemberRef.current = nextHp;
  }, [room?.players]);

  function clearAudioTimers() {
    if (audioFadeFrameRef.current) {
      window.cancelAnimationFrame(audioFadeFrameRef.current);
      audioFadeFrameRef.current = 0;
    }
    if (audioFadeOutTimeoutRef.current) {
      window.clearTimeout(audioFadeOutTimeoutRef.current);
      audioFadeOutTimeoutRef.current = null;
    }
    if (audioStopTimeoutRef.current) {
      window.clearTimeout(audioStopTimeoutRef.current);
      audioStopTimeoutRef.current = null;
    }
  }

  function clampAudioVolume(value) {
    const volume = Number(value);
    if (!Number.isFinite(volume)) return 0;
    return Math.min(1, Math.max(0, volume));
  }

  function setAudioVolume(audio, volume) {
    if (!audio) return;
    audio.volume = clampAudioVolume(volume);
  }

  function fadeAudioTo(audio, targetVolume, durationMs, onDone) {
    const startedAt = performance.now();
    const initialVolume = audio.volume;
    const finalVolume = clampAudioVolume(targetVolume);

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      setAudioVolume(audio, initialVolume + (finalVolume - initialVolume) * progress);
      if (progress < 1) {
        audioFadeFrameRef.current = window.requestAnimationFrame(tick);
        return;
      }
      audioFadeFrameRef.current = 0;
      onDone?.();
    }

    audioFadeFrameRef.current = window.requestAnimationFrame(tick);
  }

  function fadeAudioWithFrame(audio, targetVolume, durationMs, frameRef, onDone) {
    if (frameRef.current) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = 0;
    }

    const startedAt = performance.now();
    const initialVolume = audio.volume;
    const finalVolume = clampAudioVolume(targetVolume);
    const duration = Math.max(0, durationMs);

    if (duration === 0) {
      setAudioVolume(audio, finalVolume);
      onDone?.();
      return;
    }

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      setAudioVolume(audio, initialVolume + (finalVolume - initialVolume) * progress);
      if (progress < 1) {
        frameRef.current = window.requestAnimationFrame(tick);
        return;
      }
      frameRef.current = 0;
      onDone?.();
    }

    frameRef.current = window.requestAnimationFrame(tick);
  }

  function randomTrack(tracks, excludeTrack = "") {
    if (!tracks.length) return "";
    const availableTracks = tracks.length > 1 ? tracks.filter((track) => track !== excludeTrack) : tracks;
    return availableTracks[Math.floor(Math.random() * availableTracks.length)];
  }

  function battleAudioStateForPlayer(player, rival) {
    const share = playerHealthShare(player, rival);
    if (share >= ADVANTAGE_HEALTH_SHARE) return "advantage";
    if (share <= 1 - ADVANTAGE_HEALTH_SHARE) return "disadvantage";
    return "neutral";
  }

  function bgmTrackForState(state, { forceNew = false } = {}) {
    if (!forceNew && bgmCurrentStateRef.current === state && bgmCurrentTrackRef.current) {
      return bgmCurrentTrackRef.current;
    }
    const currentTrack = bgmCurrentTrackRef.current;
    if (state === "advantage") return randomTrack(advantageBgmTracks, currentTrack) || bgmBaseTrackRef.current;
    if (state === "disadvantage") return randomTrack(disadvantageBgmTracks, currentTrack) || bgmBaseTrackRef.current;
    const track = forceNew ? randomTrack(bgmTracks, currentTrack) : bgmBaseTrackRef.current || randomTrack(bgmTracks);
    if (state === "neutral" && track) bgmBaseTrackRef.current = track;
    return track;
  }

  function cancelBgmLoopFrame() {
    if (bgmLoopFrameRef.current) {
      window.cancelAnimationFrame(bgmLoopFrameRef.current);
      bgmLoopFrameRef.current = 0;
    }
  }

  function scheduleBgmLoop(audio, state) {
    cancelBgmLoopFrame();
    let fadedOutForLoop = false;

    function tick() {
      if (!bgmAudioRef.current || bgmAudioRef.current !== audio || audio.paused) {
        bgmLoopFrameRef.current = 0;
        return;
      }

      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration > BGM_FADE_MS / 1000) {
        const remainingMs = Math.max(0, (duration - audio.currentTime) * 1000);
        if (!fadedOutForLoop && remainingMs <= BGM_FADE_MS) {
          fadedOutForLoop = true;
          fadeAudioWithFrame(audio, 0, remainingMs, bgmFadeFrameRef);
        }
        if (remainingMs <= 80) {
          const nextTrack = bgmTrackForState(state, { forceNew: true });
          bgmLoopFrameRef.current = 0;
          audio.pause();
          audio.currentTime = 0;
          if (bgmAudioRef.current === audio) bgmAudioRef.current = null;
          if (nextTrack) switchBgm(nextTrack, state);
          return;
        }
      }

      bgmLoopFrameRef.current = window.requestAnimationFrame(tick);
    }

    bgmLoopFrameRef.current = window.requestAnimationFrame(tick);
  }

  function switchBgm(track, state) {
    if (!track) return;
    const current = bgmAudioRef.current;
    if (current && bgmCurrentTrackRef.current === track && bgmCurrentStateRef.current === state && !current.paused) {
      return;
    }

    const startNext = () => {
      const audio = new Audio(track);
      bgmAudioRef.current = audio;
      bgmCurrentTrackRef.current = track;
      bgmCurrentStateRef.current = state;
      setAudioVolume(audio, 0);
      audio.loop = false;
      audio.play()
        .then(() => {
          fadeAudioWithFrame(audio, musicVolume * BGM_VOLUME_RATIO, BGM_FADE_MS, bgmFadeFrameRef);
          scheduleBgmLoop(audio, state);
        })
        .catch(() => {
          // Browsers can block audio until the user interacts with the page.
        });
    };

    if (!current || current.paused) {
      startNext();
      return;
    }

    fadeAudioWithFrame(current, 0, BGM_FADE_MS, bgmFadeFrameRef, () => {
      current.pause();
      current.currentTime = 0;
      if (bgmAudioRef.current === current) bgmAudioRef.current = null;
      startNext();
    });
  }

  function stopBgm(withFade) {
    const audio = bgmAudioRef.current;
    cancelBgmLoopFrame();
    if (bgmFadeFrameRef.current) {
      window.cancelAnimationFrame(bgmFadeFrameRef.current);
      bgmFadeFrameRef.current = 0;
    }
    bgmCurrentTrackRef.current = "";
    bgmCurrentStateRef.current = "idle";
    if (!audio) return;

    const stop = () => {
      audio.pause();
      audio.currentTime = 0;
      if (bgmAudioRef.current === audio) bgmAudioRef.current = null;
    };

    if (withFade && !audio.paused) {
      fadeAudioWithFrame(audio, 0, BGM_FADE_MS, bgmFadeFrameRef, stop);
      return;
    }
    stop();
  }

  function stopResultAudio(withFade) {
    const audio = resultAudioRef.current;
    if (resultFadeFrameRef.current) {
      window.cancelAnimationFrame(resultFadeFrameRef.current);
      resultFadeFrameRef.current = 0;
    }
    if (resultFadeOutTimeoutRef.current) {
      window.clearTimeout(resultFadeOutTimeoutRef.current);
      resultFadeOutTimeoutRef.current = null;
    }
    if (resultStopTimeoutRef.current) {
      window.clearTimeout(resultStopTimeoutRef.current);
      resultStopTimeoutRef.current = null;
    }
    if (!audio) return;

    const stop = () => {
      audio.pause();
      audio.currentTime = 0;
      if (resultAudioRef.current === audio) resultAudioRef.current = null;
    };

    if (withFade && !audio.paused) {
      fadeAudioWithFrame(audio, 0, RESULT_AUDIO_FADE_MS, resultFadeFrameRef, stop);
      return;
    }
    stop();
  }

  function stopDeathAudio(withFade) {
    const audio = deathAudioRef.current;
    if (deathFadeFrameRef.current) {
      window.cancelAnimationFrame(deathFadeFrameRef.current);
      deathFadeFrameRef.current = 0;
    }
    if (deathFadeOutTimeoutRef.current) {
      window.clearTimeout(deathFadeOutTimeoutRef.current);
      deathFadeOutTimeoutRef.current = null;
    }
    if (deathStopTimeoutRef.current) {
      window.clearTimeout(deathStopTimeoutRef.current);
      deathStopTimeoutRef.current = null;
    }
    if (!audio) return;

    const stop = () => {
      audio.pause();
      audio.currentTime = 0;
      if (deathAudioRef.current === audio) deathAudioRef.current = null;
    };

    if (withFade && !audio.paused) {
      fadeAudioWithFrame(audio, 0, DEATH_AUDIO_FADE_MS, deathFadeFrameRef, stop);
      return;
    }
    stop();
  }

  function playDeathSound(config) {
    const src = (config?.soundname ? characterSound(config.soundname) : "") || deathSound;
    if (!src) return;
    stopDeathAudio(false);

    const audio = new Audio(src);
    deathAudioRef.current = audio;
    audio.currentTime = Math.max(0, Number(config?.start || 0));
    setAudioVolume(audio, config?.shouldFadeIn ? 0 : sfxVolume);

    const stopAtEnd = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      const requestedEnd = Number(config?.end || 0);
      const endAt = requestedEnd > 0 ? Math.min(requestedEnd, duration || requestedEnd) : duration;
      if (!endAt || endAt <= audio.currentTime) return;
      const remainingMs = Math.max(0, (endAt - audio.currentTime) * 1000);
      const fadeMs = config?.shouldFadeOut ? Math.min(DEATH_AUDIO_FADE_MS, remainingMs) : 0;
      deathFadeOutTimeoutRef.current = window.setTimeout(() => {
        if (fadeMs > 0) fadeAudioWithFrame(audio, 0, fadeMs, deathFadeFrameRef);
      }, Math.max(0, remainingMs - fadeMs));
      deathStopTimeoutRef.current = window.setTimeout(() => stopDeathAudio(false), remainingMs);
    };

    audio.addEventListener("loadedmetadata", stopAtEnd, { once: true });
    audio.play()
      .then(() => {
        if (config?.shouldFadeIn) fadeAudioWithFrame(audio, sfxVolume, DEATH_AUDIO_FADE_MS, deathFadeFrameRef);
        stopAtEnd();
      })
      .catch(() => {
        // Browsers can block audio until the user interacts with the page.
      });
  }

  function scheduleResultAudioEnd(audio) {
    const schedule = () => {
      const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
      if (duration <= 0) return;
      const remainingMs = Math.max(0, (duration - audio.currentTime) * 1000);
      const fadeOutDelay = Math.max(0, remainingMs - RESULT_AUDIO_FADE_MS);

      resultFadeOutTimeoutRef.current = window.setTimeout(() => {
        fadeAudioWithFrame(audio, 0, RESULT_AUDIO_FADE_MS, resultFadeFrameRef);
      }, fadeOutDelay);

      resultStopTimeoutRef.current = window.setTimeout(() => {
        stopResultAudio(false);
      }, remainingMs);
    };

    if (Number.isFinite(audio.duration)) {
      schedule();
    } else {
      audio.addEventListener("loadedmetadata", schedule, { once: true });
    }
  }

  function playResultAudio() {
    stopResultAudio(false);
    const audio = new Audio(ninjaSound);
    resultAudioRef.current = audio;
    audio.currentTime = 0;
    setAudioVolume(audio, 0);
    scheduleResultAudioEnd(audio);
    audio.play()
      .then(() => fadeAudioWithFrame(audio, sfxVolume, RESULT_AUDIO_FADE_MS, resultFadeFrameRef))
      .catch(() => {
        // Browsers can block audio until the user interacts with the page.
      });
  }

  function scheduleNotifierEnd(audio) {
    const duration = Number.isFinite(audio.duration) ? audio.duration : NOTIFIER_END_TIME;
    const endAt = Math.min(NOTIFIER_END_TIME, duration);
    const remainingMs = Math.max(0, (endAt - audio.currentTime) * 1000);
    const fadeMs = Math.min(AUDIO_FADE_MS, Math.max(0, remainingMs / 2));
    const fadeOutDelay = Math.max(0, remainingMs - fadeMs);

    audioFadeOutTimeoutRef.current = window.setTimeout(() => {
      fadeAudioTo(audio, 0, fadeMs);
    }, fadeOutDelay);

    audioStopTimeoutRef.current = window.setTimeout(() => {
      if (audioFadeFrameRef.current) {
        window.cancelAnimationFrame(audioFadeFrameRef.current);
        audioFadeFrameRef.current = 0;
      }
      audio.pause();
      audio.currentTime = NOTIFIER_START_TIME;
      setAudioVolume(audio, sfxVolume);
    }, remainingMs);
  }

  function playTurnNotifier() {
    if (!turnAudioRef.current) {
      turnAudioRef.current = new Audio(notifierSound);
    }

    const audio = turnAudioRef.current;
    clearAudioTimers();
    audio.pause();
    audio.currentTime = NOTIFIER_START_TIME;
    setAudioVolume(audio, 0);

    const scheduleWhenReady = () => scheduleNotifierEnd(audio);
    if (Number.isFinite(audio.duration)) {
      scheduleWhenReady();
    } else {
      audio.addEventListener("loadedmetadata", scheduleWhenReady, { once: true });
    }

    audio.play()
      .then(() => fadeAudioTo(audio, sfxVolume, Math.min(AUDIO_FADE_MS, 1200)))
      .catch(() => {
        // Browsers can block audio until the user interacts with the page.
      });
  }

  function playMessageSound() {
    if (!messageAudioRef.current) {
      messageAudioRef.current = new Audio(messageSound);
    }

    const audio = messageAudioRef.current;
    if (messageStopTimeoutRef.current) {
      window.clearTimeout(messageStopTimeoutRef.current);
      messageStopTimeoutRef.current = null;
    }
    audio.pause();
    audio.currentTime = MESSAGE_SOUND_START_TIME;
    setAudioVolume(audio, sfxVolume);

    audio.play().catch(() => {
      // Browsers can block audio until the user interacts with the page.
    });

    messageStopTimeoutRef.current = window.setTimeout(() => {
      audio.pause();
      audio.currentTime = MESSAGE_SOUND_START_TIME;
    }, MESSAGE_SOUND_END_TIME * 1000);
  }

  function callSocket(event, payload) {
    return new Promise((resolve) => {
      socket.emit(event, payload, (response) => resolve(response));
    });
  }

  async function createRoom() {
    setError("");
    const playerName = name.trim();
    if (!playerName) {
      setError("Debes ingresar un nombre para jugar.");
      return;
    }

    const response = await callSocket("room:create", { name: playerName });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setPlayerId(response.playerId);
    setRoom(response.room);
  }

  async function createBotRoom() {
    setError("");
    const response = await callSocket("room:createBot", { name: name.trim() || "Jugador" });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setPlayerId(response.playerId);
    setRoom(response.room);
  }

  async function createBotVsBotRoom() {
    setError("");
    const response = await callSocket("room:createBotVsBot", {});
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setPlayerId(response.playerId);
    setRoom(response.room);
  }

  async function runBalanceTest() {
    setError("");
    setBalanceTestResult(null);
    setBalanceTestLoading(true);
    setHomeView("balance-test");
    const response = await callSocket("test:runBalance", { fightCount: BALANCE_TEST_FIGHT_COUNT });
    setBalanceTestLoading(false);
    if (!response.ok) {
      setError(response.error);
      setHomeView("menu");
      return;
    }
    setBalanceTestResult(response.data);
  }

  async function joinRoom() {
    setError("");
    const playerName = name.trim();
    if (!playerName) {
      setError("Debes ingresar un nombre para jugar.");
      return;
    }

    const response = await callSocket("room:join", { code: joinCode, name: playerName });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setPlayerId(response.playerId);
    setRoom(response.room);
  }

  async function confirmTeam() {
    setError("");
    const response = await callSocket("team:select", { characterIds: selected });
    if (!response.ok) setError(response.error);
  }

  async function confirmRandomTeam() {
    setError("");
    const selectedSet = new Set(selected);
    const available = characters
      .map((character) => character.id)
      .filter((characterId) => !selectedSet.has(characterId));
    const completed = [...selected];
    while (completed.length < 3 && available.length > 0) {
      const index = Math.floor(Math.random() * available.length);
      completed.push(available.splice(index, 1)[0]);
    }
    setSelected(completed);
    const response = await callSocket("team:select", { characterIds: completed });
    if (!response.ok) setError(response.error);
  }

  async function unconfirmTeam() {
    setError("");
    const response = await callSocket("team:unselect", {});
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setSelected([]);
  }

  async function useSkill(skillId, selectedTargetId = targetId) {
    setError("");
    const response = await callSocket("battle:skill", { actorId, targetId: selectedTargetId, skillId });
    if (!response.ok) setError(response.error);
    return response.ok;
  }

  async function endTurn(negro = emptyChakra(), resolveOrder = []) {
    setError("");
    const response = await callSocket("battle:endTurn", { negro, resolveOrder });
    if (!response.ok) setError(response.error);
    return response.ok;
  }

  async function removeQueuedSkill(actionId) {
    setError("");
    const response = await callSocket("battle:removeQueuedSkill", { actionId });
    if (!response.ok) setError(response.error);
  }

  async function moveQueuedSkill(actionId, direction) {
    setError("");
    const response = await callSocket("battle:moveQueuedSkill", { actionId, direction });
    if (!response.ok) setError(response.error);
  }

  async function exchangeChakra(receivedType, spent) {
    setError("");
    const response = await callSocket("battle:exchangeChakra", { receivedType, spent });
    if (!response.ok) {
      setError(response.error);
      return false;
    }
    return true;
  }

  async function undoChakraExchange() {
    setError("");
    const response = await callSocket("battle:undoChakraExchange", {});
    if (!response.ok) setError(response.error);
  }

  async function surrender() {
    setError("");
    const response = await callSocket("battle:surrender", {});
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setOptionsOpen(false);
  }

  async function sendChatMessage(message) {
    setError("");
    const response = await callSocket("chat:send", { message });
    if (!response.ok) {
      setError(response.error);
      return false;
    }
    return true;
  }

  async function toggleBotPause() {
    setError("");
    const response = await callSocket("bot:togglePause", {});
    if (!response.ok) setError(response.error);
  }

  function copyRoomCode() {
    if (room?.mode === "bot") return;
    navigator.clipboard?.writeText(room.code);
    setNotice("Codigo copiado!");
    window.setTimeout(() => setNotice(""), 1800);
  }

  function toggleCharacter(characterId) {
    setSelected((current) => {
      if (current.includes(characterId)) return current.filter((id) => id !== characterId);
      if (current.length >= 3) return current;
      return [...current, characterId];
    });
  }

  function returnHome() {
    stopBgm(true);
    stopResultAudio(true);
    stopDeathAudio(true);
    bgmBattleKeyRef.current = "";
    lastResultAudioKeyRef.current = "";
    setRoom(null);
    setHomeView("menu");
    setPlayerId("");
    setJoinCode("");
    setSelected([]);
    setActorId("");
    setTargetId("");
    setError("");
    setNotice("");
    socket.disconnect();
    socket.connect();
  }

  return (
    <>
    <RotatingBackground />
    <main className={mobilePreview ? "mobile-preview" : ""}>
      <section className={`topbar ${!room ? "home-topbar" : ""} ${room?.phase === "lobby" ? "lobby-topbar" : ""}`}>
        <div className="topbar-brand">
          <h1 aria-label="Sote Arena">
            <img className="brand-logo" src={logoUrl} alt="" aria-hidden="true" />
          </h1>
          <span className="version-tag">v{GAME_VERSION}</span>
        </div>
        <div className="topbar-actions">
          <button
            type="button"
            className={`secondary desktop-mobile-preview-button ${mobilePreview ? "active" : ""}`}
            onClick={() => setMobilePreview((current) => !current)}
            aria-pressed={mobilePreview}
            title={mobilePreview ? "Volver a vista escritorio" : "Vista mobile"}
          >
            {mobilePreview ? <Monitor size={16} /> : <Smartphone size={16} />}
          </button>
          {room && (
            <>
            {room.phase === "lobby" && (
              <button className="secondary" onClick={returnHome}>
                <ChevronLeft size={16} />
                Menu
              </button>
            )}
            <button className="secondary" onClick={() => setOptionsOpen(true)}>
              <Shield size={16} />
              Opciones
            </button>
            {room.mode !== "bot" && (
              <button className="code" onClick={copyRoomCode}>
                <Copy size={16} />
                {room.code}
              </button>
            )}
            </>
          )}
        </div>
      </section>

      {error && <div className="alert">{error}</div>}
      {notice && <div className="notice">{notice}</div>}
      {!assetProgress.done && (
        <div className="asset-preload-bar" aria-label="Descargando assets">
          <LoaderCircle size={12} aria-hidden="true" />
          <strong>{assetProgress.total ? Math.round((assetProgress.loaded / assetProgress.total) * 100) : 0}%</strong>
          <span style={{ width: `${assetProgress.total ? Math.round((assetProgress.loaded / assetProgress.total) * 100) : 0}%` }} />
        </div>
      )}

      {!room && homeView === "menu" && (
        <MainMenu
          onPlay={() => {
            setError("");
            setHomeView("play");
          }}
          onPlayBot={createBotRoom}
          onPlayBotVsBot={createBotVsBotRoom}
          onRunTests={runBalanceTest}
          onCharacters={() => {
            setError("");
            setHomeView("characters");
          }}
          onPatchNotes={() => {
            setError("");
            setHomeView("patch-notes");
          }}
          onOptions={() => setOptionsOpen(true)}
        />
      )}

      {!room && homeView === "play" && (
        <section className="panel entry">
          <button type="button" className="secondary back-button" onClick={() => setHomeView("menu")}>
            <ChevronLeft size={18} />
            Menu
          </button>
          <div className="entry-copy">
            <Swords size={44} />
            <h2>Duelo 3 vs 3 por turnos</h2>
            <p>Crear o unirse a una sala conecta a dos jugadores. La base de datos es temporal y se reinicia con el servidor.</p>
          </div>
          <div className="form-grid">
            <label>
              Nombre
              <input value={name} maxLength={18} onChange={(event) => setName(event.target.value)} placeholder="Jugador" required />
            </label>
            <button onClick={createRoom} disabled={!name.trim()}>
              <Users size={18} />
              Crear sala
            </button>
            <label>
              Codigo
              <input value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABCDE" />
            </label>
            <button className="secondary" onClick={joinRoom} disabled={!name.trim()}>
              <Swords size={18} />
              Unirse
            </button>
          </div>
        </section>
      )}

      {!room && homeView === "characters" && (
        <CharactersCatalog
          characters={characters}
          onBack={() => {
            setError("");
            setHomeView("menu");
          }}
        />
      )}

      {!room && homeView === "patch-notes" && (
        <PatchNotesView
          onBack={() => {
            setError("");
            setHomeView("menu");
          }}
        />
      )}

      {!room && homeView === "balance-test" && (
        <BalanceTestView
          loading={balanceTestLoading}
          result={balanceTestResult}
          onRerun={runBalanceTest}
          onBack={() => {
            setError("");
            setHomeView("menu");
          }}
        />
      )}

      {room?.phase === "lobby" && (
        <Lobby
          characters={characters}
          selected={selected}
          me={me}
          room={room}
          onToggle={toggleCharacter}
          onConfirm={confirmTeam}
          onRandomTeam={confirmRandomTeam}
          onUnconfirm={unconfirmTeam}
          onSendChat={sendChatMessage}
          onToggleBotPause={toggleBotPause}
        />
      )}

      {(room?.phase === "battle" || room?.phase === "finished") && (
        <Battle
          room={room}
          me={me}
          opponent={opponent}
          isMyTurn={isMyTurn}
          actorId={actorId}
          targetId={targetId}
          selectedActor={selectedActor}
          onActor={setActorId}
          onTarget={setTargetId}
          onSkill={useSkill}
          onEndTurn={endTurn}
          onRemoveQueuedSkill={removeQueuedSkill}
          onMoveQueuedSkill={moveQueuedSkill}
          onExchangeChakra={exchangeChakra}
          onUndoChakraExchange={undoChakraExchange}
          onSendChat={sendChatMessage}
          onToggleBotPause={toggleBotPause}
        />
      )}

      {matchResult && <ResultModal title={matchResult} reason={matchResultReason} stats={room?.resultStats || []} onReturnHome={returnHome} />}
      {optionsOpen && (
        <OptionsModal
          sfxVolume={sfxVolume}
          musicVolume={musicVolume}
          canSurrender={room?.phase === "battle" && !me?.isBot}
          primaryActionLabel={room?.mode === "bot-vs-bot" ? "Salir de modo IA vs IA" : ""}
          onPrimaryAction={room?.mode === "bot-vs-bot" ? returnHome : undefined}
          onSfxVolumeChange={setSfxVolume}
          onMusicVolumeChange={setMusicVolume}
          onSurrender={surrender}
          onClose={() => setOptionsOpen(false)}
        />
      )}
      {patchNotesPopupOpen && (
        <PatchNotesPopup
          onClose={() => {
            window.localStorage.setItem(PATCH_NOTES_SEEN_KEY, "true");
            setPatchNotesPopupOpen(false);
          }}
        />
      )}
    </main>
    </>
  );
}

function filterCharacters(characters, search) {
  const query = search.trim().toLowerCase();
  const filtered = query
    ? characters.filter((character) => (
      character.name.toLowerCase().includes(query)
      || character.id.toLowerCase().includes(query)
    ))
    : characters;
  return [...filtered].sort((first, second) => first.name.localeCompare(second.name, "es", { sensitivity: "base" }));
}

function CharacterSearch({ value, onChange, placeholder, disabled = false }) {
  return (
    <label className="character-search" aria-label="Buscar personaje">
      <Search size={18} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        disabled={disabled}
      />
    </label>
  );
}

function LoadingSpinner({ label = "Cargando vista" }) {
  return (
    <div className="loading-spinner" role="status" aria-live="polite">
      <LoaderCircle size={26} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function BalanceTestView({ loading, result, onBack, onRerun }) {
  const [sortConfig, setSortConfig] = useState(DEFAULT_BALANCE_SORT);
  const isDefaultSort = sortConfig.key === DEFAULT_BALANCE_SORT.key && sortConfig.direction === DEFAULT_BALANCE_SORT.direction;
  const sortedResults = useMemo(() => {
    if (!result?.results) return [];
    const direction = sortConfig.direction === "asc" ? 1 : -1;
    const valueFor = (item) => {
      const total = item.wins + item.losses;
      if (sortConfig.key === "name") return item.name;
      if (sortConfig.key === "winrate") return total > 0 ? item.wins / total : 0;
      return Number(item[sortConfig.key] || 0);
    };
    return [...result.results].sort((first, second) => {
      const firstValue = valueFor(first);
      const secondValue = valueFor(second);
      if (typeof firstValue === "string" || typeof secondValue === "string") {
        return direction * String(firstValue).localeCompare(String(secondValue), "es", { sensitivity: "base" });
      }
      return direction * (firstValue - secondValue) || first.name.localeCompare(second.name, "es", { sensitivity: "base" });
    });
  }, [result, sortConfig]);
  const winrateRankClasses = useMemo(() => {
    const rows = [...(result?.results || [])].sort((first, second) => {
      const firstTotal = first.wins + first.losses;
      const secondTotal = second.wins + second.losses;
      const firstWinrate = firstTotal > 0 ? first.wins / firstTotal : 0;
      const secondWinrate = secondTotal > 0 ? second.wins / secondTotal : 0;
      return secondWinrate - firstWinrate || second.wins - first.wins || first.losses - second.losses || first.name.localeCompare(second.name, "es", { sensitivity: "base" });
    });
    const classes = new Map();
    rows.slice(0, 3).forEach((item) => classes.set(item.id, "balance-rank-top"));
    rows.slice(-3).forEach((item) => {
      if (!classes.has(item.id)) classes.set(item.id, "balance-rank-bottom");
    });
    return classes;
  }, [result]);

  function sortBy(key) {
    setSortConfig((current) => ({
      key,
      direction: current.key === key && current.direction === "desc" ? "asc" : "desc"
    }));
  }

  function sortLabel(key, label) {
    const active = sortConfig.key === key;
    const suffix = active ? (sortConfig.direction === "asc" ? " ascendente" : " descendente") : "";
    return `${label}${suffix}`;
  }

  function SortHeader({ sortKey, children }) {
    const active = sortConfig.key === sortKey;
    const SortIcon = active && sortConfig.direction === "asc" ? ArrowUp : ArrowDown;
    return (
      <button
        type="button"
        className={`balance-sort-button ${active ? "active" : ""}`}
        onClick={() => sortBy(sortKey)}
        aria-label={sortLabel(sortKey, children)}
      >
        <span>{children}</span>
        <SortIcon aria-hidden="true" size={13} strokeWidth={3} />
      </button>
    );
  }

  return (
    <section className="panel balance-test-view">
      <button type="button" className="secondary back-button" onClick={onBack}>
        <ChevronLeft size={18} />
        Menu
      </button>
      {loading && (
        <div className="balance-test-loading" role="status" aria-live="polite">
          <LoaderCircle size={34} />
          <h2>Calculando peleas</h2>
        </div>
      )}
      {!loading && result && (
        <>
          <header className="balance-test-header">
            <div>
              <p className="eyebrow">Testeo IA vs IA</p>
              <h2>{result.fightCount} peleas calculadas</h2>
            </div>
            <div className="balance-test-actions">
              <button
                type="button"
                className="secondary balance-action-button"
                onClick={onRerun}
                aria-label="Volver a correr el testeo"
              >
                <RefreshCw size={16} />
                Recalcular
              </button>
              <button
                type="button"
                className="secondary balance-action-button"
                onClick={() => setSortConfig(DEFAULT_BALANCE_SORT)}
                disabled={isDefaultSort}
                aria-label="Resetear orden por mayor winrate"
              >
                <RotateCcw size={16} />
                Limpiar
              </button>
            </div>
          </header>
          <div className="balance-test-table" role="table" aria-label="Resultados de testeo">
            <div className="balance-test-row head" role="row">
              <span><SortHeader sortKey="name">Personaje</SortHeader></span>
              <span><SortHeader sortKey="used">Usos</SortHeader></span>
              <span><SortHeader sortKey="wins">Victorias</SortHeader></span>
              <span><SortHeader sortKey="losses">Derrotas</SortHeader></span>
              <span><SortHeader sortKey="winrate">Winrate</SortHeader></span>
              <span><SortHeader sortKey="damageDone">Daño</SortHeader></span>
              <span><SortHeader sortKey="healingDone">Curación</SortHeader></span>
              <span><SortHeader sortKey="damageMitigated">Mitigado</SortHeader></span>
            </div>
            {sortedResults.map((item) => {
              const total = item.wins + item.losses;
              const winrate = total > 0 ? Math.round((item.wins / total) * 100) : 0;
              return (
                <div className={`balance-test-row ${winrateRankClasses.get(item.id) || ""}`} role="row" key={item.id}>
                  <strong>{item.name}</strong>
                  <span>{item.used}</span>
                  <span>{item.wins}</span>
                  <span>{item.losses}</span>
                  <span>{winrate}%</span>
                  <span>{item.damageDone || 0}</span>
                  <span>{item.healingDone || 0}</span>
                  <span>{item.damageMitigated || 0}</span>
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

const chakraUsageTypes = [
  ...chakraTypes,
  { id: "negro", label: "Neutral", className: "neutral" }
];

function characterChakraUsage(character) {
  const totals = chakraUsageTypes.reduce((usage, type) => ({ ...usage, [type.id]: 0 }), {});
  for (const skill of chakraUsageSkillsForCharacter(character)) {
    for (const type of chakraUsageTypes) {
      totals[type.id] += Math.max(0, Number(skill.cost?.[type.id] || 0));
    }
  }
  const totalChakraCost = Object.values(totals).reduce((total, amount) => total + amount, 0);
  return chakraUsageTypes.map((type) => ({
    ...type,
    percent: totalChakraCost > 0 ? Math.round((totals[type.id] / totalChakraCost) * 100) : 0
  }));
}

function CharacterChakraUsage({ character }) {
  return (
    <div className="character-chakra-usage" aria-label={`Uso de recursos de ${character.name}`}>
      {characterChakraUsage(character).map((type) => (
        <span className="character-chakra-usage-item" key={type.id} aria-label={`${type.label}: ${type.percent}%`}>
          <ChakraIcon type={type.id} />
          <b>{type.percent}%</b>
        </span>
      ))}
    </div>
  );
}

function TeamChakraUsage({ characters }) {
  if (characters.length === 0) return null;
  const totals = chakraUsageTypes.reduce((usage, type) => ({ ...usage, [type.id]: 0 }), {});
  for (const character of characters) {
    for (const skill of chakraUsageSkillsForCharacter(character)) {
      for (const type of chakraUsageTypes) {
        totals[type.id] += Math.max(0, Number(skill.cost?.[type.id] || 0));
      }
    }
  }
  const totalChakraCost = Object.values(totals).reduce((total, amount) => total + amount, 0);
  return (
    <div className="character-chakra-usage team-chakra-usage" aria-label="Recursos usados por el equipo elegido">
      {chakraUsageTypes.map((type) => {
        const total = totals[type.id];
        const percent = totalChakraCost > 0 ? Math.round((total / totalChakraCost) * 100) : 0;
        return (
          <span className="character-chakra-usage-item team-chakra-usage-item" key={type.id} aria-label={`${type.label}: ${percent}%`}>
            <ChakraIcon type={type.id} />
            <small>{percent}%</small>
          </span>
        );
      })}
    </div>
  );
}

function CharacterDetailView({ character, selected = false, canSelect = false, selectDisabled = false, selectLabel, standalone = false, onToggle, onBack }) {
  const skills = inspectableSkillsForCharacter(character);
  const actionLabel = selectLabel || (selected ? "Quitar del equipo" : "Agregar al equipo");
  return (
    <section className={`character-detail-view ${standalone ? "panel" : ""}`}>
      <div className="character-detail-toolbar">
        <button type="button" className="secondary back-button" onClick={onBack}>
          <ChevronLeft size={18} />
          Atras
        </button>
        {canSelect && (
          <button
            type="button"
            className={selected ? "secondary" : ""}
            onClick={onToggle}
            disabled={selectDisabled}
          >
            {actionLabel}
          </button>
        )}
      </div>
      <header className="character-detail-hero">
        <SquareImage alt={character.name} src={characterImage(character.id)} />
        <div className="character-detail-summary">
          <h2>{character.name}</h2>
          <p>{characterDescription(character)}</p>
          <div className="character-detail-meta">
            <span><b>Vida:</b> {character.maxHp}</span>
          </div>
          <CharacterChakraUsage character={character} />
        </div>
      </header>
      <div className="character-detail-skills" aria-label={`Habilidades de ${character.name}`}>
        {skills.map((skill) => (
          <CharacterSkillDetailCard key={skill.id} skill={skill} />
        ))}
      </div>
    </section>
  );
}

function CharacterSkillDetailCard({ skill }) {
  return (
    <article className="character-detail-skill-card">
      <h3>
        <span>Habilidad:</span>
        {skill.name}
      </h3>
      <div className="character-detail-skill-body">
        <SquareImage alt={skill.name} src={skillImage(skill.id)} />
        <p>{skill.description}</p>
      </div>
      <div className="character-detail-skill-meta">
        <span><b>Cooldown:</b> {skill.cooldown || 0}</span>
        <span><b>Costo:</b> {skill.passive ? "No usable" : <ChakraCost chakra={skill.cost} />}</span>
        <span><b>Objetivo:</b> {skill.passive ? "Pasiva" : footerTargetTypeLabel(skill.targetType)}</span>
        <span><b>Familias:</b> {skill.family?.length ? skillClassesLabel(skill.family) : "Ninguna"}</span>
      </div>
    </article>
  );
}

function CharactersCatalog({ characters, onBack }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [detailCharacterId, setDetailCharacterId] = useState("");
  const filteredCharacters = filterCharacters(characters, search);
  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = filteredCharacters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const detailCharacter = characters.find((character) => character.id === detailCharacterId);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  if (detailCharacter) {
    return (
      <CharacterDetailView
        character={detailCharacter}
        standalone
        onBack={() => setDetailCharacterId("")}
      />
    );
  }

  return (
    <section className="characters-catalog panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Personajes</p>
          <h2>Lista de personajes ({characters.length})</h2>
        </div>
        <button type="button" className="secondary" onClick={onBack}>
          Menu
        </button>
      </div>
      <CharacterSearch value={search} onChange={setSearch} placeholder="Buscar personaje" />
      {characters.length === 0 ? <LoadingSpinner label="Cargando personajes" /> : <div className="character-grid">
        {pageCharacters.map((character) => (
          <button
            key={character.id}
            className="character-card"
            onClick={() => setDetailCharacterId(character.id)}
          >
            <SquareImage alt={character.name} src={characterImage(character.id)} />
          </button>
        ))}
        {pageCharacters.length === 0 && <p className="character-empty">No hay personajes para esa busqueda.</p>}
      </div>}
      <div className="pagination" aria-label="Paginacion de personajes">
        <button type="button" className="icon-button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1}>
          <ChevronLeft size={18} />
        </button>
        <strong>{currentPage} / {totalPages}</strong>
        <button type="button" className="icon-button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages}>
          <ChevronRight size={18} />
        </button>
      </div>
    </section>
  );
}

function Lobby({ characters, selected, me, room, onToggle, onConfirm, onRandomTeam, onUnconfirm, onSendChat }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [detailCharacterId, setDetailCharacterId] = useState("");
  const [detailSkillId, setDetailSkillId] = useState("");
  const filteredCharacters = filterCharacters(characters, search);
  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = filteredCharacters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const detailCharacter = characters.find((character) => character.id === detailCharacterId);
  const selectedCharacters = selected
    .map((characterId) => characters.find((character) => character.id === characterId))
    .filter(Boolean);
  const randomTeamLabel = selected.length > 0 ? "Completar Equipo Random" : "Equipo Random";
  const detailCharacterSelected = detailCharacter ? selected.includes(detailCharacter.id) : false;
  const detailSelectDisabled = Boolean(me?.ready || (!detailCharacterSelected && selected.length >= 3));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function clickCharacter(characterId) {
    setDetailCharacterId(characterId);
    setDetailSkillId("");
  }

  return (
    <section className="lobby">
      <div className="panel">
        <>
        <div className="section-head">
          <div>
            <div className="selection-kicker">
              <p className="eyebrow">Equipo</p>
              <button type="button" className="secondary random-team-button" onClick={onRandomTeam} disabled={me?.ready || characters.length < 3}>
                <RefreshCw size={16} />
                {randomTeamLabel}
              </button>
            </div>
            <div className="selection-title">
              <h2>Elige 3 personajes</h2>
              {selectedCharacters.length > 0 && (
                <div className="selected-character-strip" aria-label="Personajes elegidos">
                  {selectedCharacters.map((character) => (
                    <button
                      type="button"
                      key={character.id}
                      onClick={() => onToggle(character.id)}
                      disabled={me?.ready}
                      aria-label={`Quitar ${character.name}`}
                    >
                      <SquareImage alt={character.name} src={characterImage(character.id)} />
                    </button>
                  ))}
                </div>
              )}
              <TeamChakraUsage characters={selectedCharacters} />
            </div>
          </div>
          <button disabled={!me?.ready && selected.length !== 3} onClick={me?.ready ? onUnconfirm : onConfirm}>
            <Shield size={18} />
            {me?.ready ? "Desconfirmar" : "Confirmar"}
          </button>
        </div>
        <CharacterSearch value={search} onChange={setSearch} placeholder="Buscar personaje" disabled={me?.ready} />
        {characters.length === 0 ? <LoadingSpinner label="Cargando personajes" /> : <div className="character-grid">
          {pageCharacters.map((character) => (
            <button
              key={character.id}
              className={`character-card ${selected.includes(character.id) ? "selected" : ""} ${detailCharacterId === character.id ? "inspected" : ""}`}
              onClick={() => clickCharacter(character.id)}
            >
              <SquareImage alt={character.name} src={characterImage(character.id)} />
            </button>
          ))}
          {pageCharacters.length === 0 && <p className="character-empty">No hay personajes para esa busqueda.</p>}
        </div>}
        <div className="pagination" aria-label="Paginacion de personajes">
          <button type="button" className="icon-button" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={currentPage === 1 || me?.ready}>
            <ChevronLeft size={18} />
          </button>
          <strong>{currentPage} / {totalPages}</strong>
          <button type="button" className="icon-button" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={currentPage === totalPages || me?.ready}>
            <ChevronRight size={18} />
          </button>
        </div>
        {detailCharacter && (
          <LobbyInspectionFooter
            character={detailCharacter}
            selected={detailCharacterSelected}
            selectDisabled={detailSelectDisabled}
            selectLabel={detailCharacterSelected ? "Quitar del equipo" : selected.length >= 3 ? "Equipo completo" : "Agregar al equipo"}
            skillId={detailSkillId}
            onSkill={setDetailSkillId}
            onToggle={() => onToggle(detailCharacter.id)}
          />
        )}
        </>
      </div>
      <aside className={`side-stack ${room.mode !== "pvp" ? "single-panel" : ""}`}>
        <section className="panel status side-main">
          <p className="eyebrow">{room.mode === "bot" ? "Partida vs IA" : `Sala ${room.code}`}</p>
          <h2>Jugadores</h2>
          {room.players.map((player) => (
            <div className="player-row" key={player.id}>
              <span>{player.name}</span>
              <strong>{player.ready ? "Listo" : "Eligiendo"}</strong>
            </div>
          ))}
          <div className="log">
            <LogEntries entries={room.log} room={room} />
          </div>
        </section>
        {room.mode === "pvp" && <ChatPanel messages={room.chat || []} onSend={onSendChat} />}
      </aside>
    </section>
  );
}

function Battle({ room, me, opponent, isMyTurn, actorId, targetId, selectedActor, onActor, onTarget, onSkill, onEndTurn, onRemoveQueuedSkill, onMoveQueuedSkill, onExchangeChakra, onUndoChakraExchange, onSendChat, onToggleBotPause }) {
  const winner = room.players.find((player) => player.id === room.winnerId);
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const [inspectedMemberId, setInspectedMemberId] = useState("");
  const [footerDetailType, setFooterDetailType] = useState("character");
  const [pendingSkillId, setPendingSkillId] = useState("");
  const skillActorChangeRef = useRef("");
  const [visibleBotMessage, setVisibleBotMessage] = useState("");
  const [visibleChatBubble, setVisibleChatBubble] = useState(null);
  const [chakraExchangeOpen, setChakraExchangeOpen] = useState(false);
  const [negroOpen, setNegroOpen] = useState(false);
  const [emptyQueueConfirmOpen, setEmptyQueueConfirmOpen] = useState(false);
  const inspectedMember = [me, opponent]
    .flatMap((player) => player?.team || [])
    .find((member) => member.id === inspectedMemberId) || selectedActor;
  const inspectedSkills = inspectableSkillsForCharacter(inspectedMember?.character);
  const selectedActorSkills = activeSkillsForMember(selectedActor, selectedActor?.character);
  const inspectedSkill = footerDetailType === "skill"
    ? inspectedSkills.find((skill) => skill.id === inspectedSkillId) || inspectedSkills[0]
    : null;
  const pendingSkill = selectedActorSkills.find((skill) => skill.id === pendingSkillId);
  const activePlayer = room.players.find((player) => player.id === room.activePlayerId);
  const turnLabel = room.mode === "bot-vs-bot"
    ? `Turno de ${activePlayer?.name || "bot"}`
    : (isMyTurn ? "Tu turno" : "Turno rival");
  const pendingEligibleTargets = pendingSkill
    ? eligibleTargetsForSkill(pendingSkill, me, opponent, selectedActor)
      .filter((member) => meetsSkillRequirements(pendingSkill, me, opponent, selectedActor, [member]))
    : [];
  const eligibleTargetIds = new Set(pendingEligibleTargets.map((member) => member.id));
  const hasQueuedSkills = (me?.queue || []).length > 0;
  const exchangeRecord = me?.chakraExchange?.turn === room.turn ? me.chakraExchange : null;
  const exchange = exchangeRecord && !exchangeRecord.undone ? exchangeRecord : null;
  const canUndoExchange = Boolean(exchange && !hasQueuedSkills && (me?.chakra?.[exchange.receivedType] || 0) > 0);
  const canOpenExchange = isMyTurn && room.phase !== "finished" && !exchange && totalChakra(me?.chakra) >= 5;
  const exchangeButtonLabel = exchange ? "Deshacer intercambio" : "Intercambiar recursos";
  const queuedNegro = (me?.queue || []).reduce((total, action) => total + negroCost(action.chakra), 0);
  const chakraTotal = totalChakra(me?.chakra);
  const adjustedChakraTotal = Math.max(0, chakraTotal - queuedNegro);
  const defaultResolveOrder = useMemo(() => skillResolveItems(room, me, opponent), [room, me, opponent]);
  const ownBattleShare = playerHealthShare(me, opponent);
  const enemyBattleShare = playerHealthShare(opponent, me);
  const damageAnimationTurnKey = `${room.turn}:${room.activePlayerId}`;
  const chatMessages = room.chat || [];
  const latestChatMessage = chatMessages[chatMessages.length - 1] || null;
  const latestChatMessageId = latestChatMessage?.id || "";
  const lastVisibleChatRoomRef = useRef("");
  const lastVisibleChatMessageRef = useRef("");

  useEffect(() => {
    if (skillActorChangeRef.current === actorId) {
      skillActorChangeRef.current = "";
      return;
    }
    skillActorChangeRef.current = "";
    setPendingSkillId("");
    setInspectedMemberId(actorId);
    setInspectedSkillId("");
    setFooterDetailType("character");
  }, [actorId, room.turn]);

  useEffect(() => {
    if (room.mode !== "bot" || !room.botMessage) {
      setVisibleBotMessage("");
      return undefined;
    }
    setVisibleBotMessage(room.botMessage);
    const timeout = window.setTimeout(() => setVisibleBotMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [room.mode, room.botMessage]);

  useEffect(() => {
    if (room.mode !== "pvp") {
      setVisibleChatBubble(null);
      lastVisibleChatRoomRef.current = "";
      lastVisibleChatMessageRef.current = "";
      return undefined;
    }
    if (lastVisibleChatRoomRef.current !== room.code) {
      lastVisibleChatRoomRef.current = room.code;
      lastVisibleChatMessageRef.current = latestChatMessageId;
      setVisibleChatBubble(null);
      return undefined;
    }
    if (!latestChatMessageId) {
      setVisibleChatBubble(null);
      return undefined;
    }
    if (lastVisibleChatMessageRef.current === latestChatMessageId) return undefined;
    lastVisibleChatMessageRef.current = latestChatMessageId;
    setVisibleChatBubble(latestChatMessage);
    const timeout = window.setTimeout(() => setVisibleChatBubble(null), 5000);
    return () => window.clearTimeout(timeout);
  }, [room.mode, room.code, latestChatMessageId]);

  function clickMemberSkill(actor, skill) {
    if (!actor) return;
    setInspectedMemberId(actor.id || "");
    setInspectedSkillId(skill.id);
    setFooterDetailType("skill");
    if (actor.id !== selectedActor?.id) {
      skillActorChangeRef.current = actor.id;
      onActor(actor.id);
    }
    if (pendingSkillId === skill.id && actor.id === selectedActor?.id) {
      setPendingSkillId("");
      return;
    }
    if (pendingSkillId) {
      setPendingSkillId("");
    }
    if (canPrepareSkill(skill, actor)) {
      setPendingSkillId(skill.id);
    }
  }

  function canPrepareSkill(skill, actor = selectedActor) {
    if (!actor || actor.hp <= 0 || !skill || skill.passive === true) return false;
    const chakraCost = modifiedSkillChakraCost(actor, skill);
    const validTargets = eligibleTargetsForSkill(skill, me, opponent, actor)
      .filter((member) => meetsSkillRequirements(skill, me, opponent, actor, [member]));
    return isMyTurn
      && room.phase !== "finished"
      && !isSkillStunned(actor, skill)
      && !isSkillOutOfUses(actor, skill)
      && skillCooldownFor(actor, skill.id) <= 0
      && !isQueuedActor(me, actor?.id)
      && !isQueuedSkill(me, actor?.id, skill.id)
      && meetsSkillRequirements(skill, me, opponent, actor)
      && canPaySkillChakra(me?.chakra, chakraCost, queuedNegro)
      && validTargets.length > 0;
  }

  function inspectMember(member) {
    setInspectedMemberId(member.id);
    setInspectedSkillId("");
    setFooterDetailType("character");
  }

  function inspectSkill(skillId) {
    setInspectedSkillId(skillId);
    setFooterDetailType("skill");
  }

  async function pickFighter(member, ownTeam) {
    if (pendingSkill) {
      if (!eligibleTargetIds.has(member.id)) return;
      onTarget(member.id);
      const queued = await onSkill(pendingSkill.id, member.id);
      if (queued) setPendingSkillId("");
      return;
    }
    if (ownTeam && member.hp > 0) {
      onActor(member.id);
    }
  }

  function clickChakraExchange() {
    if (exchange) {
      if (!canUndoExchange) return;
      onUndoChakraExchange();
      return;
    }
    setChakraExchangeOpen(true);
  }

  function clickEndTurn() {
    if (!isMyTurn || room.phase === "finished") return;
    if (defaultResolveOrder.length > 0 || queuedNegro > 0) {
      setNegroOpen(true);
      return;
    }
    if (!hasQueuedSkills) {
      setEmptyQueueConfirmOpen(true);
      return;
    }
    onEndTurn(emptyChakra());
  }

  return (
    <section className="battle">
      <div className="battle-turn-strip">
        <div className="battle-turn-left">
          <div className="battle-turn-summary">
            <span className="turn-pill">Turno {room.turn}</span>
            <span className="resource-pill" title="Chakra disponible ajustado por cola">
              Recursos {queuedNegro > 0 ? `${adjustedChakraTotal}/${chakraTotal}` : chakraTotal}
            </span>
            {room.phase === "finished" ? (
              <span className="turn-pill active winner">Gano {winner?.name}</span>
            ) : (
              <span className={`turn-pill ${isMyTurn ? "active" : ""}`}>{turnLabel}</span>
            )}
            {room.mode === "bot-vs-bot" && (
              <button type="button" className="icon-button bot-pause-button" onClick={onToggleBotPause} title={room.botPaused ? "Reanudar bots" : "Pausar bots"}>
                {room.botPaused ? <Zap size={16} /> : <Minus size={16} />}
              </button>
            )}
          </div>
          <button className="end-turn" disabled={!isMyTurn || room.phase === "finished"} onClick={clickEndTurn}>
            <CheckCircle2 size={18} />
            Finalizar turno
          </button>
        </div>
        <div className="battle-turn-resources">
          <ChakraPool chakra={me?.chakra} />
          <button
            className={`chakra-exchange-button ${exchange ? "undo" : ""}`}
            disabled={exchange ? !isMyTurn || room.phase === "finished" || !canUndoExchange : !canOpenExchange}
            onClick={clickChakraExchange}
          >
            <ArrowLeftRight size={18} />
            {exchangeButtonLabel}
          </button>
          {exchange && hasQueuedSkills && <small className="chakra-exchange-hint">Hay habilidades en cola</small>}
        </div>
      </div>
      <div className="arena">
        <Team
          title={me?.name || "Tu equipo"}
          player={me}
          active={isMyTurn}
          disadvantage={ownBattleShare <= 1 - ADVANTAGE_HEALTH_SHARE}
          actorId={actorId}
          targetId={targetId}
          eligibleTargetIds={eligibleTargetIds}
          choosingTarget={Boolean(pendingSkill)}
          damageAnimationTurnKey={damageAnimationTurnKey}
          onInspect={inspectMember}
          onPick={pickFighter}
          ownTeam
          selectedActorId={selectedActor?.id}
          pendingSkillId={pendingSkillId}
          queue={me?.queue || []}
          removableQueue={isMyTurn}
          onSkillClick={clickMemberSkill}
          canPrepareSkill={canPrepareSkill}
          onRemoveQueuedSkill={onRemoveQueuedSkill}
          onMoveQueuedSkill={onMoveQueuedSkill}
          speechMessage={visibleChatBubble?.playerId === me?.id ? visibleChatBubble?.message || "" : ""}
        />
        <Team
          title={opponent?.name || "Oponente"}
          player={opponent}
          active={room.activePlayerId === opponent?.id}
          disadvantage={enemyBattleShare <= 1 - ADVANTAGE_HEALTH_SHARE}
          targetId={targetId}
          eligibleTargetIds={eligibleTargetIds}
          choosingTarget={Boolean(pendingSkill)}
          damageAnimationTurnKey={damageAnimationTurnKey}
          onInspect={inspectMember}
          onPick={pickFighter}
          targetable
          speechMessage={visibleBotMessage || (visibleChatBubble?.playerId === opponent?.id ? visibleChatBubble?.message || "" : "")}
        />
      </div>
      <aside className={`side-stack ${room.mode !== "pvp" ? "single-panel" : ""}`}>
        <CollapsiblePanel title="Registro" className="combat-log side-main">
          <div className="log">
            <LogEntries entries={room.log} room={room} />
          </div>
        </CollapsiblePanel>
        {room.mode === "pvp" && <ChatPanel messages={room.chat || []} onSend={onSendChat} collapsible />}
      </aside>
      <BattleSkillFooter member={inspectedMember} skill={inspectedSkill} detailType={footerDetailType} onSkill={inspectSkill} />
      {chakraExchangeOpen && (
        <ChakraExchangeModal
          chakra={me?.chakra}
          onClose={() => setChakraExchangeOpen(false)}
          onConfirm={async (receivedType, spent) => {
            const ok = await onExchangeChakra(receivedType, spent);
            if (ok) setChakraExchangeOpen(false);
          }}
        />
      )}
      {negroOpen && (
        <NegroModal
          chakra={me?.chakra}
          required={queuedNegro}
          resolveItems={defaultResolveOrder}
          onClose={() => setNegroOpen(false)}
          onConfirm={async (spent, resolveOrder) => {
            const ok = await onEndTurn(spent, resolveOrder);
            if (ok) setNegroOpen(false);
          }}
        />
      )}
      {emptyQueueConfirmOpen && (
        <EndTurnConfirmModal
          onClose={() => setEmptyQueueConfirmOpen(false)}
          onConfirm={async () => {
            const ok = await onEndTurn(emptyChakra());
            if (ok) setEmptyQueueConfirmOpen(false);
          }}
        />
      )}
    </section>
  );
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function logEntityNames(room) {
  const names = new Set();
  for (const player of room?.players || []) {
    if (player.name) names.add(player.name);
    for (const member of player.team || []) {
      if (member.character?.name) names.add(member.character.name);
    }
  }
  return [...names].sort((a, b) => b.length - a.length);
}

function RichLogText({ text, names }) {
  const namePattern = names.length > 0 ? new RegExp(`\\b(${names.map(escapeRegExp).join("|")})\\b`, "i") : null;
  const damagePattern = /\d+\s+de\s+dano(?:\s+(?:normal|perforante|de\s+afliccion))?/i;
  const effectPattern = /\b(invulnerabilidad|invulnerable)\b/i;
  const parts = [];
  let remaining = String(text || "");
  let index = 0;

  while (remaining) {
    const matches = [
      { type: "log-damage", match: damagePattern.exec(remaining) },
      { type: "log-effect", match: effectPattern.exec(remaining) },
      { type: "log-name", match: namePattern?.exec(remaining) || null }
    ].filter((item) => item.match);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    matches.sort((a, b) => a.match.index - b.match.index);
    const next = matches[0];
    if (next.match.index > 0) parts.push(remaining.slice(0, next.match.index));
    parts.push(
      <span className={next.type} key={`${next.type}-${index}`}>
        {next.match[0]}
      </span>
    );
    remaining = remaining.slice(next.match.index + next.match[0].length);
    index += 1;
  }

  return <>{parts}</>;
}

function LogEntries({ entries = [], room }) {
  const names = logEntityNames(room);
  return entries.map((item, index) => (
    item?.type === "separator"
      ? <hr key={item.id || `separator-${index}`} className="log-separator" />
      : <p key={`${item}-${index}`}><RichLogText text={item} names={names} /></p>
  ));
}

function skillResolveItems(room, me, opponent) {
  const ownedMemberIds = new Set((me?.team || []).map((member) => member.id));
  const resolvingPlayer = room?.activePlayerId === me?.id ? opponent : me;
  const effectItems = (resolvingPlayer?.team || []).flatMap((member) => (
    (member.statusEffects || [])
      .filter((effect) => (
        effect.type === "complex"
        && (effect.turns > 0 || effect.turns === -1)
        && effect.originActorId
        && ownedMemberIds.has(effect.originActorId)
        && effect.createdTurn !== room.turn
      ))
      .map((effect) => ({
        id: `status:${effect.id}`,
        type: "status",
        statusId: effect.id,
        iconSkillId: groupStatusEffects([effect])[0]?.sourceSkillId || effect.statusIconSkillId || effect.sourceSkillId,
        title: effect.sourceSkillName || "Efecto",
        subtitle: member.character?.name || member.characterId || "Objetivo",
        owner: effect.sourceActorName || "Efecto propio"
      }))
  ));
  const skillItems = (me?.queue || []).map((action) => ({
    id: `skill:${action.id}`,
    type: "skill",
    actionId: action.id,
    skillId: action.skillId,
    title: action.skillName,
    subtitle: `${action.actorName} a ${action.targetName}`,
    owner: action.actorName
  }));
  return [...effectItems, ...skillItems];
}

function ChakraExchangeModal({ chakra, onClose, onConfirm }) {
  const [receivedType, setReceivedType] = useState(chakraTypes[0].id);
  const [spent, setSpent] = useState(() => emptyChakra());
  const spentTotal = totalChakra(spent);

  function moveToExchange(type) {
    setSpent((current) => {
      if (totalChakra(current) >= 5) return current;
      if ((chakra?.[type] || 0) - (current[type] || 0) <= 0) return current;
      return { ...current, [type]: (current[type] || 0) + 1 };
    });
  }

  function returnFromExchange(type) {
    setSpent((current) => {
      if ((current[type] || 0) <= 0) return current;
      return { ...current, [type]: current[type] - 1 };
    });
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="chakra-exchange-title">
      <div className="chakra-exchange-modal">
        <header>
          <div>
            <p className="eyebrow">Turno actual</p>
            <h2 id="chakra-exchange-title">Intercambio de chakra</h2>
            <p className="modal-copy">Intercambia 5 recursos por 1 recurso especifico</p>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar intercambio">
            <X size={18} />
          </button>
        </header>
        <div className="chakra-choice" aria-label="Chakra a recibir">
          <h3>Recurso que quieres tener</h3>
          {chakraTypes.map((type) => (
            <button
              type="button"
              key={type.id}
              className={`chakra-choice-button ${type.className} ${receivedType === type.id ? "selected" : ""}`}
              onClick={() => setReceivedType(type.id)}
            >
              {type.label}
            </button>
          ))}
        </div>
        <section className="exchange-payment-list" aria-label="Recursos que estas pagando">
          <h3>Recursos que pagas</h3>
          {chakraTypes.map((type) => {
            const paid = spent[type.id] || 0;
            const remaining = (chakra?.[type.id] || 0) - paid;
            return (
              <div className="exchange-payment-row" key={type.id}>
                <button type="button" className="icon-button" onClick={() => returnFromExchange(type.id)} disabled={paid <= 0} aria-label={`Quitar ${type.label} del intercambio`}>
                  <Minus size={16} />
                </button>
                <span className={`chakra-dot ${type.className}`} />
                <strong className="exchange-chakra-name">
                  <span>{type.label}</span>
                  <small>Tienes {remaining}</small>
                </strong>
                <span className="exchange-paid-count">
                  <b>{paid}</b>
                  <small>pagando</small>
                </span>
                <button type="button" className="icon-button" onClick={() => moveToExchange(type.id)} disabled={spentTotal >= 5 || remaining <= 0} aria-label={`Agregar ${type.label} al intercambio`}>
                  <Plus size={16} />
                </button>
              </div>
            );
          })}
        </section>
        <footer>
          <strong>{spentTotal} / 5</strong>
          <button type="button" disabled={spentTotal !== 5} onClick={() => onConfirm(receivedType, spent)}>
            <ArrowLeftRight size={18} />
            Confirmar intercambio
          </button>
        </footer>
      </div>
    </div>
  );
}

function NegroModal({ chakra, required, resolveItems = [], onClose, onConfirm }) {
  const [spent, setSpent] = useState(() => emptyChakra());
  const [orderedItems, setOrderedItems] = useState(resolveItems);
  const spentTotal = totalChakra(spent);

  useEffect(() => {
    setOrderedItems(resolveItems);
  }, [resolveItems]);

  function addPayment(type) {
    setSpent((current) => {
      if (totalChakra(current) >= required) return current;
      if ((chakra?.[type] || 0) - (current[type] || 0) <= 0) return current;
      return { ...current, [type]: (current[type] || 0) + 1 };
    });
  }

  function removePayment(type) {
    setSpent((current) => {
      if ((current[type] || 0) <= 0) return current;
      return { ...current, [type]: current[type] - 1 };
    });
  }

  function moveResolveItem(index, direction) {
    const nextIndex = direction === "left" ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= orderedItems.length) return;
    setOrderedItems((current) => {
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  const resolveOrder = orderedItems.map((item) => ({
    type: item.type,
    actionId: item.actionId,
    statusId: item.statusId
  }));

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="negro-chakra-title">
      <div className="chakra-exchange-modal neutral-chakra-modal">
        <header>
          <div>
            <p className="eyebrow">Finalizar turno</p>
            <h2 id="negro-chakra-title">Orden de resolucion</h2>
            <p className="modal-copy">{required > 0 ? `Completa ${required} recurso negro con tus recursos disponibles.` : "No hay recurso negro pendiente."}</p>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar pago negro">
            <X size={18} />
          </button>
        </header>
        {required > 0 && (
          <section className="exchange-payment-list" aria-label="Recursos que estas pagando">
            <h3>Recursos que pagas</h3>
            {chakraTypes.map((type) => {
              const paid = spent[type.id] || 0;
              const remaining = (chakra?.[type.id] || 0) - paid;
              return (
                <div className="exchange-payment-row" key={type.id}>
                  <button type="button" className="icon-button" onClick={() => removePayment(type.id)} disabled={paid <= 0} aria-label={`Quitar ${type.label} del pago negro`}>
                    <Minus size={16} />
                  </button>
                  <span className={`chakra-dot ${type.className}`} />
                  <strong className="exchange-chakra-name">
                    <span>{type.label}</span>
                    <small>Tienes {remaining}</small>
                  </strong>
                  <span className="exchange-paid-count">
                    <b>{paid}</b>
                    <small>pagando</small>
                  </span>
                  <button type="button" className="icon-button" onClick={() => addPayment(type.id)} disabled={spentTotal >= required || remaining <= 0} aria-label={`Agregar ${type.label} al pago negro`}>
                    <Plus size={16} />
                  </button>
                </div>
              );
            })}
          </section>
        )}
        <section className="resolve-order-panel" aria-label="Orden de resolucion">
          <h3>Se resolvera en este orden</h3>
          <div className="resolve-order-list">
            {orderedItems.map((item, index) => (
              <article className={`resolve-order-card ${item.type}`} key={item.id}>
                <div className="resolve-order-controls">
                  <button type="button" className="icon-button" disabled={index === 0} onClick={() => moveResolveItem(index, "left")} aria-label={`Mover ${item.title} a la izquierda`}>
                    <ChevronLeft size={15} />
                  </button>
                  <button type="button" className="icon-button" disabled={index === orderedItems.length - 1} onClick={() => moveResolveItem(index, "right")} aria-label={`Mover ${item.title} a la derecha`}>
                    <ChevronRight size={15} />
                  </button>
                </div>
                {item.type === "skill" && <SquareImage alt={item.title} src={skillImage(item.skillId)} />}
                {item.type === "status" && <SquareImage alt={item.title} src={skillImage(item.iconSkillId || item.skillId)} />}
                <strong>{item.title}</strong>
                <small>{item.subtitle}</small>
              </article>
            ))}
          </div>
        </section>
        <footer>
          <strong>{spentTotal} / {required}</strong>
          <button type="button" disabled={spentTotal !== required} onClick={() => onConfirm(spent, resolveOrder)}>
            <CheckCircle2 size={18} />
            Pagar y finalizar
          </button>
        </footer>
      </div>
    </div>
  );
}

function EndTurnConfirmModal({ onClose, onConfirm }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="empty-queue-title">
      <div className="end-turn-confirm-modal">
        <h2 id="empty-queue-title">No hay habilidades en cola</h2>
        <p>Vas a finalizar el turno sin ejecutar acciones.</p>
        <footer>
          <button type="button" className="secondary" onClick={onClose}>Atras</button>
          <button type="button" onClick={onConfirm}>
            <CheckCircle2 size={18} />
            Finalizar turno
          </button>
        </footer>
      </div>
    </div>
  );
}

function PatchNotesPopup({ onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="patch-notes-popup-title">
      <div className="patch-notes-modal">
        <PatchNotesView onBack={onClose} />
      </div>
    </div>
  );
}

function LobbyInspectionFooter({ character, selected, selectDisabled, selectLabel, skillId, onSkill, onToggle }) {
  if (!character) return null;
  const skills = inspectableSkillsForCharacter(character);
  const inspectedSkill = skills.find((skill) => skill.id === skillId);
  return (
    <section className="character-skill-footer lobby-inspection-footer">
      <div className="lobby-inspection-actions">
        <button type="button" className={selected ? "secondary" : ""} onClick={onToggle} disabled={selectDisabled}>
          {selectLabel}
        </button>
      </div>
      <div className="battle-skill-strip" aria-label={`Habilidades de ${character.name}`}>
        {skills.map((skill) => (
          <button
            type="button"
            key={skill.id}
            className={`${inspectedSkill?.id === skill.id ? "selected" : ""} ${skill.passive ? "unavailable" : ""}`}
            aria-disabled={skill.passive === true}
            onClick={() => onSkill(skill.id)}
            aria-label={skill.name}
          >
            <SquareImage alt={skill.name} src={skillImage(skill.id)} />
          </button>
        ))}
      </div>
      {inspectedSkill ? <SkillFooter skill={inspectedSkill} /> : <CharacterFooter character={character} />}
    </section>
  );
}

function BattleSkillFooter({ member, skill, detailType, onSkill }) {
  if (!member) return null;
  const skills = inspectableSkillsForCharacter(member.character);
  return (
    <section className="battle-skill-footer">
      <div className="battle-skill-strip" aria-label={`Habilidades de ${member.character.name}`}>
        {skills.map((item) => (
          <button
            type="button"
            key={item.id}
            className={`${detailType === "skill" && skill?.id === item.id ? "selected" : ""} ${item.passive ? "unavailable" : ""}`}
            aria-disabled={item.passive === true}
            onClick={() => onSkill(item.id)}
            aria-label={item.name}
          >
            <SquareImage alt={item.name} src={skillImage(item.id)} />
          </button>
        ))}
      </div>
      {detailType === "skill" && skill ? <SkillFooter skill={skill} /> : <CharacterFooter member={member} />}
    </section>
  );
}

function CharacterFooter({ member, character: characterOverride, compact = false }) {
  const character = member?.character || characterOverride;
  if (!character) return null;
  const currentHp = member?.hp ?? character.maxHp;
  const avatarImageId = member?.avatarImageId || character.id;
  return (
    <footer className={`skill-footer character-detail-footer ${compact ? "compact" : ""}`}>
      <SquareImage alt={character.name} src={characterImage(avatarImageId)} />
      <div className="skill-footer-body">
        <h2>{character.name}</h2>
        <p className="skill-footer-description">{characterDescription(character)}</p>
        <div className="skill-footer-meta">
          <span><b>Vida:</b> {currentHp}/{character.maxHp}</span>
        </div>
      </div>
    </footer>
  );
}

function characterDescription(character) {
  const explicitDescription = character.description || character.bio || character.lore || character.summary;
  if (explicitDescription) return explicitDescription;
  const skills = inspectableSkillsForCharacter(character).map((skill) => skill.name);
  if (skills.length) {
    return `Vida maxima: ${character.maxHp}. Habilidades: ${skills.join(", ")}.`;
  }
  return `Vida maxima: ${character.maxHp}.`;
}

function SkillFooter({ skill, compact = false }) {
  if (!skill) return null;
  return (
    <footer className={`skill-footer ${compact ? "compact" : ""}`}>
      <SquareImage alt={skill.name} src={skillImage(skill.id)} />
      <div className="skill-footer-body">
        <h2>{skill.name}</h2>
        <p className="skill-footer-description">{skill.description}</p>
        <div className="skill-footer-meta">
          <span><b>Objetivo:</b> {skill.passive ? "Pasiva" : footerTargetTypeLabel(skill.targetType)}</span>
          <span><b>Costo:</b> {skill.passive ? "No usable" : <ChakraCost chakra={skill.cost} />}</span>
          <span><b>Cooldown:</b> {skill.cooldown || 0}</span>
        </div>
        <p className="skill-footer-families"><b>Familias:</b> {skill.family?.length ? skillClassesLabel(skill.family) : "Ninguna"}</p>
      </div>
    </footer>
  );
}

function footerTargetTypeLabel(type) {
  if (type === "enemy") return "1 enemigo";
  if (type === "ally" || type === "otherAlly") return "1 aliado";
  if (type === "anyOtherAlly") return "1 aliado vivo o caido";
  if (type === "deadAlly" || type === "deadOtherAlly") return "1 aliado caido";
  if (type === "enemies") return "Todos los enemigos";
  if (type === "allies") return "Todos los aliados";
  if (type === "self") return "A si mismo";
  if (type === "allPlayers") return "Todos los personajes";
  if (type === "anyCharacter") return "Cualquier personaje";
  return targetTypeLabel(type);
}

function damageSeverityClass(damage, maxHp) {
  const percent = maxHp > 0 ? (damage / maxHp) * 100 : 0;
  if (percent <= 0) return "";
  if (percent <= 20) return "damage-minor";
  if (percent <= 40) return "damage-light";
  if (percent <= 60) return "damage-major";
  return "damage-critical";
}

function injurySeverityClass(member) {
  const maxHp = Math.max(1, Number(member?.character?.maxHp || 0));
  const hp = Math.max(0, Number(member?.hp || 0));
  if (hp >= maxHp) return "";
  if (hp <= 0) return "injury-severe";
  const missingPercent = ((maxHp - hp) / maxHp) * 100;
  if (missingPercent < 34) return "injury-light";
  if (missingPercent < 67) return "injury-moderate";
  return "injury-severe";
}

function FighterSkillRail({ member, selectedActorId, pendingSkillId, queuedActions = [], removable, onSkillClick, canPrepareSkill, onRemove, onMove }) {
  const skills = actionSkillsForMember(member, member?.character);
  const queuedAction = queuedActions[0];

  return (
    <div className="fighter-action-lane" aria-label={`Habilidades de ${member.character.name}`}>
      {skills.map((skill) => {
        const isPending = selectedActorId === member.id && pendingSkillId === skill.id;
        const disabled = !isPending && !canPrepareSkill(skill, member);
        const cooldown = skillCooldownFor(member, skill.id);
        const outOfUses = isSkillOutOfUses(member, skill);
        const chakraCost = modifiedSkillChakraCost(member, skill);
        return (
          <button
            type="button"
            key={skill.id}
            className={`fighter-skill-button ${disabled ? "unavailable" : ""} ${isPending ? "pending" : ""}`}
            aria-disabled={disabled}
            title={`${skill.name}${outOfUses ? " - Sin usos disponibles" : ""}`}
            onClick={(event) => {
              event.stopPropagation();
              onSkillClick(member, skill);
            }}
          >
            <span className="skill-icon">
              <SquareImage alt={skill.name} src={skillImage(skill.id)} />
              {cooldown > 0 && <b className="cooldown-count">{cooldown}</b>}
            </span>
            {!skill.passive && <small><ChakraCost chakra={chakraCost} /></small>}
          </button>
        );
      })}
      <span className="fighter-queue-separator" aria-hidden="true" />
      <div className={`fighter-queue-slot ${queuedAction ? "" : "empty"}`} aria-label="Habilidad en cola">
        {queuedAction && (
          <FighterQueuedSkill
            item={queuedAction}
            removable={removable}
            onRemove={onRemove}
          />
        )}
      </div>
    </div>
  );
}

function FighterQueuedSkill({ item, removable, onRemove }) {
  return (
    <div className="fighter-queued-skill">
      <button
        type="button"
        disabled={!removable}
        title={`${item.skillName}: ${item.actorName} a ${item.targetName}`}
        onClick={(event) => {
          event.stopPropagation();
          onRemove(item.id);
        }}
      >
        <SquareImage alt={item.skillName} src={skillImage(item.skillId)} />
      </button>
    </div>
  );
}

function Team({
  title,
  player,
  active,
  disadvantage = false,
  actorId,
  targetId,
  eligibleTargetIds = new Set(),
  choosingTarget = false,
  damageAnimationTurnKey = "",
  onInspect,
  onPick,
  targetable = false,
  ownTeam = false,
  selectedActorId = "",
  pendingSkillId = "",
  queue = [],
  removableQueue = false,
  onSkillClick = () => {},
  canPrepareSkill = () => false,
  onRemoveQueuedSkill = () => {},
  onMoveQueuedSkill = () => {},
  speechMessage = ""
}) {
  const previousHpRef = useRef(new Map());
  const [damageAnimations, setDamageAnimations] = useState({});
  const queueLength = queue.length;

  useEffect(() => {
    previousHpRef.current = new Map((player?.team || []).map((member) => [member.id, member.hp]));
    setDamageAnimations({});
  }, [player?.id]);

  useEffect(() => {
    const nextHp = new Map();
    const nextAnimations = {};
    for (const member of player?.team || []) {
      const previousHp = previousHpRef.current.get(member.id);
      nextHp.set(member.id, member.hp);
      if (previousHp === undefined || member.hp >= previousHp) continue;
      const severity = damageSeverityClass(previousHp - member.hp, member.character.maxHp);
      if (severity) nextAnimations[member.id] = { severity, token: `${member.hp}-${Date.now()}` };
    }
    previousHpRef.current = nextHp;
    if (Object.keys(nextAnimations).length === 0) return;
    setDamageAnimations((current) => ({ ...current, ...nextAnimations }));
    const timeout = window.setTimeout(() => {
      setDamageAnimations((current) => {
        const remaining = { ...current };
        for (const memberId of Object.keys(nextAnimations)) delete remaining[memberId];
        return remaining;
      });
    }, 720);
    return () => window.clearTimeout(timeout);
  }, [damageAnimationTurnKey]);

  return (
    <div className={`team ${ownTeam ? "own-team" : "enemy-team"} ${player?.side || ""} ${active ? "active" : ""} ${disadvantage ? "disadvantage" : ""}`}>
      {speechMessage && <SpeechBubble message={speechMessage} align={ownTeam ? "left" : "right"} />}
      <h2>{title}</h2>
      <div className="fighters">
        {player?.team.map((member) => {
          const damageAnimation = choosingTarget && targetable ? null : damageAnimations[member.id];
          const eligible = choosingTarget && eligibleTargetIds.has(member.id);
          const invulnerable = targetable && hasStatus(member, "invulnerable");
          const untargetable = invulnerable && !eligible;
          const selectable = member.hp > 0 && eligible;
          const portraitSrc = member.hp <= 0 ? skullImage : characterImage(member.avatarImageId || member.character.id);
          const mirrorEnemyPortrait = targetable && member.hp > 0 && !String(portraitSrc).startsWith("data:image/svg+xml");
          const fighterHint = !choosingTarget && untargetable ? "Invulnerable" : "";
          const injuryClass = injurySeverityClass(member);
          const queuedActions = ownTeam
            ? queue
              .map((item, index) => ({ ...item, queueIndex: index, queueLength }))
              .filter((item) => item.actorId === member.id)
            : [];
          return (
            <div
              className={`fighter ${ownTeam ? "fighter-with-actions" : ""} ${injuryClass} ${damageAnimation ? `damage-shake ${damageAnimation.severity}` : ""} ${actorId === member.id ? "actor-picked" : ""} ${ownTeam && targetId === member.id ? "target-picked" : ""} ${eligible ? "target-eligible" : ""} ${member.hp <= 0 ? "down" : ""} ${untargetable && !eligible ? "untargetable" : ""}`}
              key={member.id}
              data-damage-token={damageAnimation?.token}
              onClick={() => {
                if (!selectable) return;
                onPick?.(member, ownTeam);
              }}
              role="button"
              tabIndex={0}
              aria-disabled={!selectable}
            >
              <div className="fighter-card-main">
                {!ownTeam && (
                  <div className="fighter-opponent-status">
                    <StatusEffects member={member} effects={member.statusEffects || []} className="enemy-status-row" />
                  </div>
                )}
                <div
                  className="fighter-top"
                  onClick={(event) => {
                    event.stopPropagation();
                    if (selectable) {
                      onPick?.(member, ownTeam);
                      return;
                    }
                    onInspect?.(member);
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    event.stopPropagation();
                    if (selectable) {
                      onPick?.(member, ownTeam);
                      return;
                    }
                    onInspect?.(member);
                  }}
                >
                  <SquareImage
                    alt={member.hp <= 0 ? `${member.character.name} derrotado` : member.character.name}
                    className={mirrorEnemyPortrait ? "enemy-combat-portrait" : ""}
                    src={portraitSrc}
                  />
                </div>
                <strong>{member.character.name}</strong>
                <Health current={member.hp} max={member.character.maxHp} />
                <span className="stats">
                  <HeartPulse size={14} /> {member.hp}
                  <Shield size={14} /> {member.shield}
                </span>
                {fighterHint && <small>{fighterHint}</small>}
              </div>
              {ownTeam && (
                <div className="fighter-rail">
                  <StatusEffects member={member} effects={member.statusEffects || []} className="ally-status-row" />
                  <FighterSkillRail
                    member={member}
                    selectedActorId={selectedActorId}
                    pendingSkillId={pendingSkillId}
                    queuedActions={queuedActions}
                    removable={removableQueue}
                    onSkillClick={onSkillClick}
                    canPrepareSkill={canPrepareSkill}
                    onRemove={onRemoveQueuedSkill}
                    onMove={onMoveQueuedSkill}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SpeechBubble({ message, align = "left" }) {
  return (
    <div className={`speech-bubble ${align}`} role="status" aria-live="polite">
      {message}
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
