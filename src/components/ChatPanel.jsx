import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const MOBILE_QUERY = "(max-width: 768px)";

export function ChatPanel({ messages, onSend, collapsible = false }) {
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

export function CollapsiblePanel({ title, className = "", children }) {
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
