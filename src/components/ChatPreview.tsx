import { business } from "@/config/business";

type Msg = { from: "bot" | "user"; body?: string; kind?: "list" | "photo" };

const messages: Msg[] = [
  { from: "bot", body: `Olá! Aqui é o atendimento da ${business.name}. Qual é o seu nome?` },
  { from: "user", body: "Carlos" },
  { from: "bot", body: "Prazer, Carlos! Qual é o veículo?" },
  { from: "user", body: "VW Gol 1.0" },
  { from: "bot", body: "Qual é o ano do veículo?" },
  { from: "user", body: "2014" },
  { from: "bot", kind: "list", body: "Qual serviço você precisa?" },
  { from: "user", body: "Freios" },
  { from: "bot", body: "Se puder, envie uma foto ou vídeo do problema." },
  { from: "user", kind: "photo", body: "Foto enviada" },
  { from: "bot", body: "Pronto, seu pedido foi enviado para a oficina." },
];

/** Reproduz, uma vez, a conversa que o cliente terá com o atendimento automático. */
export default function ChatPreview() {
  return (
    <figure className="chat" aria-label="Exemplo de conversa de orçamento no WhatsApp">
      <div className="chat-head">
        <span className="chat-avatar" aria-hidden="true">
          799
        </span>
        <div>
          <strong>{business.name}</strong>
          <span>atendimento automático</span>
        </div>
      </div>
      <div className="chat-body">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`msg msg-${m.from}`}
            style={{ animationDelay: `${0.6 + i * 0.85}s` }}
          >
            <div className="bubble">
              {m.kind === "photo" && (
                <span className="bubble-photo" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <circle cx="9" cy="10.5" r="1.6" />
                    <path d="m4 17 5-4.5 4 3.5 3-2.5 4 3.5" />
                  </svg>
                </span>
              )}
              {m.body}
              {m.kind === "list" && <span className="bubble-list">Ver opções</span>}
            </div>
          </div>
        ))}
      </div>
    </figure>
  );
}
