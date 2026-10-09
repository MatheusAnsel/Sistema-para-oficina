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
  | Foto do veículo | `S3_ENDPOINT`\*, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL_BASE` (\*vazio para AWS S3 "de verdade") |

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

**Rode a migração antes de publicar esta versão:** sem a `002`, a tela do veículo e o dashboard não têm a tabela de ordens de serviço e ficam vazios. A migração `002_ordens_servico.sql` copia o histórico que já existia na tabela `servicos` para ordens já entregues, sem apagar a tabela original, e pode ser executada mais de uma vez sem duplicar registros. A `003_veiculo_cliente_opcional.sql` libera cadastrar um veículo sem cliente vinculado ainda (só placa e modelo são obrigatórios); a `004_veiculo_foto.sql` adiciona a coluna da foto do veículo. O script de migração roda todos os arquivos de `migrations/` em ordem, então basta rodar o mesmo comando de novo.

### Mão de obra e apagar veículo — migração 007

A `007_mao_de_obra.sql` libera o tipo de item "Mão de obra" em `os_itens` (e no schema `demo`). **Rode a migração antes de publicar esta versão**, senão adicionar mão de obra à OS falha pela restrição do banco: `node --env-file=.env.local scripts/migrate-gestao.mjs` (idempotente). A mão de obra é uma linha da OS com o valor definido pelo mecanico (quantidade × valor unitário, por exemplo horas × valor da hora) e entra no total como qualquer item. Apagar veículo desativa o registro (as OS antigas continuam no histórico) e é bloqueado enquanto o veículo tiver OS em andamento.

### Apagar veículo e placa — migração 008

A `008_veiculo_placa_ativa.sql` troca a restrição de placa única por um índice único só entre veículos ativos e remove do banco os veículos já apagados que não têm OS. Veículo sem OS é apagado de verdade (com a foto); veículo com OS no histórico fica oculto e guardado, mas libera a placa para novo cadastro. Rode `node --env-file=.env.local scripts/migrate-gestao.mjs` (idempotente) ou cole o conteúdo no SQL Editor.

### Login de demonstração para recrutadores — migração 006

A tela `/gestao/login` tem o botão "Preencher acesso de demonstração". O acesso (`recrutador@demo.oficina` / `demo-recrutador`, definido em `src/lib/gestao-demo.ts`) abre a gestão com dados fictícios, em modo somente leitura e com um aviso no topo. Ele **não** usa a tabela de usuários e **não** enxerga o schema `public`: as consultas rodam no schema `demo`, criado e populado pela `006_demo.sql`.

- Antes de publicar, rode `node --env-file=.env.local scripts/migrate-gestao.mjs`. Sem a `006`, o login demo entra mas as telas dão erro (o login real não é afetado).
- Rodar a migração de novo reajusta as datas das ordens de serviço para hoje, mantendo o dashboard com movimento. Vale rodar de vez em quando.
- Os dados reais ficam só em `public`. Para trocar a senha demo, edite `src/lib/gestao-demo.ts`.
- Se criar uma migration nova que altere `clientes`, `veiculos` ou `ordens_servico`, inclua o `ALTER` equivalente no schema `demo` (a cópia da estrutura é feita uma vez).

### Segurança do banco (RLS) — migração 005

O Supabase expõe o schema `public` pela API pública (PostgREST). Tabela sem RLS pode ser lida e alterada por qualquer pessoa que tenha a URL do projeto e a chave `anon`, que é pública por desenho. É o que o Security Advisor aponta como *RLS Disabled in Public*. O app **não** usa essa API: ele conecta direto pelo `DATABASE_URL`.

A migração `005_seguranca_rls.sql` liga RLS em todas as tabelas, sem permitir nada aos papéis `anon` e `authenticated`, e fixa o `search_path` da função `gestao_set_atualizado_em` (alerta *Function Search Path Mutable*). Para aplicar, use uma das duas opções (é idempotente, pode rodar mais de uma vez):

- `node --env-file=.env.local scripts/migrate-gestao.mjs`, ou
- cole o conteúdo de `migrations/005_seguranca_rls.sql` no **SQL Editor** do Supabase e execute.

Regras para manter seguro:

- O `DATABASE_URL` deve usar o usuário dono das tabelas (`postgres` ou `postgres.<ref-do-projeto>` no pooler). Ele ignora o RLS, então o site continua funcionando igual. Nunca use as chaves `anon` ou `service_role` no `DATABASE_URL` nem em variáveis `NEXT_PUBLIC_*`.
- Toda tabela nova precisa do seu `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` na migração que a cria. O teste `src/lib/migrations-seguranca.test.ts` falha se faltar.
- Depois de aplicar, rode o **Security Advisor** de novo (Supabase → Advisors): os alertas de RLS e de search path devem sumir.

### Foto do veículo (armazenamento S3-compatível)

Funciona com qualquer provedor que fale o protocolo S3 — não depende da Vercel. Duas opções testadas:

**Cloudflare R2 (recomendado — tem plano gratuito generoso e é rápido de configurar)**

1. Painel da Cloudflare → R2 → Create bucket. Anote o nome.
2. R2 → Manage API tokens → Create API token (permissão de leitura e escrita nesse bucket). Anote Access Key ID e Secret Access Key.
3. No bucket, ative "Public access" (R2.dev) ou conecte um domínio próprio — isso vira o `S3_PUBLIC_URL_BASE`.
4. Preencha:
   ```
   S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_BUCKET=<nome-do-bucket>
   S3_ACCESS_KEY_ID=<access-key-id>
   S3_SECRET_ACCESS_KEY=<secret-access-key>
   S3_PUBLIC_URL_BASE=https://pub-xxxxxxxx.r2.dev
   S3_FORCE_PATH_STYLE=false
   ```

**AWS S3**

1. Crie um bucket em S3 e uma política que permita leitura pública dos objetos (ou coloque um CloudFront na frente, mais robusto).
2. IAM → crie um usuário com política restrita a `s3:PutObject`/`s3:DeleteObject` nesse bucket → gere as chaves de acesso.
3. Preencha:
   ```
   S3_ENDPOINT=            # vazio: o SDK usa o endpoint padrão da AWS
   S3_REGION=us-east-1     # a região real do bucket
   S3_BUCKET=<nome-do-bucket>
   S3_ACCESS_KEY_ID=<access-key-id>
   S3_SECRET_ACCESS_KEY=<secret-access-key>
   S3_PUBLIC_URL_BASE=https://<bucket>.s3.<região>.amazonaws.com
   S3_FORCE_PATH_STYLE=false
   ```

Qualquer outro provedor S3-compatível (Backblaze B2, DigitalOcean Spaces, MinIO self-hosted) segue o mesmo padrão de variáveis — muda só o endpoint e como o provedor expõe a URL pública. Sem essas variáveis, o upload de foto retorna erro explicando qual está faltando; o resto do sistema funciona normalmente.

Na Vercel, rode os passos 3 e 4 localmente apontando `DATABASE_URL`/`GESTAO_JWT_SECRET` para o banco de produção (ou de uma máquina com acesso a ele) — são scripts únicos, não rotas do site.

## Limitações conhecidas

- Fotos e vídeos ficam guardados pela Meta por tempo limitado; o painel os busca sob demanda.
- O bot não interpreta texto livre (nível 1): ele segue as perguntas em ordem. Para IA, o ponto de troca é `advance()` em `src/lib/flow.ts`.
- `/admin` usa autenticação básica (senha única, sem limite de tentativas). Suficiente para uma oficina pequena; para vários usuários, use o login de `/gestao` como referência.
- `/gestao` não controla estoque de peças: as peças de uma ordem são itens com descrição e valor livres.
- Não há upload de fotos específicas de entrada/saída por ordem de serviço, nem exportação de relatórios do dashboard.
