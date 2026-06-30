import React, { useEffect, useState } from "react";
import { FileText, FlaskConical, Shield, Swords, Users, Zap } from "lucide-react";

export function MainMenu({ onPlay, onPlayBot, onPlayBotVsBot, onRunTests, onCharacters, onPatchNotes, onOptions }) {
  const [showTestButton, setShowTestButton] = useState(false);

  useEffect(() => {
    function handleKeyDown(event) {
      if (event.key === "Control" || event.ctrlKey) setShowTestButton(true);
    }

    function handleKeyUp(event) {
      if (event.key === "Control" || !event.ctrlKey) setShowTestButton(false);
    }

    function handleBlur() {
      setShowTestButton(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  return (
    <section className="panel main-menu">
      <button type="button" onClick={onPlay}>
        <Swords size={20} />
        Jugar PVP
      </button>
      <button type="button" onClick={onPlayBot}>
        <Zap size={20} />
        Jugar vs IA
      </button>
      <button type="button" onClick={onPlayBotVsBot}>
        <Swords size={20} />
        Bot vs Bot
      </button>
      {showTestButton && (
        <button type="button" onClick={onRunTests}>
          <FlaskConical size={20} />
          Testeo
        </button>
      )}
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
