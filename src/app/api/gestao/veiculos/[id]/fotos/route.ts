import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { db, transacao } from "@/lib/db";
import { comTratamentoDeErro } from "@/lib/gestao-route";
import { ErroValidacao } from "@/lib/gestao-validacao";
import { apagarArquivo, subirArquivo } from "@/lib/storage";

export const dynamic = "force-dynamic";

/**
 * Fotos ADICIONAIS do veiculo (a principal continua em veiculos.foto_url, rota ../foto).
 *   GET    -> lista
 *   POST   -> envia uma foto (multipart, campo "foto")
 *   PATCH  ?foto=<uuid> -> torna essa foto a principal (troca com a principal atual)
 *   DELETE ?foto=<uuid> -> remove
 */
type Ctx = { params: Promise<{ id: string }> };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPOS_ACEITOS = ["image/jpeg", "image/png", "image/webp"];
const TAMANHO_MAXIMO = 8 * 1024 * 1024; // rede de seguranca; o app ja redimensiona antes de enviar
const MAX_FOTOS_EXTRAS = 20;

const naoEncontrado = () => NextResponse.json({ error: "Veículo não encontrado" }, { status: 404 });

export async function GET(_req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return naoEncontrado();
    const { rows } = await db().query(
      "SELECT id, veiculo_id, url, criado_em FROM veiculo_fotos WHERE veiculo_id = $1 ORDER BY criado_em, id",
      [id],
    );
    return NextResponse.json(rows);
  });
}

export async function POST(req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    if (!UUID.test(id)) return naoEncontrado();

    const { rows } = await db().query("SELECT id FROM veiculos WHERE id = $1 AND ativo = true", [id]);
    if (!rows[0]) return naoEncontrado();
    const { rows: cont } = await db().query("SELECT count(*)::int AS n FROM veiculo_fotos WHERE veiculo_id = $1", [id]);
    if (cont[0].n >= MAX_FOTOS_EXTRAS) {
      throw new ErroValidacao(`Limite de ${MAX_FOTOS_EXTRAS} fotos adicionais por veículo`);
    }

    const form = await req.formData().catch(() => null);
    const arquivo = form?.get("foto");
    if (!(arquivo instanceof File)) throw new ErroValidacao("Envie uma foto");
    if (!TIPOS_ACEITOS.includes(arquivo.type)) throw new ErroValidacao("Formato de imagem não suportado");
    if (arquivo.size > TAMANHO_MAXIMO) throw new ErroValidacao("Imagem muito grande");

    const buffer = Buffer.from(await arquivo.arrayBuffer());
    const url = await subirArquivo(`veiculos/${id}-${Date.now()}-${randomUUID().slice(0, 8)}.jpg`, buffer, arquivo.type);

    try {
      const { rows: nova } = await db().query(
        "INSERT INTO veiculo_fotos (veiculo_id, url) VALUES ($1, $2) RETURNING id, veiculo_id, url, criado_em",
        [id, url],
      );
      return NextResponse.json(nova[0], { status: 201 });
    } catch (err) {
      await apagarArquivo(url); // nao deixa arquivo orfao no storage se o banco recusar
      throw err;
    }
  });
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const fotoId = req.nextUrl.searchParams.get("foto") ?? "";
    if (!UUID.test(id)) return naoEncontrado();
    if (!UUID.test(fotoId)) throw new ErroValidacao("Foto inválida");

    const out = await transacao(async (client) => {
      const { rows: v } = await client.query("SELECT foto_url FROM veiculos WHERE id = $1 AND ativo = true FOR UPDATE", [id]);
      if (!v[0]) return null;
      const { rows: f } = await client.query("SELECT url FROM veiculo_fotos WHERE id = $1 AND veiculo_id = $2", [fotoId, id]);
      if (!f[0]) throw new ErroValidacao("Foto não encontrada");

      // A principal atual vai para a galeria no lugar da escolhida (ou a linha some se nao havia principal).
      if (v[0].foto_url) await client.query("UPDATE veiculo_fotos SET url = $1 WHERE id = $2", [v[0].foto_url, fotoId]);
      else await client.query("DELETE FROM veiculo_fotos WHERE id = $1", [fotoId]);
      await client.query("UPDATE veiculos SET foto_url = $1 WHERE id = $2", [f[0].url, id]);

      const { rows: fotos } = await client.query(
        "SELECT id, veiculo_id, url, criado_em FROM veiculo_fotos WHERE veiculo_id = $1 ORDER BY criado_em, id",
        [id],
      );
      return { foto_url: f[0].url as string, fotos };
    });

    if (!out) return naoEncontrado();
    return NextResponse.json(out);
  });
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  return comTratamentoDeErro(async () => {
    const { id } = await ctx.params;
    const fotoId = req.nextUrl.searchParams.get("foto") ?? "";
    if (!UUID.test(id)) return naoEncontrado();
    if (!UUID.test(fotoId)) throw new ErroValidacao("Foto inválida");

    const { rows } = await db().query("DELETE FROM veiculo_fotos WHERE id = $1 AND veiculo_id = $2 RETURNING url", [fotoId, id]);
    if (!rows[0]) return NextResponse.json({ error: "Foto não encontrada" }, { status: 404 });
    await apagarArquivo(rows[0].url as string); // so depois do banco confirmar; nunca lanca
    return new NextResponse(null, { status: 204 });
  });
}
