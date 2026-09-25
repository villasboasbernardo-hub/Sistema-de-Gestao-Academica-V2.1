# Pesquisa — Fase 0: Épico 5, fatia (b) — disciplinas e unidades de ensino

**Data**: 24–25/09/2026 · **Spec**: [spec.md](./spec.md) · **Plano**: [plan.md](./plan.md) ·
**Conferência**: [conferencia-dos-curriculos.md](./conferencia-dos-curriculos.md)

Tudo abaixo foi **medido** — no banco local (retrato do remoto, cópia `remoto-20260924-153818.sql`), no
código da `main` em `406b566`, nos 24 PDFs de `SIS11/Curriculos/` e nas leituras independentes da
conferência —, não suposto. Cada item traz **Decisão**, **Motivo** e **Alternativas recusadas**. O que
depende de Bernardo está no **lote de dúvidas** ao fim do relatório do plan, não decidido aqui.

---

## R-1 · A carga das UEs é uma migration de dados GERADA, não uma rotina do ETL

**Decisão**: o PR 2 entrega `scripts/etl/gerar_carga_de_unidades_ensino.py`, que lê a saída do
extrator (`unidades_ensino.json`) e a tabela de pareamento `scripts/etl/dados/pareamento_ue.csv` e
**escreve um arquivo de migration** `supabase/migrations/<ts>_carga_unidades_ensino.sql` com
`INSERT INTO unidades_ensino (disciplina_id, curso_id, numero_ue, topico, ch_prevista_tempos,
fundamento_normativo, origem_migracao_v1) SELECT d.id, d.curso_id, … FROM disciplinas d WHERE d.codigo = '<ID_Grade>'`,
uma linha por UE, `ON CONFLICT (disciplina_id, numero_ue) DO NOTHING`, e um `DO $$ … ASSERT count = N $$`
ao fim. A migration é **revisada e versionada**; a carga chega ao remoto por `supabase db push`, com
backup antes, **como qualquer migration**.

**Motivo**: a regra de direção (`CLAUDE.md`, 24/09/2026) proíbe dado do local para o remoto e proíbe
script escrevendo no remoto; o único caminho que existe para o remoto é migration. `disciplinas.codigo`
guarda o `ID_Grade` da v2.0 verbatim e é o **mesmo nos dois bancos** (o remoto foi carregado pelo mesmo
ETL em 22/09/2026 — as 175 linhas do retrato local **são** as do remoto), então resolver `disciplina_id`
por `codigo` é determinístico e não depende de `uuid`. Idempotência pela unicidade `(disciplina_id,
numero_ue)` que já existe. A spec 002 previa `INSERT … SELECT` no Épico 2, pelo ETL — o mecanismo é o
mesmo, o veículo muda porque o remoto deixou de ser vazio.

**Alternativas recusadas**: (a) `carregar.py` inserindo direto — só alcança o local; (b) `seed.sql` —
roda a cada `db reset`, mas não vai ao remoto por `db push`; (c) CSV lido pela migration — o
PostgreSQL da Supabase não lê arquivo do repositório.

---

## R-2 · O pareamento por UE das duas disciplinas desdobradas — N-3

**Decisão**: `pareamento_ue.csv` traz, além do par disciplina → `codigo`, **linhas por UE** para
`HN-2101-0621` (UEs 1–6 → `41 - C-Ap-HN - I`, UE 7 → `… - I-I`) e `MATFIS` (UE 1 → `20 - CAHO - MAT`,
UE 2 → `… - FIS`). A tabela é dado versionado e revisado; o gerador **recusa** UE sem destino.

**Medido na conferência** (2ª verificação, com página): `MATFIS` — A1/A2 **confirmados** (p. 8 e
72–73): uma disciplina, 2 UEs de 28 h cujos tópicos nomeiam matemática e física. `HN-2101-0621` —
I1/I2 **confirmados** (p. 6, 8–9): uma disciplina só, um sumário e um guia; UEs 1–6 = 105, UE 7
*FÍSICA* = 21, com SUEs só de física e PM própria — *"nada no PDF a chama de disciplina"*. **A tabela da
N-3 está aceita** (conferência §4.2).

**Motivo**: Q-05 (carga por UE, sem fundir linhas) e N-3 (aceita se a conferência confirmar com
página). As somas fecham exatamente nas quatro metades (105/21 e 28/28), e os tópicos dizem de que
metade são — não há segunda partição possível.

**Alternativas recusadas**: fundir as duas linhas do banco (mexe em `turma_disciplina` e histórico);
carregar as UEs numa metade só (falsearia a CH); deixar fora (perde 9 UEs sem motivo).

---

## R-3 · `EST-QF-APOC`: as 5 UEs transcritas de imagem entram como candidatas à carga

**Decisão**: entram na carga com `origem_migracao_v1 = 'marinha_do_brasil_-_curriculo-do-est-qf-apoc.pdf (transcrito de imagem)'`
e `fundamento_normativo = 'Currículo EST-QF-APOC — CIAARA, 2021'`; `cursos.curriculo_modelo` fica
`unidades_de_ensino`. **`PEND-5b-3` fecha.**

**Medido**: leitura independente das 6 páginas rasterizadas (170 dpi), legibilidade **alta**, nenhum
item incerto; 2ª verificação **F1–F4 confirmados** com página: 1 disciplina `I` de **79 h** (p. 4 e 5),
5 UEs — 9, 18, 9, 20 (p. 5) e 24 (p. 6) — e a diferença 80 × 79 **explicada pelo próprio documento**:
*"CARGA HORÁRIA REAL 79 HORAS | TEMPO RESERVA 1 HORA | CARGA HORÁRIA TOTAL 80 HORAS"* (p. 4). O banco
tem a disciplina com **79** tempos — bate com a CH real.

**Consequência**: é a **única** disciplina carregada cuja soma das UEs (80) ≠ CH da disciplina (79)
— e o Q-06 já decidiu: **aviso, nunca recusa**. A asserção pgTAP de soma (`050_grao_unidade_ensino.sql`)
precisa **excluir explicitamente** esta disciplina com o motivo no comentário, senão o PR 2 nasce
vermelho. O PDF não diz de qual UE sai a hora de reserva — **não se ajusta UE nenhuma** (D-B4).

**Alternativas recusadas**: OCR automático (o que se fez foi leitura por agente + 2ª verificação,
que é mais forte); esperar transcrição humana (a dupla leitura com página cumpre o que Q-05 pediu).

---

## R-4 · O que a conferência achou de NOVO — e o que não é desta carga

A leitura independente cobriu o que o extrator não cobre: os dois currículos por competências e o
digitalizado. Contra o banco, apareceram divergências que a análise do specify **não podia ver**:

| # | Achado (2ª verificação, com página) | Esta carga | Destino |
|---|---|---|---|
| R-4.1 | **`C-Espc-FR` e `C-Espc-HN` não têm UE em disciplina nenhuma** (D5/E3: busca por "UNIDADE" nas 127 + 146 páginas — só unidades de medida e a *Subunidade de Ensino* dos anexos de palestra) | `curriculo_modelo = 'competencias'` | como previsto |
| R-4.2 | `C-Espc-FR`: o banco chama a física de *FÍSICA APLICADA À HIDROGRAFIA* com código **`HN-1104-0506`** (código do C-Espc-HN); o currículo diz *FÍSICA APLICADA AOS AUXÍLIOS À NAVEGAÇÃO*, `FAANFR-005` (D1, p. 15). Idem *PRIMEIROS SOCORROS* `SN-1103-0506` (código do HN) × *PRIMEIROS SOCORROS EM FARÓIS* `PSFFR-014` (D3, p. 80) | nada — nome e código não são desta carga (Q-13) | **`PEND-5b-2`** ganha estes dois casos, com página |
| R-4.3 | `C-Espc-FR` TFM: banco **47** × currículo **48** TA (D2, p. 21 e tabela p. 7) | nada (Q-06: aviso) | dúvida **P-1** |
| R-4.4 | `C-Espc-FR`: dos 17 códigos do banco, **3** estão no PDF (índice e plano), **1** só no índice, **13 em nenhum** — o banco renumerou os sufixos em sequência; o PDF os traz fora de ordem e com sufixo repetido (`-010` ×2, `-011` ×2) (D4) | nada | `PEND-5b-2` |
| R-4.5 | `C-Espc-HN`: *NAVEGAÇÃO I* banco **100** × currículo **108**; *NAVEGAÇÃO II* **128** × **120** — não é troca (nenhuma fonte tem 100/128), é **redistribuição** com soma igual (E1, p. 32, 45, 7) | nada | dúvida **P-1** |
| R-4.6 | `C-Espc-HN`: o próprio PDF diverge de si — *PRIMEIROS SOCORROS* `SN-1103-0506` (índice) × `HN-1113-0508` (plano, p. 94, com rodapé *"Of nº 10-12/2024 … B-94 de 128"* — página colada de versão anterior); *HIDROGRAFIA APLICADA* `HN-1114-0730` × `HN-1104-0730` (p. 98); *TOPOGRAFIA* com código em branco no plano (p. 73) (E2) | nada | registrado; o banco usa os do índice |
| R-4.7 | **AMBIENTAÇÃO** aparece nos 5 currículos semipresenciais/EAD **só na composição da carga horária**, nunca no quadro de disciplinas (G1–G5): **8 / 5 / 5 / 10 / 8 h** (AuxNav, PCN, PrevMe, OcOp, Metoc-SP). O banco a modela como disciplina *AMBIENTAÇÃO VIRTUAL* de **8 tempos nos cinco** — diverge em **3** (PCN, PrevMe, OcOp) | `disciplinas.sem_unidades_ensino = true` nas 5 | dúvida **P-2** |
| R-4.8 | `C-Exp-MetocOf` (OF 2011): banco `I` **48** × PDF **30** (B1); `V` **40** × **50** (B2). E os 48/19/37/40 do banco **batem com o currículo SP de 2025** (C1/C2, p. 3 e 6), enquanto o **18** da `IV` só existe no OF 2011 — o banco não é cópia integral de nenhum dos dois | UEs do OF 2011 entram como estão (o pareamento é por nome, as 5 pareiam); a divergência de CH vira **aviso** (Q-06) | dúvida **P-1** |
| R-4.9 | `C-Ap-FR` `III` banco **76** × PDF **75** | idem | dúvida **P-1** |
| R-4.10 | 2 tópicos de UE do `C-Ap-HN` saem do extrator com a **translineação com hífen quebrada** (*"PRÁTI CAS"*, *"AEROFOTOGRA METRIA"*, p. 34 e 54); os leitores reuniram | corrigir no extrator (PR 2): juntar `-\n` | achado do extrator |
| R-4.11 | Divergências **internas** dos PDFs, sem efeito na carga: `C-Ap-HN` XVIII `HN-2118-0450` (quadro) × `HN-2118-1016` (sumário); AuxNav fase a distância 220 (p. 3) × 202 (p. 6); PCN *"FASE PRESENCIAL: 325"* num EAD; Metoc-SP 112 × 104; PGRS100 datas de aprovação 29/08 × 25/08 | nada | registradas na conferência |

**Decisão**: a carga do PR 2 **não corrige CH, nome nem código** de disciplina — grava as UEs com a CH
do currículo e deixa o aviso do Q-06 mostrar onde a soma não fecha (R-4.3, R-4.5, R-4.8, R-4.9 e o
APOC). O que fazer com essas CH é de Bernardo (**P-1**).

---

## R-5 · Exclusão permanente: RPC + tabela de rastro, no molde de `20260915140100`

**Decisão**: `app.impedimentos_de_exclusao_da_disciplina` / `app.excluir_disciplina` (e o par de UE),
DEFINER, com espelhos INVOKER em `public`; porteiro `app.pode('disciplinas','criar') and
app.alcanca_curso(curso_id)`; impedimentos por `exists` (inclusive `registros_aula.disciplina_codigo_legado_v1 = codigo`,
que **não é FK** — A-11); `p_codigo_confirmacao` conferido contra `codigo`; **`insert into
exclusoes_registradas` antes do `delete`**, na mesma transação; `found` conferido. Tabela nova
append-only com os gatilhos de statement de `curso_sigla_historico` (inclusive `TRUNCATE`,
inclusive `service_role`).

**Medido**: a função de instrutor tem exatamente este esqueleto (lida sem comentário), **não grava
rastro** e usa `23503`/`42501`/`22023`/`P0002` — as mesmas chaves são reaproveitadas; `DELETE` para
`authenticated`: 0 privilégios, 0 policies; nenhuma das 175 disciplinas é excluível hoje (0 sem
dependente).

**Alternativas recusadas**: policy `FOR DELETE` (regra 4); reutilizar `migracao_log` (regra 5: é da
migração); harmonizar a RPC de instrutor agora (`FR-025`: pendência).

---

## R-6 · Rateio: uma RPC que regrava a lista + constraint trigger deferred

**Decisão**: `public.definir_instrutores_da_turma(p_turma_disciplina_id uuid, p_instrutores jsonb)`
INVOKER (as policies `tdi_*` decidem quem pode), que numa transação: desativa (`status='inativo'`) quem
saiu, reativa/insere quem entrou, grava `ch_prevista_tempos` de cada um; `trg_tdi_soma_do_rateio`
é **constraint trigger `DEFERRABLE INITIALLY DEFERRED`** que confere a soma ao fim da transação. A
parcela vem da função pura `lib/dominio/rateio-de-carga.ts` (resto aos mais antigos, Q-03) — o banco
**reconfere**, não recalcula.

**Motivo**: várias linhas por gravação; um gatilho por linha veria estados intermediários que não
somam. `NULL` em todas = "não informado" e é aceito (as 96 migradas); mistura é recusada.

**Alternativas recusadas**: gatilho por linha (falso negativo a cada linha intermediária); calcular no
banco (a regra do resto por antiguidade exige a ordenação de `lib/dominio/antiguidade.ts`, que é a
fonte única — duplicá-la em SQL seria a segunda implementação que a `RN-ANT-01` proíbe).

---

## R-7 · Janela da turma: só para o que a pessoa informa

**Decisão**: `trg_turma_disciplina_janela` recusa período fora da janela **só quando
`new.origem_periodo = 'manual'`** e a turma tem as duas datas.

**Medido**: **4** linhas de `turma_disciplina` têm hoje período fora da janela da turma (herdadas do
ETL; 27 turmas têm janela). Um gatilho sem a cláusula de origem faria a próxima carga do ETL — e
qualquer `UPDATE` de outra coluna nessas 4 — falhar.

**Alternativas recusadas**: recusar sempre (quebra o ETL e as 4 linhas); só avisar (Q-07 decidiu
recusa, paridade com a spec 029).

---

## R-8 · Disciplina nova nasce nas turmas `planejada`/`ativa`

**Decisão**: `trg_disciplinas_nasce_nas_turmas`, `AFTER INSERT`, espelho de
`fazer_nascer_disciplinas_da_turma` (lido: insere por turma nova, período herdado se dentro da
janela); aqui **sempre `nao_informado`** (Q-08) e só `status in ('planejada','ativa')` (N-4).
DEFINER com `revoke` de quem grava (padrão R-6 da spec 009). Reativar disciplina **não** dispara
(as linhas já existem; unicidade `(turma_id, disciplina_id)` garante).

---

## R-9 · Tabela expansível: estender `TabelaDensa`

**Decisão**: `TabelaDensa` ganha a prop opcional `detalhe?: (linha: T) => ReactNode` e a linha
expandida na URL (`aberta`); nenhum segundo componente de tabela.

**Medido**: `tabela-densa.tsx` não tem expansão hoje (grep por `expan|detalhe`: só o texto de "nenhuma
linha corresponde"); a spec 031 da v2.0 exigia *"a MESMA tabela, não uma segunda"*.

---

## R-10 · Sequências `DIS-` e `UE-`: lista única

**Decisão**: `SEQUENCIAS_DE_CODIGO` ganha `("app.disciplinas_codigo_seq","disciplinas", "case when
codigo ~ '^DIS-[0-9]+$' …")` e a de `UE-`; o teste `sequencias-apos-restaurar` e a prova P3 passam a
esperar **6**. A carga do PR 2 usa o `DEFAULT` para `unidades_ensino.codigo` e **avança a sequência
no fim da migration** (`setval` com o `max` lido) — porque `db push` não roda `avancar_sequencias`.

**Medido**: 4 sequências hoje; `unidades_ensino.codigo` sem `DEFAULT`; 0 de 175 `disciplinas.codigo`
começam com `DIS-`.

---

## R-11 · `cursos.curriculo_modelo` como `text + CHECK`, não ENUM

**Decisão**: `text not null default 'unidades_de_ensino' check (in ('unidades_de_ensino','competencias'))`.
**Motivo**: o domínio é da DEnsM (fechado hoje) mas mudou entre 2011 e 2024 — *"ENUM fechado cedo
demais é migration"*. **Alternativa recusada**: `config_listas` (não é vocabulário administrável pela
Divisão; é o modelo do documento normativo).
