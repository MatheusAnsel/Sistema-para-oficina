# Sistema Digital para Oficina Mecânica

[![CI](https://github.com/MatheusAnsel/Sistema-para-oficina/actions/workflows/ci.yml/badge.svg)](https://github.com/MatheusAnsel/Sistema-para-oficina/actions/workflows/ci.yml)

Site institucional com captação de orçamento pelo WhatsApp e um sistema interno de gestão
(dashboard, ordens de serviço, clientes e veículos) para uma oficina mecânica real — a Oficina
Parada 799, no Rio de Janeiro.

Projeto pessoal, do levantamento de requisito com o cliente até o deploy em produção.

<p>
  <img src="docs/dashboard.png" alt="Dashboard da gestão no celular: faturamento do mês, veículos no pátio, serviços em andamento" width="300">
  <img src="docs/ordens-de-servico.png" alt="Lista de ordens de serviço no celular, com filtro por status e busca" width="300">
</p>

## O problema

Uma oficina pequena recebe pedido de orçamento pelo WhatsApp de forma desorganizada: mensagens
soltas, sem padrão, sem histórico do que já foi combinado com o cliente. O projeto ataca isso em
duas pontas:

1. **Site + bot do WhatsApp**: o cliente chega pelo Google/Instagram, descreve o problema em um
   fluxo guiado (sem digitar texto livre) e a oficina recebe o pedido já estruturado.
2. **Gestão interna** (`/gestao`): depois que o cliente chega, a oficina cadastra o veículo, abre
   uma ordem de serviço, acompanha o status até a entrega e enxerga faturamento e pátio num
   dashboard.

## Funcionalidades

**Site público**
- Página institucional com identidade visual própria, seção de serviços e mapa (Google Maps Embed API)
- Atendimento automatizado pelo WhatsApp Cloud API: uma máquina de estados conduz o cliente por
  perguntas objetivas (veículo, ano, serviço, foto do problema)
- Painel simples (`/admin`) para a oficina acompanhar os pedidos recebidos
- Política de privacidade (`/privacidade`, LGPD) com link no rodapé

**Gestão da oficina** (`/gestao`, login próprio)
- Dashboard: faturamento por período (hoje / 7 dias / mês), veículos no pátio, serviços em
  andamento, ordens previstas para o dia e orçamentos pendentes
- Ordens de serviço com itens de serviço/peça, total calculado no servidor e um fluxo de status
  (aguardando avaliação → orçamento enviado → aprovado → em execução → finalizado → entregue),
  com validação de quais transições são permitidas
- Cadastro de clientes e veículos (com foto principal do veículo), com histórico de ordens por veículo
- Listas de clientes, veículos e ordens com busca, paginação no servidor (25 por página, máximo de 100) e filtro por período
- Exportação das listas em CSV, já formatado para o Excel em português
- Foto do veículo tirada direto na câmera do celular (com alternativa pela galeria) e aberta em tela cheia

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 15 (App Router), React 19, TypeScript |
| Estilo | CSS puro (sem framework), tema escuro desenhado para o negócio |
| Backend | Route Handlers do Next.js (Node.js) |
| Banco (gestão) | PostgreSQL (Supabase), com Row Level Security |
| Banco (conversa do bot) | Redis (Upstash), chave-valor |
| Autenticação | bcrypt + JWT em cookie `httpOnly` (`jose`, compatível com o runtime Edge do middleware) |
| Integração externa | WhatsApp Cloud API (Meta), armazenamento de arquivos S3-compatível (foto do veículo) |
| Testes | `node:test` nativo, sem framework externo |
| Deploy | Vercel (testado); qualquer host de Next.js funciona — nada no código é específico da Vercel |

## Decisões técnicas

Alguns pontos em que priorizei corretude e manutenção em vez do caminho mais rápido:

- **Webhook do WhatsApp validado por HMAC** (`X-Hub-Signature-256`) com comparação *timing-safe*
  e deduplicação de mensagem repetida — a Meta reenvia webhooks, então idempotência não é opcional.
- **Duas autenticações diferentes, de propósito**: Basic Auth simples no `/admin` (painel de leitura
  para uma pessoa), e login com bcrypt + JWT em `/gestao` (várias contas, mais dado sensível).
  O JWT usa `jose` em vez de `jsonwebtoken` porque o middleware roda no runtime Edge, que não tem o
  módulo `crypto` do Node.
- **Fluxo de status da ordem de serviço como função pura testada** (`transicaoPermitida`,
  `proximosStatus`), sem acesso a banco — a regra de negócio (o que pode virar o quê) é validada
  isoladamente, sem precisar de um banco de dados no ar para rodar o teste.
- **Faturamento calculado no fuso `America/Sao_Paulo`, não no fuso do servidor.** Sem isso, uma
  ordem fechada às 21h no Brasil seria contabilizada no dia seguinte (servidor em UTC).
- **Exclusão lógica em vez de `DELETE`**: cliente, veículo e ordem de serviço são desativados/
  cancelados, não apagados — apagar quebraria o histórico financeiro do dashboard.
- **Validação de entrada com os mesmos limites das colunas do banco** (ex.: campo de até 100
  caracteres na aplicação porque a coluna é `VARCHAR(100)`), para não deixar o Postgres rejeitar
  um dado que passou pela validação.
- **Row Level Security ligado em todas as tabelas da gestão** (migration `005`). O app conecta com o
  usuário dono das tabelas, então nada muda para ele, mas a API pública do Supabase (chaves
  `anon`/`authenticated`) deixa de enxergar qualquer linha. Um teste lê as migrations e falha se uma
  tabela nova for criada sem RLS ou uma função sem `search_path` fixo, para a regra não depender de
  lembrar dela.
- **Filtros e paginação montados só com parâmetros**: o texto digitado pelo usuário nunca entra na
  string do SQL, e valores inválidos de página ou data viram erro 400 em vez de uma consulta estranha.
  O período filtra pelo dia no fuso da oficina, não do servidor.
- **CSV pensado para o uso real**: separador `;`, UTF-8 com BOM, CRLF, datas `dd/mm/aaaa` e vírgula
  decimal, para abrir direto no Excel brasileiro sem quebrar acentos. Células de texto livre que
  começam com `=`, `+`, `-` ou `@` recebem um apóstrofo para evitar CSV injection, e a exportação tem
  teto de linhas para proteger o servidor.
- **Login de demonstração para recrutadores, isolado dos dados reais.** Na tela `/gestao/login`, um
  botão preenche o acesso de demonstração com um clique. Esse acesso não consulta a tabela de usuários:
  o token assinado leva a marca `demo`, o middleware (Edge) repassa essa marca ao servidor por um
  cabeçalho interno que é sempre descartado do cliente, e `db()` passa a rodar cada consulta no schema
  `demo` do Postgres (`SET LOCAL search_path`, sem `public` no caminho, então uma tabela faltando
  falha em vez de cair nos dados reais). O schema `demo` tem dados 100% fictícios (migration `006`) e a
  sessão é somente leitura: qualquer `POST`, `PUT`, `PATCH` ou `DELETE` recebe 403. As credenciais são
  públicas de propósito, porque não dão acesso a nada sensível.
- **Foto do veículo é redimensionada no navegador antes do upload** (canvas, máx. 1600px,
  JPEG ~80%) — evita depender de configuração de limite de corpo de requisição no servidor e
  deixa o upload rápido numa rede de celular.

## Testes e lint

```bash
npm test
npm run lint
```

Testes automatizados (`node:test`) cobrindo a máquina de estados do bot do WhatsApp, as regras de
negócio das ordens de serviço (transições de status válidas, cálculo de total, cálculo de período do
dashboard considerando fuso horário e ano bissexto), a validação de entrada, a paginação e os filtros
das listas, a exportação CSV (incluindo proteção contra injeção de fórmulas) e a regra de que toda
tabela das migrations tenha RLS. O GitHub Actions roda checagem de tipos, lint, testes e build a cada push.

## Estrutura

```
src/
├── app/
│   ├── page.tsx               site público
│   ├── privacidade/           política de privacidade (LGPD)
│   ├── admin/                 painel de leads (Basic Auth)
│   ├── gestao/                 dashboard, ordens de serviço, clientes, veículos
│   └── api/
│       ├── whatsapp/webhook/  webhook validado por HMAC
│       └── gestao/            API da gestão (auth, os, clientes, veiculos, dashboard, exportação CSV)
├── components/                 modais, paginação, filtro de período, foto (câmera e tela cheia)
├── lib/
│   ├── flow.ts                 máquina de estados do bot (testada)
│   ├── os.ts                   regras de negócio das ordens de serviço (testada)
│   ├── gestao-lista.ts         paginação e filtros parametrizados das listas (testada)
│   ├── gestao-csv.ts           exportação CSV para Excel pt-BR (testada)
│   ├── gestao-validacao.ts     validação de entrada (testada)
│   ├── db.ts                   conexão Postgres
│   ├── gestao-auth.ts          JWT (jose)
│   └── kv.ts                   Redis / arquivo local (conversa do bot)
migrations/                     schema do Postgres, incremental (inclui RLS)
```

## Rodar localmente

```bash
npm install
cp .env.example .env.local
npm run dev
npm test
npm run lint
```

O passo a passo de configuração de contas externas (WhatsApp, Google Maps, Postgres) e deploy em
produção está em [DEPLOY.md](DEPLOY.md).

## Débito técnico conhecido

Documentar o que ficou pendente é parte do trabalho, não só o que funciona:

- Foto do veículo é só uma (cadastro geral); não há fotos específicas de entrada/saída por ordem
  de serviço. A exportação cobre as listas em CSV, mas não os números do dashboard.
- `/admin` usa senha única sem limite de tentativas; para várias contas, o padrão de login do
  `/gestao` (bcrypt + JWT) é o caminho a seguir.

Mais detalhes e limitações operacionais em [DEPLOY.md](DEPLOY.md#limitações-conhecidas).

## Autor

Matheus Ansel — desenvolvedor full stack.

[LinkedIn](https://linkedin.com/in/matheusansel) · [GitHub](https://github.com/MatheusAnsel) · [Portfólio](https://matheusansel-dev.vercel.app)
