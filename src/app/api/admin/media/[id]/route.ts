import { NextRequest, NextResponse } from "next/server";
import { fetchMedia } from "@/lib/whatsapp";

export const dynamic = "force-dynamic";

/** Repassa a foto/video do cliente (a Meta guarda a midia por tempo limitado). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!/^\d+$/.test(id)) return new NextResponse("Bad request", { status: 400 });

  const media = await fetchMedia(id);
  if (!media) return new NextResponse("Mídia indisponível ou expirada", { status: 404 });

  return new NextResponse(media.body, {
    headers: {
      "Content-Type": media.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox",
    },
  });
}
