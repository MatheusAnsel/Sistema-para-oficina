/**
 * Dados da oficina. O nome e o link do Google vieram do Perfil da Empresa;
 * endereco, telefone, horarios e nota devem ser copiados do perfil.
 * Campos vazios simplesmente nao aparecem no site.
 */

export type Symptom = {
  /** id enviado pelo bot na lista do WhatsApp (max. 200 caracteres) */
  id: string;
  /** titulo curto na lista do WhatsApp (max. 24 caracteres) */
  label: string;
  /** frase como o cliente descreve o problema, usada no site */
  headline: string;
  /** palavras que, se aparecerem na primeira mensagem, pulam a pergunta de servico */
  keywords: string[];
};

export const business = {
  name: "Oficina Parada 799",
  shortName: "Parada 799",
  googleProfileUrl: "https://share.google/1xboNTM1WpdqZx3ou",

  // Copie do Perfil da Empresa no Google
  address: "Av. Monsenhor Félix, 799 - Irajá, Rio de Janeiro - RJ, 21235-111",
  addressParts: {
    streetAddress: "Av. Monsenhor Félix, 799",
    addressLocality: "Rio de Janeiro",
    addressRegion: "RJ",
    postalCode: "21235-111",
  } as null | { streetAddress: string; addressLocality: string; addressRegion: string; postalCode: string },
  phoneDisplay: "(21) 97445-8983",
  hours: [{ days: "Segunda a sexta", time: "8h às 20h" }] as { days: string; time: string }[],
  // Mesmo horário no formato do schema.org (usado nos dados estruturados para o Google)
  hoursSchema: "Mo-Fr 08:00-20:00",
  rating: { value: 5, count: 6 } as null | { value: number; count: number },

  // Avaliações reais do perfil no Google (sem nome, como aparecem na busca)
  reviews: [
    { text: "Não fica de enrolação e faz de tudo pra ajudar o cliente.", stars: 5 },
    { text: "Excelente profissional!", stars: 5 },
  ] as { text: string; stars: number }[],

  // Mensagem final do bot. Ajuste conforme como a oficina vai responder o cliente.
  doneMessage:
    "Pronto, seu pedido foi enviado para a oficina. Assim que o orçamento estiver pronto, você recebe o retorno pelo WhatsApp.",

  // Lista de problemas, na linguagem do cliente. Edite a vontade.
  symptoms: [
    { id: "freios", label: "Freios", headline: "Barulho ou pedal mole ao frear", keywords: ["freio", "pastilha", "disco"] },
    { id: "suspensao", label: "Suspensão e direção", headline: "Batidas, folga ou carro puxando", keywords: ["suspens", "amortecedor", "direcao", "direção", "alinhamento"] },
    { id: "motor", label: "Motor", headline: "Falhando, fraco ou superaquecendo", keywords: ["motor", "esquentando", "superaquec", "falhando"] },
    { id: "injecao", label: "Luz acesa no painel", headline: "Luz de injeção ou outra luz acesa", keywords: ["luz", "injeção", "injecao", "scanner"] },
    { id: "eletrica", label: "Parte elétrica", headline: "Bateria, partida ou faróis", keywords: ["bateria", "eletric", "elétric", "partida", "alternador"] },
    { id: "ar", label: "Ar-condicionado", headline: "Não gela ou cheira mal", keywords: ["ar-condicionado", "ar condicionado", "gela"] },
    { id: "revisao", label: "Revisão e troca de óleo", headline: "Revisão de rotina antes de viajar", keywords: ["revisão", "revisao", "óleo", "oleo", "filtro"] },
    { id: "outro", label: "Outro / não sei", headline: "Não sei o que é, quero uma avaliação", keywords: [] },
  ] satisfies Symptom[],
};

export type Business = typeof business;
