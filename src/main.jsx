import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { ArrowDown, ArrowLeftRight, ArrowUp, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, Copy, ListChecks, Minus, Plus, Swords, Trash2, Users, Shield, HeartPulse, X, Zap } from "lucide-react";
import messageSound from "./assets/sounds/message.mp3";
import notifierSound from "./assets/sounds/notifier.mp3";
import "./styles.css";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || undefined;
const SOCKET_PATH = import.meta.env.VITE_SOCKET_PATH || "/socket.io";
const socket = io(SOCKET_URL, { path: SOCKET_PATH });
const characterImages = import.meta.glob("./assets/characters/*.png", { eager: true, query: "?url", import: "default" });
const skillImages = import.meta.glob("./assets/skills/*.png", { eager: true, query: "?url", import: "default" });
const chakraTypes = [
  { id: "taijutsu", label: "Tai", className: "tai" },
  { id: "ninjutsu", label: "Nin", className: "nin" },
  { id: "bloodline", label: "Blood", className: "blood" },
  { id: "genjutsu", label: "Gen", className: "gen" }
];
const NOTIFIER_START_TIME = 0;
const NOTIFIER_END_TIME = 3;
const MESSAGE_SOUND_START_TIME = 0.5;
const MESSAGE_SOUND_END_TIME = 1.5;
const AUDIO_FADE_MS = 450;
const MOBILE_QUERY = "(max-width: 768px)";
const skullImage = `data:image/svg+xml;utf8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    <rect width="80" height="80" rx="10" fill="#111827"/>
    <path d="M40 12c-17 0-28 11-28 27 0 9 4 15 10 19v10h36V58c6-4 10-10 10-19 0-16-11-27-28-27Z" fill="#f8fafc"/>
    <circle cx="29" cy="39" r="7" fill="#111827"/>
    <circle cx="51" cy="39" r="7" fill="#111827"/>
    <path d="M40 44l-5 8h10l-5-8Z" fill="#111827"/>
    <path d="M28 61h24" stroke="#111827" stroke-width="4" stroke-linecap="round"/>
  </svg>
`.replace(/\s+/g, " ").trim())}`;

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
  const [volume, setVolume] = useState(0.5);
  const turnAudioRef = useRef(null);
  const messageAudioRef = useRef(null);
  const audioFadeFrameRef = useRef(0);
  const audioFadeOutTimeoutRef = useRef(null);
  const audioStopTimeoutRef = useRef(null);
  const messageStopTimeoutRef = useRef(null);
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
      turnAudioRef.current.volume = volume;
    }
    if (messageAudioRef.current && messageAudioRef.current.paused) {
      messageAudioRef.current.volume = volume;
    }
  }, [volume]);

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
      audio.volume = volume;
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
      .then(() => fadeAudioTo(audio, volume, Math.min(AUDIO_FADE_MS, 1200)))
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
    audio.volume = volume;

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
        <div>
          <h1>Sote Arena</h1>
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
            <button className="code" onClick={copyRoomCode}>
              <Copy size={16} />
              {room.code}
            </button>
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
          onCharacters={() => {
            setError("");
            setHomeView("characters");
          }}
          onOptions={() => setOptionsOpen(true)}
        />
      )}

      {!room && homeView === "play" && (
        <section className="panel entry">
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

      {matchResult && <ResultModal title={matchResult} onReturnHome={returnHome} />}
      {optionsOpen && <OptionsModal volume={volume} onVolumeChange={setVolume} onClose={() => setOptionsOpen(false)} />}
    </main>
  );
}

function MainMenu({ onPlay, onCharacters, onOptions }) {
  return (
    <section className="panel main-menu">
      <button type="button" onClick={onPlay}>
        <Swords size={20} />
        Jugar
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

function OptionsModal({ volume, onVolumeChange, onClose }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="options-title">
      <div className="options-modal">
        <header>
          <h2 id="options-title">Volumen</h2>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar opciones">
            <X size={18} />
          </button>
        </header>
        <label>
          Volumen {Math.round(volume * 100)}%
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(volume * 100)}
            onChange={(event) => onVolumeChange(Number(event.target.value) / 100)}
          />
        </label>
      </div>
    </div>
  );
}

function ResultModal({ title, onReturnHome }) {
  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-modal">
        <p className="eyebrow">Partida finalizada</p>
        <h2 id="result-title">{title}</h2>
        <button onClick={onReturnHome}>
          <Swords size={18} />
          Regresar al inicio
        </button>
      </div>
    </div>
  );
}

function CharactersCatalog({ characters, onBack }) {
  const pageSize = 6;
  const [page, setPage] = useState(1);
  const [inspectedCharacterId, setInspectedCharacterId] = useState("");
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const totalPages = Math.max(1, Math.ceil(characters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = characters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inspectedCharacter = characters.find((character) => character.id === inspectedCharacterId) || pageCharacters[0];
  const inspectedSkill = inspectedCharacter?.skills.find((skill) => skill.id === inspectedSkillId) || inspectedCharacter?.skills[0];

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  useEffect(() => {
    if (!inspectedCharacterId && pageCharacters[0]) {
      setInspectedCharacterId(pageCharacters[0].id);
      setInspectedSkillId(pageCharacters[0].skills[0]?.id || "");
    }
  }, [inspectedCharacterId, pageCharacters]);

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
      <div className="character-grid">
        {pageCharacters.map((character) => (
          <button
            key={character.id}
            className={`character-card ${inspectedCharacter?.id === character.id ? "inspected" : ""}`}
            onClick={() => inspectCharacter(character.id)}
          >
            <SquareImage alt={character.name} src={characterImage(character.id)} />
            <strong>{character.name}</strong>
          </button>
        ))}
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
          <div className="lobby-skill-strip" aria-label={`Habilidades de ${inspectedCharacter.name}`}>
            {inspectedCharacter.skills.map((skill) => (
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
          <SkillFooter skill={inspectedSkill} compact />
        </footer>
      )}
    </section>
  );
}

function Lobby({ characters, selected, me, room, onToggle, onConfirm, onSendChat }) {
  const pageSize = 6;
  const [page, setPage] = useState(1);
  const [inspectedCharacterId, setInspectedCharacterId] = useState("");
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const totalPages = Math.max(1, Math.ceil(characters.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageCharacters = characters.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const inspectedCharacter = characters.find((character) => character.id === inspectedCharacterId);
  const inspectedSkill = inspectedCharacter?.skills.find((skill) => skill.id === inspectedSkillId) || inspectedCharacter?.skills[0];
  const selectedCharacters = selected
    .map((characterId) => characters.find((character) => character.id === characterId))
    .filter(Boolean);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

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
        <div className="character-grid">
          {pageCharacters.map((character) => (
            <button
              key={character.id}
              className={`character-card ${selected.includes(character.id) ? "selected" : ""}`}
              onClick={() => clickCharacter(character.id)}
              disabled={me?.ready}
            >
              <SquareImage alt={character.name} src={characterImage(character.id)} />
              <strong>{character.name}</strong>
            </button>
          ))}
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
            <div className="lobby-skill-strip" aria-label={`Habilidades de ${inspectedCharacter.name}`}>
              {inspectedCharacter.skills.map((skill) => (
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
            <SkillFooter skill={inspectedSkill} compact />
          </footer>
        )}
      </div>
      <aside className="side-stack">
        <section className="panel status side-main">
          <p className="eyebrow">Sala {room.code}</p>
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
        <ChatPanel messages={room.chat || []} onSend={onSendChat} />
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
  const inspectedSkill = inspectedMember?.character.skills.find((skill) => skill.id === inspectedSkillId) || inspectedMember?.character.skills[0];
  const pendingSkill = selectedActor?.character.skills.find((skill) => skill.id === pendingSkillId);
  const eligibleTargetIds = new Set(pendingSkill ? eligibleTargetsForSkill(pendingSkill, me, opponent, selectedActor).map((member) => member.id) : []);
  const exchangeRecord = me?.chakraExchange?.turn === room.turn ? me.chakraExchange : null;
  const exchange = exchangeRecord && !exchangeRecord.undone ? exchangeRecord : null;
  const canUndoExchange = Boolean(exchange && (me?.chakra?.[exchange.receivedType] || 0) > 0);
  const canOpenExchange = isMyTurn && room.phase !== "finished" && !exchangeRecord && totalChakra(me?.chakra) >= 5;
  const exchangeButtonLabel = exchange ? "Deshacer intercambio" : "Intercambiar chakra";
  const queuedNeutralChakra = (me?.queue || []).reduce((total, action) => total + neutralChakraCost(action.chakra), 0);

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
    return isMyTurn
      && room.phase !== "finished"
      && !hasStatus(selectedActor, "stun")
      && skillCooldownFor(selectedActor, skill.id) <= 0
      && !isQueuedActor(me, selectedActor?.id)
      && !isQueuedSkill(me, selectedActor?.id, skill.id)
      && canPaySkillChakra(me?.chakra, skill.chakra, queuedNeutralChakra)
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
          </div>
          <div className="skill-list">
            {selectedActor?.character.skills.map((skill) => {
              const isPending = pendingSkillId === skill.id;
              const disabled = !isPending && !canPrepareSkill(skill);
              const cooldown = skillCooldownFor(selectedActor, skill.id);
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
                      {targetTypeLabel(skill.targetType)} - <ChakraCost chakra={skill.chakra} />
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
      <aside className="side-stack">
        <CollapsiblePanel title="Registro" className="combat-log side-main">
          <div className="log">
            {room.log.map((item, index) => (
              <p key={`${item}-${index}`}>{item}</p>
            ))}
          </div>
        </CollapsiblePanel>
        <ChatPanel messages={room.chat || []} onSend={onSendChat} collapsible />
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
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar intercambio">
            <X size={18} />
          </button>
        </header>
        <div className="chakra-choice" aria-label="Chakra a recibir">
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
        <div className="exchange-columns">
          <section>
            <h3>Tus chakras</h3>
            {chakraTypes.map((type) => (
              <div className="exchange-row" key={type.id}>
                <span className={`chakra-dot ${type.className}`} />
                <strong>{type.label}</strong>
                <b>{(chakra?.[type.id] || 0) - (spent[type.id] || 0)}</b>
                <button type="button" className="icon-button" onClick={() => moveToExchange(type.id)} disabled={spentTotal >= 5 || (chakra?.[type.id] || 0) - (spent[type.id] || 0) <= 0} aria-label={`Mover ${type.label} al intercambio`}>
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </section>
          <section>
            <h3>Intercambio</h3>
            {chakraTypes.map((type) => (
              <div className="exchange-row" key={type.id}>
                <button type="button" className="icon-button" onClick={() => returnFromExchange(type.id)} disabled={(spent[type.id] || 0) <= 0} aria-label={`Devolver ${type.label}`}>
                  <Minus size={16} />
                </button>
                <b>{spent[type.id] || 0}</b>
                <strong>{type.label}</strong>
                <span className={`chakra-dot ${type.className}`} />
              </div>
            ))}
          </section>
        </div>
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
          </div>
          <button type="button" className="icon-button modal-close" onClick={onClose} aria-label="Cerrar pago neutral">
            <X size={18} />
          </button>
        </header>
        <p className="modal-copy">Completa {required} chakra neutral con tus chakras disponibles.</p>
        <div className="exchange-columns">
          <section>
            <h3>Tus chakras</h3>
            {chakraTypes.map((type) => (
              <div className="exchange-row" key={type.id}>
                <span className={`chakra-dot ${type.className}`} />
                <strong>{type.label}</strong>
                <b>{(chakra?.[type.id] || 0) - (spent[type.id] || 0)}</b>
                <button type="button" className="icon-button" onClick={() => addPayment(type.id)} disabled={spentTotal >= required || (chakra?.[type.id] || 0) - (spent[type.id] || 0) <= 0} aria-label={`Agregar ${type.label} al pago neutral`}>
                  <Plus size={16} />
                </button>
              </div>
            ))}
          </section>
          <section>
            <h3>Pago neutral</h3>
            {chakraTypes.map((type) => (
              <div className="exchange-row" key={type.id}>
                <button type="button" className="icon-button" onClick={() => removePayment(type.id)} disabled={(spent[type.id] || 0) <= 0} aria-label={`Quitar ${type.label} del pago neutral`}>
                  <Minus size={16} />
                </button>
                <b>{spent[type.id] || 0}</b>
                <strong>{type.label}</strong>
                <span className={`chakra-dot ${type.className}`} />
              </div>
            ))}
          </section>
        </div>
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
  return (
    <section className="battle-skill-footer">
      <div className="battle-skill-strip" aria-label={`Habilidades de ${member.character.name}`}>
        {member.character.skills.map((item) => (
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
  const rowRef = useRef(null);

  useEffect(() => {
    if (!openEffectId) return undefined;
    function closeOnOutsideClick(event) {
      if (rowRef.current?.contains(event.target)) return;
      setOpenEffectId("");
    }
    document.addEventListener("click", closeOnOutsideClick);
    return () => document.removeEventListener("click", closeOnOutsideClick);
  }, [openEffectId]);

  if (!effects.length) return <span className="status-row" aria-label="Sin efectos" />;
  const groups = groupStatusEffects(effects);
  return (
    <span className="status-row" ref={rowRef}>
      {groups.map((group) => (
        <span
          className={`status-icon ${group.className} ${openEffectId === group.id ? "open" : ""}`}
          key={group.id}
          tabIndex={0}
          onClick={(event) => {
            event.stopPropagation();
            setOpenEffectId((current) => (current === group.id ? "" : group.id));
          }}
        >
          <img src={skillImage(group.sourceSkillId)} alt={group.sourceSkillName} />
          <b>{statusEffectGroupValue(group)}</b>
          <span className="status-tooltip" role="tooltip">
            <strong>{group.sourceSkillName}</strong>
            <ul>
              {group.effects.flatMap((effect) => effect.descriptions || [`${effect.sourceActorName || "Un personaje"} ha aplicado ${effect.type} a este personaje.`]).map((description, index) => (
                <li key={`${description}-${index}`}>{description}</li>
              ))}
            </ul>
            <small>{statusEffectGroupMeta(group)}</small>
          </span>
        </span>
      ))}
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
  if (type === "neutralChakra") {
    return (
      <svg className="chakra-svg neutral" viewBox="0 0 16 16" aria-hidden="true">
        <rect x="2" y="2" width="12" height="12" rx="3" />
      </svg>
    );
  }
  return (
    <svg className={`chakra-svg ${chakraType?.className || ""}`} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="2" width="12" height="12" rx="3" />
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

function emptyChakra() {
  return { taijutsu: 0, ninjutsu: 0, bloodline: 0, genjutsu: 0 };
}

function totalChakra(chakra = {}) {
  return chakraTypes.reduce((total, type) => total + (chakra?.[type.id] || 0), 0);
}

function neutralChakraCost(chakra = {}) {
  return Math.max(0, Number(chakra?.neutralChakra || 0));
}

function specificChakraCost(chakra = {}) {
  return chakraTypes.reduce((cost, type) => {
    cost[type.id] = Math.max(0, Number(chakra?.[type.id] || 0));
    return cost;
  }, emptyChakra());
}

function teamHealthPercent(player) {
  if (!player?.team?.length) return 1;
  const current = player.team.reduce((total, member) => total + Math.max(0, member.hp), 0);
  const max = player.team.reduce((total, member) => total + member.character.maxHp, 0);
  return max > 0 ? current / max : 0;
}

function characterImage(characterId) {
  return characterImages[`./assets/characters/${characterId}.png`];
}

function skillImage(skillId) {
  return skillImages[`./assets/skills/${skillId}.png`] || fallbackSkillImage(skillId);
}

function chakraCostLabel(chakra = {}) {
  return Object.entries(chakra)
    .filter(([, amount]) => amount > 0)
    .map(([type, amount]) => `${amount} ${type}`)
    .join(" + ");
}

function canPayChakra(available = {}, cost = {}) {
  return chakraTypes.every((type) => (available?.[type.id] || 0) >= (cost?.[type.id] || 0));
}

function canPaySkillChakra(available = {}, cost = {}, reservedNeutral = 0) {
  const specificCost = specificChakraCost(cost);
  return canPayChakra(available, specificCost) && totalChakra(available) >= reservedNeutral + totalChakra(specificCost) + neutralChakraCost(cost);
}

function skillCooldownFor(member, skillId) {
  return Math.max(0, member?.skillCooldowns?.[skillId] || 0);
}

function isQueuedSkill(player, actorId, skillId) {
  return Boolean(actorId && skillId && (player?.queue || []).some((item) => item.actorId === actorId && item.skillId === skillId));
}

function isQueuedActor(player, actorId) {
  return Boolean(actorId && (player?.queue || []).some((item) => item.actorId === actorId));
}

function eligibleTargetsForSkill(skill, me, opponent, actor) {
  if (!skill || !actor || actor.hp <= 0) return [];

  const allies = (me?.team || []).filter((member) => member.hp > 0);
  const enemies = (opponent?.team || []).filter((member) => member.hp > 0 && !hasStatus(member, "invulnerable"));

  if (skill.targetType === "self") return actor.hp > 0 ? [actor] : [];
  if (skill.targetType === "ally" || skill.targetType === "allies") return allies;
  if (skill.targetType === "enemy" || skill.targetType === "enemies") return enemies;
  if (skill.targetType === "allPlayers") return [...allies, ...enemies];
  return [];
}

function hasStatus(member, type) {
  return (member?.statusEffects || []).some((effect) => effect.type === type && effect.turns > 0);
}

function groupStatusEffects(effects = []) {
  const groups = new Map();
  for (const effect of effects) {
    const key = effect.sourceSkillId || effect.id;
    const current = groups.get(key);
    if (current) {
      current.effects.push(effect);
      current.className = current.effects.length > 1 ? `${current.effects[0].type} stacked-status` : current.className;
      continue;
    }
    groups.set(key, {
      id: key,
      sourceSkillId: effect.sourceSkillId,
      sourceSkillName: effect.sourceSkillName,
      className: effect.type,
      effects: [effect]
    });
  }
  return [...groups.values()];
}

function statusEffectGroupValue(group) {
  const timedEffects = group.effects.filter((effect) => Number.isFinite(effect.turns));
  if (timedEffects.length > 0) {
    return Math.max(...timedEffects.map((effect) => effect.turns));
  }
  return statusEffectValue(group.effects[0]);
}

function statusEffectGroupMeta(group) {
  const metas = group.effects.map((effect) => statusEffectMeta(effect));
  return [...new Set(metas)].join(" | ");
}

function statusEffectValue(effect) {
  if (effect.type === "shield") return effect.remainingShield || effect.value;
  if (Number.isFinite(effect.turns)) return effect.turns;
  return effect.turns;
}

function statusEffectMeta(effect) {
  if (effect.type === "shield") return "Escudo destruible";
  if (effect.type === "damage-reduction") return `Turnos restantes: ${effect.turns}`;
  return `Turnos restantes: ${effect.turns}`;
}

function effectDescription(effect) {
  if (effect.type === "damage") return `${damageTypeLabel(effect.damageType)}: ${effect.value}`;
  if (effect.type === "heal") return `Cura: ${effect.value}`;
  if (effect.type === "self-heal") return `Auto-curacion: ${effect.value}`;
  if (effect.type === "shield") return `Escudo destruible: ${effect.value}${effect.isStackable ? " (acumulable)" : " (renovable)"}`;
  if (effect.type === "damage-reduction") return `Reduccion de dano: ${effect.value} por ${effect.duration} turno(s)`;
  if (effect.type === "buffDamage") {
    const scope = effect.skillIds?.length ? ` (${effect.skillIds.join(", ")})` : " (todas)";
    return `Aumenta dano: +${effect.value} por ${effect.duration} turno(s)${scope}`;
  }
  if (effect.type === "stun") return `Aturde: ${effect.value} turno(s)`;
  if (effect.type === "invulnerable") return `Invulnerable: ${effect.value} turno(s)`;
  if (effect.type === "gain-chakra") return `Gana chakra: ${effect.value} ${chakraEffectTypeLabel(effect.chakraType)}`;
  if (effect.type === "remove-chakra") return `Elimina chakra: ${effect.value} ${chakraEffectTypeLabel(effect.chakraType)}`;
  return `${effect.type}: ${effect.value}`;
}

function chakraEffectTypeLabel(type) {
  return chakraTypes.find((item) => item.id === type)?.label || "al azar";
}

function damageTypeLabel(type = "basic") {
  const labels = {
    basic: "Dano basico",
    piercing: "Dano perforante",
    affliction: "Dano afliccion"
  };
  return labels[type] || "Dano basico";
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

function targetTypeLabel(type) {
  const labels = {
    self: "Uno mismo",
    enemy: "Un enemigo",
    ally: "Un aliado",
    enemies: "Todos los enemigos",
    allies: "Todos los aliados",
    allPlayers: "Todos los jugadores"
  };
  return labels[type] || "objetivo";
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
