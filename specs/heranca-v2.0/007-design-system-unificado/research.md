# Research — Épico A: Design System Unificado

Nenhum `NEEDS CLARIFICATION` restou no Technical Context do `plan.md`. Este documento registra as
decisões técnicas concretas encontradas ao ler o estado real do frontend antes de desenhar o
objeto `UI`.

## Achado 1 — Prevenção de "flash" de tema errado (SC-003) exige script no `<head>`, não em `components/ciaara/`

`components/ciaara/` é incluído no **fim** de `<body>` (``app/layout.tsx`:78`) — qualquer lógica de tema
colocada lá só roda depois que o HTML inteiro (inclusive todas as views) já foi parseado e, na
prática, já pintado na tela pelo menos uma vez. Isso é exatamente o "flash de tema errado" que
SC-003 proíbe.

**Decisão**: um script **inline, síncrono, no `<head>` de `app/layout.tsx`** (antes ou logo depois do
`include('_Estilos')`) lê `localStorage` e, na ausência de escolha manual salva, `window.matchMedia
('(prefers-color-scheme: dark)').matches` (RF-DS-03.1, Clarifications 2026-08-15), e aplica
`document.documentElement.setAttribute('data-theme', ...)` **antes de qualquer conteúdo do `<body>`
ser parseado** — o mesmo padrão universalmente usado para evitar FOUC de tema em páginas sem
framework/SSR. O toggle manual (`alternarTema()`, definido em `components/ciaara/`, chamado só depois que
a página já carregou) só precisa mudar o mesmo atributo e gravar em `localStorage` — não precisa
repetir a lógica de detecção.

## Achado 2 — CSS Custom Properties como a implementação real do objeto `UI`

RF-DS-01 pede um "objeto/API de UI" — em Tailwind CSS + shadcn/ui puro sem bundler, o mecanismo nativo
equivalente é **CSS Custom Properties** (`:root { --cor-sucesso: ...; }`), com os dois temas
redefinindo os mesmos nomes de variável sob `[data-theme="escuro"] { --cor-sucesso: ...; }` (mesmo
padrão de tokens usado por qualquer Design System moderno sem framework de componente).

**Decisão**: `app/globals.css` define as variáveis (`--cor-primaria`, `--cor-sucesso`,
`--cor-atencao`, `--cor-critico`, `--cor-neutro`, `--fonte-principal`, `--espacamento-*`) uma vez
em `:root`, redefinidas sob `[data-bs-theme="dark"]` (atributo nativo do Tailwind CSS + shadcn/ui — decisão tomada durante
`/speckit-implement`, ver tasks.md T006: Tailwind CSS já restiliza seus próprios componentes com esse
mesmo atributo, evitando reinventar contraste manualmente). Um objeto `UI` em JS (`components/ciaara/`) espelha
esses nomes só para os casos em que JavaScript precisa do valor de cor (ex.: montar HTML dinâmico
que não pode usar `var(--...)` diretamente) — lido de `getComputedStyle(document.documentElement)`,
nunca hardcoded duas vezes.

## Achado 3 — As 5 cores de `badge-categoria` já são um componente único; falta só a fonte de verdade

`app/globals.css` já centraliza as 5 cores de `badge-categoria-*` num único arquivo, consumido por 4
views via nome de classe — na prática, RF-DS-02 já está estruturalmente satisfeito para badges
(um só lugar, reutilizado). O que falta é indireto: os valores são hex literais
(`background-color: #6f42c1;`), não referências a `var(--cor-*)` — se uma cor semântica mudar no
futuro, alguém pode esquecer de atualizar o badge em conjunto.

**Decisão**: migrar as 5 declarações para `var(--cor-*)` (achado 2), **sem mudar nenhum valor de
cor real** — verificado por comparação visual antes/depois (FR-006, "sem alterar o comportamento
das telas que já os usam").

## Achado 4 — Nenhum arquivo de imagem do brasão do CIAARA existe no repositório

Busca em todo o repositório (`, `Versão 1.0/`) não encontra nenhum arquivo de imagem de
brasão/insígnia — só o texto literal "MARINHA DO BRASIL" no cabeçalho de impressão do DSA da V1.0
(`Versão 1.0/index.html`, não um `<img>`). RF-INI-05 pede "incorporar o brasão/identidade
institucional", mas não há asset real para incorporar — e não é apropriado a este agente gerar ou
supor uma reprodução de um brasão/insígnia oficial.

**Decisão**: implementar o slot de identidade institucional (`app/layout.tsx`, navbar) como um `<img>`
com um caminho de asset a ser fornecido por Bernardo (ex.: hospedado no  Supabase Storage do projeto ou
embutido como asset do próprio Next.js), com **fallback textual explícito** (o título de
exibição "Sistema de Gestão Acadêmica", já confirmado em `03-design-system.md` §3) caso a imagem
não carregue — nunca um ícone de imagem quebrada (RN-DEG-01). FR-009/SC-005 ficam satisfeitos
mesmo sem o asset final: a navbar já fica mais "convidativa" com o título de exibição + o slot
pronto para receber o brasão assim que o arquivo for fornecido.

## Achado 5 — Campos reais de `instrutores` para o formato RF-INSTR-15

RF-INSTR-15 pede "P/G Especialidade/Habilitação Nome Completo", nome de guerra em negrito.
Confirmado em `01-schema.md` §5.4 e no uso real em `app/(app)/instrutores/page.tsx`
(`app/(app)/instrutores/page.tsx`:22`, campo `Nome_Guerra`): os campos canônicos são
`Posto_Graduacao`, `Esp_Hab_Obs` (Especialidade/Habilitação/Observação) e `Nome_Guerra` — não existe
um campo de "nome completo" separado no cadastro mínimo do Épico F (só `Nome_Guerra`).

**Decisão**: `formatarNomeInstrutor_({ Posto_Graduacao, Esp_Hab_Obs, Nome_Guerra })` monta
`"{Posto_Graduacao} {Esp_Hab_Obs} <strong>{Nome_Guerra}</strong>"`, tratando campos vazios/ausentes
sem gerar espaços duplos ou "undefined" visível (RN-DEG-01) — função pura, testável em Node sem
mock de planilha, mesmo padrão de `lib/dominio/regras-normativas.ts`.
