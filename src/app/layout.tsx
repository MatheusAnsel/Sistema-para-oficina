import type { Metadata, Viewport } from "next";
import "@fontsource/barlow-condensed/600.css";
import "@fontsource/barlow-condensed/700.css";
import "@fontsource/barlow/400.css";
import "@fontsource/barlow/500.css";
import "@fontsource/barlow/600.css";
import "./globals.css";
import { business } from "@/config/business";
import { siteUrl } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: `${business.name} | Orçamento pelo WhatsApp`,
  description:
    "Peça o orçamento do seu carro pelo WhatsApp: responda algumas perguntas, envie uma foto do problema e a oficina retorna com o valor.",
  openGraph: {
    title: `${business.name} | Orçamento pelo WhatsApp`,
    description: "Responda algumas perguntas, envie uma foto do problema e receba o orçamento.",
    type: "website",
    locale: "pt_BR",
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
  colorScheme: "dark",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
