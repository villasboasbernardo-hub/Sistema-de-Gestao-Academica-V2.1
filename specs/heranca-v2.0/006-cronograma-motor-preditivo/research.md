# Research — Épico G: Cronograma Unificado e Motor Preditivo Multi-Ano

Nenhum `NEEDS CLARIFICATION` restou no Technical Context do `plan.md`. Este documento registra as
decisões técnicas concretas encontradas ao ler a implementação real da V1.0
(`Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)`) antes de portar/generalizar qualquer função — "portar", não "reescrever do
zero", é a diretriz (RF-MOD-02/03), mas dois pontos exigiram correção deliberada em vez de cópia
literal (achados 3 e 5 abaixo).

## Achado 1 — A V1.0 já quase satisfaz RN-DIST-01, só com nomes enganosos

`distribuicaoSemanalMateria_` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):1550`) já é usada tanto pelo Diagrama de Alocação
do ano corrente quanto pela geração do motor 2027 — e já chama `ehTfm27_`/`ehSemTetoSemanal27_`/
`limiteSemanalMateria27_` (linhas 1573-1575) mesmo quando calculando o diagrama do **ano corrente**,
não só do motor. A regra RN-DIST-01 ("função compartilhada, nunca duplicada") já é respeitada na
prática — o problema é só o sufixo `27` nos três helpers, que sugere (incorretamente) que são
exclusivos do motor preditivo.

**Decisão**: portar `distribuicaoSemanalMateria_` para `lib/acoes/cronograma.ts` com o algoritmo idêntico
(RN-DIST-02: última semana absorve o resto; RN-DIST-03: TFM rígido 6/semana, fim de curso sem teto,
demais 25/semana recomendado), renomeando os três helpers para `ehTfm_`/`ehSemTetoSemanal_`/
`limiteSemanalMateria_` (sem sufixo) — usados por `getCronograma` (visão corrente) e por
`lib/dominio/motor-preditivo.ts` (simulação futura) igualmente, um único import de `lib/acoes/cronograma.ts`.

## Achado 2 — `gravarPlanejamento2027_` recria uma aba do zero; `planejamento_anual` exige acréscimo

`gravarPlanejamento2027_` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):2588`) deleta e recria inteira a tabela `Planejamento_2027`
a cada execução — implementação literal de RN-2027-07 (revertida). O schema V2.0 já reflete a
reversão: `planejamento_anual` é versionado (`Ano_Letivo`+`Versao`, `01-schema.md` §4.1), nunca
recriado.

**Decisão**: a função de gravação em `lib/dominio/motor-preditivo.ts` (`gerarPlanejamento(ano)`) calcula
`Versao = MAX(Versao WHERE Ano_Letivo = ano) + 1` (1 se não houver nenhuma), grava todas as linhas
com `Status_Previa = 'Rascunho'`, `Origem_Linha = 'Motor'`, `Tempos_Alocados = Tempos_Alocados_Motor`
— nunca deleta linhas de versões anteriores. `salvarPlanejamento(ano, versao)` (nova) promove essa
versão para `Salvo` e, na mesma operação, rebaixa a versão que estava `Salvo` (se houver) para
`Arquivado` — nunca duas versões `Salvo` do mesmo ano simultaneamente (invariante do schema).

## Achado 3 — Correção obrigatória: `escolherInstrutor27_` usa o número do regime, não a faixa (RN-2027-06)

`escolherInstrutor27_` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):2567`) calcula `limiteSemanal` a partir de uma regex
`/20h/i` sobre o texto do regime (`instrPorId[id].limiteSemanal = /20h/i.test(...) ? 20 : 40`) —
exatamente o bug que a correção de RN-2027-06 (documento 04, aplicada em 01/08/2026) documenta e
substitui: o número do regime (20h/40h) não é o teto de aula, é o vínculo; o teto real é a **faixa**
de horas de aula por regime (20h→8–12h; 40h→16–24h; Dedicação Exclusiva→16–30h, DGPM-103). Portar o
código da V1.0 literalmente reintroduziria um bug já corrigido na especificação — mesmo padrão do
que aconteceu com `registrarAvaliacao()` no Épico I (RN-AVAL-02).

**Decisão**: `lib/dominio/motor-preditivo.ts` implementa a escolha de instrutor com a faixa correta por regime
(usar o **teto superior** da faixa como `limiteSemanal` — 12/24/30 — mantendo a mesma lógica de
"menor carga já alocada, com fallback para o menos sobrecarregado + alerta" da V1.0, só trocando o
valor do limite). Teste `RN-2027-06` (já `test.todo`) deve cobrir explicitamente as 3 faixas e o
caso de sobrecarga com alerta.

## Achado 4 — Constantes de calendário têm equivalente direto nas tabelas já migradas

| Constante V1.0 (``lib/` (monólito da v1.0, hoje dividido por domínio)`) | Tabela V2.0 (já populada, Épico C) | Observação |
|---|---|---|
| `SEMENTES_2027` (array fixo de janelas por curso) | `janelas_curso` filtrada por `Ano` | Campos `ID_Curso`/`Turma_Prevista`/`Data_Inicio_Prevista`/`Data_Termino_Prevista` já mapeiam 1:1 aos campos usados em `semente.idCurso`/`.turma`/`.ini`/`.fim` |
| `FERIADOS_2027` (objeto `{iso: nome}`) | `feriados` filtrada por `Ano` + `Impacto = 'Dia_Inteiro'` (RN-EVT-02 — impacto Parcial/Informativo não desconta nada) | |
| `RESERVAS_PROENS` (objeto por `idCurso`, chave `'_default'` para o genérico) | `reservas_proens` filtrada por `Ano` + `Tipo_Reserva` (`TAD`/`TR`); **o sentinel genérico já migrado é `ID_Curso = 'GERAL'`** (`migracao/popular_calendario_reservas.py`, 2 linhas `GERAL` já gravadas na banco de produção) | Confirmado no script de migração real, não é uma suposição |

**Decisão**: `lib/dominio/motor-preditivo.ts` lê as 3 tabelas via `lerAbaComoObjetos_` uma vez por execução de
`gerarPlanejamento(ano)`, monta os mesmos formatos de mapa em memória que a V1.0 já usava
(`reservas = mapaPorCurso[idCurso] || mapaPorCurso['GERAL']`), preservando o resto do algoritmo de
alocação inalterado.

## Achado 5 — Correção obrigatória: `espelharData2027_` tem o ano 2027 hardcoded, não parametrizado

`espelharData2027_` (V1.0, ``lib/` (monólito da v1.0, hoje dividido por domínio):2162`) cria `new Date(2027, d.getMonth(), 1)` literalmente —
generalizar para qualquer ano (RN-2027-01, FR-2027-01) exige um parâmetro `anoAlvo` explícito. O
algoritmo de "n-ésimo dia da semana do mês" em si (linhas 2164-2169) é correto e não muda.

**Decisão**: nova assinatura `espelharData_(isoOrigem, anoAlvo)` — todo call site (`construirCalendario_`,
o corpo principal de `gerarPlanejamento`) passa o ano solicitado pelo usuário, nunca um literal.

## Achado 6 — `getRegimeVigente` nunca foi escrito; contrato já existe

`docs/arquitetura/01-schema.md` §4.2 já define o contrato exato: `getRegimeVigente(ID_Curso, data,
tipo)` retorna a linha `Ativo` de `curso_regime_historico` com maior `Vigente_A_Partir_De` ≤
`data`, filtrada por `Tipo_Regime` (`Padrao`/`Excecao`). Nenhuma implementação existe hoje —
confirmado por grep em `; o achado (j) de `01-schema.md` §6.7 e o `test.todo`
`RN-2027-09` (`tests/unidade/pendentes.test.ts`) documentam isso como pendência explícita deste épico
(corrigido em `docs/arquitetura/02-modularizacao.md`, que atribuía isso ao Épico C por engano — ver
commit de correção 2026-08-15 anterior a este research).

**Decisão**: `lib/dominio/regime-curso.ts` implementa `getRegimeVigente` como função pura (recebe a lista de
regimes já lida, não lê o banco sozinha — mesmo padrão de `cursoDentroDoEscopoOperador_` em
`lib/dominio/regras-normativas.ts`, testável com casos sintéticos sem mock de planilha) mais um wrapper que lê
`curso_regime_historico` e chama a função pura. `lib/acoes/cronograma.ts`/`lib/dominio/motor-preditivo.ts` chamam
sempre com a **data do próprio registro/semana sendo calculado**, nunca com "hoje" — é isso que
impede a reinterpretação de registros passados (RN-2027-09).

## Achado 7 — Risco de tempo de execução do Next.js: já mitigado pelo precedente da V1.0

A V1.0 já executa `gerarPlanejamento2027()` de forma síncrona (um único `app/layout.tsx`/a Server Action)
para todo o catálogo de cursos do PROENS, sem paginação nem fila — e está em produção há tempo
suficiente para esse padrão ser considerado validado empiricamente dentro do limite de execução do
Next.js (~6 min). Generalizar o ano não muda a quantidade de trabalho por execução (mesmo número
de cursos/semanas), só a fonte dos dados de calendário (achado 4) — não há motivo para introduzir
processamento assíncrono/em lote que a V1.0 nunca precisou.

**Decisão**: manter a mesma execução síncrona de ponta a ponta; se o tempo real de execução crescer
de forma perceptível durante os testes de aceite (mais cursos cadastrados na V2.0 que na V1.0), lidar
com isso como um achado real no momento em que aparecer, não como uma otimização especulativa agora
(constitution — não adicionar complexidade sem necessidade comprovada).
