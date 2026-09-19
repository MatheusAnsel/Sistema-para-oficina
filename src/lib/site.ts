import { business } from "@/config/business";

export const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

/** Link do botao de WhatsApp do site. O bot reconhece o servico citado na mensagem. */
export function whatsappLink(message = "Olá! Vim pelo site e quero um orçamento.") {
  const number = (process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "").replace(/\D/g, "");
  const text = encodeURIComponent(message);
  return number ? `https://wa.me/${number}?text=${text}` : `https://wa.me/?text=${text}`;
}

export function serviceMessage(label: string, id: string) {
  return id === "outro"
    ? "Olá! Vim pelo site e quero um orçamento."
    : `Olá! Vim pelo site e quero um orçamento de ${label}.`;
}

/**
 * Mapa da secao "Onde estamos". Com GOOGLE_MAPS_API_KEY usa a Maps Embed API
 * (chave gratuita, restrinja por dominio no Google Cloud); sem a chave, cai no
 * embed simples do Google Maps, que tambem funciona.
 */
export function mapsEmbedUrl() {
  if (!business.address) return null;
  const q = encodeURIComponent(`${business.name}, ${business.address}`);
  const key = process.env.GOOGLE_MAPS_API_KEY;
  return key
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(key)}&q=${q}&language=pt-BR&region=BR&zoom=16`
    : `https://www.google.com/maps?q=${q}&output=embed`;
}

export function directionsUrl() {
  return business.address
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${business.name} ${business.address}`)}`
    : null;
}

export const phoneTel = () => {
  const d = business.phoneDisplay.replace(/\D/g, "");
  return d ? `tel:+55${d}` : null;
};

export function formatPhone(raw: string) {
  const d = raw.replace(/\D/g, "");
  const m = d.match(/^55(\d{2})(9?\d{4})(\d{4})$/);
  return m ? `+55 (${m[1]}) ${m[2]}-${m[3]}` : `+${d}`;
}

/** "(21) 97445-8983" -> "tel:+5521974458983" */
export function telLink(display: string) {
  const d = display.replace(/\D/g, "");
  return `tel:+${d.startsWith("55") ? d : `55${d}`}`;
}
