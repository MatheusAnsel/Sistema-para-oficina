import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/**
 * Armazenamento de arquivos via S3-compatível: funciona com AWS S3, Cloudflare R2,
 * Backblaze B2, DigitalOcean Spaces, MinIO (self-hosted) etc. — qualquer provedor
 * que fale o protocolo S3, não só a Vercel. Autentica com usuário/senha de API
 * (access key/secret), sem nenhum mecanismo específico de uma nuvem.
 */

let client: S3Client | undefined;

function env(nome: string): string {
  const v = process.env[nome];
  if (!v) throw new Error(`${nome} não configurada (veja .env.example, seção Armazenamento de arquivos)`);
  return v;
}

function s3(): S3Client {
  if (!client) {
    client = new S3Client({
      region: process.env.S3_REGION || "auto",
      endpoint: process.env.S3_ENDPOINT || undefined, // vazio = AWS S3 "de verdade"
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true", // MinIO/self-hosted geralmente precisa
      credentials: {
        accessKeyId: env("S3_ACCESS_KEY_ID"),
        secretAccessKey: env("S3_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

/** Sobe um arquivo e devolve a URL pública para exibir (ex.: numa tag <img>). */
export async function subirArquivo(chave: string, corpo: Buffer, contentType: string): Promise<string> {
  await s3().send(
    new PutObjectCommand({
      Bucket: env("S3_BUCKET"),
      Key: chave,
      Body: corpo,
      ContentType: contentType,
    }),
  );
  const base = env("S3_PUBLIC_URL_BASE").replace(/\/+$/, "");
  return `${base}/${chave}`;
}

/** Apaga um arquivo a partir da URL pública devolvida por subirArquivo. Nunca lança. */
export async function apagarArquivo(url: string): Promise<void> {
  try {
    const base = env("S3_PUBLIC_URL_BASE").replace(/\/+$/, "");
    if (!url.startsWith(base + "/")) return; // URL de outro lugar (ou de uma migração antiga); nada a fazer
    const chave = url.slice(base.length + 1);
    await s3().send(new DeleteObjectCommand({ Bucket: env("S3_BUCKET"), Key: chave }));
  } catch (err) {
    console.error("[storage] falha ao apagar arquivo", err);
  }
}
