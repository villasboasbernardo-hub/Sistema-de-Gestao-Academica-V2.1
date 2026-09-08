# Checklist de Integridade do Dado Migrado — Épico 2

**Purpose**: Portão sobre a **qualidade dos requisitos** que impedem corrupção silenciosa — reconciliação,
contagem, idempotência, rastro e integridade referencial. Percorrer **antes de escrever a primeira
migration** (T007).

**Created**: 2026-09-08
**Feature**: [spec.md](../spec.md) · [plan.md](../plan.md) · [contracts/reconciliacao.md](../contracts/reconciliacao.md)
**Público**: o agente que vai implementar — os itens perguntam pelo **texto do requisito**, não pelo código.
**Escopo**: os requisitos de integridade (FR-002, FR-004 a FR-015, FR-018/019, FR-025.x). Não cobre o
corte (US4/US5) nem a exposição de dado real, que merecem checklist próprio.

**Como ler**: cada item pergunta se o requisito está **escrito** de modo que duas pessoas cheguem à
mesma conclusão. ⛔ = **bloqueante**: responder "não" significa que o requisito precisa de decisão
antes que o código correspondente seja escrito. Este épico carrega o histórico de 2026 **uma única
vez** — requisito ambíguo aqui produz dado errado que ninguém questiona, porque estará preenchido.

---

## Idempotência e checksum — o conflito mais caro

- [ ] CHK001 ⛔ O **checksum por tabela** (FR-006, R-08) está definido? Sobre quais colunas, em que ordem de linha, com qual algoritmo — nada disso está escrito [Gap, Spec §FR-006]
- [ ] CHK002 ⛔ **Conflito não resolvido:** o quarteto de auditoria (`criado_em`, `criado_por`, `editado_em`, `editado_por`) é preenchido por gatilho a cada carga. Duas execuções produzem carimbos **diferentes** — logo checksum "idêntico" é **impossível** a menos que essas colunas sejam excluídas do cálculo. O requisito não as exclui [Conflito, Spec §FR-006 × Épico 1 `app.set_auditoria()`]
- [ ] CHK003 ⛔ **Conflito não resolvido:** o FR-006 exige que reexecutar produza resultado **idêntico**, e o FR-004 exige que `migracao_log` seja **append-only e continuado**. A segunda execução ou acrescenta linhas de log (e o resultado deixa de ser idêntico) ou não acrescenta (e a carga deixa de ser registrada). Os dois requisitos não podem valer juntos como escritos [Conflito, Spec §FR-006 × §FR-004]
- [ ] CHK004 A idempotência é "por `codigo`" (documento 30 §5.4), mas o requisito não diz o que acontece quando a **origem mudou** entre as duas execuções — a planilha é escrita todo dia [Gap, Coverage]

## Contagem, linha de base e as identidades aritméticas

- [ ] CHK005 ⛔ **Conflito não resolvido:** o FR-012 crava as identidades em números literais (1.566+1+186=1.753 · 663+1=664 · 531+62+60+11=664), e o FR-009.1 manda **refazer a linha de base** contra a planilha viva. Se a contagem mudar, as identidades ficam obsoletas — e elas são critério **bloqueante** [Conflito, Spec §FR-012 × §FR-009.1]
- [ ] CHK006 ⛔ "O delta contra o documento 05 §10 MUST ser registrado e **aprovado**" — aprovado **por quem** e **segundo qual critério**? Um delta de 3 linhas e um de 300 recebem o mesmo tratamento? [Clareza, Mensurabilidade, Spec §FR-009.1]
- [ ] CHK007 O `migracao_log` histórico é descrito como **"717+ linhas"**. O sinal de mais torna o número não verificável, e o documento 30 §11 registra que o log vivo já passou de `LOG-001060` [Mensurabilidade, Conflito, Spec §FR-004, §SC-006]
- [ ] CHK008 O documento 30 §4 escreve `avaliacoes` como **"111 + órfãs"**. As órfãs não estão quantificadas em lugar nenhum, e a contagem é critério bloqueante [Gap, Spec §FR-009]
- [ ] CHK009 O volume declarado (~5.400 linhas) vem do mesmo inventário de 02/08 que o P-8 dá como vencido. Ele é premissa de desenho ou número a reconferir? [Premissa, Spec §Assumptions]
- [ ] CHK010 A ordem de carga prevê `planejamento_anual` com **0 linhas**. O requisito de contagem exata trata "zero esperado" como caso normal ou como tabela ausente? [Clareza, Caso de borda]

## Reconciliação — a que decide o corte

- [ ] CHK011 ⛔ O **R-02** compara o somatório de TA "origem × destino". A origem é a staging, que é **integralmente `text`** por desenho. Somar exige conversão numérica — e a conversão é justamente o que pode estar errado. O requisito não diz como o lado da origem é somado sem repetir o defeito que ele deveria detectar [Lacuna, contracts/reconciliacao.md R-02 × data-model §2]
- [ ] CHK012 ⛔ **Conflito não resolvido:** o `data-model.md` §2 diz que a staging é **"descartada ao fim de cada execução"**, mas o contrato do pipeline diz que a etapa 5 é **reexecutável sozinha** e compara `public.* × staging.*`. Descartada a staging, `--somente-reconciliar` não tem contra o que comparar [Conflito, data-model §2 × contracts/pipeline.md]
- [ ] CHK013 A lista de invariantes bloqueantes (R-01 a R-08) é **fechada**? O FR-015 fala em "invariante estrutural e matemática" sem enumerá-las, e é o critério que o documento 06 chama de inegociável [Completude, Spec §FR-015]
- [ ] CHK014 O formato de "divergência nomeada" vive só no contrato (C-2: *"tabela X, linha Y, esperado Z, obtido W"*), não no requisito. O FR-014 exige nomear sem dizer o que é nomear [Clareza, Spec §FR-014]
- [ ] CHK015 A reconciliação é declarada **"só leitura"** (C-4). O requisito diz o que fazer quando ela **não consegue ler** — staging ausente, conexão caída no meio? [Lacuna, Fluxo de exceção]
- [ ] CHK016 O SC-008 exige que uma troca deliberada de FK seja detectada. O requisito não diz **qual troca** nem em que tabela — e a força da prova depende disso: trocar turma num registro de 1 TA é diferente de trocar num de 12 [Mensurabilidade, Spec §SC-008]

## Rastro, proveniência e o log

- [ ] CHK017 ⛔ O que exatamente vai em **`origem_migracao_v1`**? O FR-002 exige "preenchido" sem dizer com quê — e a coluna deixou de ser só auditoria: o `CHECK` da R-1 a usa para **decidir se a UE pode ser nula**. O conteúdo dela agora afeta correção, não só rastreabilidade [Gap, Spec §FR-002 × §FR-025.8]
- [ ] CHK018 `codigo` deve ser único **por tabela** ou **globalmente**? Os identificadores da v2.0 são prefixados (`CUR-`, `VIN-`), o que sugere por tabela, mas o requisito não diz [Clareza, Spec §FR-002]
- [ ] CHK019 O FR-004 exige o log "íntegro — nenhuma reescrita". Está definido o que se compara para **provar** que nada foi reescrito: contagem, checksum das linhas antigas, ou leitura por amostragem? [Mensurabilidade, Spec §FR-004]
- [ ] CHK020 As três famílias de evento do log (data-model §4) estão no modelo de dados, não nos requisitos. Registrar o **não casado** é obrigação ou escolha de desenho? [Rastreabilidade, data-model §4 × Spec]
- [ ] CHK021 O log é gravado "em bloco, no fim". Se a gravação do log **falhar** depois de as 25 tabelas terem sido promovidas na mesma transação, o requisito não diz se a carga inteira volta [Lacuna, Fluxo de exceção]

## Integridade referencial e o novo nulo

- [ ] CHK022 ⛔ "**Zero FK órfã**" (FR-011) foi escrito quando `unidade_ensino_id` era `NOT NULL`. Agora ela aceita nulo. O requisito distingue **nulo legítimo** de **órfã**? Como está, uma leitura literal pode contar 1.566 nulos como violação [Clareza, Conflito, Spec §FR-011 × §FR-025.8]
- [ ] CHK023 ⛔ O `CHECK` da R-1 admite nulo quando `origem_migracao_v1` está preenchido. Nada impede que **dado novo** também preencha essa coluna e escape da obrigatoriedade. O requisito protege contra isso? [Lacuna, Spec §FR-025.8]
- [ ] CHK024 As duas colunas de P-6 nascem **anuláveis** porque a v2.0 não as preenche em todas as 210 linhas. Está escrito **quantas** devem vir preenchidas, para que a ausência seja verificável em vez de presumida? [Mensurabilidade, data-model §1.1]
- [ ] CHK025 O FR-013 crava 89 herdados e 121 em branco em `turma_disciplina`. Se a linha de base for refeita (FR-009.1), esses dois números seguem a mesma sorte das identidades do CHK005? [Consistência, Spec §FR-013]

## Conversão, tipo e fuso

- [ ] CHK026 ⛔ O FR-019 exige "fuso explícito", mas `registros_aula.data` é **`date`**, tipo sem fuso. O requisito confunde a data do fato com os carimbos de auditoria (`timestamptz`)? Sem essa distinção, "converter com fuso" pode **introduzir** o deslocamento de um dia que o requisito existe para evitar [Ambiguidade, Spec §FR-019]
- [ ] CHK027 "Datas de fronteira" (FR-019) não está definido: virada de ano, horário de verão, primeiro e último dia da turma? [Clareza, Spec §FR-019]
- [ ] CHK028 O FR-018 exige conversão "verificada por coluna antes da gravação definitiva". Está escrito **o que** se verifica — formato, faixa, domínio, ou os três? [Clareza, Spec §FR-018]
- [ ] CHK029 A normalização de `1P` → `1` (FR-025.9) trata o sufixo como *parte prática*. O requisito diz o que fazer com **outros sufixos** que apareçam nos 6 arquivos ainda não inspecionados coluna a coluna? [Coverage, Gap, Spec §FR-025.9]

## Consistência entre os artefatos

- [ ] CHK030 O `contracts/reconciliacao.md` lista **R-01 a R-08 e U-01 a U-03**; a spec descreve as verificações em FR-009 a FR-014. As duas listas correspondem uma a uma? [Consistência]
- [ ] CHK031 O documento 30 §13 lista **P-7 como bloqueante** e ela está resolvida desde o Épico 1 (research R-3). Enquanto o documento não for corrigido (T069), qual texto prevalece para quem chegar agora? [Conflito, research §R-3]
- [ ] CHK032 O documento 31 é o de-para das 23 abas da v2.0 e **não conhece a segunda fonte** (T072). Até ser atualizado, o de-para da v1.0 vive só no `contracts/cruzamento-ue.md` — isso está declarado? [Rastreabilidade, Lacuna]
- [ ] CHK033 O termo **"lançamento"** (linha da v1.0, grão de TA) e **"registro"** (linha da v2.0, grão de sessão) são usados de forma consistente em spec, plan, data-model e contratos? Trocá-los inverte o sentido de toda frase sobre o cruzamento [Terminologia, Consistência]

## Cobertura de cenário e recuperação

- [ ] CHK034 Existe requisito para a carga **interrompida por queda** — energia, conexão, processo morto — em vez de por defeito de dado? A transação protege o banco, mas os artefatos de `dados/` ficam num estado que ninguém descreveu [Lacuna, Fluxo de recuperação]
- [ ] CHK035 O FR-007 exige cada etapa "reexecutável isoladamente". Está escrito o que garante que uma etapa reexecutada **não use artefato obsoleto** de outra etapa anterior? [Lacuna, Spec §FR-007]
- [ ] CHK036 Há requisito de **observabilidade** para uma carga que leva minutos — progresso, etapa corrente, o que fazer quando ela parece travada? Registrado como Outstanding no `/speckit-clarify`, mas segue sem requisito [Gap, Não funcional]

---

## Portão — o que precisa de decisão antes de T007

**Bloqueantes (⛔), em ordem de custo se descobertos tarde:**

| # | Item | Por que agora |
| --- | --- | --- |
| **CHK002 · CHK003** | Idempotência × auditoria × log append-only | São **dois conflitos formais**. O FR-006 é insatisfazível como escrito: carimbos mudam a cada execução e o log cresce. Descoberto na implementação, custa reescrever requisito **e** teste |
| **CHK005** | Identidades cravadas × linha de base refeita | Ambos bloqueantes, e um invalida o outro |
| **CHK011 · CHK012** | Como a origem é somada, e se a staging sobrevive | Decidem se a reconciliação é executável. O CHK012 é conflito direto entre dois artefatos |
| **CHK017** | O conteúdo de `origem_migracao_v1` | Deixou de ser auditoria: o `CHECK` da R-1 depende dela para decidir se a UE pode ser nula |
| **CHK022 · CHK023** | "Zero FK órfã" × a coluna que virou anulável | O FR-011 foi escrito antes da R-1 e não foi revisto |
| **CHK006** | Quem aprova o delta da linha de base, e com que critério | Sem isso, "aprovado" é assinatura em branco |
| **CHK026** | Fuso sobre um tipo `date` | Aplicar fuso a uma data sem fuso é como se **produz** o deslocamento de um dia |

**Onze itens bloqueantes.** Nenhum exige trabalho de código para responder — todos são decisão ou
redação. Os quatro conflitos formais (CHK002, CHK003, CHK005, CHK012) são pares de requisitos que
**não podem estar os dois certos**, e nenhum deles foi detectado pelo `requirements.md`, que valida a
spec como documento e não cruza requisito com requisito.

## Notas

- **Este checklist não testa implementação.** Nenhum item pede para rodar comando. Ele pergunta se o
  requisito está escrito de modo que duas pessoas cheguem à mesma conclusão.
- **Por que integridade, e não o cruzamento da UE:** o cruzamento é novo e chama atenção, mas foi
  decidido em três rodadas nesta sessão e tem contrato próprio. Os requisitos de integridade vêm do
  documento 30 e do documento 06, foram escritos meses atrás, e **não foram revistos depois que a R-1
  tornou a UE anulável** — é por isso que CHK022 e CHK023 existem.
- **O que este checklist deliberadamente não cobre:** a operação do corte (US4/US5) e a exposição de
  dado real. Ambos merecem checklist próprio; nenhum bloqueia a primeira migration.
