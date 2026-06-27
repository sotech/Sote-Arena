import React from "react";
import { FileText, Shield, Swords, Users, Zap } from "lucide-react";

export function MainMenu({ onPlay, onPlayBot, onCharacters, onPatchNotes, onOptions }) {
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
      <button type="button" className="secondary" onClick={onPatchNotes}>
        <FileText size={20} />
        Notas de parche
      </button>
      <button type="button" onClick={onOptions}>
        <Shield size={20} />
        Opciones
      </button>
    </section>
  );
}
