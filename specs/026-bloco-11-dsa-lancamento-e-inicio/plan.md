# Plano — spec 026 (Bloco 11)

Ordem de dentro para fora (`CLAUDE.md`): `lib/dominio/` (regra pura + teste) → migration + pgTAP → `lib/validacao/` →
`lib/acoes/` → leitura (`app/…/leitura.ts`) → telas → `components/` → ponta a ponta → documentos.

## 1. Domínio puro (`lib/dominio/`)

| Módulo | O quê | Regra |
|---|---|---|
| `dsa/instrutores-da-aula.ts` (novo) | `instrutoresDaAula(instrutores, habilitacoes, disciplinaId)` — só **filtra** (a ordem é do `SeletorInstrutor`); `ehHabilitadoAtivo` | RD-1, `RN-INST-01` |
| `dsa/pre-preenchimento.ts` | `preencherLancamento` aceita `habilitados?` (opcional — a planilha não muda, D-6) e pula o designado não habilitado, com o motivo `designado_sem_habilitacao` | RD-1, D-3 |
| `dsa/horario-do-bloco.ts` | `slotDoEstudoIndividual({ temposDoRegime, ultimoLancado, ultimoDoRelogio })` = `max(regime, último+1)`, nulo além do relógio | RD-2, D-7, D-8 |
| `dsa/impressao.ts` | o cartão fixo do EI pela regra nova (`relogio.temposDoRegime`) | RD-2, D-9 |
| `dsa/planilha/preenchimento.ts` | a fórmula `MAX(regime; último+1)` | RD-2, D-9 |
| `dsa/regime-da-semana.ts` (novo) | `regimeDaSemana({ registro, vigenciasDaTurma, daTurma, doCurso, segunda })` → `{ regime, fonte }`; `semanasSalvas(...)` | RD-3, D-10, D-11 |
| `dsa/limpar-semana.ts` (novo) | `operacoesDeLimpeza(fatos)` — o que entra (D-17) e a mesma operação do cartão | RD-4 |
| `dsa/publicacao.ts` | `ROTULO_DO_SELO`, `seloDaSituacao(situacao, alt)`; `versaoVigentePorTurma(eventos)` | RD-5, RD-7 |
| `cartoes-do-inicio.ts` | `contagemPorSituacao(panorama)` | RD-8 |

## 2. Banco — migration `<carimbo>_regime_da_semana.sql` (só acrescenta)

Tabelas `dsa_regime_da_semana` e `turma_regime_vigencia`; funções `app.semana_do_dsa_salva(turma, ano, semana)`,
`app.definir_regime_da_semana(...)`, `app.gravar_regime_da_semana(...)`, espelhos `public.*` `INVOKER`. RLS de leitura
pela trilha do DSA; sem policy de escrita; sem `DELETE`. pgTAP `151_regime_da_semana.sql`; RLS
`tests/invariantes/rls/regime-da-semana.test.ts`.

## 3. Servidor (`lib/acoes/`, `lib/validacao/`)

- `dsa.ts`: a aula confere o par final e o instrutor ativo (D-4, D-5); o EI pela semana lida (`lerSemanaDoDsa`, com
  rascunho) — o mesmo regime e relógio da tela; `limparSemanaDoDsa` (Zod, releitura no servidor, lote único).
- `regime-do-dia.ts`: `temposDoDiaDaTurmaNoServidor` recebe a **data** e resolve pela `regimeDaSemana` (D-14).
- `regime-da-semana.ts` (novo): `definirRegimeDaSemana` (Zod: turma, ano, semana, regime, alcance); o grava-ao-salvar,
  chamado por `salvarSemanaDoDsa` e pela publicação da alteração.

## 4. Leitura e telas

- `turmas/[turma]/dsa/leitura.ts`: `status` dos instrutores; as habilitações do curso; os registros da semana e as
  vigências da turma; `montarSemanaDoDsa` pela `regimeDaSemana`; `SemanaDoDsa` ganha `habilitacoes`, `regime`
  (fonte, nome, TA) e `regimeTravado`.
- `turmas/[turma]/dsa/page.tsx`: o cabeçalho com a `BarraDeAcoes` (RD-6); o selo (RD-5); o fim dos dois cartões; a seção
  *Versões publicadas*; o intervalo dos rascunhos até o sábado (FR-005.3). `/print/dsa/page.tsx` idem.
- `FormularioDeLancamento.tsx` e `AcoesDoBloco.tsx`: a lista da aula filtrada (RD-1).
- `DialogoDoRegime.tsx` (folha nova) e `LimparSemana.tsx` (folha nova).
- `components/ciaara/botao-de-icone.tsx`: ações `regime` (Clock), `limpar` (Eraser), `publicar` (Stamp), `semana`
  (CalendarRange); `badge-status.tsx`: ícone opcional.
- `inicio/page.tsx`: os cartões (RD-8); o carrossel das turmas sem *Abrir DSA*; o carrossel do DSA publicado (RD-7) com
  `EscalaDoPapel` (folha nova) e `EscolhaDaSemana` (folha nova); `?semana=` no contrato.
- `turmas/[turma]/editar/page.tsx`: a vigência atual do regime, só leitura.

## 5. Testes

Unidade (cada regra nova vista reprovar antes), pgTAP `151`, RLS com sessão real, e ponta a ponta por clique:
`dsa-lancar` (RD-1, RD-2), `dsa-regime-da-semana` (RD-3, novo), `dsa-limpar` (RD-4, novo), `publicacao-do-dsa`
(RD-5/6, os `data-slot` de hoje preservados), `inicio-bloco-11` (RD-7/8, novo). Os casos antigos que mudam de forma
(o negativo da habilitação pelo seletor, as manchetes, *Turmas no recorte*, o *Abrir DSA* do cartão) são ajustados ao
desenho.
