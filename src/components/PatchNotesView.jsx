import React from "react";
import { ChevronLeft } from "lucide-react";
import { PatchNotesContent } from "./PatchNotesContent.jsx";

export function PatchNotesView({ onBack }) {
  return (
    <section className="panel patch-notes-view">
      <div className="section-head">
        <div>
          <p className="eyebrow">Actualizaciones</p>
          <h2>Notas de parche</h2>
        </div>
        <button type="button" className="secondary" onClick={onBack}>
          <ChevronLeft size={18} />
          Volver
        </button>
      </div>
      <div className="patch-notes-content">
        <PatchNotesContent />
      </div>
    </section>
  );
}
