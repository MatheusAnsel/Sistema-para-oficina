# Oficina Parada 799 — site + orçamento pelo WhatsApp

Fluxo: Google Maps / Instagram → site → WhatsApp Business → o atendimento automático coleta
**nome, veículo, ano, serviço e foto do problema** → a oficina recebe o pedido organizado.

Stack: Next.js 15 (App Router), React 19, TypeScript, Node.js e WhatsApp Cloud API. Tema totalmente preto.

## O que tem no projeto

| Parte | Onde |
|---|---|
| Site (hero com a conversa de exemplo, problemas mais comuns, onde estamos) | `src/app/page.tsx` |
| Dados da oficina e lista de serviços | `src/config/business.ts` |
| Fluxo de perguntas do bot (função pura, testada) | `src/lib/flow.ts`, `src/lib/flow.test.ts` |
| Webhook do WhatsApp (assinatura validada, sem resposta duplicada) | `src/app/api/whatsapp/webhook/route.ts` |
| Aviso de lead novo para a oficina | `notifyWorkshop` em `src/lib/whatsapp.ts` |
| Painel dos pedidos (`/admin`, senha) | `src/app/admin/page.tsx` |
| Armazenamento (Upstash Redis ou arquivo local) | `src/lib/kv.ts` |

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha
npm run dev                  # http://localhost:3000
npm test                     # testa o fluxo de perguntas
```

## 1. Dados do Google

Endereço, telefone, horário (segunda a sexta, 8h às 20h), nota e duas avaliações já estão em
`src/config/business.ts`, copiados do perfil. Campos vazios não aparecem no site.
Depois de publicar, adicione o endereço do site no perfil do Google ("Adicionar website"): é a entrada do fluxo.
Revise também a lista `symptoms`: é a lista de serviços do site e do WhatsApp.

### Mapa (Google Maps)

O mapa usa a **Maps Embed API**. No Google Cloud: crie um projeto, ative a *Maps Embed API*, crie uma chave
de API e restrinja por *referenciador HTTP* ao domínio do site (e `*.vercel.app` enquanto testa).
Coloque a chave em `GOOGLE_MAPS_API_KEY`. Sem a chave, o site usa o embed simples do Google Maps.
A chave é lida no build: depois de alterar, faça um novo deploy.

## 2. Configurar o WhatsApp (Meta)

1. Em developers.facebook.com, crie um app do tipo Business e adicione o produto **WhatsApp**.
2. Cadastre o número da oficina (ou um número dedicado ao atendimento) e copie o
   `Phone number ID`, um token permanente (usuário do sistema) e o `App Secret`.
3. Em *Webhooks*, use a URL `https://SEU-DOMINIO/api/whatsapp/webhook`, o `WHATSAPP_VERIFY_TOKEN`
   que você definiu e assine o campo `messages`.
4. **Template para avisar a oficina** (WhatsApp → Modelos de mensagem): nome `novo_orcamento`,
   categoria Utilidade, idioma Português (BR), corpo:

   ```
   Novo pedido de orçamento
   Cliente: {{1}}
   Veículo: {{2}} ({{3}})
   Serviço: {{4}}
   Chamar o cliente: {{5}}
   ```

   Sem template aprovado, use `NOTIFY_MODE=text` (só chega se o número da oficina falou com o bot nas últimas 24 h).

## 3. Publicar

- GitHub: `git init -b main && git add . && git commit -m "Site Oficina Parada 799"` e depois
  `gh repo create parada-799 --private --source=. --push` (ou crie o repositório no site e use `git remote add origin ... && git push -u origin main`).
- Vercel: *Add New > Project*, importe o repositório (o Next.js é detectado sozinho) e cadastre as variáveis do `.env.example`.
  Enquanto o número do WhatsApp não estiver definido, deixe `NEXT_PUBLIC_WHATSAPP_NUMBER` vazio: o botão abre o WhatsApp sem destinatário.
- **Crie um banco Upstash Redis** (grátis) e preencha `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
  Na Vercel o disco é temporário; sem isso a conversa do cliente se perde entre as mensagens.
- `NEXT_PUBLIC_WHATSAPP_NUMBER` é lido na hora do build: depois de alterar, faça um novo deploy.
- Defina `ADMIN_PASSWORD` para liberar o `/admin`.

## Como a oficina continua a conversa

O bot só coleta as informações. Na mensagem de aviso e no `/admin` há o botão **Chamar no WhatsApp**
(`wa.me/<número do cliente>`), que abre a conversa a partir do WhatsApp da própria oficina.
Se preferir que a equipe responda no mesmo número do bot, verifique na documentação da Meta a
disponibilidade do modo de coexistência com o app WhatsApp Business e ajuste `doneMessage`.

## Limitações conhecidas

- Fotos e vídeos ficam guardados pela Meta por tempo limitado; o painel os busca sob demanda.
- O bot não interpreta texto livre (nível 1): ele segue as perguntas em ordem. Para IA, o ponto de troca é `advance()` em `src/lib/flow.ts`.
- `/admin` usa autenticação básica. Suficiente para uma oficina pequena; para vários usuários, troque por login próprio.
