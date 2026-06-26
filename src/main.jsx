import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { io } from "socket.io-client";
import { ArrowDown, ArrowLeftRight, ArrowUp, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, ListChecks, Minus, Plus, Search, Swords, Trash2, Users, Shield, HeartPulse, X, Zap } from "lucide-react";
import messageSound from "./assets/sounds/message.mp3";
import ninjaSound from "./assets/sounds/ninja.mp3";
import notifierSound from "./assets/sounds/notifier.mp3";
import { characterImage, skillImage, skullImage } from "./game/assets.js";
import { canPaySkillChakra, chakraTypes, emptyChakra, neutralChakraCost, totalChakra } from "./game/chakra.js";
import { eligibleTargetsForSkill, hasStatus, isQueuedActor, isQueuedSkill, isSkillStunned, meetsSkillRequirements, playerHealthShare, skillCooldownFor, teamHealthPercent } from "./game/battleRules.js";
import { effectDescription, groupStatusEffects, requirementDescription, statusEffectGroupMeta, statusEffectGroupValue, targetTypeLabel } from "./game/labels.js";
import { modifiedSkillChakraCost } from "../shared/chakraCostModifiers.js";
import { skillClassesLabel } from "../shared/effects.js";
import { activeSkillsForMember, baseSkillsForCharacter } from "../shared/skillReplacements.js";
import "./styles.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";
const socket = io(SOCKET_URL, { path: SOCKET_PATH });
const NOTIFIER_START_TIME = 0;
const NOTIFIER_END_TIME = 0.8;
const MESSAGE_SOUND_START_TIME = 0.5;
const MESSAGE_SOUND_END_TIME = 1.5;
const AUDIO_FADE_MS = 450;
const RESULT_AUDIO_FADE_MS = 1000;
const BGM_FADE_MS = 1000;
const BGM_VOLUME_RATIO = 0.5;
const ADVANTAGE_HEALTH_SHARE = 0.68;
const GAME_VERSION = "1.1.3";
const MOBILE_QUERY = "(max-width: 768px)";
const bgmTracks = Object.values(import.meta.glob("./assets/bgm/*.mp3", { eager: true, query: "?url", import: "default" }));
const advantageBgmTracks = Object.values(import.meta.glob("./assets/bgm-advantage/*.mp3", { eager: true, query: "?url", import: "default" }));
const disadvantageBgmTracks = Object.values(import.meta.glob("./assets/bgm-disadvantage/*.mp3", { eager: true, query: "?url", import: "default" }));
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
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [sfxVolume, setSfxVolume] = useState(0.5);
  const [musicVolume, setMusicVolume] = useState(0.5);
  const turnAudioRef = useRef(null);
  const messageAudioRef = useRef(null);
  const resultAudioRef = useRef(null);
  const bgmAudioRef = useRef(null);
  const audioFadeFrameRef = useRef(0);
  const audioFadeOutTimeoutRef = useRef(null);
  const audioStopTimeoutRef = useRef(null);
  const messageStopTimeoutRef = useRef(null);
  const resultFadeFrameRef = useRef(0);
  const resultFadeOutTimeoutRef = useRef(null);
  const resultStopTimeoutRef = useRef(null);
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

  useEffect(() => {
    socket.on("characters", setCharacters);
    socket.on("room:update", setRoom);
    return () => {
      socket.off("characters", setCharacters);
      socket.off("room:update", setRoom);
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
  }, [sfxVolume, musicVolume]);

  useEffect(() => {
    return () => {
      stopBgm(false);
      stopResultAudio(false);
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

  function randomTrack(tracks) {
    if (!tracks.length) return "";
    return tracks[Math.floor(Math.random() * tracks.length)];
  }

  function battleAudioStateForPlayer(player, rival) {
    const share = playerHealthShare(player, rival);
    if (share >= ADVANTAGE_HEALTH_SHARE) return "advantage";
    if (share <= 1 - ADVANTAGE_HEALTH_SHARE) return "disadvantage";
    return "neutral";
  }

  function bgmTrackForState(state) {
    if (bgmCurrentStateRef.current === state && bgmCurrentTrackRef.current) {
      return bgmCurrentTrackRef.current;
    }
    if (state === "advantage") return randomTrack(advantageBgmTracks) || bgmBaseTrackRef.current;
    if (state === "disadvantage") return randomTrack(disadvantageBgmTracks) || bgmBaseTrackRef.current;
    return bgmBaseTrackRef.current || randomTrack(bgmTracks);
  }

  function cancelBgmLoopFrame() {
    if (bgmLoopFrameRef.current) {
      window.cancelAnimationFrame(bgmLoopFrameRef.current);
      bgmLoopFrameRef.current = 0;
    }
  }

  function scheduleBgmLoop(audio) {
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
          audio.currentTime = 0;
          audio.volume = 0;
          fadedOutForLoop = false;
          audio.play().catch(() => {});
          fadeAudioWithFrame(audio, musicVolume * BGM_VOLUME_RATIO, BGM_FADE_MS, bgmFadeFrameRef);
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
          scheduleBgmLoop(audio);
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
    <main>
      <section className="topbar">
        <div className="topbar-brand">
          <h1>Sote Arena</h1>
          <span className="version-tag">v{GAME_VERSION}</span>
        </div>
        {room && (
          <div className="topbar-actions">
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
          </div>
        )}
      </section>

      {error && <div className="alert">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      {!room && homeView === "menu" && (
        <MainMenu
          onPlay={() => {
            setError("");
            setHomeView("play");
          }}
          onPlayBot={createBotRoom}
          onCharacters={() => {
            setError("");
            setHomeView("characters");
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

      {room?.phase === "lobby" && (
        <Lobby
          characters={characters}
          selected={selected}
          me={me}
          room={room}
          onToggle={toggleCharacter}
          onConfirm={confirmTeam}
          onSendChat={sendChatMessage}
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
        />
      )}

      {matchResult && <ResultModal title={matchResult} reason={matchResultReason} onReturnHome={returnHome} />}
      {optionsOpen && (
        <OptionsModal
          sfxVolume={sfxVolume}
          musicVolume={musicVolume}
          canSurrender={room?.phase === "battle" && !me?.isBot}
          onSfxVolumeChange={setSfxVolume}
          onMusicVolumeChange={setMusicVolume}
          onSurrender={surrender}
          onClose={() => setOptionsOpen(false)}
        />
      )}
    </main>
  );
}

function MainMenu({ onPlay, onPlayBot, onCharacters, onOptions }) {
  return (
    <section className="panel main-menu">
      <button type="button" onClick={onPlay}>
        <Swords size={20} />
        Jugar
      </button>
      <button type="button" onClick={onPlayBot}>
        <Zap size={20} />
        Jugar vs IA
      </button>
      <button type="button" className="secondary" onClick={onCharacters}>
        <Users size={20} />
        Personajes
      </button>
      <button type="button" onClick={onOptions}>
        <Shield size={20} />
        Opciones
      </button>
    </section>
  );
}

function filterCharacters(characters, search) {
  const query = search.trim().toLowerCase();
  if (!query) return characters;
  return characters.filter((character) => (
    character.name.toLowerCase().includes(query)
    || character.id.toLowerCase().includes(query)
  ));
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
    <div className="character-chakra-usage" aria-label={`Uso de chakra de ${character.name}`}>
      {characterChakraUsage(character).map((type) => (
        <span className="character-chakra-usage-item" key={type.id} aria-label={`${type.label}: ${type.percent}%`}>
          <ChakraIcon type={type.id} />
          <b>{type.percent}%</b>
        </span>
      ))}
    </div>
  );
}

function OptionsModal({ sfxVolume, musicVolume, canSurrender = false, onSfxVolumeChange, onMusicVolumeChange, onSurrender, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="options-title">
      <div className="options-modal">
        <header>
          <h2 id="options-title">Opciones</h2>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar opciones">
            <X size={18} />
          </button>
        </header>
        <label>
          SFX {Math.round(sfxVolume * 100)}%
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(sfxVolume * 100)}
            onChange={(event) => onSfxVolumeChange(Number(event.target.value) / 100)}
          />
        </label>
        <label>
          Musica {Math.round(musicVolume * 100)}%
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(musicVolume * 100)}
            onChange={(event) => onMusicVolumeChange(Number(event.target.value) / 100)}
          />
        </label>
        {canSurrender && (
          <button type="button" className="surrender-button" onClick={onSurrender}>
            Rendirse
          </button>
        )}
      </div>
    </div>
  );
}

function ResultModal({ title, reason, onReturnHome }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-modal">
        <p className="eyebrow">Partida finalizada</p>
        <h2 id="result-title">{title}</h2>
        {reason && <p className="result-reason">{reason}</p>}
        <button onClick={onReturnHome}>
          <Swords size={18} />
          Regresar al inicio
        </button>
      </div>
    </div>
  );
}

function CharactersCatalog({ characters, onBack }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inspectedCharacterId, setInspectedCharacterId] = useState("");
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const filteredCharacters = filterCharacters(characters, search);
  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = filteredCharacters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inspectedCharacter = filteredCharacters.find((character) => character.id === inspectedCharacterId) || pageCharacters[0];
  const inspectedSkills = inspectedCharacter?.skills || [];
  const inspectedSkill = inspectedSkills.find((skill) => skill.id === inspectedSkillId) || inspectedSkills[0];

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (inspectedCharacterId && !filteredCharacters.some((character) => character.id === inspectedCharacterId)) {
      setInspectedCharacterId(pageCharacters[0]?.id || "");
      setInspectedSkillId(pageCharacters[0]?.skills?.[0]?.id || "");
    } else if (!inspectedCharacterId && pageCharacters[0]) {
      setInspectedCharacterId(pageCharacters[0].id);
      setInspectedSkillId(pageCharacters[0].skills[0]?.id || "");
    }
  }, [filteredCharacters, inspectedCharacterId, pageCharacters]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  function inspectCharacter(characterId) {
    const character = characters.find((item) => item.id === characterId);
    setInspectedCharacterId(characterId);
    setInspectedSkillId(character?.skills[0]?.id || "");
  }

  return (
    <section className="characters-catalog panel">
      <div className="section-head">
        <div>
          <p className="eyebrow">Personajes</p>
          <h2>Lista de personajes</h2>
        </div>
        <button type="button" className="secondary" onClick={onBack}>
          Atras
        </button>
      </div>
      <CharacterSearch value={search} onChange={setSearch} placeholder="Buscar personaje" />
      <div className="character-grid">
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
      </div>
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
          <h3 className="inspected-character-name">{inspectedCharacter.name}</h3>
          <div className="lobby-skill-strip" aria-label={`Habilidades de ${inspectedCharacter.name}`}>
            {inspectedSkills.map((skill) => (
              <button
                type="button"
                key={skill.id}
                className={inspectedSkill?.id === skill.id ? "selected" : ""}
                onClick={() => setInspectedSkillId(skill.id)}
                aria-label={skill.name}
              >
                <SquareImage alt={skill.name} src={skillImage(skill.id)} />
              </button>
            ))}
          </div>
          <CharacterChakraUsage character={inspectedCharacter} />
          <SkillFooter skill={inspectedSkill} compact />
        </footer>
      )}
    </section>
  );
}

function Lobby({ characters, selected, me, room, onToggle, onConfirm, onSendChat }) {
  const pageSize = 10;
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [inspectedCharacterId, setInspectedCharacterId] = useState("");
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const filteredCharacters = filterCharacters(characters, search);
  const totalPages = Math.max(1, Math.ceil(filteredCharacters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = filteredCharacters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inspectedCharacter = filteredCharacters.find((character) => character.id === inspectedCharacterId);
  const inspectedSkills = inspectedCharacter?.skills || [];
  const inspectedSkill = inspectedSkills.find((skill) => skill.id === inspectedSkillId) || inspectedSkills[0];
  const selectedCharacters = selected
    .map((characterId) => characters.find((character) => character.id === characterId))
    .filter(Boolean);

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
    }
  }, [filteredCharacters, inspectedCharacterId]);

  function clickCharacter(characterId) {
    const character = characters.find((item) => item.id === characterId);
    setInspectedCharacterId(characterId);
    setInspectedSkillId(character?.skills[0]?.id || "");
    onToggle(characterId);
  }

  return (
    <section className="lobby">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Equipo</p>
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
            </div>
          </div>
          <button disabled={selected.length !== 3 || me?.ready} onClick={onConfirm}>
            <Shield size={18} />
            Confirmar
          </button>
        </div>
        <CharacterSearch value={search} onChange={setSearch} placeholder="Buscar personaje" disabled={me?.ready} />
        <div className="character-grid">
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
        </div>
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
            <h3 className="inspected-character-name">{inspectedCharacter.name}</h3>
            <div className="lobby-skill-strip" aria-label={`Habilidades de ${inspectedCharacter.name}`}>
              {inspectedSkills.map((skill) => (
                <button
                  type="button"
                  key={skill.id}
                  className={inspectedSkill?.id === skill.id ? "selected" : ""}
                  onClick={() => setInspectedSkillId(skill.id)}
                  disabled={me?.ready}
                  aria-label={skill.name}
                >
                  <SquareImage alt={skill.name} src={skillImage(skill.id)} />
                </button>
              ))}
            </div>
            <CharacterChakraUsage character={inspectedCharacter} />
            <SkillFooter skill={inspectedSkill} compact />
          </footer>
        )}
      </div>
      <aside className={`side-stack ${room.mode === "bot" ? "single-panel" : ""}`}>
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
            {room.log.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </section>
        {room.mode !== "bot" && <ChatPanel messages={room.chat || []} onSend={onSendChat} />}
      </aside>
    </section>
  );
}

function Battle({ room, me, opponent, isMyTurn, actorId, targetId, selectedActor, onActor, onTarget, onSkill, onEndTurn, onRemoveQueuedSkill, onMoveQueuedSkill, onExchangeChakra, onUndoChakraExchange, onSendChat }) {
  const winner = room.players.find((player) => player.id === room.winnerId);
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const [inspectedMemberId, setInspectedMemberId] = useState("");
  const [pendingSkillId, setPendingSkillId] = useState("");
  const [chakraExchangeOpen, setChakraExchangeOpen] = useState(false);
  const [neutralChakraOpen, setNeutralChakraOpen] = useState(false);
  const [emptyQueueConfirmOpen, setEmptyQueueConfirmOpen] = useState(false);
  const inspectedMember = [me, opponent]
    .flatMap((player) => player?.team || [])
    .find((member) => member.id === inspectedMemberId) || selectedActor;
  const inspectedSkills = inspectedMember?.character?.skills || [];
  const selectedActorSkills = activeSkillsForMember(selectedActor, selectedActor?.character);
  const inspectedSkill = inspectedSkills.find((skill) => skill.id === inspectedSkillId) || inspectedSkills[0];
  const pendingSkill = selectedActorSkills.find((skill) => skill.id === pendingSkillId);
  const eligibleTargetIds = new Set(pendingSkill ? eligibleTargetsForSkill(pendingSkill, me, opponent, selectedActor).map((member) => member.id) : []);
  const hasQueuedSkills = (me?.queue || []).length > 0;
  const exchangeRecord = me?.chakraExchange?.turn === room.turn ? me.chakraExchange : null;
  const exchange = exchangeRecord && !exchangeRecord.undone ? exchangeRecord : null;
  const canUndoExchange = Boolean(exchange && !hasQueuedSkills && (me?.chakra?.[exchange.receivedType] || 0) > 0);
  const canOpenExchange = isMyTurn && room.phase !== "finished" && !exchangeRecord && totalChakra(me?.chakra) >= 5;
  const exchangeButtonLabel = exchange ? "Deshacer intercambio" : "Intercambiar chakra";
  const queuedNeutralChakra = (me?.queue || []).reduce((total, action) => total + neutralChakraCost(action.chakra), 0);
  const chakraTotal = totalChakra(me?.chakra);
  const adjustedChakraTotal = Math.max(0, chakraTotal - queuedNeutralChakra);

  useEffect(() => {
    setPendingSkillId("");
    setInspectedMemberId(actorId);
    setInspectedSkillId("");
  }, [actorId, room.turn]);

  function clickSkill(skill) {
    setInspectedMemberId(selectedActor?.id || "");
    setInspectedSkillId(skill.id);
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
    const chakraCost = modifiedSkillChakraCost(selectedActor, skill);
    return isMyTurn
      && room.phase !== "finished"
      && !isSkillStunned(selectedActor, skill)
      && skillCooldownFor(selectedActor, skill.id) <= 0
      && !isQueuedActor(me, selectedActor?.id)
      && !isQueuedSkill(me, selectedActor?.id, skill.id)
      && meetsSkillRequirements(skill, me, opponent, selectedActor)
      && canPaySkillChakra(me?.chakra, chakraCost, queuedNeutralChakra)
      && eligibleTargetsForSkill(skill, me, opponent, selectedActor).length > 0;
  }

  function inspectMember(member) {
    setInspectedMemberId(member.id);
    setInspectedSkillId("");
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
          actorId={actorId}
          targetId={targetId}
          eligibleTargetIds={eligibleTargetIds}
          choosingTarget={Boolean(pendingSkill)}
          onInspect={inspectMember}
          onPick={pickFighter}
          ownTeam
        />
        <div className="turn-panel card-combate" id="card-combate">
          <header className="turn-panel-header">
            <p className="eyebrow">Turno {room.turn}</p>
            {room.phase === "finished" ? (
              <h2>Gano {winner?.name}</h2>
            ) : (
              <h2 className={isMyTurn ? "turn-title active-turn-title" : "turn-title"}>
                <span>{isMyTurn ? "Tu turno" : "Turno rival"}</span>
              </h2>
            )}
          </header>
          <div className="turn-chakra-column">
            <div className="chakra">
              <Zap size={18} />
              <span>Chakra</span>
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
            {selectedActorSkills.map((skill) => {
              const isPending = pendingSkillId === skill.id;
              const disabled = !isPending && !canPrepareSkill(skill);
              const cooldown = skillCooldownFor(selectedActor, skill.id);
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
                      {targetTypeLabel(skill.targetType)} - <ChakraCost chakra={chakraCost} />
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
          title={opponent?.name || "Rival"}
          player={opponent}
          active={room.activePlayerId === opponent?.id}
          targetId={targetId}
          eligibleTargetIds={eligibleTargetIds}
          choosingTarget={Boolean(pendingSkill)}
          onInspect={inspectMember}
          onPick={pickFighter}
          targetable
        />
      </div>
      <aside className={`side-stack ${room.mode === "bot" ? "single-panel" : ""}`}>
        <CollapsiblePanel title="Registro" className="combat-log side-main">
          <div className="log">
            {room.log.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </CollapsiblePanel>
        {room.mode !== "bot" && <ChatPanel messages={room.chat || []} onSend={onSendChat} collapsible />}
      </aside>
      <BattleSkillFooter member={inspectedMember} skill={inspectedSkill} onSkill={setInspectedSkillId} />
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

function ChatPanel({ messages, onSend, collapsible = false }) {
  const [message, setMessage] = useState("");

  async function submit(event) {
    event.preventDefault();
    const sent = await onSend(message);
    if (sent) setMessage("");
  }

  const content = (
    <>
      <div className="chat-messages" aria-live="polite">
        {messages.length === 0 ? (
          <p className="chat-empty">No hay mensajes.</p>
        ) : (
          messages.map((item) => (
            <p key={item.id}>
              <strong>{item.playerName}:</strong> {item.message}
            </p>
          ))
        )}
      </div>
      <form className="chat-form" onSubmit={submit}>
        <input value={message} maxLength={180} onChange={(event) => setMessage(event.target.value)} placeholder="Mensaje" />
        <button type="submit" disabled={!message.trim()}>
          Enviar
        </button>
      </form>
    </>
  );

  if (collapsible) {
    return (
      <CollapsiblePanel title="Chat" className="chat-panel">
        {content}
      </CollapsiblePanel>
    );
  }

  return (
    <section className="panel chat-panel">
      <h2>Chat</h2>
      {content}
    </section>
  );
}

function CollapsiblePanel({ title, className = "", children }) {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return !window.matchMedia(MOBILE_QUERY).matches;
  });

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const media = window.matchMedia(MOBILE_QUERY);
    const syncOpen = () => setOpen(!media.matches);
    syncOpen();
    media.addEventListener("change", syncOpen);
    return () => media.removeEventListener("change", syncOpen);
  }, []);

  return (
    <section className={`panel collapsible-panel ${className} ${open ? "open" : ""}`}>
      <button type="button" className="collapsible-toggle" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <span>{title}</span>
        <ChevronDown size={18} />
      </button>
      <div className="collapsible-content" hidden={!open}>
        {children}
      </div>
    </section>
  );
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
            <p className="modal-copy">Intercambia 5 chakras por 1 chakra en especifico</p>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar intercambio">
            <X size={18} />
          </button>
        </header>
        <div className="chakra-choice" aria-label="Chakra a recibir">
          <h3>Chakra que quieres tener</h3>
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
        <section className="exchange-payment-list" aria-label="Chakras que estas pagando">
          <h3>Chakras que pagas</h3>
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
            <h2 id="neutral-chakra-title">Pagar chakra neutral</h2>
            <p className="modal-copy">Completa {required} chakra neutral con tus chakras disponibles.</p>
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar pago neutral">
            <X size={18} />
          </button>
        </header>
        <section className="exchange-payment-list" aria-label="Chakras que estas pagando">
          <h3>Chakras que pagas</h3>
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

function BattleSkillFooter({ member, skill, onSkill }) {
  if (!member) return null;
  const skills = member.character.skills || [];
  return (
    <section className="battle-skill-footer">
      <div className="battle-skill-strip" aria-label={`Habilidades de ${member.character.name}`}>
        {skills.map((item) => (
          <button
            type="button"
            key={item.id}
            className={skill?.id === item.id ? "selected" : ""}
            onClick={() => onSkill(item.id)}
            aria-label={item.name}
          >
            <SquareImage alt={item.name} src={skillImage(item.id)} />
          </button>
        ))}
      </div>
      <SkillFooter skill={skill} inspectedName={member.character.name} />
    </section>
  );
}

function SkillFooter({ skill, compact = false, inspectedName = "" }) {
  if (!skill) return null;
  return (
    <footer className={`skill-footer ${compact ? "compact" : ""}`}>
      <SquareImage alt={skill.name} src={skillImage(skill.id)} />
      <div>
        <p className="eyebrow">{inspectedName ? `Habilidad de ${inspectedName}` : "Habilidad seleccionada"}</p>
        <h2>{skill.name}</h2>
        <p>{skill.description}</p>
      </div>
      <div className="skill-footer-meta">
        <strong>{targetTypeLabel(skill.targetType)}</strong>
        <span><ChakraCost chakra={skill.chakra} /></span>
        <span>Cooldown: {skill.cooldown || 0}</span>
      </div>
      <ul>
        {(skill.effects || []).map((effect, index) => (
          <li key={`${effect.type}-${index}`}>{effectDescription(effect)}</li>
        ))}
        {(skill.requires || []).map((requirement, index) => (
          <li key={`requirement-${index}`}>Requiere: {requirementDescription(requirement)}</li>
        ))}
        {skill.family?.length ? <li>Clases: {skillClassesLabel(skill.family)}</li> : null}
      </ul>
    </footer>
  );
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
        <span>{opponent?.name || "Rival"} {Math.round(enemyHealth * 100)}%</span>
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

function Team({ title, player, active, actorId, targetId, eligibleTargetIds = new Set(), choosingTarget = false, onInspect, onPick, targetable = false, ownTeam = false }) {
  return (
    <div className={`team ${player?.side || ""} ${active ? "active" : ""}`}>
      <h2>{title}</h2>
      <div className="fighters">
        {player?.team.map((member) => {
          const untargetable = targetable && hasStatus(member, "invulnerable");
          const eligible = choosingTarget && eligibleTargetIds.has(member.id);
          const selectable = member.hp > 0 && (eligible || (!choosingTarget && ownTeam));
          return (
            <div
              className={`fighter ${actorId === member.id ? "actor-picked" : ""} ${ownTeam && targetId === member.id ? "target-picked" : ""} ${eligible ? "target-eligible" : ""} ${member.hp <= 0 ? "down" : ""} ${untargetable && !eligible ? "untargetable" : ""}`}
              key={member.id}
              onClick={() => {
                onInspect?.(member);
                if (selectable) onPick?.(member, ownTeam);
              }}
              role="button"
              tabIndex={0}
              aria-disabled={!selectable}
            >
              <div className="fighter-top">
                <SquareImage alt={member.hp <= 0 ? `${member.character.name} derrotado` : member.character.name} src={member.hp <= 0 ? skullImage : characterImage(member.character.id)} />
              </div>
              <strong>{member.character.name}</strong>
              <Health current={member.hp} max={member.character.maxHp} />
              <span className="stats">
                <HeartPulse size={14} /> {member.hp}
                <Shield size={14} /> {member.shield}
              </span>
              <StatusEffects effects={member.statusEffects || []} />
              <small>{eligible ? "Objetivo elegible" : untargetable ? "Invulnerable" : ownTeam ? "Atacante" : targetable ? "Rival" : "Objetivo"}</small>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SquareImage({ alt, src }) {
  return <img className="square-img" src={src} alt={alt} width="48" height="48" />;
}

function StatusEffects({ effects }) {
  const [openEffectId, setOpenEffectId] = useState("");
  const [hoverEffectId, setHoverEffectId] = useState("");
  const [tooltipPosition, setTooltipPosition] = useState(null);
  const rowRef = useRef(null);
  const tooltipRef = useRef(null);

  useEffect(() => {
    if (!openEffectId) return undefined;
    function closeOnOutsideClick(event) {
      if (rowRef.current?.contains(event.target)) return;
      if (tooltipRef.current?.contains(event.target)) return;
      setOpenEffectId("");
    }
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [openEffectId]);

  const groups = groupStatusEffects(effects);
  const activeEffectId = openEffectId || hoverEffectId;
  const activeGroup = groups.find((group) => group.id === activeEffectId);

  useLayoutEffect(() => {
    if (!activeGroup || !tooltipPosition || !tooltipRef.current || !isDesktopTooltip()) return;
    const rect = tooltipRef.current.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    const topOverflow = 16 - rect.top;
    const bottomOverflow = rect.bottom - (viewportHeight - 16);

    if (topOverflow > 0) {
      setTooltipPosition((current) => current ? { ...current, top: current.top + topOverflow } : current);
    } else if (bottomOverflow > 0) {
      setTooltipPosition((current) => current ? { ...current, top: current.top - bottomOverflow } : current);
    }
  }, [activeGroup, tooltipPosition]);

  function isDesktopTooltip() {
    return typeof window !== "undefined" && !window.matchMedia(MOBILE_QUERY).matches;
  }

  function positionDesktopTooltip(element) {
    if (!isDesktopTooltip()) return;
    const rect = element.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const width = Math.min(460, viewportWidth - 32);
    const centeredLeft = rect.left + (rect.width / 2) - (width / 2);
    const left = Math.min(Math.max(centeredLeft, 16), viewportWidth - width - 16);
    const spaceAbove = rect.top - 16;
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const placement = spaceAbove >= 180 || spaceAbove >= spaceBelow ? "above" : "below";

    setTooltipPosition({
      left,
      top: placement === "above" ? rect.top - 10 : rect.bottom + 10,
      width,
      placement
    });
  }

  function tooltipContent(group) {
    return (
      <>
        <strong>{group.sourceSkillName}</strong>
        <ul>
          {group.effects.flatMap((effect) => effect.descriptions || [`${effect.sourceActorName || "Un personaje"} ha aplicado ${effect.type} a este personaje.`]).map((description, index) => (
            <li key={`${description}-${index}`}>{description}</li>
          ))}
        </ul>
        <small>{statusEffectGroupMeta(group)}</small>
      </>
    );
  }

  if (!effects.length) return <span className="status-row" aria-label="Sin efectos" />;

  return (
    <span className="status-row" ref={rowRef}>
      {groups.map((group) => (
        <span
          className={`status-icon ${group.className} ${openEffectId === group.id ? "open" : ""}`}
          key={group.id}
          tabIndex={0}
          onMouseEnter={(event) => {
            if (!isDesktopTooltip()) return;
            setHoverEffectId(group.id);
            positionDesktopTooltip(event.currentTarget);
          }}
          onMouseLeave={() => {
            setHoverEffectId("");
          }}
          onFocus={(event) => {
            if (!isDesktopTooltip()) return;
            setHoverEffectId(group.id);
            positionDesktopTooltip(event.currentTarget);
          }}
          onBlur={() => {
            setHoverEffectId("");
          }}
          onClick={(event) => {
            event.stopPropagation();
            positionDesktopTooltip(event.currentTarget);
            setOpenEffectId((current) => (current === group.id ? "" : group.id));
          }}
        >
          <img src={skillImage(group.sourceSkillId)} alt={group.sourceSkillName} />
          <b>{statusEffectGroupValue(group)}</b>
          <span className="status-tooltip inline-status-tooltip" role="tooltip">
            {tooltipContent(group)}
          </span>
        </span>
      ))}
      {activeGroup && tooltipPosition && createPortal(
        <span
          className={`status-tooltip status-tooltip-portal ${tooltipPosition.placement}`}
          ref={tooltipRef}
          role="tooltip"
          style={{
            "--tooltip-left": `${tooltipPosition.left}px`,
            "--tooltip-top": `${tooltipPosition.top}px`,
            "--tooltip-width": `${tooltipPosition.width}px`
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {tooltipContent(activeGroup)}
        </span>,
        document.body
      )}
    </span>
  );
}

function ChakraPool({ chakra }) {
  return (
    <div className="chakra-pool">
      {chakraTypes.map((type) => (
        <span className={`chakra-chip ${type.className}`} key={type.id}>
          <ChakraIcon type={type.id} />
          <b>{chakra?.[type.id] || 0}</b>
          {type.label}
        </span>
      ))}
    </div>
  );
}

function ChakraIcon({ type }) {
  const chakraType = chakraTypes.find((item) => item.id === type);
  const className = type === "neutralChakra" ? "neutral" : chakraType?.className || "";
  return (
    <svg className={`chakra-svg ${className}`} viewBox="0 0 16 16" aria-hidden="true">
      <rect className="chakra-border" x="1" y="1" width="14" height="14" rx="4" />
      <rect className="chakra-inner-border" x="2.5" y="2.5" width="11" height="11" rx="3" />
      <rect className="chakra-fill" x="4" y="4" width="8" height="8" rx="2" />
    </svg>
  );
}

function ChakraCost({ chakra = {} }) {
  const entries = chakraTypes
    .map((type) => ({ ...type, amount: chakra[type.id] || 0 }))
    .filter((type) => type.amount > 0);
  const neutralAmount = neutralChakraCost(chakra);
  if (neutralAmount > 0) {
    entries.push({ id: "neutralChakra", label: "Neutral", amount: neutralAmount });
  }

  if (!entries.length) return <span className="chakra-cost empty">Sin chakra</span>;

  return (
    <span className="chakra-cost">
      {entries.map((type) => (
        <span className="chakra-cost-item" key={type.id}>
          <ChakraIcon type={type.id} />
          <b>{type.amount}</b>
          <span>{type.label}</span>
        </span>
      ))}
    </span>
  );
}

function Health({ current, max }) {
  const width = Math.max(0, Math.round((current / max) * 100));
  const level = width <= 30 ? "low" : width <= 70 ? "mid" : "high";
  return (
    <span className={`health ${level}`} aria-label={`${width}% vida`}>
      <span style={{ width: `${width}%` }} />
    </span>
  );
}

createRoot(document.getElementById("root")).render(<App />);
