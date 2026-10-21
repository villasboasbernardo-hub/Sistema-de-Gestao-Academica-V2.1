# Antes × depois — currículo versionado (spec 021, PR 1), medido em 21/10/2026

**Base:** a cópia do remoto `remoto-20261020-235051.sql` (modo completo do `dado_do_remoto`, só leitura no remoto),
restaurada no local com as **87** migrations da `main`; depois, só as duas novas (`supabase migration up --local`).
**Hoje fixo:** 20/10/2026 nas funções "até uma data" e nas leituras do DSA e da planilha.

## 1. A impressão digital do que o currículo alimenta — IDÊNTICA

Instrumento: `scripts/provas/impressao_digital_do_curriculo.sql` — 24 objetos, `objeto|linhas|md5` das linhas ordenadas,
com as colunas que a tela lê listadas uma a uma (uma coluna nova não mexe no md5).

| Objeto | Linhas | Antes = depois |
|---|---|---|
| `vw_carga_horaria_turma` | 29 | `93e84ff8…` |
| `vw_conformidade_tetos` | 87 | `877f04ab…` |
| `vw_disciplinas_execucao` | 228 | `fbd8768f…` |
| `vw_unidades_ensino_execucao` | 587 | `7ebda3af…` |
| `vw_instrutor_carga_prevista` | 112 | `1e2e3a01…` |
| `vw_instrutor_carga_anual` | 181 | `02dad46d…` |
| `vw_chd_por_fato` | 2.512 | `38f312ba…` |
| `vw_ocupacao_ta` | 3.310 | `301470aa…` |
| `vw_dias_parados_turma` | 23 | `dc9b1481…` |
| `vw_avaliacoes_situacao` | 392 | `6987c6c8…` |
| `vw_instrutor_disciplina_rotulada` | 863 | `5673d076…` |
| `chd_da_turma_ate(2026-10-20)` | 10 | `05ae8e2f…` |
| `execucao_por_disciplina_ate(2026-10-20)` | 100 | `cf3a0cae…` |
| `turma_disciplina` / `…_instrutor` / `…_unidade` | 231 / 115 / 4 | iguais |
| `disciplinas` / `unidades_ensino` / `avaliacoes_curriculo` / `…_turma` / `limites_curriculo` | 175 / 587 / 281 / 19 / 30 | iguais |
| `instrutor_disciplina` / `turmas` / `cursos` | 864 / 29 / 24 | iguais |

`diff` vazio nos 24, **duas vezes**: na primeira aplicação e na reaplicação depois da reversão.

## 2. O retrato das telas — IDÊNTICO

Instrumento: `tests/invariantes/retrato-das-telas.test.ts` (só roda com `RETRATO_SAIDA`). Para **cada uma das 29
turmas**: o insumo da planilha de contingência, o **arquivo `.xlsx` inteiro**, os extras da impressão do DSA e o
**documento do DSA de cada semana com lançamento** — **212 semanas**. Determinístico (duas rodadas do antes: 0
diferenças). Antes × depois: **0 diferenças**, nas duas aplicações. Andamento, saldo e CH prevista dos instrutores
saem das views da §1.

## 3. A ligação

- **24 versões**, uma por curso, todas a versão 1, vigentes desde 01/01/2020.
- **175** disciplinas, **30** limites e **29** turmas na versão 1; linhagem = o próprio id em disciplinas, UEs e avaliações.
- **0** linhas ativas de turma fora da versão da turma.
- **Ninguém foi carimbado como editor**: 0 `editado_em` novos em disciplinas, UEs, avaliações, limites e turmas, e 0
  linhas novas na trilha do arbitrado.
- **10 versões travadas** (seguidas por turma com lançamento) — as dos 10 cursos da triagem.
- As três views com `security_invoker=true`; **0** policies de `DELETE`.
- Esquema: **2.237 → 2.324 objetos** (`1ba390aa…` → `c3e0ef59…`).

## 4. O caso que discrimina (DoD 8), na cópia, numa transação desfeita

| # | Caso | Resultado |
|---|---|---|
| 1 | Versão 2 da CAHO, copiada da 1, vigente em 2027 | 21 disciplinas, 1.668 TA |
| 2 | CH de uma disciplina da v2 (sem turma com lançamento) | aceita |
| 3 | A mesma mudança na v1 (seguida pela CAHO 2026) | **recusada** — `curriculo_em_uso` |
| 4 | Texto na v1 (nome no DSA) | aceito |
| 5 | CAHO 2027 (sem lançamento) troca para a v2 | 21 linhas novas da v2; 21 velhas inativas |
| 5b | ...com um período manual e uma atribuição plantados antes | a linha da v2 leva os dois; o rateio adiado confere |
| 6 | CH curricular | CAHO 2026 **1.668** (igual); CAHO 2027 **1.653** (a da v2) |
| 7 | CAHO 2026 (com lançamento) tenta trocar | **recusada** — `curriculo_da_turma_travado` |
| 8 | Linha de disciplina da v1 na CAHO 2027 (agora v2) | **recusada** — `disciplina_de_outra_versao` |
| 9 | CAHO 2028 inserida sem versão | nasce na **v2** (vigência) com 21 linhas |
| 10 | Disciplina sem versão num curso com duas | **recusada** — `versao_obrigatoria` |

E o pgTAP `144` (31 asserções) codifica os mesmos casos numa amostra própria; **defeito deliberado**: com a junção
**pelo curso** de volta na `vw_carga_horaria_turma`, ele reprova com a CH curricular **190** (as duas versões somadas) em
vez de **100**.

## 5. A reversão — PROVADA COM DADO

`reversao.sql` aplicado na cópia com as 24 versões ligadas: o esquema volta a **2.237 objetos, `1ba390aa…`** — o da
`main` e do remoto — e a impressão do currículo à do antes. Reaplicadas as duas migrations, as medições das §1 a §4 se
repetem.

## 6. O que a CÓPIA leva (o rascunho da função do PR 2), na cópia `remoto-20261021-010344.sql`

| | Disciplinas | CH | UEs | Avaliações do currículo | Limites | Habilitações |
|---|---|---|---|---|---|---|
| CAHO v1 | 21 | 1.668 | 132 | 54 | 2 | 59 |
| CAHO v2 (cópia) | 21 | 1.668 | 132 | 54 | 2 | 59 |

Linhagem: **0** disciplinas, UEs ou avaliações da v2 sem par na v1. **0** turmas e **0** linhas de turma passam sozinhas
para a v2. ⚠️ O **porteiro** da cópia não foi exercitado aqui (a restauração desfaz os vínculos de credencial de outro
ambiente, e não havia Admin com sessão): a prova dele, com sessão real, é do PR 2.

## 7. As suítes, na base limpa

pgTAP **971** em 64 arquivos (com o `144`) · unidade **2.614** em 189 · invariantes e RLS **417** em 23 (+ o retrato,
pulado sem `RETRATO_SAIDA`) — todas verdes. O ETL refeito sobre as migrations: **APROVADO**, 24 versões, 30 limites na
versão 1 (a D-1 reaplicada com o índice provisório, que sai). Sobre a base do ETL, reprovam `112`, `115` e `129`: as
asserções medem os efeitos das migrations de dado D-5/D-6 da spec 014 (que a ETAPA 6b **não** reaplica — a lista
declarada só tem D-1, D-2 e D-3) e a contagem de Admins; nenhuma lê o que esta spec mudou. ⚠️ **Não conferi** se as
três reprovam também na `main` sobre a base do ETL.
## 8. A ponta a ponta — o CI do ramo (run `39542414518`, sobre `810ee6a`)

**539 passados, 3 reprovados nas três tentativas, 6 pulados.** Os três reprovam **pela trava** (a frase dela aparece na
tela), e os três são funções de **hoje** para curso em andamento — as avaliações do currículo:

| Caso | O que a tela tenta | O que a trava faz |
|---|---|---|
| `avaliacoes-da-turma.spec.ts:303` | **nomear a UE** de um item que o currículo deixou na disciplina (*"decisão CIAARA-11"*, `FR-031.3`) | recusa (muda `unidade_ensino_id`) |
| `avaliacoes-nas-telas.spec.ts:76` | o Admin **define o tempo** de uma avaliação *"não definida"* (US9) | recusa (muda `ta_aplicacao`, de nulo para valor) |
| `avaliacoes-nas-telas.spec.ts:194` | **acrescentar e inativar** avaliação do currículo na aba Disciplinas (`FR-038`) | recusa (inclui e inativa item) |

É a consequência da D-4/D-6 medida na suíte: com a trava estrita, a curadoria das avaliações do currículo (que segue em
andamento — `PEND-014-*`) para nos **10 cursos** com turma em andamento. A decisão é do portão (lote, D-4 e D-6).
