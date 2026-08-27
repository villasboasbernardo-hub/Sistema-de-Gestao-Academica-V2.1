# Quickstart — Validação do Hotfix de Filtros/Cross-Filtering/Terminologia (Módulo de Instrutores)

## Pré-requisitos

- Implantação via `o fluxo Git → Vercel` já feita (`o histórico de deploys da Vercel`).
- Acesso à aplicação Next.js publicada com qualquer perfil de leitura do módulo de Instrutores (todos os User
  Stories desta spec são só-leitura — nenhum FR desta spec toca gravação).
- A banco de produção `Banco de dados CIAARA-11 v2.0` tem, na data desta spec (2026-08-17): **177
  instrutores** (`instrutores`), **599 vínculos** (`instrutor_disciplina`, 598 `Ativo`/1 `Inativo` —
  número confirmado no quickstart da spec 014, mesmo dia), **~175 disciplinas** (`disciplinas`),
  **~24 cursos** (`cursos`). Se a base tiver mudado, use os números reais no momento do teste.
- Abrir o DevTools do navegador (aba Rede/Network) antes de começar — vários passos abaixo pedem para
  confirmar **ausência** de requisição de rede nova.

## Passo 1 — `pnpm vitest run` (parte automatizável)

```
pnpm vitest run tests/unidade/*.test.ts
```

Esperado: baseline (213 testes/213 passam, ver histórico do Hotfix Módulo de Instrutores) mais os
casos novos em `tests/unidade/filtros_cross_instrutores.test.ts`:

- `enriquecerInstrutoresParaFiltros_`: instrutor com vínculo `Status=Ativo` em `instrutor_disciplina`
  mas **sem** aparecer em nenhum `disciplinas.ID_Instrutor` → `_qualificado=true`,
  `_selecionado=false`; o inverso também testado (10 casos reais do achado 5 da spec 014, com dado
  sintético equivalente). `Posto_Graduacao='CMG'` → `_circuloHierarquico='Oficiais'`;
  `Posto_Graduacao='SC'` → `_circuloHierarquico=''`. `_cursosVinculados` inclui o `ID_Curso` de uma
  disciplina só-qualificada e o de outra só-selecionada (união, FR-005).
- `instrutorPassaNosFiltros_`: 2+ filtros ativos simultaneamente → só passa quem atende a todos (E
  lógico, FR-013); filtro `status='Qualificados'` e `status='Selecionados'` aplicados separadamente
  ao mesmo instrutor "selecionado sem qualificação" → resultados diferentes, nenhum dos dois força o
  outro (Edge Case de `spec.md`).
- `agregarEstatisticasInstrutores_`: subconjunto filtrado sintético → KPIs e as 7 séries batem com
  contagem manual do mesmo subconjunto; subconjunto vazio → todos os KPIs zerados, séries vazias, sem
  lançar exceção (FR-018).

## Passo 2 — Ausência de chamada de rede por filtro (FR-014/SC-005, manual)

1. Abrir "Instrutores", aguardar o carregamento inicial completo (listagem + formulários populados).
2. Limpar a aba Rede do DevTools.
3. Alterar 3 ou 4 filtros da barra em sequência, incluindo trocar de volta para "Todos" em algum
   deles.
4. **Esperado**: nenhuma nova requisição aparece na aba Rede durante o passo 3 — só o carregamento
   inicial do passo 1 gerou tráfego.

## Passo 3 — Barra com as 8 categorias exigidas (FR-004 a FR-012, manual)

1. Observar a barra de filtros no topo da listagem.
2. **Esperado**: exatamente 8 caixas de seleção, nesta cobertura: Curso, Classificação de Curso,
   Status, Posto/Graduação, Círculo Hierárquico, Categoria, OM, Capacitação Didática — nem
   Regime de Trabalho nem Escolaridade aparecem mais como filtro (continuam como estavam em outros
   lugares: Regime como coluna da listagem).
3. Abrir o filtro Status: opções são exatamente "Qualificados", "Selecionados", "Inativos".
4. Abrir o filtro Círculo Hierárquico: opções são exatamente "Oficiais", "Praças".
5. Abrir o filtro Capacitação Didática: opções incluem "C-Exp-TE", "C-Esp-DID", "Licenciatura" e
   "Sem capacitação didática".
6. Abrir o filtro Classificação de Curso: opções são as 5 classificações reais (Curso Regular, Curso
   Especial, Curso Expedito, Curso de Aperfeiçoamento Avançado, Estágio de Qualificação).

## Passo 4 — Motor de cross-filtering (FR-015/016/017/018, "o mais crítico", manual)

1. Expandir o painel de Estatísticas. Anotar o KPI "Total de Instrutores" (deve ser 177 ou o total
   real do momento).
2. Selecionar "Oficiais" no filtro Círculo Hierárquico.
3. **Esperado, no mesmo instante**: o KPI Total muda para um número menor; a listagem mostra só
   instrutores com posto de oficial; os 7 gráficos mudam — em especial, os gráficos de OM e
   Capacitação Didática mostram uma distribuição diferente da inicial (critério de aceite literal do
   pedido original, SC-004).
4. Limpar o filtro Círculo Hierárquico (voltar para "Todos"). **Esperado**: tudo volta ao estado
   inicial do passo 1, sem precisar recarregar a página.
5. Recolher o painel de Estatísticas (sem limpar nenhum filtro). Aplicar um novo filtro (ex.: uma OM
   específica). Expandir o painel de Estatísticas de novo.
6. **Esperado**: o painel já nasce mostrando os dados filtrados pela OM escolhida — nunca o total
   geral seguido de uma correção visível.
7. Aplicar uma combinação de filtros que não deve retornar nenhum instrutor (ex.: uma OM que só tenha
   Praças + Círculo Hierárquico "Oficiais").
8. **Esperado**: a listagem mostra "Nenhum instrutor encontrado com esses filtros"; os 4 KPIs mostram
   "0"; os 7 gráficos aparecem vazios, sem travar nem mostrar dado antigo.

## Passo 5 — Filtro Curso (FR-005, manual)

1. Escolher, no banco `disciplinas`, um curso com pelo menos um instrutor qualificado e um
   selecionado sem qualificação (ou dois cursos diferentes, se não houver um caso combinado).
2. No filtro Curso, selecionar esse curso.
3. **Esperado**: a listagem mostra tanto os instrutores qualificados quanto os selecionados para
   aquele curso (união, não interseção) — confirmar contra a banco de produção.
4. No filtro Classificação de Curso, selecionar a classificação do mesmo curso.
5. **Esperado**: mesmo resultado do passo 3 (todo instrutor vinculado a algum curso daquela
   classificação).

## Passo 6 — Terminologia "qualificado" (FR-001/002/003, manual)

1. Percorrer a tela completa (dashboard, listagem, formulário de vínculo, tela de edição) procurando
   a palavra "habilitado" em qualquer forma.
2. **Esperado**: zero ocorrências. Especificamente: título "Vínculo de qualificação" (não
   "habilitação"); botão "Qualificar" (não "Habilitar"); mensagem de sucesso "Vínculo de qualificação
   criado."; KPI/gráfico usam "Qualificados" (não "Habilitados"); campo `Esp_Hab_Obs` na tela de
   edição rotulado "Especialidade/Qualificação".
3. **Esperado**: os valores numéricos de "Qualificados" são idênticos aos que "Habilitados" mostrava
   antes desta spec — é troca de rótulo, não de cálculo (comparar com o snapshot do Passo 1 do
   quickstart da spec 014, se disponível, ou com contagem manual de `instrutor_disciplina.Status=
   Ativo`).

## Passo 7 — Formulários permanecem independentes dos filtros (FR-019, Clarifications 2026-08-17, manual)

1. Aplicar um filtro restritivo (ex.: uma OM específica com poucos instrutores).
2. Abrir o dropdown de instrutor do formulário "Vínculo de qualificação".
3. **Esperado**: o dropdown continua listando todos os 177 instrutores ativos, não só os da OM
   filtrada.
4. Verificar o formulário "Cadastrar instrutor".
5. **Esperado**: nenhum campo/comportamento desse formulário muda com o filtro ativo.

## Fora do escopo desta validação

- Correção da fórmula quebrada `disciplinas.Instrutores_Selecionados` — continua contornada por
  leitura direta de `ID_Instrutor`, não corrigida na origem (herdado da spec 014, inalterado aqui).
- Harmonização do rótulo "Servidor Civil"/"Militar da Ativa" (filtro Categoria, FR-010) com "Civis"/
  "Militares da Ativa" (gráfico "Classificação", já existente) — divergência aceita, ver Assumptions
  de `spec.md`.
- Qualquer mudança na tela de edição de instrutor (US3/US4 da spec 014) — fora de escopo, não tocada
  por esta spec.
