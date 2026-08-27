# Research — Épico C: Migração e Saneamento da Base de Dados

## Achado de escopo (descoberto na Fase 0, não vinha do spec)

**Decision**: O escopo real de implementação desta feature é o *delta* entre o estado atual da
planilha de trabalho e o estado descrito no spec — não uma migração do zero.

**Rationale**: Rodar `pnpm vitest run` contra `Versão 2.0/Fase 2 - Arquitetura/Banco de
dados CIAARA-11 v2.0.xlsx` (14/08/2026) dá **42 passed / 3 failed / 13 todo** em 58 testes. As 13
`todo` são comportamento de código de épicos futuros (D/F/G — `lib/acoes/crud.ts`, `lib/acoes/cronograma.ts`,
`lib/dominio/motor-preditivo.ts`, `lib/dominio/regime-curso.ts`, ``lib/supabase/middleware.ts` + policies RLS`, `lib/acoes/dsa.ts`, per `docs/arquitetura/02-modularizacao.md`),
fora de escopo do Épico C. `docs/arquitetura/01-schema.md` (revisado 2026-08-11) já documenta o
roteiro de migração completo (seção 6) como **já executado**. Os 3 achados reais já estavam listados
em `CLAUDE.md` como pendências deixadas de propósito para "quando o Épico C for aberto de fato" —
que é agora.

**Alternatives considered**: Tratar a spec literalmente e reexecutar/redocumentar toda a
transformação como se fosse nova. Rejeitado — reescreveria trabalho já correto e já coberto por 42
testes verdes, violando o Princípio VI (mudança cirúrgica: só se muda o que precisa mudar) sem
nenhum ganho, e arriscaria introduzir regressão em algo que já funciona.

---

## Achado 1 — Vínculo órfão em `instrutor_disciplina`

**Decision**: A linha `VIN-000419` (`ID_Instrutor=86`, `ID_Grade="40 - C-Ap-FR - XVII"`,
`Status=Inativo`) tem seu `ID_Grade` esvaziado e o valor bruto preservado em
`ID_Grade_Legado_v1` (nova coluna, `C-07`). O vínculo permanece no banco (nunca apagado, `C-05`),
permanece `Inativo`, e a correção é registrada como uma nova linha em `migracao_log`
(`Acao = Corrigido`).

**Rationale**: `"40 - C-Ap-FR - XVII"` não corresponde a nenhuma linha de `disciplinas` — o
curso `C-Ap-FR` vai de `ID_Disciplina` 40 (`Cod_Disciplina = "X"`) a 53 (`"XIII"`), sem nenhum
`"XVII"`, e com um buraco em `ID_Disciplina = 41` (a duplicata incompleta do achado (a) do
documento 05, corretamente descartada na migração, nunca teve equivalente em v2.0). O vínculo já
estava `Inativo` antes desta correção — ou seja, alguém já havia identificado e neutralizado o
problema no nível de negócio; falta só o saneamento físico da FK. Não existe, nos dados
disponíveis, nenhuma base para inferir com confiança qual disciplina real esse vínculo deveria
referenciar — fabricar um destino plausível violaria o Princípio V (nunca inventar dado) e o
Princípio IV (nunca destruir a evidência do que a origem realmente continha).

**Alternatives considered**:
- *Apontar para a disciplina mais parecida por nome/curso*: rejeitado — não há candidato razoável
  (nenhuma disciplina "XVII" existe em curso algum da base), e adivinhar violaria a proibição de
  dado fabricado.
- *Apagar a linha*: rejeitado — viola `C-05`/Princípio IV (nenhuma linha é removida de fato).
- *Deixar como está e apenas marcar o teste como `todo`*: rejeitado — o vínculo já é `Inativo`
  (não afeta nenhuma habilitação ativa), então a FK pendurada é puramente um problema de
  integridade física sanável sem risco, sem motivo para adiar.

**Ajuste de teste necessário**: `tests/unidade/reconciliacao_migracao.test.ts`, checagem
`instrutor_disciplina.ID_Grade -> disciplinas.ID_Grade`, precisa tratar `ID_Grade` vazio como
FK opcional-vazia-não-é-órfã (mesmo padrão já usado para `atividades_nao_letivas.ID_Turma` com
`Escopo=Global`) — comportamento que a função `checagens` do teste já suporta nativamente (linha
`if (v === null || v === undefined || v === "") continue;`), então nenhuma mudança de lógica de
teste é necessária, só a correção do dado.

---

## Achado 2 — `Posto_Graduacao` fora da escala RN-ANT-02

**Decision**: Duas correções distintas, uma mecânica e uma de extensão de regra:

1. **Símbolo de grau → indicador ordinal** (2 linhas, `ID_Instrutor` com `"2°SG"`/`"1°SG"`):
   normalizar `U+00B0` (SÍMBOLO DE GRAU) para `U+00BA` (INDICADOR ORDINAL MASCULINO), igual às
   outras 179 linhas. Correção mecânica, sem ambiguidade.
2. **`"SC"` (6 linhas, `ID_Instrutor` 17–22, todas `Categoria = "SCNS"`, `Nome_Guerra` em branco)**:
   por decisão do responsável (esclarecimento de 2026-08-14), `"SC"` é uma categoria civil, e a
   escala RN-ANT-02 é **estendida** com um degrau adicional — peso **13** (após `MN`, o mais
   antigo º/menor peso). Instrutores civis entram na ordenação crescente por antiguidade (RN-ANT-01
   não abre exceção — "sem exceção" é explícito no texto da regra), sempre por último entre postos
   militares.

**Rationale**: A correção 1 é idêntica em natureza ao achado (g) do documento 05 (fragilidade a
variação de grafia) — sem decisão de negócio envolvida. A correção 2 depende de uma informação que
nenhum documento de Fase 1 contém (a escala RN-ANT-02 nunca cogitou pessoal civil); resolvida com o
responsável em vez de assumida — Princípio I.

**Alternatives considered**: manter `"SC"` fora da ordenação (opção B apresentada) — rejeitada pelo
responsável, que preferiu manter RN-ANT-01 sem exceção. Tratar como erro de dado a investigar depois
(opção C) — rejeitada, pois adiaria sem necessidade uma decisão que já foi possível tomar com a
informação disponível (`Categoria = "SCNS"` uniforme nas 6 linhas confirma que não é um erro de
digitação aleatório).

**Ajuste de teste necessário**: `tests/unidade/regras_de_negocio.test.ts`, `PESO_POR_PG`, ganha a entrada
`SC: 13`. Comentário no teste deve registrar a origem da decisão (esclarecimento 2026-08-14) para
não parecer uma inferência silenciosa a quem ler o código depois.

**Follow-up de documentação (fora desta feature, não bloqueia)**: `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`
(RN-ANT-02) é um documento de Fase 1 validado — a extensão do peso para civis deveria, no rigor do
processo, ganhar uma nota datada ali também (mesmo padrão usado para `RN-INST-05`, `RN-AVAL-02`
etc.). Não é feito nesta migração de dado; fica registrado aqui como pendência de documentação a
levar ao responsável separadamente.

---

## Achado 3 — Terceiro formato de ID (`AVL-MNNNNN` / `EVT-MNNNNN`)

**Decision**: Renumerar as 77 linhas `AVL-M00001`..`AVL-M00077` de `avaliacoes` e a 1 linha
`EVT-M00001` de `atividades_nao_letivas` para o padrão único já documentado em RN-CRUD-03,
continuando a sequência existente (`AVA-####`/`EXT-####` — os prefixos reais em uso, 4 dígitos,
ver achado informativo já existente sobre largura de zero-padding). `arquivo_avaliacoes_v1.ID_Avaliacao_Destino`
é atualizado em conjunto para as 77 linhas afetadas, preservando a correspondência com a quarentena.
Cada renumeração gera uma linha nova em `migracao_log` (`Acao = Corrigido`, `Valor_Antes`/`Valor_Depois`).

**Rationale**: RN-CRUD-03 é explícita — **dois** padrões de ID, e só dois, "devem ser preservados
exatamente como estão"; introduzir um terceiro sem decisão formal quebra essa regra de Risco Alto.
O prefixo `M` foi usado durante a migração para marcar "linha criada pela própria migração"
(`Conciliacao_Migracao = Execucao_Orfa` / evento movido de `registros_aula`), mas essa
informação **já está capturada sem redundância** em `Origem_Execucao_v1`/`Origem_Migracao_v1` — o
prefixo no ID é supérfluo como marca de proveniência e só existe porque nada mais referencia esses
77+1 IDs ainda (foram criados pela própria migração, não herdados de sistema algum), então
renumerá-los agora, antes de qualquer referência externa existir, tem custo zero e nenhum risco de
quebrar link (ao contrário do texto de RN-CRUD-02: "unificar os dois padrões quebraria referências
existentes" — aqui não há referência existente a preservar, só a própria quarentena, que é
atualizada junto).

**Alternatives considered**: Documentar `AVL-M`/`EVT-M` como um terceiro padrão legítimo (emendar
RN-CRUD-03). Rejeitado — cria uma exceção permanente para resolver um problema que é, na origem,
transitório (marcar proveniência de migração), quando a coluna dedicada para isso já existe e já é
usada; manter os dois haveria redundância sem benefício.

**Ajuste de teste necessário**: nenhum — `tests/unidade/regras_de_negocio.test.ts` já espera exatamente o
padrão `PREFIXO-dígitos` que a renumeração produz; o teste passa a verde sem alteração de lógica,
só pela correção do dado.

---

## Reprodutibilidade da migração já aplicada

**Decision**: Os 3 scripts novos (achados 1–3) seguem o padrão de
`migracao/renomear_materia_para_disciplina.py`: docstring explicando escopo exato, backup do
`.xlsx` como arquivo irmão antes de escrever, leitura/escrita direta via `openpyxl`, e gravação de
novas linhas em `migracao_log` — nunca reescrita de linha existente. Cada script é idempotente
(reexecutar contra um arquivo já corrigido não duplica a correção nem falha).

**Rationale**: É o único padrão de migração já estabelecido e validado no repositório; inventar um
segundo padrão (por exemplo, um script único "faz tudo") contrariaria o Princípio VI (unidades
pequenas, testáveis isoladamente, um commit por mudança) sem necessidade — os 3 achados são
independentes entre si e não têm ordem de dependência.

**Alternatives considered**: Um único script `corrigir_achados_migracao.py` cobrindo os três.
Rejeitado — misturaria três mudanças conceitualmente independentes num commit só, dificultando
reverter uma sem reverter as outras, e quebraria o padrão de nomeação descritiva já em uso.

**Nota sobre o backlog de reprodutibilidade mais amplo.** O roteiro completo do documento
`01-schema.md` §6 (desdobramento de `cursos`, fusão de `avaliacoes`, recategorização de
`atividades_nao_letivas` etc.) também não tem script versionado — só o resultado já aplicado ao
`.xlsx`. Reconstituir esse histórico inteiro como scripts retroativos está **fora do escopo desta
feature**: nenhuma FR do spec pede isso, e fazê-lo sem necessidade duplicaria trabalho já correto e
já coberto por 42 testes verdes (mesmo raciocínio do achado de escopo, acima). Registrado aqui para
não ser esquecido caso um saneamento futuro precise reexecutar a migração do zero (ex.: se a
planilha de trabalho for perdida e for necessário partir do snapshot V1.0 outra vez).
