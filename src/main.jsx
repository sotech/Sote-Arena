import React, { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import { io } from "socket.io-client";
import { CheckCircle2, Copy, ListChecks, Swords, Trash2, Users, Shield, HeartPulse, Zap } from "lucide-react";
import "./styles.css";

const socket = io();
const characterImages = import.meta.glob("./assets/characters/*.png", { eager: true, query: "?url", import: "default" });
const skillImages = import.meta.glob("./assets/skills/*.png", { eager: true, query: "?url", import: "default" });
const chakraTypes = [
  { id: "taijutsu", label: "Tai", className: "tai" },
  { id: "ninjutsu", label: "Nin", className: "nin" },
  { id: "bloodline", label: "Blood", className: "blood" },
  { id: "genjutsu", label: "Gen", className: "gen" }
];
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
  const [playerId, setPlayerId] = useState("");
  const [name, setName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [selected, setSelected] = useState([]);
  const [actorId, setActorId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

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

  function callSocket(event, payload) {
    return new Promise((resolve) => {
      socket.emit(event, payload, (response) => resolve(response));
    });
  }

  async function createRoom() {
    setError("");
    const response = await callSocket("room:create", { name });
    if (!response.ok) {
      setError(response.error);
      return;
    }
    setPlayerId(response.playerId);
    setRoom(response.room);
  }

  async function joinRoom() {
    setError("");
    const response = await callSocket("room:join", { code: joinCode, name });
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

  async function useSkill(skillId) {
    setError("");
    const response = await callSocket("battle:skill", { actorId, targetId, skillId });
    if (!response.ok) setError(response.error);
  }

  async function endTurn() {
    setError("");
    const response = await callSocket("battle:endTurn", {});
    if (!response.ok) setError(response.error);
  }

  async function removeQueuedSkill(actionId) {
    setError("");
    const response = await callSocket("battle:removeQueuedSkill", { actionId });
    if (!response.ok) setError(response.error);
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
          <button className="code" onClick={copyRoomCode}>
            <Copy size={16} />
            {room.code}
          </button>
        )}
      </section>

      {error && <div className="alert">{error}</div>}
      {notice && <div className="notice">{notice}</div>}

      {!room && (
        <section className="panel entry">
          <div className="entry-copy">
            <Swords size={44} />
            <h2>Duelo 3 vs 3 por turnos</h2>
            <p>Crear o unirse a una sala conecta a dos jugadores. La base de datos es temporal y se reinicia con el servidor.</p>
          </div>
          <div className="form-grid">
            <label>
              Nombre
              <input value={name} maxLength={18} onChange={(event) => setName(event.target.value)} placeholder="Jugador" />
            </label>
            <button onClick={createRoom}>
              <Users size={18} />
              Crear sala
            </button>
            <label>
              Codigo
              <input value={joinCode} maxLength={5} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="ABCDE" />
            </label>
            <button className="secondary" onClick={joinRoom}>
              <Swords size={18} />
              Unirse
            </button>
          </div>
        </section>
      )}

      {room?.phase === "lobby" && (
        <Lobby
          characters={characters}
          selected={selected}
          me={me}
          room={room}
          onToggle={toggleCharacter}
          onConfirm={confirmTeam}
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
        />
      )}

      {matchResult && <ResultModal title={matchResult} onReturnHome={returnHome} />}
    </main>
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

function Lobby({ characters, selected, me, room, onToggle, onConfirm }) {
  return (
    <section className="lobby">
      <div className="panel">
        <div className="section-head">
          <div>
            <p className="eyebrow">Equipo</p>
            <h2>Elige 3 personajes</h2>
          </div>
          <button disabled={selected.length !== 3 || me?.ready} onClick={onConfirm}>
            <Shield size={18} />
            Confirmar
          </button>
        </div>
        <div className="character-grid">
          {characters.map((character) => (
            <button
              key={character.id}
              className={`character-card ${selected.includes(character.id) ? "selected" : ""}`}
              onClick={() => onToggle(character.id)}
              disabled={me?.ready}
            >
              <SquareImage alt={character.name} src={characterImage(character.id)} />
              <strong>{character.name}</strong>
            </button>
          ))}
        </div>
      </div>
      <aside className="panel status">
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
      </aside>
    </section>
  );
}

function Battle({ room, me, opponent, isMyTurn, actorId, targetId, selectedActor, onActor, onTarget, onSkill, onEndTurn, onRemoveQueuedSkill }) {
  const winner = room.players.find((player) => player.id === room.winnerId);
  const activePlayer = room.players.find((player) => player.id === room.activePlayerId);
  const [inspectedSkillId, setInspectedSkillId] = useState("");
  const inspectedSkill = selectedActor?.character.skills.find((skill) => skill.id === inspectedSkillId) || selectedActor?.character.skills[0];

  function clickSkill(skill) {
    setInspectedSkillId(skill.id);
    if (isMyTurn && room.phase !== "finished" && !hasStatus(selectedActor, "stun")) {
      onSkill(skill.id);
    }
  }

  return (
    <section className="battle">
      <BalanceBar players={room.players} />
      <div className="arena">
        <Team
          title={me?.name || "Tu equipo"}
          player={me}
          active={isMyTurn}
          actorId={actorId}
          targetId={targetId}
          onActor={onActor}
          onTarget={onTarget}
          ownTeam
        />
        <div className="turn-panel">
          <p className="eyebrow">Turno {room.turn}</p>
          {room.phase === "finished" ? <h2>Gano {winner?.name}</h2> : <h2>{isMyTurn ? "Tu turno" : "Turno rival"}</h2>}
          <div className="chakra">
            <Zap size={18} />
            <span>Chakra</span>
          </div>
          <ChakraPool chakra={me?.chakra} />
          <div className="skill-list">
            {selectedActor?.character.skills.map((skill) => (
              <button
                key={skill.id}
                className={!canPayChakra(me?.chakra, skill.chakra) || hasStatus(selectedActor, "stun") ? "unavailable" : ""}
                disabled={!isMyTurn || room.phase === "finished" || hasStatus(selectedActor, "stun")}
                onClick={() => clickSkill(skill)}
              >
                <SquareImage alt={skill.name} src={skillImage(skill.id)} />
                <span className="skill-copy">
                  <strong>{skill.name}</strong>                  
                  <small>{targetTypeLabel(skill.targetType)} - {chakraCostLabel(skill.chakra)}</small>
                </span>
              </button>
            ))}
          </div>
          <button className="end-turn" disabled={!isMyTurn || room.phase === "finished"} onClick={onEndTurn}>
            <CheckCircle2 size={18} />
            Finalizar turno
          </button>
          <QueuePanel
            title={isMyTurn ? "Tu cola" : `Cola de ${activePlayer?.name || "rival"}`}
            queue={activePlayer?.queue || []}
            removable={isMyTurn}
            onRemove={onRemoveQueuedSkill}
          />
        </div>
        <Team title={opponent?.name || "Rival"} player={opponent} active={room.activePlayerId === opponent?.id} targetId={targetId} onTarget={onTarget} targetable />
      </div>
      <aside className="panel combat-log">
        <h2>Registro</h2>
        {room.log.map((item, index) => (
          <p key={`${item}-${index}`}>{item}</p>
        ))}
      </aside>
      <SkillFooter skill={inspectedSkill} />
    </section>
  );
}

function SkillFooter({ skill }) {
  if (!skill) return null;
  return (
    <footer className="skill-footer">
      <SquareImage alt={skill.name} src={skillImage(skill.id)} />
      <div>
        <p className="eyebrow">Habilidad seleccionada</p>
        <h2>{skill.name}</h2>
        <p>{skill.description}</p>
      </div>
      <div className="skill-footer-meta">
        <strong>{targetTypeLabel(skill.targetType)}</strong>
        <span>{chakraCostLabel(skill.chakra)}</span>
      </div>
      <ul>
        {(skill.effects || []).map((effect, index) => (
          <li key={`${effect.type}-${index}`}>{effectDescription(effect)}</li>
        ))}
      </ul>
    </footer>
  );
}

function BalanceBar({ players }) {
  const red = players.find((player) => player.side === "red") || players[0];
  const blue = players.find((player) => player.side === "blue") || players[1];
  const redHealth = teamHealthPercent(red);
  const blueHealth = teamHealthPercent(blue);
  const arrow = Math.max(6, Math.min(94, 50 + (blueHealth - redHealth) * 50));
  const redFill = Math.min(50, arrow);
  const blueFill = Math.max(0, 100 - Math.max(50, arrow));

  return (
    <div className="balance-panel">
      <div className="balance-labels">
        <span>{red?.name || "Rojo"} {Math.round(redHealth * 100)}%</span>
        <strong>Balance</strong>
        <span>{blue?.name || "Azul"} {Math.round(blueHealth * 100)}%</span>
      </div>
      <div className="balance-track">
        <span className="balance-half red-half" />
        <span className="balance-half blue-half" />
        <span className="balance-fill red-fill" style={{ width: `${redFill}%` }} />
        <span className="balance-fill blue-fill" style={{ width: `${blueFill}%` }} />
        <span className="balance-arrow" style={{ left: `${arrow}%` }} />
      </div>
    </div>
  );
}

function QueuePanel({ title, queue, removable, onRemove }) {
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
          {queue.map((item) => (
            <li key={item.id}>
              <button className="queue-action" disabled={!removable} onClick={() => onRemove(item.id)}>
                <SquareImage alt={item.skillName} src={skillImage(item.skillId)} />
                <span>
                  <strong>{item.skillName}</strong>
                  <span>{item.actorName} a {item.targetName}</span>
                  <small>{chakraCostLabel(item.chakra)} gastado</small>
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

function Team({ title, player, active, actorId, targetId, onActor, onTarget, targetable = false, ownTeam = false }) {
  return (
    <div className={`team ${player?.side || ""} ${active ? "active" : ""}`}>
      <h2>{title}</h2>
      <div className="fighters">
        {player?.team.map((member) => {
          const untargetable = targetable && hasStatus(member, "invulnerable");
          const selectable = member.hp > 0 && !untargetable;
          return (
            <div
              className={`fighter ${actorId === member.id ? "actor-picked" : ""} ${targetId === member.id ? "target-picked" : ""} ${member.hp <= 0 ? "down" : ""} ${untargetable ? "untargetable" : ""}`}
              key={member.id}
              onClick={() => selectable && (ownTeam ? onActor(member.id) : onTarget(member.id))}
              role="button"
              tabIndex={selectable ? 0 : -1}
              aria-disabled={!selectable}
            >
              <div className="fighter-top">
                <SquareImage alt={member.hp <= 0 ? `${member.character.name} derrotado` : member.character.name} src={member.hp <= 0 ? skullImage : characterImage(member.character.id)} />
                <StatusEffects effects={member.statusEffects || []} />
              </div>
              <strong>{member.character.name}</strong>
              <Health current={member.hp} max={member.character.maxHp} />
              <span className="stats">
                <HeartPulse size={14} /> {member.hp}
                <Shield size={14} /> {member.shield}
              </span>
              <small>{untargetable ? "Invulnerable" : targetable ? "Objetivo enemigo" : ownTeam ? "Atacante" : "Objetivo"}</small>
              {ownTeam && (
                <span className="fighter-actions">
                  <span>Atacante</span>
                  <button type="button" onClick={(event) => { event.stopPropagation(); onTarget(member.id); }}>
                    Objetivo aliado
                  </button>
                </span>
              )}
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
  if (!effects.length) return <span className="status-row" aria-label="Sin efectos" />;
  return (
    <span className="status-row">
      {effects.map((effect) => (
        <span className={`status-icon ${effect.type}`} key={effect.id} tabIndex={0}>
          <img src={skillImage(effect.sourceSkillId)} alt={effect.sourceSkillName} />
          <b>{effect.turns}</b>
          <span className="status-tooltip" role="tooltip">
            <strong>{effect.sourceSkillName}</strong>
            <ul>
              {(effect.descriptions || [`${effect.sourceActorName || "Un personaje"} ha aplicado ${effect.type} a este personaje.`]).map((description) => (
                <li key={description}>{description}</li>
              ))}
            </ul>
            <small>Turnos restantes: {effect.turns}</small>
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
          <b>{chakra?.[type.id] || 0}</b>
          {type.label}
        </span>
      ))}
    </div>
  );
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
  return Object.entries(cost).every(([type, amount]) => (available?.[type] || 0) >= amount);
}

function hasStatus(member, type) {
  return (member?.statusEffects || []).some((effect) => effect.type === type && effect.turns > 0);
}

function effectDescription(effect) {
  if (effect.type === "damage") return `Dano: ${effect.value}`;
  if (effect.type === "heal") return `Cura: ${effect.value}`;
  if (effect.type === "self-heal") return `Auto-curacion: ${effect.value}`;
  if (effect.type === "leech") return `Roba vida: ${effect.value} de dano y ${effect.heal} de sanacion`;
  if (effect.type === "shield") return `Escudo: ${effect.value}`;
  if (effect.type === "stun") return `Aturde: ${effect.value} turno(s)`;
  if (effect.type === "invulnerable") return `Invulnerable: ${effect.value} turno(s)`;
  return `${effect.type}: ${effect.value}`;
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
