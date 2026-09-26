import { del, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { ErroValidacao } from "@/lib/gestao-validacao";

export const dynamic = "force-dynamic";

const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 8 * 1024 * 1024; // 8 MB — rede de segurança; o app já redimensiona antes de enviar.

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;

    const { rows } = await db().query("SELECT id, foto_url FROM veiculos WHERE id = $1 AND ativo = true", [id]);
    const veiculo = rows[0];
    if (!veiculo) return NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });

    const form = await req.formData().catch(() => null);
    const arquivo = form?.get("foto");
    if (!(arquivo instanceof File)) throw new ErroValidacao("Envie uma foto");
    if (!TIPOS_ACEITOS.includes(arquivo.type)) throw new ErroValidacao("Formato de imagem não suportado");
    if (arquivo.size > TAMANHO_MAXIMO) throw new ErroValidacao("Imagem muito grande");

    const { url } = await put(`veiculos/${id}-${Date.now()}.jpg`, arquivo, {
      access: "public",
      contentType: arquivo.type,
    });

    await db().query("UPDATE veiculos SET foto_url = $1 WHERE id = $2", [url, id]);

    // Apaga a foto antiga depois de confirmar a nova, para nunca ficar sem nenhuma em caso de falha.
    if (veiculo.foto_url) {
      await del(veiculo.foto_url).catch((err) => console.error("[gestao] falha ao apagar foto antiga", err));
    }

    return NextResponse.json({ foto_url: url });
  });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const { rows } = await db().query("SELECT foto_url FROM veiculos WHERE id = $1", [id]);
    const foto_url = rows[0]?.foto_url as string | null | undefined;

    await db().query("UPDATE veiculos SET foto_url = NULL WHERE id = $1", [id]);
    if (foto_url) {
      await del(foto_url).catch((err) => console.error("[gestao] falha ao apagar foto", err));
    }
    return new NextResponse(null, { status: 204 });
  });
}
