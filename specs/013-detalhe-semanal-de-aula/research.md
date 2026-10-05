# Research — as decisões de desenho, e a medição por trás de cada uma

> Fase 0 do `/speckit-plan`. Formato: **Decisão · Por quê · Alternativas recusadas**. Toda
> afirmação "medido" nomeia o artefato (regra 9.2). Nenhum marcador de clarificação restou na spec
> (as 18 estão respondidas); o que esta página resolve são escolhas de **engenharia** dentro das
> decisões de Bernardo.

---

## 1. Onde a regra mora: `lib/dominio/dsa/`, e `distribuicao-semanal.ts` fora dela

**Decisão.** Os módulos do DSA nascem em `lib/dominio/dsa/` — a **primeira subpasta** de
`lib/dominio/`. A função de distribuição (`RN-DIST-01`) nasce **fora**, em
`lib/dominio/distribuicao-semanal.ts`.

**Por quê.** O documento 24 (linha 262) declara `lib/dominio/dsa/` com `conflitos.ts · grade.ts ·
tetos.ts`, e a diretriz `R-1` o repete. A `RN-DIST-01` diz que a distribuição é *"reaproveitada
simultaneamente pelo Diagrama de Alocação, pelo Cronos e, indiretamente, pelo DSA"* e que *"não pode
existir uma segunda implementação"* — pô-la sob `dsa/` convidaria o Épico 7 a escrever a dele. Medido:
a subpasta é coberta pelo ESLint (`files: ["lib/dominio/**/*.ts"]`, `eslint.config.mjs:95`) e pelo
caminhador recursivo das guardas (`andamento-unico.test.ts:93-100`).

**Recusadas.** Os nomes planos dos documentos 02 (`conflito.ts`) e 04 (`conflito-horario.ts`,
`comparacao-semanal.ts`, `tetos-normativos.ts`): são a divergência **V-1**, backlog por diretriz.
Guarda nova: `distribuicao-unica.test.ts`, no molde de `andamento-unico.test.ts`.

---

## 2. O relógio: o regime manda quando não aponta catálogo; a manhã é derivada

**Decisão.** `horario-do-bloco.ts` recebe a linha de `curso_regime_historico` que
`app.fn_regime_vigente(curso, data, tipo)` devolve. Se `configuracao_horario_id` é **nulo**, o
relógio sai dos sete campos do regime (`hora_inicio_manha`, `hora_inicio_tarde`, `ta_duracao_min`,
`intervalo_manha_min`, `intervalo_tarde_min`, `regime_tempos`, `tipo_regime`). Se **aponta**, o
relógio sai de `horarios_tempos_aula` daquela configuração (`hora_inicio`/`hora_fim` armazenadas).
**A quantidade de TA da manhã é derivada**: cabe TA enquanto o fim dele é ≤ 12:00 + a tolerância da
`RF-HOR-04` (*"poucos minutos após as 12h00"*); o que sobra vai para a tarde, a partir de
`hora_inicio_tarde`.

**Por quê.** Medido no `estado-atual.md` §4: há **duas** fontes, e a vigência corrigida da `Q-6` não
vai apontar catálogo (as 5 configurações começam às 08:00). A derivação da manhã **reproduz as duas
grades reais sem parâmetro extra**: G45 (07:50, 45, 5) dá 5 TA (a 5ª termina 11:55); G50 (08:10, 50,
10) dá 4 (a 4ª termina 12:00; a 5ª começaria 12:10, dentro do almoço). O fim do **bloco** é o fim do
último TA dele — a `hora_fim` do catálogo não é recalculada, o que é o que a `R-2` quer dizer com
"derivada, sem arredondar".

**Recusadas.** Criar duas configurações G45/G50 no catálogo: não há tela de `configuracoes_horario`
(medido: nenhum consumidor em `app/` ou `lib/`), e seria uma segunda escrita de dado no remoto.
Guardar a contagem da manhã num campo: não existe na vigência, e a derivação a torna redundante.

---

## 3. A faixa "Sem posição" NÃO sai de `vw_ocupacao_ta`

**Decisão.** `consulta.ts` lê a view para o que **tem** posição e faz **três** `select … where
ta_inicial is null and data between …` (aulas, avaliações pela `data_avaliacao` e pela
`data_vista_prova`, atividades) para a faixa — tudo na **mesma** rodada de `Promise.all`.

**Por quê.** A view chama-se *ocupação de TA*; os quatro ramos filtram `ta_inicial IS NOT NULL` por
construção (`estado-atual.md` §6.1, limite 2). Acrescentar um ramo "sem posição" à view faria o nome
mentir e exigiria um `ta_inicial` nulo em `UNION ALL` com os que não são.

**Recusadas.** Uma view nova `vw_sem_posicao`: três leituras simples não justificam objeto de banco;
e a view teria de ser recriada a cada mudança de coluna.

---

## 4. Nenhuma biblioteca nova — medido antes de decidir

**Decisão.** DnD com a API nativa (`draggable`, `dragstart`, `dragover`, `drop`), e o **teclado como
caminho primário** (`Enter` → menu *Mover para…*); impressão com `@page` + `@media print`; datas por
`lib/formato/data.ts` e `hojeNaCiaara()`.

**Por quê.** Medido em `package.json`: **13** dependências de produção e **zero** de DnD, PDF,
calendário ou data (varredura `dnd|drag|sortable|pdf|print|calendar|date|fns|luxon|moment|dayjs|
table|virtual`). O `RF-DSA-07` exige a alternativa de teclado **de qualquer forma**, então a
biblioteca de DnD não economizaria nada no caminho que a acessibilidade exige. A tabela de plataforma
do `CLAUDE.md` já decide *"Impressão CSS `@media print` + rotas `/print/*`"*.

**Recusadas.** `@dnd-kit`, `react-beautiful-dnd`: pacote novo sem necessidade medida. Gerar PDF no
servidor (`puppeteer`): o `RF-PDF-01` é renderização, e o navegador imprime.

---

## 5. O conflito entre turmas: função com porteiro, e só o fato

**Decisão.** `public.conflitos_da_semana(p_turma_id uuid, p_de date, p_ate date)`,
`SECURITY DEFINER`, porteiro `coalesce(app.pode('registros_aula','ler'), false) and
coalesce(app.alcanca_turma(p_turma_id), false)` — devolve, das **outras** turmas, só
`(data, ta_inicial, ta_final, instrutor_id, fiscal_id, local)` das ocupações cujo instrutor, fiscal
ou local coincide com algum da minha semana. **Nunca** `turma_id`, `fato_id`, disciplina ou
conteúdo. `conflitos.ts` cruza isso com os meus blocos, em memória.

**Por quê.** Medido (`estado-atual.md` §6.2): `vw_ocupacao_ta` é `security_invoker=true` e as policies
filtram `app.alcanca_turma` — o Operador de escopo recortado **não vê** a turma do outro curso, logo
não vê o conflito. A própria `RN-CONF-01` avisa que a verificação *"exige acesso a mais dados"*. A
forma — função definer com porteiro, devolvendo o fato sem a linha — é a que `dependentes_da_conta`
e `vigencias_do_curso` já usam. O porteiro é escrito **na forma que falha fechado** (gotcha 15), e o
pgTAP, que roda sem sessão, prova que ele levanta.

**Recusadas.** Afrouxar a policy de leitura (entrega o DSA alheio); conflito só no alcance (cega quem
mais lança); tabela de conflitos (a `RN-CONF-01` proíbe persistir).

---

## 6. Aula sem UE (`Q-1`): coluna nova, `CHECK` duplo, isenção nominal, views com `LEFT`

**Decisão.** `registros_aula.disciplina_id` nulável + FK composta ao curso; `CHECK` "UE presente
**ou** (disciplina presente **e** tópico não vazio)"; a catraca `reg_aula_ue_so_nula_no_historico`
ganha **uma** segunda isenção, por `app.disciplina_sem_ue(disciplina_id)` (`STABLE`: curso
`competencias` **ou** disciplina `sem_unidades_ensino`); `vw_ocupacao_ta` e
`vw_disciplinas_execucao` passam a `LEFT JOIN` com `coalesce(ue.disciplina_id, r.disciplina_id)`.

**Por quê.** Medido: `registros_aula` **não tem** `disciplina_id` (só o legado em texto); as duas
views juntam a UE por junção **interna** — sem a mudança, a aula sem UE é **insalvável, invisível na
grade e invisível na CH da disciplina**. `vw_carga_horaria_turma` e `vw_unidades_ensino_execucao`
**não** mudam (a primeira não passa pela UE; a segunda parte da UE com `LEFT`). A isenção é
**nominal** — o pedido proibia afrouxar "por conta própria", e a `Q-1` é decisão de Bernardo.

**Recusadas.** UE operacional no catálogo (minha recomendação, recusada na `Q-1`). Trocar a
semântica de `unidade_ensino_id` para aceitar nulo em geral: afrouxaria a catraca para os 22 cursos
que **têm** UE.

---

## 7. A posição herdada (`Q-12`): uma coluna `herdado` na view, três condições no domínio

**Decisão.** `vw_ocupacao_ta` ganha `herdado boolean` = `origem_migracao_v1 is not null and
editado_em is null`. `posicao-herdada.ts` decide `semPosicao` quando `origem = 'avaliacao'` **e**
`herdado` **e** `ta_inicial = 1`.

**Por quê.** Medido: as **188** avaliações têm `ta_inicial = 1`, procedência de ETL e `editado_em`
nulo — **todas**. A regra com as três condições é segura hoje (não há caso legítimo a perder) e **se
desarma sozinha**: a primeira edição carimba `editado_em`, e a linha passa a valer o que diz.

**Recusadas.** Só `ta_inicial = 1`: esconderia uma avaliação nova no 1º TA. Zerar `ta_inicial` por
`UPDATE` em massa: escrita de dado real no remoto, e carimbaria `editado_em` nas 188 — o que
dispararia a coerência `aval_ta_coerente` na que tem `tempos_consumidos` nulo.

---

## 8. O Nº do DSA sem a emissão (`Q-3` fora): derivado, e semana sem aula não conta

**Decisão.** `numero-do-dsa.ts` recebe as datas distintas com lançamento da turma e a semana
pedida; Nº = quantidade de semanas ISO **com lançamento** desde `turma.data_inicio` até a semana,
inclusive. Turma sem `data_inicio` → `null` → `Nº —` no papel, com aviso na tela (D-7).

**Por quê.** A planilha diverge entre as abas (`P-6`), então não há prática a preservar; a
convenção da aba CRONOS (não contar semana sem aula) é a que **não** depende de a turma ter começado
no dia certo. A `ALT` **não** aparece — aparecer errada seria pior.

---

## 9. Estudo Individual num clique (`Q-7`): um lançamento por dia útil, no slot seguinte ao regime

**Decisão.** `lancarEstudoIndividualDaSemana(turma, semana)` insere, numa transação, uma
`atividades_nao_letivas` (`Estudo_Individual`, escopo `turma`, `tempos = 1`, `ta_inicial =
regime_tempos + 1`) por dia útil da semana que **não** seja feriado `dia_inteiro` e que ainda não
tenha EI. Idempotente por dia.

**Por quê.** É a linha **fixa** do documento (`praticas` §1.2) e o 9º tempo é onde a operação o
lança (CAHO 15:40–16:25, C-Ap-HN 16:25–17:20). Determinístico — não muda de lugar quando alguém
lança depois (D-4). O `compoe_cht` gerado já o deixa fora da fórmula.

---

## 10. Sábado (`Q-4`): parâmetro de URL **e** automático quando há lançamento

**Decisão.** `sabado` entra no contrato (`sim/nao`, padrão `nao`, `historico: substitui`); a
coluna aparece quando `sabado=sim` **ou** quando há lançamento no sábado da semana. Os **5 TA** vêm de
`config_parametros` (`dsa.sabado_tempos`), com o relógio do regime a partir de `hora_inicio_manha`.

**Por quê.** "Por ação do operador" é estado de navegação — URL, pelo doc 25 §1.3 — e some sozinho
num sábado vazio. O número 5 é dado (Princípio VII): a planilha do C-Ap-HN usou 5, outra turma pode
usar outro.

---

## 11. Server Action: o `id` nasce antes, o `insert` não tem `RETURNING`

**Decisão.** `lancar(bloco)` gera o `id` em TypeScript, insere **sem** `RETURNING`, e devolve o `id`;
a leitura da linha é da tela, no `revalidatePath`.

**Por quê.** Gotcha 4.1: `INSERT … RETURNING` exige passar pela policy de `SELECT`, e
`app.alcanca_turma` é `STABLE` — pode não enxergar a linha recém-inserida no mesmo comando e recusar
com `new row violates row-level security policy`, que aponta para o lugar errado.

---

## 12. A rota de impressão fica em `app/print/`, fora de `(app)`

**Decisão.** `app/print/dsa/page.tsx`, Server Component, sem a casca, com `impressao.css`
(`@page { size: A4 landscape }`) importado só ali.

**Por quê.** A casca vive no layout de `(app)`; fora dele não há menu nem cabeçalho a esconder. O
`proxy.ts` (linha 31) **já inclui `/print/*` no `matcher`** — a sessão é exigida sem código novo.
Medido: **não existe `@media print`** no repositório — este é o primeiro, e nasce num arquivo só.

---

## 13. Assinatura: a linha do curso vence a GERAL (`Q-14`)

**Decisão.** `assinaturas.ts` procura, por papel, a linha `curso_id = curso` vigente na data; não
achando, a `curso_id is null`. `exibir_no_dsa = false` exclui.

**Por quê.** Medido: as **2** linhas existentes são GERAL (elaborador dinâmico, encarregado fixo), e
`curso_id` é nulável — o fallback já está no schema. O modo `dinamico_usuario_logado` resolve para
**quem imprime**, lido da sessão na rota de impressão.

---

## 14. Lançamento futuro (`Q-2`): nenhum corte por data; uma marca visual

**Decisão.** `situacao.ts` e o rodapé somam tudo o que está lançado; a grade, o quadro e o papel
marcam o bloco com data **posterior a hoje** (`hojeNaCiaara()`) como *lançado à frente*.

**Por quê.** A `RN-CRONOS-01` fala de *"lançados"*, e o pedido proibiu reinterpretá-la; o `D-5` da
planilha era contar o futuro **sem dizer**. Nenhum número do Épico 5.5 muda — `chd_executada` segue
sem corte.

---

## 15. Guardas que nascem com esta feature

| Guarda | O que impede | Molde |
|---|---|---|
| `distribuicao-unica.test.ts` | segunda implementação da distribuição (`RN-DIST-01`) | `andamento-unico.test.ts` |
| `horario-unico.test.ts` | relógio de TA calculado fora de `horario-do-bloco.ts` | idem |
| caso pgTAP do porteiro sem sessão | `if not fn()` que falha aberto na função de conflito | `114_auditoria_de_conta.sql` |
| asserção I-13 já existente | view recriada sem `security_invoker` | `010_estrutura.sql:201-205` — **não é nova**, e é por isso que o PR B não pode esquecer o `with (…)` |
| `fronteira-das-telas.test.ts` | folha de cliente não declarada | as três entradas novas, com motivo |
