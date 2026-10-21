# Changelog

Todas as mudanças relevantes deste projeto são registradas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o projeto usa [Versionamento Semântico](https://semver.org/lang/pt-BR/).

## [1.4.1] - 2026-10-21

### Documentação

- Suspensão do sistema, retenção LGPD, fotos por veículo, mão de obra e fundo 3D no README
- GIF de demonstração, capturas do site e da gestão, capa e link da demo
- CHANGELOG com o histórico de versões

## [1.4.0] - 2026-10-11

### Adicionado

- Login de demonstração para recrutadores com dados fictícios isolados
- Mão de obra como linha própria da ordem de serviço e opção de apagar veículos
- Placa no padrão Mercosul e várias fotos por veículo
- Fundo 3D interativo em WebGL na home, novo hero e botões de orçamento no verde do WhatsApp
- Suspensão do sistema e exclusão, exportação e retenção dos pedidos do WhatsApp (LGPD)

### Corrigido

- Login do dono com o cookie de demonstração ativo
- Horário de funcionamento (segunda a sexta, 8h às 18h)

## [1.3.0] - 2026-10-03

### Adicionado

- Câmera do celular para tirar a foto do veículo e foto em tela cheia
- Paginação, filtro por data e exportação CSV nas listas
- Página de política de privacidade (LGPD)

### Alterado

- Avisos nativos trocados por modais no padrão do site

### Corrigido

- Botões Pedir orçamento e Gestão no celular e navbar entre 721 e 870px
- Trava de rolagem da página com modal, foto em tela cheia ou câmera abertos

### Segurança

- Row Level Security nas tabelas da gestão e search_path fixo na função

## [1.2.0] - 2026-09-29

### Adicionado

- Fotos do veículo, já no cadastro, com armazenamento compatível com S3
- ESLint e CI no GitHub Actions (tipos, lint, testes e build)

### Alterado

- Validação de campos numéricos; só placa e modelo obrigatórios no veículo
- Dashboard abre em Hoje por padrão
- Revisão visual mobile-first da gestão

### Corrigido

- Mensagens claras quando falta rodar migração e erros reais do upload de fotos

## [1.1.0] - 2026-09-24

### Adicionado

- Gestão (/gestao) de clientes, veículos e histórico de serviço
- Ordens de serviço e dashboard operacional
- Destaque da especialidade em motor (cabeçote e bloco) e da disponibilidade de scanner

### Removido

- Categorias de elétrica e ar-condicionado, fora do escopo da oficina

### Corrigido

- Botão Gestão visível no cabeçalho no celular

## [1.0.0] - 2026-09-19

### Adicionado

- Site da oficina com orçamento automatizado pelo WhatsApp: o bot coleta nome, veículo, ano, serviço e foto do problema
- Painel /admin com os pedidos organizados

### Segurança

- Cabeçalhos de segurança e painel sem cache nem indexação

[1.4.1]: https://github.com/MatheusAnsel/Sistema-para-oficina/compare/v1.4.0...v1.4.1
[1.4.0]: https://github.com/MatheusAnsel/Sistema-para-oficina/compare/v1.3.0...v1.4.0
[1.3.0]: https://github.com/MatheusAnsel/Sistema-para-oficina/compare/v1.2.0...v1.3.0
[1.2.0]: https://github.com/MatheusAnsel/Sistema-para-oficina/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/MatheusAnsel/Sistema-para-oficina/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/MatheusAnsel/Sistema-para-oficina/releases/tag/v1.0.0
