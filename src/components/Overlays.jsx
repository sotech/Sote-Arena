import { useMemo, useState } from "react";
import { Swords, X } from "lucide-react";

export function OptionsModal({
  sfxVolume,
  musicVolume,
  canSurrender = false,
  primaryActionLabel = "",
  onPrimaryAction,
  onSfxVolumeChange,
  onMusicVolumeChange,
  onSurrender,
  onClose
}) {
  const showPrimaryAction = Boolean(primaryActionLabel && onPrimaryAction);
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
          Musica {Math.round(musicVolume * 100)}%
          <input
            type="range"
            min="0"
            max="100"
            value={Math.round(musicVolume * 100)}
            onChange={(event) => onMusicVolumeChange(Number(event.target.value) / 100)}
          />
        </label>
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
        {canSurrender && (
          <button type="button" className="surrender-button" onClick={onSurrender}>
            Rendirse
          </button>
        )}
        {showPrimaryAction && (
          <button type="button" className="surrender-button" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

const resultColumns = [
  { id: "characterName", label: "Personaje", type: "text" },
  { id: "playerName", label: "Equipo", type: "text" },
  { id: "damageDone", label: "Dano hecho", type: "number" },
  { id: "healingDone", label: "Sanacion hecha", type: "number" }
];

export function ResultModal({ title, reason, stats = [], onReturnHome }) {
  const [sort, setSort] = useState({ key: "damageDone", direction: "desc" });
  const sortedStats = useMemo(() => {
    const column = resultColumns.find((item) => item.id === sort.key) || resultColumns[2];
    return [...stats].sort((a, b) => {
      const aValue = a?.[column.id] ?? (column.type === "number" ? 0 : "");
      const bValue = b?.[column.id] ?? (column.type === "number" ? 0 : "");
      if (column.type === "number") {
        const delta = Number(bValue || 0) - Number(aValue || 0);
        return sort.direction === "desc" ? delta : -delta;
      }
      const delta = String(aValue).localeCompare(String(bValue));
      return sort.direction === "asc" ? delta : -delta;
    });
  }, [stats, sort]);

  function sortBy(columnId) {
    setSort((current) => ({
      key: columnId,
      direction: current.key === columnId && current.direction === "desc" ? "asc" : "desc"
    }));
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="result-title">
      <div className="result-modal">
        <p className="eyebrow">Partida finalizada</p>
        <h2 id="result-title">{title}</h2>
        {reason && <p className="result-reason">{reason}</p>}
        {sortedStats.length > 0 && (
          <div className="result-stats-table-wrap">
            <table className="result-stats-table">
              <thead>
                <tr>
                  {resultColumns.map((column) => (
                    <th key={column.id}>
                      <button type="button" onClick={() => sortBy(column.id)}>
                        {column.label}
                        {sort.key === column.id && <span>{sort.direction === "desc" ? "v" : "^"}</span>}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedStats.map((item) => (
                  <tr key={item.memberId} className={item.side === "player" ? "result-player-row" : "result-enemy-row"}>
                    <td>{item.characterName}</td>
                    <td>{item.playerName}</td>
                    <td>{item.damageDone}</td>
                    <td>{item.healingDone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <button onClick={onReturnHome}>
          <Swords size={18} />
          Regresar al inicio
        </button>
      </div>
    </div>
  );
}
