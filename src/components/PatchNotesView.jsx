import React from "react";
import { ChevronLeft } from "lucide-react";
import patchNotesHtml from "../../patch-notes.html?raw";

const PATCH_NOTES_BODY = patchNotesHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || patchNotesHtml;

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
      <div className="patch-notes-content" dangerouslySetInnerHTML={{ __html: PATCH_NOTES_BODY }} />
    </section>
  );
}
