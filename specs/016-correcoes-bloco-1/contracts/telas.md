# Contrato das telas — spec 016 (Bloco 1)

*17/10/2026. Para cada tela: o que muda, o caminho **por clique** até ela, a permissão e o `data-slot`
que a suíte usa. Uma rota sem caminho clicável é tela não entregue (CLAUDE.md, 24/09/2026).*

## PR 1 — casca, entrada, listas e fichas

| Item | Tela / rota | Muda | Caminho por clique | Permissão | `data-slot` |
|---|---|---|---|---|---|
| 1.1 | **Toda** rota, inclusive `/login`, `/estilo`, erros | Faixa fixa no topo: *"Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema de Gestão Acadêmica"* + *"· ambiente local"* / *"· pré-visualização"* só com o ambiente declarado; some em `/print/*` (também no carregamento e no erro) | Qualquer tela | Nenhuma (é aviso) | `faixa-de-ambiente` (mantido) |
| 1.2 | Lateral (`components/casca/navegacao-lateral.tsx`) | Item ativo com fundo `marca` e texto `marca-contraste`; hover continua `marca-suave` | Qualquer entrada do menu | — | `[aria-current="page"]` |
| 1.3 | `/login`, `/perfil/senha` (voluntária e primeiro acesso) | Botão de olho em cada campo de senha (3 campos), nome *"Mostrar senha"* / *"Ocultar senha"*, `type="button"` | `/login` é o ponto de partida; `/perfil/senha` pelo menu do avatar → *Meu perfil* → *Trocar a minha senha*, ou pelo redirecionamento do primeiro acesso | — | `mostrar-senha` |
| 1.4 | `/turmas`, `/cursos`, `/instrutores`, `/atividades`, `/disciplinas` (depois do curso) | Filtros recolhidos; o botão diz *"Filtros"* ou *"Filtros N"*, com N = parâmetros fora do padrão do contrato | Menu → a tela | a da tela | `filtro-avancado`, `filtros-ativos` |
| 1.6 | `/cursos/[curso]` | Barra única no topo: Editar · Desativar/Reativar · Nova turma, mesmo tamanho; Desativar destrutivo; abas *Sobre o Curso* · Grade · Avaliações, *Sobre o Curso* padrão | Menu *Cursos* → cartão do curso | Editar: `cursos/editar`; Desativar: `cursos/desativar`; Nova turma: `turmas/criar` e curso em oferta | `barra-de-acoes`, `ir-para-editar-curso`, `nova-turma` |
| 1.6 | Cartão do `/inicio` que leva ao curso | O link passa a pedir `?aba=grade` | Menu *Início* → cartão | — | (o de hoje) |
| 1.7 | `/disciplinas` (curso escolhido), linha expandida | UEs como linhas de tabela, só leitura, com **Editar** por linha; *Acrescentar unidade* atrás de botão; gráfico de pizza com as 4 maiores e *"Outras (N)"*, lista em texto com todas | Menu *Disciplinas* → curso → expandir disciplina | Editar: `disciplinas/editar` | `tabela-de-unidades`, `editar-unidade`, `acrescentar-unidade`, `proporcao-da-carga` |
| 1.10 | `/instrutores/[codigo]` | Abre em leitura; barra no topo: Editar · Desativar/Reativar · Excluir; o formulário num recolhível (*"Editar instrutor"*) | Menu *Instrutores* → linha do instrutor | Editar: `instrutores/editar`; Desativar: `instrutores/desativar`; Excluir: a de hoje (exceção da regra 4) | `barra-de-acoes`, `abrir-edicao-do-instrutor` |
| 1.10 | Disciplina, painel de avaliações do currículo | Em leitura, com Editar por item | Menu *Disciplinas* → curso → expandir disciplina | `disciplinas/editar` | `editar-avaliacao-do-curriculo` |
| 1.15 | `/turmas/[turma]` | Botão **"Trocar situação"** ao lado do selo do cabeçalho → diálogo só com a situação → confirmação na tela; o formulário *"Editar turma"* **não** tem mais o campo *Situação*; gravar a turma também confirma | Menu *Turmas* → linha da turma | `turmas/editar` e curso em oferta | `trocar-situacao`, `situacao-gravada` |
| 1.15 | Criação de turma (`/cursos/[curso]/turmas/nova`) | **Continua** com o campo *Situação* | Curso → *Nova turma* | `turmas/criar` | (o de hoje) |

## PR 2 — DSA, papel e planilha

| Item | Tela / rota | Muda | Caminho por clique | `data-slot` |
|---|---|---|---|---|
| 1.5 | `/atividades` | Filtros *De* e *Até* viram campo de data (exibição DD/MM/AAAA; URL em ISO) | Menu *Atividades* → *Filtros* | `filtro-de`, `filtro-ate` |
| 1.5 | `/print/dsa`, planilha | Cabeçalho dos dias com ano; IMPRESSÃO, CRONOS e seletor de semana da planilha com ano | DSA → *Imprimir*; DSA → *Baixar planilha de contingência* | (os de hoje) |
| 1.8 | DSA, grade da tela | Cartão: **nome** da disciplina em destaque, código depois, técnica numa linha própria e discreta (grade com e sem relógio). Papel e planilha **não** mudam | Turma → *Abrir o DSA* | `cartao-tecnica` |
| 1.9 | DSA (tela), `/print/dsa`, planilha, ficha da turma | *"Semana N de T"* no lugar de *"Nº"* e de *"Semana 41/2026"*; navegação com *"Semana N de T"* e as datas; semana ISO só na URL; aviso *"a turma tem N semanas e o curso, M"* nos avisos de cadastro da ficha | Menu *Turmas* → turma → *Abrir o DSA* | `semana-atual`, `tela-semana`, `dsa-numero` (o texto muda) |
| 1.11 | DSA | Nenhuma mudança de tela; só o caso de regressão | Turma → *Abrir o DSA* | — |
| 1.12 | DSA, formulário *Lançar* | Instrutor e técnica sugeridos (UE → disciplina na turma → vazio), editáveis; erro de leitura vira aviso; o 2º lançamento no mesmo TA aparece em *"sem posição"* | Turma → *Abrir o DSA* → clicar num tempo vazio | `aviso-de-leitura`, (os de hoje) |

## PR 3 — banco e o que depende dele

| Item | Tela / rota | Muda | Caminho por clique | `data-slot` |
|---|---|---|---|---|
| 1.13 | `/instrutores/[codigo]` | CH prevista do ano conta as atribuições com janela efetiva; média semanal de reserva; marca *"só habilitado — não gera CH prevista"* por disciplina habilitada sem atribuição no ano, e a frase explicativa | Menu *Instrutores* → linha | `so-habilitado`, `explica-ch-prevista` |
| 1.14 | `/inicio` | Andamento até hoje (executada, %, restante, saldo, atraso) | Menu *Início* | (os de hoje) |
| 1.14 | `/turmas` | Colunas novas **Progresso** (todas as turmas) e **Saldo (TA)** (só ativa e planejada; *"—"* nas demais — P-4), com a marca de atraso | Menu *Turmas* | `coluna-progresso`, `coluna-saldo` |
| 1.14 | `/turmas/[turma]` | Andamento e tabela de disciplinas até hoje; aba Avaliações com o "cumprido" e o "iniciada" até hoje | Menu *Turmas* → turma (→ aba *Avaliações*) | (os de hoje) |
| 1.14 | `/disciplinas` (turma escolhida) | Execução por disciplina até hoje | Menu *Disciplinas* → curso → turma | (os de hoje) |
| — | DSA e planilha | **Não mudam** — continuam acumulados até a semana | — | — |
