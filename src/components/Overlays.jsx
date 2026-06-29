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
        {showPrimaryAction && (
          <button type="button" className="surrender-button" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export function ResultModal({ title, reason, onReturnHome }) {
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
