# Guia de configuração e deploy

Este guia cobre a configuração operacional do projeto (contas externas, variáveis de ambiente,
publicação). Para uma visão geral do projeto, arquitetura e decisões técnicas, veja o [README](README.md).

## Rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha
npm run dev                  # http://localhost:3000
npm test                     # roda os testes automatizados
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
- Vercel: *Add New > Project*, importe o repositório (o Next.js é detectado sozinho). **O site abre sem nenhuma variável.**
  Cadastre as demais em *Settings > Environment Variables*, conforme a tabela:

  | Quando | Variáveis |
  |---|---|
  | Já no primeiro deploy | nenhuma obrigatória (`ADMIN_PASSWORD` protege o `/admin`; sem ela o painel fica desligado) |
  | Ao definir o número | `NEXT_PUBLIC_WHATSAPP_NUMBER` (só dígitos, com DDI) |
  | Mapa do Google | `GOOGLE_MAPS_API_KEY` (restrinja por domínio) |
  | Ativar o bot | `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_APP_SECRET`, `WHATSAPP_VERIFY_TOKEN`, `WORKSHOP_NOTIFY_NUMBERS`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` |
  | Ativar a gestão da oficina (`/gestao`) | `DATABASE_URL`, `GESTAO_JWT_SECRET` |

  Gere senhas e tokens próprios, por exemplo com `openssl rand -base64 24`. Depois de alterar variáveis, faça um novo deploy.
- **Crie um banco Upstash Redis** (grátis) e preencha `UPSTASH_REDIS_REST_URL` e `UPSTASH_REDIS_REST_TOKEN`.
  Na Vercel o disco é temporário; sem isso a conversa do cliente se perde entre as mensagens.
- `NEXT_PUBLIC_WHATSAPP_NUMBER` é lido na hora do build: depois de alterar, faça um novo deploy.
- Defina `ADMIN_PASSWORD` para liberar o `/admin`.

## Como a oficina continua a conversa

O bot só coleta as informações. Na mensagem de aviso e no `/admin` há o botão **Chamar no WhatsApp**
(`wa.me/<número do cliente>`), que abre a conversa a partir do WhatsApp da própria oficina.
Se preferir que a equipe responda no mesmo número do bot, verifique na documentação da Meta a
disponibilidade do modo de coexistência com o app WhatsApp Business e ajuste `doneMessage`.

## 4. Gestão da oficina (`/gestao`)

Área separada do `/admin`, com login próprio (e-mail/senha). Reúne dashboard, ordens de serviço, clientes e veículos.
Usa um Postgres **dedicado** (não é o banco do Syre nem o Upstash do bot).

1. Crie um Postgres (Vercel Postgres ou um projeto Supabase novo) e copie a *connection string* para `DATABASE_URL`.
2. Gere um segredo aleatório para `GESTAO_JWT_SECRET` (ex.: `openssl rand -hex 32`).
3. Rode a migração: `node --env-file=.env.local scripts/migrate-gestao.mjs`.
4. Crie o primeiro usuário: `node --env-file=.env.local scripts/criar-usuario-gestao.mjs "Seu Nome" email@exemplo.com "senha-forte"`.
5. Acesse `/gestao/login`. Cadastre o cliente, depois o veículo (vinculado ao cliente) e abra uma ordem de serviço para ele em `/gestao/os`. Adicione os serviços e as peças na própria ordem e avance o status conforme o trabalho anda.

**Rode a migração antes de publicar esta versão:** sem a `002`, a tela do veículo e o dashboard não têm a tabela de ordens de serviço e ficam vazios. A migração `002_ordens_servico.sql` copia o histórico que já existia na tabela `servicos` para ordens já entregues, sem apagar a tabela original, e pode ser executada mais de uma vez sem duplicar registros. A `003_veiculo_cliente_opcional.sql` libera cadastrar um veículo sem cliente vinculado ainda (só placa e modelo são obrigatórios); o script de migração roda todos os arquivos de `migrations/` em ordem, então basta rodar o mesmo comando de novo.

Na Vercel, rode os passos 3 e 4 localmente apontando `DATABASE_URL`/`GESTAO_JWT_SECRET` para o banco de produção (ou de uma máquina com acesso a ele) — são scripts únicos, não rotas do site.

## Limitações conhecidas

- Fotos e vídeos ficam guardados pela Meta por tempo limitado; o painel os busca sob demanda.
- O bot não interpreta texto livre (nível 1): ele segue as perguntas em ordem. Para IA, o ponto de troca é `advance()` em `src/lib/flow.ts`.
- `/admin` usa autenticação básica (senha única, sem limite de tentativas). Suficiente para uma oficina pequena; para vários usuários, use o login de `/gestao` como referência.
- `/gestao` não controla estoque de peças: as peças de uma ordem são itens com descrição e valor livres.
- Não há upload de fotos do veículo na entrada ou na saída, nem exportação de relatórios.
- As rotas `/api/gestao/servicos` (modelo anterior às ordens de serviço) continuam no código, mas nenhuma tela as usa: o que for gravado por elas não aparece nas ordens nem no faturamento. Candidatas a remoção — ver "Débito técnico" no README.
