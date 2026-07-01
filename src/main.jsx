import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { ArrowDown, ArrowLeftRight, ArrowUp, CheckCircle2, ChevronLeft, ChevronRight, Copy, ListChecks, LoaderCircle, Minus, Monitor, Plus, RefreshCw, RotateCcw, Search, Smartphone, Swords, Trash2, Users, Shield, HeartPulse, X, Zap } from "lucide-react";
import messageSound from "./assets/sounds/message.mp3";
import ninjaSound from "./assets/sounds/ninja.mp3";
import notifierSound from "./assets/sounds/notifier.mp3";
import deathSound from "./assets/sounds/death.mp3";
import { ChakraCost, ChakraIcon, ChakraPool, Health, SquareImage } from "./components/common.jsx";
import { ChatPanel, CollapsiblePanel } from "./components/ChatPanel.jsx";
import { MainMenu } from "./components/MainMenu.jsx";
import { OptionsModal, ResultModal } from "./components/Overlays.jsx";
import { PatchNotesView } from "./components/PatchNotesView.jsx";
import { StatusEffects } from "./components/StatusEffects.jsx";
import { allAssetUrls, backgroundImages, characterImage, characterSound, skillImage, skullImage } from "./game/assets.js";
import { canPaySkillChakra, chakraTypes, emptyChakra, neutralChakraCost, totalChakra } from "./game/chakra.js";
import { eligibleTargetsForSkill, hasStatus, isQueuedActor, isQueuedSkill, isSkillOutOfUses, isSkillStunned, meetsSkillRequirements, playerHealthShare, skillCooldownFor, teamHealthPercent } from "./game/battleRules.js";
import { targetTypeLabel } from "./game/labels.js";
import { modifiedSkillChakraCost } from "../shared/chakraCostModifiers.js";
import { skillClassesLabel } from "../shared/effects.js";
import { actionSkillsForMember, activeSkillsForMember, baseSkillsForCharacter, inspectableSkillsForCharacter } from "../shared/skillReplacements.js";
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
      turnAudioRef.current.volume = sfxVolume;
    }
    if (messageAudioRef.current && messageAudioRef.current.paused) {
      messageAudioRef.current.volume = sfxVolume;
    }
    if (bgmAudioRef.current && !bgmAudioRef.current.paused) {
      bgmAudioRef.current.volume = musicVolume * BGM_VOLUME_RATIO;
    }
    if (resultAudioRef.current && resultAudioRef.current.paused) {
      resultAudioRef.current.volume = sfxVolume;
    }
    if (deathAudioRef.current && deathAudioRef.current.paused) {
      deathAudioRef.current.volume = sfxVolume;
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

  function fadeAudioTo(audio, targetVolume, durationMs, onDone) {
    const startedAt = performance.now();
    const initialVolume = audio.volume;

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / durationMs);
      audio.volume = initialVolume + (targetVolume - initialVolume) * progress;
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
    const duration = Math.max(0, durationMs);

    if (duration === 0) {
      audio.volume = targetVolume;
      onDone?.();
      return;
    }

    function tick(now) {
      const progress = Math.min(1, (now - startedAt) / duration);
      audio.volume = initialVolume + (targetVolume - initialVolume) * progress;
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
      audio.volume = 0;
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
    audio.volume = config?.shouldFadeIn ? 0 : sfxVolume;

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
    audio.volume = 0;
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
      audio.volume = sfxVolume;
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
    audio.volume = 0;

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
    audio.volume = sfxVolume;

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

  async function endTurn(neutralChakra = emptyChakra()) {
    setError("");
    const response = await callSocket("battle:endTurn", { neutralChakra });
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
      <section className="topbar">
        <div className="topbar-brand">
          <h1>Sote Arena</h1>
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
            Volver
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
        Volver
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
  { id: "neutralChakra", label: "Neutral", className: "neutral" }
];

function characterChakraUsage(character) {
  const totals = chakraUsageTypes.reduce((usage, type) => ({ ...usage, [type.id]: 0 }), {});
  for (const skill of baseSkillsForCharacter(character)) {
    for (const type of chakraUsageTypes) {
      totals[type.id] += Math.max(0, Number(skill.chakra?.[type.id] || 0));
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
    for (const skill of baseSkillsForCharacter(character)) {
      for (const type of chakraUsageTypes) {
        totals[type.id] += Math.max(0, Number(skill.chakra?.[type.id] || 0));
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

function CharactersCatalog({ characters, onBack }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inspectedCharacterId, setInspectedCharacterId] = useState("");
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const [footerDetailType, setFooterDetailType] = useState("character");
  const filteredCharacters = filterCharacters(characters, search);
  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = filteredCharacters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inspectedCharacter = filteredCharacters.find((character) => character.id === inspectedCharacterId) || pageCharacters[0];
  const inspectedSkills = inspectableSkillsForCharacter(inspectedCharacter);
  const inspectedSkill = footerDetailType === "skill"
    ? inspectedSkills.find((skill) => skill.id === inspectedSkillId) || inspectedSkills[0]
    : null;

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (inspectedCharacterId && !filteredCharacters.some((character) => character.id === inspectedCharacterId)) {
      setInspectedCharacterId(pageCharacters[0]?.id || "");
      setInspectedSkillId("");
      setFooterDetailType("character");
    } else if (!inspectedCharacterId && pageCharacters[0]) {
      setInspectedCharacterId(pageCharacters[0].id);
      setInspectedSkillId("");
      setFooterDetailType("character");
    }
  }, [filteredCharacters, inspectedCharacterId, pageCharacters]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function inspectCharacter(characterId) {
    setInspectedCharacterId(characterId);
    setInspectedSkillId("");
    setFooterDetailType("character");
  }

  function inspectCatalogSkill(skillId) {
    setInspectedSkillId(skillId);
    setFooterDetailType("skill");
  }

  return (
    <section className="characters-catalog panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Personajes</p>
          <h2>Lista de personajes ({characters.length})</h2>
        </div>
        <button type="button" className="secondary" onClick={onBack}>
          Atras
        </button>
      </div>
      <CharacterSearch value={search} onChange={setSearch} placeholder="Buscar personaje" />
      {characters.length === 0 ? <LoadingSpinner label="Cargando personajes" /> : <div className="character-grid">
        {pageCharacters.map((character) => (
          <button
            key={character.id}
            className={`character-card ${inspectedCharacter?.id === character.id ? "inspected" : ""}`}
            onClick={() => inspectCharacter(character.id)}
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
      {inspectedCharacter && (
        <footer className="character-skill-footer">
          <div className="lobby-skill-strip" aria-label={`Habilidades de ${inspectedCharacter.name}`}>
            {inspectedSkills.map((skill) => (
              <button
                type="button"
                key={skill.id}
                className={footerDetailType === "skill" && inspectedSkill?.id === skill.id ? "selected" : ""}
                onClick={() => inspectCatalogSkill(skill.id)}
                aria-label={skill.name}
              >
                <SquareImage alt={skill.name} src={skillImage(skill.id)} />
              </button>
            ))}
          </div>
          <CharacterChakraUsage character={inspectedCharacter} />
          {footerDetailType === "skill" && inspectedSkill
            ? <SkillFooter skill={inspectedSkill} compact />
            : <CharacterFooter character={inspectedCharacter} compact />}
        </footer>
      )}
    </section>
  );
}

function Lobby({ characters, selected, me, room, onToggle, onConfirm, onRandomTeam, onUnconfirm, onSendChat }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inspectedCharacterId, setInspectedCharacterId] = useState("");
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const [footerDetailType, setFooterDetailType] = useState("character");
  const filteredCharacters = filterCharacters(characters, search);
  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = filteredCharacters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inspectedCharacter = filteredCharacters.find((character) => character.id === inspectedCharacterId);
  const inspectedSkills = inspectableSkillsForCharacter(inspectedCharacter);
  const inspectedSkill = footerDetailType === "skill"
    ? inspectedSkills.find((skill) => skill.id === inspectedSkillId) || inspectedSkills[0]
    : null;
  const selectedCharacters = selected
    .map((characterId) => characters.find((character) => character.id === characterId))
    .filter(Boolean);
  const randomTeamLabel = selected.length > 0 ? "Completar Equipo Random" : "Equipo Random";

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  useEffect(() => {
    if (inspectedCharacterId && !filteredCharacters.some((character) => character.id === inspectedCharacterId)) {
      setInspectedCharacterId("");
      setInspectedSkillId("");
      setFooterDetailType("character");
    }
  }, [filteredCharacters, inspectedCharacterId]);

  function clickCharacter(characterId) {
    setInspectedCharacterId(characterId);
    setInspectedSkillId("");
    setFooterDetailType("character");
    onToggle(characterId);
  }

  function inspectLobbySkill(skillId) {
    setInspectedSkillId(skillId);
    setFooterDetailType("skill");
  }

  return (
    <section className="lobby">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Equipo</p>
            <div className="selection-title">
              <div className="selection-heading">
                <h2>Elige 3 personajes</h2>
                <button type="button" className="secondary random-team-button" onClick={onRandomTeam} disabled={me?.ready || characters.length < 3}>
                  <RefreshCw size={16} />
                  {randomTeamLabel}
                </button>
              </div>
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
              className={`character-card ${selected.includes(character.id) ? "selected" : ""}`}
              onClick={() => clickCharacter(character.id)}
              disabled={me?.ready}
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
        {inspectedCharacter && (
          <footer className="character-skill-footer">
            <div className="lobby-skill-strip" aria-label={`Habilidades de ${inspectedCharacter.name}`}>
              {inspectedSkills.map((skill) => (
                <button
                  type="button"
                  key={skill.id}
                  className={footerDetailType === "skill" && inspectedSkill?.id === skill.id ? "selected" : ""}
                  onClick={() => inspectLobbySkill(skill.id)}
                  disabled={me?.ready}
                  aria-label={skill.name}
                >
                  <SquareImage alt={skill.name} src={skillImage(skill.id)} />
                </button>
              ))}
            </div>
            <CharacterChakraUsage character={inspectedCharacter} />
            {footerDetailType === "skill" && inspectedSkill
              ? <SkillFooter skill={inspectedSkill} compact />
              : <CharacterFooter character={inspectedCharacter} compact />}
          </footer>
        )}
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
  const [chakraExchangeOpen, setChakraExchangeOpen] = useState(false);
  const [neutralChakraOpen, setNeutralChakraOpen] = useState(false);
  const [emptyQueueConfirmOpen, setEmptyQueueConfirmOpen] = useState(false);
  const inspectedMember = [me, opponent]
    .flatMap((player) => player?.team || [])
    .find((member) => member.id === inspectedMemberId) || selectedActor;
  const inspectedSkills = inspectableSkillsForCharacter(inspectedMember?.character);
  const selectedActorSkills = activeSkillsForMember(selectedActor, selectedActor?.character);
  const selectedActorDisplaySkills = actionSkillsForMember(selectedActor, selectedActor?.character);
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
  const queuedNeutralChakra = (me?.queue || []).reduce((total, action) => total + neutralChakraCost(action.chakra), 0);
  const chakraTotal = totalChakra(me?.chakra);
  const adjustedChakraTotal = Math.max(0, chakraTotal - queuedNeutralChakra);
  const ownBattleShare = playerHealthShare(me, opponent);
  const enemyBattleShare = playerHealthShare(opponent, me);
  const damageAnimationTurnKey = `${room.turn}:${room.activePlayerId}`;

  useEffect(() => {
    setPendingSkillId("");
    setInspectedMemberId(actorId);
    setInspectedSkillId("");
    setFooterDetailType("character");
  }, [actorId, room.turn]);

  function clickSkill(skill) {
    setInspectedMemberId(selectedActor?.id || "");
    setInspectedSkillId(skill.id);
    setFooterDetailType("skill");
    if (pendingSkillId === skill.id) {
      setPendingSkillId("");
      return;
    }
    if (pendingSkillId) {
      setPendingSkillId("");
    }
    if (canPrepareSkill(skill)) {
      setPendingSkillId(skill.id);
    }
  }

  function canPrepareSkill(skill) {
    if (!skill || skill.passive === true) return false;
    const chakraCost = modifiedSkillChakraCost(selectedActor, skill);
    const validTargets = eligibleTargetsForSkill(skill, me, opponent, selectedActor)
      .filter((member) => meetsSkillRequirements(skill, me, opponent, selectedActor, [member]));
    return isMyTurn
      && room.phase !== "finished"
      && !isSkillStunned(selectedActor, skill)
      && !isSkillOutOfUses(selectedActor, skill)
      && skillCooldownFor(selectedActor, skill.id) <= 0
      && !isQueuedActor(me, selectedActor?.id)
      && !isQueuedSkill(me, selectedActor?.id, skill.id)
      && meetsSkillRequirements(skill, me, opponent, selectedActor)
      && canPaySkillChakra(me?.chakra, chakraCost, queuedNeutralChakra)
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
    if ((me?.queue || []).length === 0) {
      setEmptyQueueConfirmOpen(true);
      return;
    }
    if (queuedNeutralChakra > 0) {
      setNeutralChakraOpen(true);
      return;
    }
    onEndTurn(emptyChakra());
  }

  return (
    <section className="battle">
      <BalanceBar me={me} opponent={opponent} />
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
        />
        <div className="turn-panel card-combate" id="card-combate">
          <header className="turn-panel-header">
            <p className="eyebrow">Turno {room.turn}</p>
            {room.mode === "bot-vs-bot" && (
              <button type="button" className="icon-button bot-pause-button" onClick={onToggleBotPause} title={room.botPaused ? "Reanudar bots" : "Pausar bots"}>
                {room.botPaused ? <Zap size={16} /> : <Minus size={16} />}
              </button>
            )}
            {room.phase === "finished" ? (
              <h2>Gano {winner?.name}</h2>
            ) : (
              <h2 className={isMyTurn ? "turn-title active-turn-title" : "turn-title"}>
                <span>{turnLabel}</span>
              </h2>
            )}
          </header>
          {room.mode === "bot" && room.botMessage && <p className="bot-speech">{room.botMessage}</p>}
          <div className="turn-chakra-column">
            <div className="chakra">
              <Zap size={18} />
              <span>Recursos</span>
              <b className="chakra-total" title="Chakra disponible ajustado por cola">
                {queuedNeutralChakra > 0 ? `${adjustedChakraTotal}/${chakraTotal}` : chakraTotal}
              </b>
            </div>
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
          <div className="skill-list">
            {selectedActorDisplaySkills.map((skill) => {
              const isPending = pendingSkillId === skill.id;
              const disabled = !isPending && !canPrepareSkill(skill);
              const cooldown = skillCooldownFor(selectedActor, skill.id);
              const outOfUses = isSkillOutOfUses(selectedActor, skill);
              const chakraCost = modifiedSkillChakraCost(selectedActor, skill);
              return (
                <button
                  key={skill.id}
                  className={`${disabled ? "unavailable" : ""} ${isPending ? "pending" : ""}`}
                  aria-disabled={disabled}
                  onClick={() => clickSkill(skill)}
                >
                  <span className="skill-icon">
                    <SquareImage alt={skill.name} src={skillImage(skill.id)} />
                    {cooldown > 0 && <b className="cooldown-count">{cooldown}</b>}
                  </span>
                  <span className="skill-copy">
                    <strong>{skill.name}</strong>
                    <small>
                      {outOfUses
                        ? "Sin usos disponibles"
                        : skill.passive
                          ? "Pasiva - no usable"
                          : <>{targetTypeLabel(skill.targetType)} - <ChakraCost chakra={chakraCost} /></>}
                    </small>
                  </span>
                </button>
              );
            })}
          </div>
          <button className="end-turn" disabled={!isMyTurn || room.phase === "finished"} onClick={clickEndTurn}>
            <CheckCircle2 size={18} />
            Finalizar turno
          </button>
          <QueuePanel
            title="Tu cola"
            queue={me?.queue || []}
            removable={isMyTurn}
            onRemove={onRemoveQueuedSkill}
            onMove={onMoveQueuedSkill}
          />
        </div>
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
      {neutralChakraOpen && (
        <NeutralChakraModal
          chakra={me?.chakra}
          required={queuedNeutralChakra}
          onClose={() => setNeutralChakraOpen(false)}
          onConfirm={async (spent) => {
            const ok = await onEndTurn(spent);
            if (ok) setNeutralChakraOpen(false);
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

function NeutralChakraModal({ chakra, required, onClose, onConfirm }) {
  const [spent, setSpent] = useState(() => emptyChakra());
  const spentTotal = totalChakra(spent);

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

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="neutral-chakra-title">
      <div className="chakra-exchange-modal neutral-chakra-modal">
        <header>
          <div>
            <p className="eyebrow">Finalizar turno</p>
            <h2 id="neutral-chakra-title">Pagar recurso neutral</h2>
            <p className="modal-copy">Completa {required} recurso neutral con tus recursos disponibles.</p>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar pago neutral">
            <X size={18} />
          </button>
        </header>
        <section className="exchange-payment-list" aria-label="Recursos que estas pagando">
          <h3>Recursos que pagas</h3>
          {chakraTypes.map((type) => {
            const paid = spent[type.id] || 0;
            const remaining = (chakra?.[type.id] || 0) - paid;
            return (
              <div className="exchange-payment-row" key={type.id}>
                <button type="button" className="icon-button" onClick={() => removePayment(type.id)} disabled={paid <= 0} aria-label={`Quitar ${type.label} del pago neutral`}>
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
                <button type="button" className="icon-button" onClick={() => addPayment(type.id)} disabled={spentTotal >= required || remaining <= 0} aria-label={`Agregar ${type.label} al pago neutral`}>
                  <Plus size={16} />
                </button>
              </div>
            );
          })}
        </section>
        <footer>
          <strong>{spentTotal} / {required}</strong>
          <button type="button" disabled={spentTotal !== required} onClick={() => onConfirm(spent)}>
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
            Proceder
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
          <span><b>Costo:</b> {skill.passive ? "No usable" : <ChakraCost chakra={skill.chakra} />}</span>
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
  if (type === "enemies") return "Todos los enemigos";
  if (type === "allies") return "Todos los aliados";
  if (type === "self") return "A si mismo";
  if (type === "allPlayers") return "Todos los personajes";
  if (type === "anyCharacter") return "Cualquier personaje";
  return targetTypeLabel(type);
}

function BalanceBar({ me, opponent }) {
  const ownHealth = teamHealthPercent(me);
  const enemyHealth = teamHealthPercent(opponent);
  const arrow = Math.max(6, Math.min(94, 50 + (enemyHealth - ownHealth) * 50));
  const ownFill = Math.min(50, arrow);
  const enemyFill = Math.max(0, 100 - Math.max(50, arrow));

  return (
    <div className="balance-panel">
      <div className="balance-labels">
        <span>{me?.name || "Tu equipo"} {Math.round(ownHealth * 100)}%</span>
        <strong>Balance</strong>
        <span>{opponent?.name || "Oponente"} {Math.round(enemyHealth * 100)}%</span>
      </div>
      <div className="balance-track">
        <span className="balance-half red-half" />
        <span className="balance-half blue-half" />
        <span className="balance-fill red-fill" style={{ width: `${ownFill}%` }} />
        <span className="balance-fill blue-fill" style={{ width: `${enemyFill}%` }} />
        <span className="balance-arrow" style={{ left: `${arrow}%` }} />
      </div>
    </div>
  );
}

function QueuePanel({ title, queue, removable, onRemove, onMove }) {
  return (
    <div className="queue-panel">
      <h3>
        <ListChecks size={16} />
        {title}
      </h3>
      {queue.length === 0 ? (
        <p>No hay habilidades en cola.</p>
      ) : (
        <ol>
          {queue.map((item, index) => (
            <li key={item.id}>
              <div className="queue-reorder" aria-label={`Orden de ${item.skillName}`}>
                <button type="button" className="queue-order-button" disabled={!removable || index === 0} onClick={() => onMove(item.id, "up")} aria-label={`Subir ${item.skillName}`}>
                  <ArrowUp size={14} />
                </button>
                <button type="button" className="queue-order-button" disabled={!removable || index === queue.length - 1} onClick={() => onMove(item.id, "down")} aria-label={`Bajar ${item.skillName}`}>
                  <ArrowDown size={14} />
                </button>
              </div>
              <button className="queue-action" disabled={!removable} onClick={() => onRemove(item.id)}>
                <SquareImage alt={item.skillName} src={skillImage(item.skillId)} />
                <span>
                  <strong>{item.skillName}</strong>
                  <span>{item.actorName} a {item.targetName}</span>
                  <small><ChakraCost chakra={item.chakra} /> gastado</small>
                </span>
                {removable && <Trash2 size={16} />}
              </button>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
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
  if (hp <= 0 || hp >= maxHp) return "";
  const missingPercent = ((maxHp - hp) / maxHp) * 100;
  if (missingPercent < 34) return "injury-light";
  if (missingPercent < 67) return "injury-moderate";
  return "injury-severe";
}

function Team({ title, player, active, disadvantage = false, actorId, targetId, eligibleTargetIds = new Set(), choosingTarget = false, damageAnimationTurnKey = "", onInspect, onPick, targetable = false, ownTeam = false }) {
  const previousHpRef = useRef(new Map());
  const [damageAnimations, setDamageAnimations] = useState({});

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
    <div className={`team ${player?.side || ""} ${active ? "active" : ""} ${disadvantage ? "disadvantage" : ""}`}>
      <h2>{title}</h2>
      <div className="fighters">
        {player?.team.map((member) => {
          const damageAnimation = choosingTarget && targetable ? null : damageAnimations[member.id];
          const eligible = choosingTarget && eligibleTargetIds.has(member.id);
          const invulnerable = targetable && hasStatus(member, "invulnerable");
          const untargetable = invulnerable && !eligible;
          const selectable = member.hp > 0 && (eligible || (!choosingTarget && ownTeam));
          const portraitSrc = member.hp <= 0 ? skullImage : characterImage(member.avatarImageId || member.character.id);
          const mirrorEnemyPortrait = targetable && member.hp > 0 && !String(portraitSrc).startsWith("data:image/svg+xml");
          const fighterHint = eligible ? "Objetivo elegible" : untargetable ? "Invulnerable" : "";
          const injuryClass = injurySeverityClass(member);
          return (
            <div
              className={`fighter ${injuryClass} ${damageAnimation ? `damage-shake ${damageAnimation.severity}` : ""} ${actorId === member.id ? "actor-picked" : ""} ${ownTeam && targetId === member.id ? "target-picked" : ""} ${eligible ? "target-eligible" : ""} ${member.hp <= 0 ? "down" : ""} ${untargetable && !eligible ? "untargetable" : ""}`}
              key={member.id}
              data-damage-token={damageAnimation?.token}
              onClick={() => {
                onInspect?.(member);
                if (selectable) onPick?.(member, ownTeam);
              }}
              role="button"
              tabIndex={0}
              aria-disabled={!selectable}
            >
              <div className="fighter-top">
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
              <StatusEffects member={member} effects={member.statusEffects || []} />
              {fighterHint && <small>{fighterHint}</small>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

createRoot(document.getElementById("root")).render(<App />);
