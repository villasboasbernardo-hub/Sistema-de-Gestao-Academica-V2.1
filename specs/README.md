# Specs — CIAARA-11 v2.1

**Comece por [`00-Fundacao-Tecnica.md`](00-Fundacao-Tecnica.md).** Ele declara a plataforma
(Next.js App Router, Tailwind CSS, Supabase para banco e autenticação), define que a
primeira tela do sistema é o Login e que as regras de acesso vivem no Supabase Auth + RLS.
**Prevalece sobre qualquer spec numerada.**

## O que há aqui — duas séries, dois diretórios

| Caminho | O que é | Numeração |
|---|---|---|
| `specs/001-…` em diante | **As fatias da v2.1.** Ainda não há nenhuma: a série começa no Épico 1 | Reiniciada em 26/08/2026 |
| `specs/heranca-v2.0/001-…` a `039-…` | As **39 specs executadas na v2.0**, convertidas para a plataforma da v2.1 | Encerrada em 039 |
| `specs/00-Fundacao-Tecnica.md` | A fundação de plataforma — **prevalece sobre as duas séries** | Sem número de série |

> ⚠️ **"Spec 001" é ambíguo.** Existem duas: `heranca-v2.0/001-migracao-saneamento-dados`
> (v2.0) e a primeira fatia da v2.1, ainda por criar. **Cite sempre com o diretório.**
> Referências internas a `specs/NNN-…` dentro dos arquivos de `heranca-v2.0/` são anteriores
> ao reinício e resolvem sob `heranca-v2.0/`. Elas **não foram reescritas**: corrigir o
> passado é registrar evento novo, nunca editar o registro (Princípio IV).

### Sobre as 39 herdadas

Não são documentos novos: são os mesmos requisitos, com a plataforma trocada. Cerca de
**11.300 substituições** em 314 arquivos, por dicionário determinístico — o que garante que
o mesmo conceito recebeu o mesmo nome nas 39 specs, coisa que reescrita manual não garante.

**Zero menções** a Google Apps Script, Google Sheets, `google.script.run`, `getSheetByName`,
`SpreadsheetApp`, `HtmlService`, `clasp`, `doGet`, arquivos `.gs`/`View*.html`, Bootstrap,
ApexCharts ou Google Docs/Drive. O dicionário completo está na §8 do Spec 00.

## Como ler uma spec

| Arquivo | O que é | Confiabilidade |
|---|---|---|
| `spec.md` | **o requisito** — o quê e por quê | **Alta.** É o artefato durável |
| `data-model.md` | entidades e campos | **Alta** |
| `contracts/` | assinatura das funções | Média — reveja contra o schema real |
| `research.md` | investigação técnica da época | Média — o contexto mudou |
| `plan.md` · `tasks.md` | **como se implementou no Apps Script** | **Baixa. Regere.** |
| `quickstart.md` | roteiro de validação manual | Média |
| `checklists/` | checagens de qualidade | Alta |

> ⚠️ **`plan.md` e `tasks.md` foram traduzidos, não replanejados.** A plataforma declarada
> e o vocabulário estão corretos, mas um plano traduzido não é um plano executado. Ao
> retomar qualquer feature, **regere os dois** com `/speckit.plan` e `/speckit.tasks` a
> partir do `spec.md`. O requisito é durável; o plano é do momento em que foi feito.

## Exceção deliberada

Três arquivos ainda citam nomes da v1.0 (`Cad_Matérias`, `ID_Materia`) — `heranca-v2.0/001-migracao-saneamento-dados/spec.md`
e dois de `heranca-v2.0/004-rbac-ampliado-usuarios/`. Eles **narram a própria migração**, e traduzi-los
apagaria a trilha. É o Princípio IV da constitution aplicado à documentação: corrige-se o
passado registrando evento novo, nunca reescrevendo o registro.

## As 39 specs herdadas (em `heranca-v2.0/`)

| # | Tema | # | Tema |
|---|---|---|---|
| 001 | Migração e saneamento de dados | 021 | Gráficos e siglas de cursos |
| 002 | Categorização de atividades letivas | 022 | Ficha de docentes em PDF |
| 003 | Simplificação de avaliações | 023–024 | Impressão da ficha |
| 004 | RBAC ampliado e usuários | 025 | Ficha SPA, máscaras e schema |
| 005 | Modularização frontend/backend | 026 | Layout da ficha |
| 006 | Cronograma e motor preditivo | 027 | LIQ — automação |
| 007 | Design System unificado | 028 | OS de Instrutoria |
| 008 | Motor de sugestão do DSA | 029 | Turma, disciplina e instrutor |
| 009 | Refatoração de UI/UX | 030–031 | Disciplinas em cascata |
| 010 | Sidebar, carrossel e estatísticas | 032 | Rateio de CH multidisciplinar |
| 011 | AppState e navegação | 033 | Limpeza do schema de disciplinas |
| 012 | Tratamento de erro de leitura | 034 | Validação de instrutor na LIQ |
| 013 | Carrosséis da página inicial | 035 | Refinamento de UI de disciplinas |
| 014 | Refatoração do módulo de instrutores | 036 | CRUD de disciplinas por antiguidade |
| 015 | Filtros cruzados de instrutores | 037 | Filtros, status e gráfico |
| 016 | Ficha e formulário de instrutores | 038 | Edição inline de datas |
| 017 | Roteamento e fonte do DSA | 039 | Cronograma Gantt SST |
| 018 | Nomenclatura militar | | |
| 019 | Atribuição de disciplinas ao instrutor | | |
| 020 | Listagem de instrutores | | |
