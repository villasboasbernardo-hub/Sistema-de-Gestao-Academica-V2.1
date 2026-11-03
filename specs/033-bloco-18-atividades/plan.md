# Plano — spec 033 (Bloco 18): o módulo de Atividades

## Contexto técnico

Next.js 16 (App Router, Server Components por padrão) · Supabase/PostgreSQL com RLS · Tailwind v4 · Zod · `nuqs` · Vitest,
pgTAP e Playwright. **Sem pacote novo.** Ordem de dentro para fora: banco → `lib/dominio/` → `lib/validacao/` →
`lib/acoes/` → `app/` → `components/`.

## Constituição e regras do `CLAUDE.md`

| Regra | Como o plano a cumpre |
|---|---|
| 1 (documento 04) | Nenhuma `RN-` muda; as RA se apontam a `RN-EVT-01`, `RN-CRONOS-02`, `RN-DEG-01/02` e `RN-INST-04` com nota datada |
| 4 (nada se apaga) | Desativar em tudo; *Excluir* desabilitado nas três tabelas novas e no tipo (sem exceção nominal) |
| 6 (alerta, nunca bloqueio) | Os limites seguem alerta; o aviso de teto é o de sempre (`tetosDaTurma`) |
| 8 (parâmetro é dado) | `apoinst.ano_inicial` e `atividades.aviso_aec_semanas` em `config_parametros` |
| 9 (domínio puro) | `lib/dominio/atividades/*` e `categoria-pelo-tipo.ts`, sem `supabase`/`next`/`react` |
| 9.4 (portão) | M1 só acrescenta; M2 recria com efeito zero medido (`medicao-efeito-zero.md`), a condição nominal do item 1 |
| Gotcha 10 | `with (security_invoker = true)` repetido nas seis views da M2 |
| Gotcha 4.1 | Gravação nas tabelas novas com o `id` gerado antes, sem `RETURNING` |
| Gotcha 15 | `coalesce(app.pode(…), false)` em toda policy nova |
| RT-1 a RT-8 | Ações em `BotaoDeIcone`; edição em `DialogoDeFormulario`; Filtros/Estatísticas por `GatilhoDePainel`; gráficos com legenda que alterna; o ano do cabeçalho; cartões em grade; arquivada conta nas estatísticas |

## Banco (feito: `e5a287b`)

- **M1** `20261103140231_atividades_catalogo_previstas_e_apoinst.sql` — §6.1 da spec.
- **M2** `20261103140512_atividades_conta_como_efeito_zero.sql` — §6.2 da spec; efeito zero medido na cópia
  `remoto-20261103-103124.sql` (dez md5 iguais).

## Código — onde cada parte mora

| Parte | Arquivos | Dono |
|---|---|---|
| Regras puras (RA-1 a RA-9) | `lib/dominio/categoria-pelo-tipo.ts`, `lib/dominio/atividades/{grupos,marcacoes,previstas,apoinst,estatisticas,avisos}.ts` | feito |
| Contrato de URL e endereços | `lib/navegacao/contrato.ts`, `lib/navegacao/endereco-de-turma.ts` | feito |
| Esqueleto das abas | `turmas/[turma]/{AbasDaTurma,AtividadesDaTurma,PalestrasDaTurma,ApoinstDaTurma}.tsx`, `contexto-das-abas.ts`, `dsa/Acompanhamento{DePalestras,DeApoinst}.tsx`, `atividades/{AbaDePalestras,AbaDeApoinst}.tsx`, `contexto.ts` | feito |
| A — AEC previstas no currículo | `lib/validacao/aec-prevista.ts`, `lib/acoes/aec-previstas.ts`, `cursos/[curso]/editar/AecPrevistasDoCurriculo.tsx`, a parte *Atividades* de `editar/page.tsx`, a aba *Atividades* da página do curso | agente |
| B — o lançamento no DSA (RA-4) | `lib/validacao/dsa.ts`, `lib/acoes/dsa.ts`, `dsa/FormularioDeLancamento.tsx`, `ResponsavelOuNomeLivre.tsx`, `AcoesDoBloco.tsx`, `dsa/leitura.ts`, `lib/dominio/dsa/rotulos.ts`, os leitores TS que somam por categoria (o «TA da disciplina» é CHD) e o rótulo do tipo na grade, no papel e na planilha | agente |
| C — Palestras e APOINST (RA-5, RA-6) | os leitores e os quadros compartilhados, `lib/acoes/{marcacoes-de-atividade,apoinst}.ts` e as validações; preenche `PalestrasDaTurma`, `ApoinstDaTurma`, os dois `Acompanhamento…` do DSA e `AbaDePalestras`/`AbaDeApoinst` do módulo | agente |
| D — a lista, os filtros e as estatísticas (FR-006, FR-007.1) | a aba *Atividades* do módulo (extraída de `atividades/page.tsx`), `consulta.ts`, `FiltrosDeAtividades.tsx`, as estatísticas, as ações da linha, e `AtividadesDaTurma` | agente |
| E — o catálogo e os avisos (FR-001.3, FR-009) | `/admin/tipos-de-atividade` (página, ações, a aba da Administração) e o módulo *Atividades* do sininho (`lib/dominio/avisos/central.ts`, `app/(app)/avisos/*`) | agente |
| F — RLS com sessão real e pgTAP do bloco | `tests/invariantes/rls/atividades-bloco-18.test.ts`, `supabase/tests/156_bloco_18_atividades.sql` e os pgTAP antigos que contam o catálogo | eu |
| Cargas no remoto | `scripts/manutencao/carga_aec_previstas.sql` e `scripts/manutencao/carregar_pdfs_dos_curriculos.py` | eu |

**Arquivos compartilhados** — `tests/unidade/fronteira-das-telas.test.ts` (`FOLHAS_DE_CLIENTE`),
`tests/e2e/sem-campo-aberto.spec.ts`, `tests/e2e/telas-acessiveis.spec.ts`, `lib/acoes/traducao-de-recusas.ts` e
`components/ciaara/botao-de-icone.tsx`: cada agente **informa** o que precisa neles, e a junção é minha.

## Rito do remoto (depois do CI verde)

1. `python -m scripts.manutencao.dado_do_remoto --somente-copia` (arquivo citado) e a remedição do efeito zero sobre ele.
2. `supabase db push --linked --dry-run` listando **só** as duas migrations; `supabase db push --linked`.
3. Conferência só de leitura: migrations iguais nos dois lados, impressão digital do esquema, `security_invoker`, zero
   policy de `DELETE`, Production respondendo.
4. As cargas (itens 6 e 7): ensaio na cópia local, backup, a carga, a conferência só de leitura e a lista no relatório.

## Reversão

`specs/033-bloco-18-atividades/reversao.sql`: recriar os objetos da M2 com o corpo da migration de origem, repor os dois
`CHECK`, apagar as colunas e tabelas da M1 (nascidas aqui; recusar se tiverem linha), as funções, as sequências, os
parâmetros, o recurso e os quatro tipos sem uso, e devolver o rótulo.
