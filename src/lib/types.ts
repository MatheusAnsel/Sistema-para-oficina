export type LeadStatus = "novo" | "em_atendimento" | "orcado" | "fechado" | "perdido";

export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
  novo: "Novo",
  em_atendimento: "Em atendimento",
  orcado: "Orçado",
  fechado: "Fechado",
  perdido: "Perdido",
};

export type MediaKind = "image" | "video" | "audio" | "document";

export type LeadMedia = {
  id: string;
  kind: MediaKind;
  caption?: string;
};

export type Lead = {
  id: string;
  phone: string;
  name: string;
  vehicle: string;
  year: number;
  service: string;
  notes: string[];
  media: LeadMedia[];
  status: LeadStatus;
  createdAt: string;
  updatedAt: string;
};

export type FlowState = "idle" | "name" | "vehicle" | "year" | "service" | "media" | "done";

export type Draft = {
  name?: string;
  vehicle?: string;
  year?: number;
  service?: string;
};

export type Conversation = {
  phone: string;
  state: FlowState;
  draft: Draft;
  leadId?: string;
  /** ids das ultimas mensagens processadas (a Meta pode reenviar o mesmo webhook) */
  seen: string[];
  updatedAt: string;
  doneAt?: string;
};

export type Incoming = {
  id: string;
  from: string;
  profileName?: string;
  kind: "text" | "image" | "video" | "audio" | "document" | "reply" | "other";
  text?: string;
  mediaId?: string;
  caption?: string;
  /** id de botao ou item de lista tocado pelo cliente */
  replyId?: string;
};

export type Outgoing =
  | { type: "text"; body: string }
  | { type: "buttons"; body: string; buttons: { id: string; title: string }[] }
  | {
      type: "list";
      body: string;
      button: string;
      rows: { id: string; title: string; description?: string }[];
    };
