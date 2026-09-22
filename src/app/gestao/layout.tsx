import type { Metadata } from "next";
import { business } from "@/config/business";

export const metadata: Metadata = {
  title: `Gestão | ${business.name}`,
  robots: { index: false, follow: false },
};

export default function GestaoLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
