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

- [x] CHK001 O **checksum por tabela** está definido — colunas, ordem, algoritmo? [Gap, Spec §FR-006] — ✅ **`md5()` nativo do PostgreSQL** sobre a concatenação textual dos valores, ordenada pelas colunas de negócio, excluindo as de auditoria *(decisão de 08/09)*.
- [x] CHK002 ✅ **RESOLVIDO 08/09** — o FR-006 passou a excluir `id` e o quarteto de auditoria do checksum. ⛔ **Conflito não resolvido:** o quarteto de auditoria (`criado_em`, `criado_por`, `editado_em`, `editado_por`) é preenchido por gatilho a cada carga. Duas execuções produzem carimbos **diferentes** — logo checksum "idêntico" é **impossível** a menos que essas colunas sejam excluídas do cálculo. O requisito não as exclui [Conflito, Spec §FR-006 × Épico 1 `app.set_auditoria()`]
- [x] CHK003 ✅ **RESOLVIDO 08/09** — FR-006.1 novo: `migracao_log` fica fora da idempotência. ⛔ **Conflito não resolvido:** o FR-006 exige que reexecutar produza resultado **idêntico**, e o FR-004 exige que `migracao_log` seja **append-only e continuado**. A segunda execução ou acrescenta linhas de log (e o resultado deixa de ser idêntico) ou não acrescenta (e a carga deixa de ser registrada). Os dois requisitos não podem valer juntos como escritos [Conflito, Spec §FR-006 × §FR-004]
- [x] CHK004 A idempotência é por `codigo`, mas nada dizia o que acontece quando a **origem muda** entre execuções — a planilha é escrita todo dia [Gap, Coverage] — ✅ A unidade de idempotência é o **snapshot** (FR-008), não a planilha viva. FR-006 reescrito.

## Contagem, linha de base e as identidades aritméticas

- [x] CHK005 ✅ **RESOLVIDO 08/09** — o FR-012 passou a afirmar a **relação**, com os literais como linha de base recalculável. ⛔ **Conflito não resolvido:** o FR-012 crava as identidades em números literais (1.566+1+186=1.753 · 663+1=664 · 531+62+60+11=664), e o FR-009.1 manda **refazer a linha de base** contra a planilha viva. Se a contagem mudar, as identidades ficam obsoletas — e elas são critério **bloqueante** [Conflito, Spec §FR-012 × §FR-009.1]
- [x] CHK006 Aprovado por quem, e segundo qual critério? [Clareza, Mensurabilidade, Spec §FR-009.1] — ✅ **Bernardo, autoridade única, com justificativa documentada linha a linha.** Aprovação em bloco ou por amostragem não é aceita *(decisão de 08/09)*.
- [x] CHK007 As **717+ linhas** não são número verificável, e o log vivo já passou de `LOG-001060` [Mensurabilidade, Conflito] — ✅ Absorvido pelo **FR-009.2**: todo número vindo do inventário de 02/08 segue a linha de base refeita.
- [x] CHK008 `avaliacoes` consta como 111 + órfãs, com as órfãs não quantificadas [Gap] — ✅ Absorvido pelo **FR-009.2** — a sondagem as quantifica antes de a contagem virar critério.
- [x] CHK009 O volume de ~5.400 linhas vem do inventário vencido [Premissa] — ✅ Absorvido pelo **FR-009.2**.
- [x] CHK010 Zero esperado é caso normal ou tabela ausente? [Clareza, Caso de borda] — ✅ **FR-009.3**: zero é valor válido e verificado como qualquer outro; tabela ausente é falha distinta.

## Reconciliação — a que decide o corte

- [x] CHK011 Como o lado da origem é somado sem repetir o defeito que deveria detectar? [Lacuna] — ✅ **FR-014.1**: soma **bruta do CSV extraído, sem filtro de negócio** *(decisão de 08/09)*.
- [x] CHK012 ✅ **RESOLVIDO 08/09** — a staging é **truncada no início da execução seguinte**, não descartada ao fim. ⛔ **Conflito não resolvido:** o `data-model.md` §2 diz que a staging é **"descartada ao fim de cada execução"**, mas o contrato do pipeline diz que a etapa 5 é **reexecutável sozinha** e compara `public.* × staging.*`. Descartada a staging, `--somente-reconciliar` não tem contra o que comparar [Conflito, data-model §2 × contracts/pipeline.md]
- [x] CHK013 A lista de invariantes bloqueantes é fechada? [Completude, Spec §FR-015] — ✅ **FR-015.1**: fechada em **R-01 a R-08**; U-01 a U-03 informam. Invariante nova exige emenda ao contrato.
- [x] CHK014 O formato de divergência nomeada vivia só no contrato [Clareza, Spec §FR-014] — ✅ Promovido ao requisito: **tabela · linha · esperado · obtido**. Contagem agregada não conta como nomeação.
- [x] CHK015 O que fazer quando a reconciliação **não consegue ler**? [Lacuna, Fluxo de exceção] — ✅ **FR-014.2**: falha com erro nomeado. Ausência de divergência por ausência de leitura não é aprovação (`RN-DEG-01`).
- [x] CHK016 Qual troca de FK prova o SC-008? [Mensurabilidade] — ✅ O **caso mais difícil**: registro de `tempos_consumidos > 1` movido para **outra turma do mesmo curso** — mesma janela, contagem idêntica dos dois lados.

## Rastro, proveniência e o log

- [x] CHK017 O que vai em **`origem_migracao_v1`**? A coluna deixou de ser só auditoria [Gap] — ✅ **FR-002.1**: `<tabela_origem>:<chave_original>`, por exemplo `Registros_Aula:REG-001234` *(decisão de 08/09)*.
- [x] CHK018 `codigo` é único por tabela ou globalmente? [Clareza] — ✅ **Medido no banco: 23 constraints `UNIQUE(codigo)`, uma por tabela.** O FR-002 passou a dizê-lo.
- [x] CHK019 Como se **prova** que o log não foi reescrito? [Mensurabilidade] — ✅ **FR-004.1**: checksum das linhas anteriores à carga, comparado antes e depois. Não por contagem, não por amostragem.
- [x] CHK020 As três famílias de evento estavam no modelo, não nos requisitos [Rastreabilidade] — ✅ **FR-004.2** as promove, com a família (c) — o não casado — explicitamente obrigatória.
- [x] CHK021 Se a gravação do log falhar depois das 25 tabelas promovidas? [Lacuna, Fluxo de exceção] — ✅ **FR-004.3**: o log é escrito **dentro** da transação do FR-005. Carga sem registro de carga não é estado alcançável.

## Integridade referencial e o novo nulo

- [x] CHK022 Zero FK órfã foi escrito quando a UE era `NOT NULL` [Clareza, Conflito] — ✅ **FR-011.1**: chave anulável pode conter nulo legitimamente, e nulo **não** é órfã. A verificação distingue *não há a que apontar* de *aponta para o que não existe* *(decisão de 08/09)*.
- [x] CHK023 O `CHECK` admitia nulo com `origem_migracao_v1` preenchido, sem impedir que **dado novo** preenchesse a coluna e escapasse da obrigatoriedade [Lacuna] — ✅ **Trava reforçada (FR-025.8):** nulo só com `origem_migracao_v1` preenchido **E** `editado_em` estritamente nulo. É uma **catraca** — linha migrada que for editada passa a exigir a UE. ⚠️ **Residual declarado:** um `INSERT` novo também nasce com `editado_em` nulo, então quem preencher `origem_migracao_v1` no formato do FR-002.1 ainda consegue gravar sem UE. A trava tornou a fraude **deliberada em vez de acidental**; fechá-la por completo exigiria gatilho que distinga a sessão do ETL — decisão do Épico 3 (auth), registrada aqui para não se perder.
- [x] CHK024 Quantas das 210 linhas devem trazer as colunas de P-6 preenchidas? [Mensurabilidade] — ✅ Absorvido pelo **FR-009.2**: a sondagem estabelece o número antes de ele virar critério.
- [x] CHK025 Os 89/121 seguem a sorte das identidades? [Consistência] — ✅ **FR-009.2** os inclui nominalmente.

## Conversão, tipo e fuso

- [x] CHK026 Fuso sobre `date`, um tipo sem fuso [Ambiguidade] — ✅ **FR-019**: conversão de fuso sobre `date` fica **vedada**; extração e inserção no literal `YYYY-MM-DD`. **FR-019.1**: `timestamptz` em `America/Sao_Paulo`, apresentação `DD/MM/AAAA` *(decisão de 08/09)*.
- [x] CHK027 Datas de fronteira não estava definido [Clareza] — ✅ **FR-019.2**: virada de ano, primeiro e último dia de turma, e horário de verão se houver no período.
- [x] CHK028 O que se verifica na conversão por coluna? [Clareza] — ✅ **FR-018.2**: os **três** eixos — formato, faixa e domínio.
- [x] CHK029 O que fazer com outros sufixos de UE nos arquivos não inspecionados? [Coverage, Gap] — ✅ **Medido nos 7 arquivos: `P` é o único sufixo, 434 ocorrências.** Sufixo novo que apareça cai na regra geral de valor fora de domínio (FR-017).

## Consistência entre os artefatos

- [x] CHK030 As listas R-01…R-08 e FR-009…FR-014 correspondem uma a uma? [Consistência] — ✅ Correspondência declarada no **FR-015.1**, que fecha a lista e a torna referência única.
- [x] CHK031 Enquanto o documento 30 §13 não for corrigido, qual texto prevalece? [Conflito] — ✅ **A spec prevalece**, e a correção é a T069. Registrado em research §R-3.
- [x] CHK032 Até o documento 31 ser atualizado, onde vive o de-para da v1.0? [Rastreabilidade] — ✅ No **`contracts/cruzamento-ue.md`**, que prevalece até a T072.
- [x] CHK033 Lançamento (v1.0, grão de TA) e registro (v2.0, grão de sessão) são usados de forma consistente? [Terminologia] — ✅ Conferido nos cinco artefatos; a distinção está declarada em data-model §3.1 e §3.2.

## Cobertura de cenário e recuperação

- [x] CHK034 Existe requisito para carga interrompida por **queda**? [Lacuna, Recuperação] — ✅ **FR-007.1**: retomada da etapa 1 sem estado residual que altere o resultado.
- [x] CHK035 O que impede uma etapa reexecutada de usar artefato obsoleto? [Lacuna] — ✅ **FR-007.1**: a etapa recusa artefato cujo **snapshot de origem** não corresponda ao seu.
- [x] CHK036 Há requisito de **observabilidade** para uma carga de minutos? [Gap, Não funcional] — ✅ **FR-021.1**: etapa corrente e tempo por etapa registrados, para distinguir carga lenta de carga travada.

---

## Portão — fechado em 08/09/2026

**36 de 36 verdes.** Onze bloqueantes na origem, todos resolvidos: quatro por correção de redação
(os conflitos formais) e sete por decisão de Bernardo.

| Origem da resolução | Itens |
| --- | --- |
| **Conflito formal, corrigido na redação** | CHK002 · CHK003 · CHK005 · CHK012 |
| **Decisão de Bernardo (08/09)** | CHK001 · CHK006 · CHK011 · CHK017 · CHK022 · CHK023 · CHK026 |
| **Medido no banco ou nos arquivos** | CHK018 (23 constraints `UNIQUE`) · CHK029 (`P` é o único sufixo, 434 ocorrências) |
| **Absorvido pela linha de base do FR-009.2** | CHK007 · CHK008 · CHK009 · CHK024 · CHK025 |
| **Redação derivada, sem decisão nova** | os 13 restantes |

**Efeito na spec: 57 requisitos**, contra os 34 com que ela começou o dia.

### ⚠️ Um residual declarado, dentro do CHK023

A trava do FR-025.8 — nulo só com `origem_migracao_v1` preenchido **e** `editado_em` nulo — funciona
como **catraca**: linha migrada que for editada passa a exigir a Unidade de Ensino. Mas um `INSERT`
novo também nasce com `editado_em` nulo, então quem preencher `origem_migracao_v1` no formato do
FR-002.1 ainda consegue gravar sem UE.

**O item está verde porque a decisão foi tomada e aplicada**, e porque a trava mudou a natureza do
risco: a fraude passou de **acidental** a **deliberada**. Fechá-la por completo exige gatilho que
distinga a sessão do ETL da sessão de um usuário — e isso é o Épico 3, que traz autenticação. Fica
registrado aqui para que ninguém o descubra sozinho em 2027.

## Notas

- **Este checklist não testa implementação.** Nenhum item pede para rodar comando. Ele pergunta se o
  requisito está escrito de modo que duas pessoas cheguem à mesma conclusão.
- **Por que integridade, e não o cruzamento da UE:** o cruzamento é novo e chama atenção, mas foi
  decidido em três rodadas nesta sessão e tem contrato próprio. Os requisitos de integridade vêm do
  documento 30 e do documento 06, foram escritos meses atrás, e **não foram revistos depois que a R-1
  tornou a UE anulável** — é por isso que CHK022 e CHK023 existem.
- **O que este checklist deliberadamente não cobre:** a operação do corte (US4/US5) e a exposição de
  dado real. Ambos merecem checklist próprio; nenhum bloqueia a primeira migration.
