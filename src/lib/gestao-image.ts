/**
 * Redimensiona/comprime uma foto no navegador antes de enviar. Fotos de câmera de
 * celular costumam vir com vários MB; o servidor tem limite de tamanho de corpo de
 * requisição, e uma foto de veículo não precisa de resolução maior que isso.
 */
export async function redimensionarFoto(arquivo: File, ladoMaximo = 1600, qualidade = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(arquivo);
  const escala = Math.min(1, ladoMaximo / Math.max(bitmap.width, bitmap.height));
  const largura = Math.round(bitmap.width * escala);
  const altura = Math.round(bitmap.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = largura;
  canvas.height = altura;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Não foi possível processar a imagem");
  ctx.drawImage(bitmap, 0, 0, largura, altura);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", qualidade));
  if (!blob) throw new Error("Não foi possível processar a imagem");
  return blob;
}
