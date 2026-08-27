# Quickstart — Validação do Módulo de Instrutores

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel`).
- Acesso à aplicação Next.js publicada com um usuário Admin/Operador/Divisão de Administração Acadêmica
  (perfis com escrita no módulo, RF-INSTR-12) — os 4 User Stories desta spec exigem só leitura,
  exceto a tentativa de gravação de FR-012.
- A banco de produção `Banco de dados CIAARA-11 v2.0` tem, na data desta spec (2026-08-17): **177
  instrutores** (`instrutores`), **599 vínculos de habilitação** (`instrutor_disciplina`, 598
  `Ativo`/1 `Inativo`), **175 disciplinas** (`disciplinas`). Os números abaixo usam esse
  snapshot como referência — se a base tiver mudado, use os números reais do banco no momento do
  teste, não os fixos aqui.

## Passo 1 — `pnpm vitest run` (parte automatizável)

```
pnpm vitest run tests/unidade/*.test.ts
```

Esperado: baseline (195 testes/195 passam, ver histórico do Hotfix 013) mais os casos novos em
`tests/unidade/regras_ui_dados.test.ts`:

- `ordenarPorAntiguidadePosto_`: array com os 11 postos em ordem aleatória → devolve na ordem CMG,
  CF, CC, CT, 1ºTen, 2ºTen, SO, 1ºSG, 2ºSG, 3ºSG, SC, com nome por extenso; um posto desconhecido cai
  ao final, sem lançar exceção.
- `formatarNomeInstrutor_`: instrutor sem `Nome_Guerra` → nome completo sem negrito; instrutor com
  `Nome_Guerra` = "CAMPOS" dentro de "DANIEL DE OLIVEIRA CAMPOS BORGES" → só "CAMPOS" fica em
  `<strong>`.
- `contarHabilitadosDistintos_`/`contarSelecionadosDistintos_`: array sintético com `ID_Instrutor`
  repetido em `instrutor_disciplina`/CSV de `disciplinas.ID_Instrutor` → cada instrutor conta uma
  única vez.
- `somarCargaHorariaPorInstrutor_`: registros sintéticos de `registros_aula` com
  `Categoria_Normativa` mista (`Aula`/`Atividade_Extraclasse`) e `Status` mista (`Ativo`/`Cancelada`)
  → só `Aula`+não-cancelada do ano corrente entram na soma.

## Passo 2 — Dashboard e estatísticas (FR-001/002/003/004/005, manual)

1. Abrir "Instrutores" → "Estatísticas".
2. **Esperado**: 4 KPIs — Total (177), Com Capacitação Didática (29), Carga Horária Total Ministrada
   no Ano (soma real do ano corrente, nunca 0 fixo), Taxa de Seleção (aprox. 131 habilitados / 35
   selecionados, ou os números reais do momento).
3. **Esperado**: 7 gráficos — Habilitados×Selecionados, Classificação (4 categorias: Militares da
   Ativa, TTC, Civis, Magistério Militar Naval), Posto/Graduação, OM, Escolaridade, Regime de
   Trabalho, Capacitação Didática.
4. **Esperado**: o gráfico de Posto/Graduação aparece **exatamente** nesta ordem: Capitão de Mar e
   Guerra, Capitão de Fragata, Capitão de Corveta, Capitão-Tenente, Primeiro-Tenente,
   Segundo-Tenente, Suboficial, Primeiro-Sargento, Segundo-Sargento, Terceiro-Sargento, Servidor
   Civil — nunca em ordem alfabética.
5. **Esperado**: o gráfico de Capacitação Didática mostra barras separadas para `C-Exp-TE` (~10),
   `C-Esp-DID` (~9) e `Licenciatura` (~6) — um instrutor com mais de uma qualificação conta em cada
   barra correspondente.

## Passo 3 — Listagem, nome legível e filtros (FR-006/007/008/009, manual)

1. Na listagem de instrutores, escolher um instrutor cujo `Nome_Guerra` esteja vazio no banco
   (a grande maioria — 175 de 177).
2. **Esperado**: o campo Nome Completo mostra o nome inteiro, sem nenhuma palavra em negrito.
3. Localizar um instrutor com `Nome_Guerra` preenchido (ex.: os que tiverem "CAMPOS"/"JONATHAS" ou
   equivalente na base atual).
4. **Esperado**: só a palavra correspondente ao `Nome_Guerra` aparece em negrito dentro do nome.
5. **Esperado**: as colunas visíveis são exatamente Posto/Graduação, Nome Completo, Categoria, OM,
   Regime e Carga Horária Total no ano — sem coluna de status Ativo/Inativo.
6. Aplicar um filtro de OM (ex.: "CHM") junto com um filtro de Categoria (ex.: "Militar da Ativa").
7. **Esperado**: só instrutores que atendem aos dois filtros simultaneamente aparecem na lista.

## Passo 4 — Edição em nova aba, campos bloqueados (FR-010/010.1/011/012/013, manual)

1. Na listagem, clicar em "Editar" em qualquer instrutor.
2. **Esperado**: uma nova aba do navegador abre, já carregada diretamente na tela de edição daquele
   instrutor específico — sem precisar navegar manualmente até ele de novo.
3. **Esperado**: `ID_Instrutor` e Carga Horária Ministrada aparecem como texto simples, nunca dentro
   de um campo de formulário editável; os demais campos cadastrais (Nome Completo, Posto/Graduação,
   Categoria, OM, Regime, Escolaridade, Capacitação Didática etc.) aparecem em campos editáveis,
   organizados em blocos visuais distintos.
4. Editar um campo cadastral qualquer (ex.: `Email`) e salvar.
5. **Esperado**: a gravação funciona normalmente; `ID_Instrutor` e Carga Horária Ministrada
   permanecem com os mesmos valores de antes.
6. Abrir a aplicação Next.js diretamente com um `ID_Instrutor` inexistente no parâmetro de deep-link (ex.:
   `?editarInstrutor=ID-QUE-NAO-EXISTE`).
7. **Esperado**: mensagem de erro clara, nunca tela em branco nem dado de outro instrutor.

## Passo 5 — Vínculo de habilitação sem IDs (FR-014, manual)

1. Abrir o formulário de vínculo de habilitação.
2. **Esperado**: cada opção do dropdown de instrutor mostra "[Posto/Graduação] [Nome Completo]"
   (ex.: "SO ROSILVALDO FIGUEIRÓ PEREIRA") — nunca um `ID_Instrutor` numérico cru, mesmo para os 175
   instrutores sem `Nome_Guerra`.
3. **Esperado**: o dropdown de disciplina continua mostrando nome da disciplina + curso (já correto
   desde o Épico 009, fora de escopo desta spec).

## Fora do escopo desta validação

- Correção da fórmula quebrada `disciplinas.Instrutores_Selecionados` (`#ERROR!`) — contornada
  por leitura direta de `ID_Instrutor`, não corrigida na origem (Assumptions de `spec.md`).
- Inclusão de carga horária de `avaliacoes` (fiscal/aplicador) no cálculo de CH Ministrada
  (Assumptions de `spec.md`).
- Atualização formal do texto de `RN-ANT-02` em `docs/fase-1/04-Regras-de-Negocio-a-Preservar.md`
  (achado 3) — a implementação usa a escala revisada, mas o documento normativo em si é atualizado
  como tarefa de documentação, não como comportamento de sistema testável aqui.
