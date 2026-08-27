# Implementation Plan: Ficha de Cadastro de Instrutores e Formulário Avançado

**Branch**: `016-ficha-formulario-instrutores` | **Date**: 2026-08-17 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `specs/016-ficha-formulario-instrutores/spec.md`

## Summary

Substitui o cadastro de 3 campos e o painel de edição de campos planos (spec 014) por um único
formulário rico, reaproveitando a "nova aba" já em produção (`app/layout.tsx` (layout raiz)/`DEEP_LINK_EDITAR_INSTRUTOR`),
agora também usada para cadastro (novo parâmetro de deep-link). Resgata a Ficha imprimível da V1.0
como modal (`.area-impressao` já existente, com uma nova página nomeada de impressão em retrato).
Remove `instrutores.Ultima_Avaliacao_Desempenho` via script de migração (padrão já estabelecido,
`migracao/_util_migracao.py`). Dois achados técnicos descobertos só durante a pesquisa desta fase
(nenhum dos dois estava no pedido original nem na spec): (1) `ID_Instrutor` nunca foi auto-gerado —
`CRUD_CONFIG['instrutores'].prefixo` é `''`, e `gerarProximoId_` só sabe produzir o formato
`PREFIXO-NNNNNN`, incompatível com a decisão de `/speckit-clarify` (inteiro simples); resolvido com
uma função pura nova, sem tocar o motor genérico. (2) `crudAtualizar` **nunca** grava `Editado_Por`/
`Timestamp_Edicao` — só `crudExcluir` já fazia isso — violando C-02/C-06 do schema (auditoria padrão)
para toda entidade que usa o motor genérico, não só Instrutores; corrigido no motor genérico
(`crudAtualizar`), não com um hack isolado, porque é estritamente aditivo e nenhuma entidade depende
do comportamento antigo.

## Technical Context

**Language/Version**: TypeScript 5.x em modo `strict` — Next.js 15 (App Router) e React 19; SQL (PostgreSQL 16) nas migrations; Python 3.12 nos scripts de ETL.

**Primary Dependencies**: Nenhuma nova. Máscara de NIP e datepickers via HTML/JS nativo (`<input
type="date">`, já padrão desde a spec 014; máscara de NIP como handler `oninput` simples, sem
biblioteca). Ficha imprimível reaproveita `.area-impressao`/`@media print` (`app/globals.css`, Épico H)
e Tailwind CSS Modal (já em uso em toda a SPA).

**Storage**: Supabase PostgreSQL, com RLS em todas as tabelas — `instrutores` perde 1 coluna (`Ultima_Avaliacao_Desempenho`, FR-001);
nenhuma outra aba/coluna nova (achado 1 de `spec.md`). Migração via `migracao/remover_coluna_
ultima_avaliacao_desempenho.py`, mesmo padrão de backup+`migracao_log` de todos os scripts
anteriores.

**Testing**: Vitest para as funções puras de ` (uma asserção nomeada por regra `RN-` de Risco: Alto); pgTAP para os invariantes de banco e para o teste NEGATIVO de RLS por perfil; Playwright para o percurso principal e para a rota `/print/*`. Não regressão se prova por invariante, nunca por diff com a saída histórica de um curso (decisão de 2026-08-10).

**Target Platform**: Next.js (App Router) publicado na Vercel, com preview por branch; navegador desktop moderno (o sistema é de gestão, com tabelas densas — ver `RNF-USA-02`).

**Project Type**: Aplicação web Next.js com App Router. **Server Components por padrão**; `"use client"` apenas em componente-folha com interação. Sem SPA servida por template — o roteamento é do framework, e o estado de tela vive na URL.

**Performance Goals**: N/A — mesma ordem de grandeza já aceita nesta tela (177 instrutores, ~175
disciplinas, ~599 vínculos): toda validação/cálculo do formulário roda em memória, sem chamada de
rede por campo alterado (mesmo espírito de FR-014 da spec 015, embora esta spec não seja sobre
filtros).

**Constraints**: Zero coluna nova (só a remoção de FR-001); zero dependência JS nova; `ID_Instrutor`
mantém o formato de inteiro simples (Clarifications); nenhum dado histórico real de `Disciplinas_
Ministradas`/`Esp_Hab_Obs` é apagado ou substituído silenciosamente (FR-010/024, SC-004).

**Scale/Scope**: 5 arquivos de produção tocados — `app/(app)/instrutores/page.tsx` (reescrita do
painel de edição/cadastro, novo modal de Ficha), `lib/acoes/instrutores.ts` (geração de ID,
Antiguidade/Tempo no Setor calculados, escala de antiguidade revisada, normalização de `Esp_Hab_
Obs`), `lib/acoes/crud.ts` (`crudAtualizar` grava `Editado_Por`/`Timestamp_Edicao`), `lib/acoes/
`lib/supabase/server.ts`` (`gerarProximoIdSequencial_`, nova), `app/globals.css` (página nomeada de
impressão em retrato para a Ficha). 1 script de migração novo (`migracao/remover_coluna_ultima_
avaliacao_desempenho.py`). 1 atualização de documentação normativa (`docs/fase-1/04-Regras-de-
Negocio-a-Preservar.md`, RN-ANT-02 — 3ª revisão, achado 11 de `spec.md`).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Princípio I (Fidelidade à Fase 1)**: Implementa RF-INSTR-* já documentados (cadastro/edição
  completos, ficha imprimível — resgate de funcionalidade V1.0 explícita no documento 00). Revisa
  RN-ANT-02 pela 3ª vez (achado 11) — decisão do próprio responsável (pedido explícito dos pesos
  `AE/VA/CA=0`), documentada e não escondida, mesmo padrão de P-14/revisões anteriores. **PASSA**.
- **Princípio II (Preservação de Regras de Negócio)**: RN-INST-02 (aviso ao desativar) é
  explicitamente estendida, não enfraquecida — o aviso passa a valer também pelo novo caminho do
  formulário (Clarifications, FR-021). RN-CRUD-02 (colunas fórmula protegidas) continua intacta —
  `Editado_Por`/`Timestamp_Edicao` não estão em `COLUNAS_FORMULA`, e o novo stamping em
  `crudAtualizar` não toca nenhuma coluna já protegida. **PASSA**.
- **Princípio III (Restrição de Plataforma)**: Zero dependência nova; `<input type="date">`/checkbox/
  select nativos; máscara de NIP em JS puro. **PASSA**.
- **Princípio IV (Integridade do Histórico)**: A remoção de `Ultima_Avaliacao_Desempenho` (FR-001)
  segue o protocolo padrão (snapshot + `migracao_log`, mesmo com a coluna 100% vazia). `Disciplinas_
  Ministradas`/`Esp_Hab_Obs` legados nunca são apagados/sobrescritos (FR-010/024) — é o ponto de
  maior risco desta spec para este princípio, mitigado explicitamente. **PASSA**.
- **Princípio V (Degradação Segura)**: `Esp_Hab_Obs` legado não mapeável ao catálogo de 60 siglas
  vira alerta, nunca bloqueio (FR-024, Assumptions). Campo vazio na Ficha impressa mostra marcador
  neutro, nunca `undefined`/tela quebrada (FR-027). **PASSA**.
- **Princípio VI (Mudança Cirúrgica, Validada por Invariantes)**: A mudança em `crudAtualizar`
  (Summary acima) é a única que toca um motor genérico compartilhado por 9 entidades — mitigada por
  ser estritamente aditiva (só grava em colunas que já existem no cabeçalho da aba de destino;
  nenhuma aba sem essas colunas é afetada) e coberta por teste antes de qualquer outra mudança
  (research.md). **PASSA, com nota**.
- **Princípio VII (Configuração Sobre Constante)**: O catálogo de 60 siglas de `Esp_Hab_Obs` e a
  escala de antiguidade de 14 postos são taxonomias fechadas do domínio (mesmo critério já aceito
  para `ESCALA_ANTIGUIDADE_POSTO`/`CLASSIFICACOES_CURSO_FECHADAS`) — não são limite normativo nem
  dado anual do PROENS. **PASSA**.
- **Princípio VIII (Rastreabilidade)**: Todo FR cita o achado que o motivou; a extensão de
  `crudAtualizar` e a nova função de geração de ID são documentadas com o raciocínio completo em
  research.md, não silenciosamente. **PASSA**.
- **Princípio IX (Contenção de Escopo)**: Escopo restrito aos 5 arquivos + 1 script listados; a
  correção de `crudAtualizar` (achado desta fase, não do pedido original) é aceita por ser um
  pré-requisito direto e estritamente aditivo de FR-011, não uma extensão de escopo por conta
  própria — sem ela, FR-011 seria falso em produção. **PASSA**.

Nenhuma violação bloqueante. 1 entrada em Complexity Tracking (mudança em `crudAtualizar`, motor
compartilhado — justificada, não uma exceção a esconder).

### Re-check pós-Fase 1 (após research.md/data-model.md/contracts/quickstart.md)

Nenhum gate mudou de veredito depois do desenho detalhado. Confirmações específicas:
- Princípio IV: `migracao/remover_coluna_ultima_avaliacao_desempenho.py` (research.md §9) segue
  exatamente o mecanismo de `_util_migracao.py` já validado 6 vezes — `quickstart.md` Passo 0 exige
  essa migração antes de qualquer outro teste, tornando a ordem de execução explícita e verificável.
- Princípio VI (nota acima): `contracts/server-functions.md` deixa explícito que a mudança em
  `crudAtualizar` é estritamente aditiva por coluna existente — nenhuma das 9 entidades que usam o
  motor genérico precisa de nenhuma mudança própria; `quickstart.md` Passo 1 cobre a mudança com teste
  automatizado (mock já existente, `criarPlanilhaFalsa`) antes de qualquer verificação manual.
- Princípio IX: o achado de `crudAtualizar` (Complexity Tracking) permanece a única exceção — nenhum
  outro arquivo além dos 5 + 1 script já listados em Scale/Scope foi necessário durante o desenho
  detalhado.

Nenhuma entrada nova em Complexity Tracking.

## Project Structure

### Documentation (this feature)

```text
specs/016-ficha-formulario-instrutores/
├── plan.md                     # Este arquivo (/speckit-plan)
├── research.md                 # Fase 0 (/speckit-plan)
├── data-model.md               # Fase 1 (/speckit-plan)
├── contracts/server-functions.md  # Fase 1 (/speckit-plan)
├── quickstart.md               # Fase 1 (/speckit-plan) — roteiro de verificação manual
├── checklists/requirements.md  # já criado no /speckit.specify
└── tasks.md                    # Fase 2 (/speckit-tasks — ainda não criado)
```

### Source Code (repository root)

```text
src/
├── backend/
│   ├── `lib/supabase/server.ts`              # gerarProximoIdSequencial_ (nova, funcao pura) - ID de instrutores
│   ├── `lib/acoes/crud.ts`               # crudAtualizar passa a gravar Editado_Por/Timestamp_Edicao quando
│   │                         # essas colunas existem no cabecalho (mesmo padrao de crudExcluir)
│   └── `lib/acoes/instrutores.ts`        # ESCALA_ANTIGUIDADE_POSTO ganha AE/VA/CA (peso 0); calcularAntiguidade_/
│                             # calcularTempoSetorAnos_/normalizarEspHabObs_ (novas, funcoes puras);
│                             # cadastrarInstrutor pre-calcula o proximo ID antes de crudCriar;
│                             # atualizarInstrutor dispara o mesmo aviso de RN-INST-02 (FR-021)
└── frontend/
    ├── `app/globals.css`        # pagina nomeada de impressao em retrato para a Ficha (research.md §7)
    └── `app/(app)/instrutores/page.tsx` # formulario unico (cadastro+edicao) na "nova aba" existente, com todos
                              # os tipos de campo pedidos; modal da Ficha imprimivel (novo); escalas
                              # de antiguidade/circulo hierarquico client-side ganham AE/VA/CA

migracao/
└── remover_coluna_ultima_avaliacao_desempenho.py   # novo, mesmo padrao de _util_migracao.py

docs/fase-1/
└── 04-Regras-de-Negocio-a-Preservar.md   # RN-ANT-02, 3a revisao (AE/VA/CA=0)

tests/
├── regras_de_negocio_backend.test.ts   # ganha describe novo: crudAtualizar grava Editado_Por/
│                                         # Timestamp_Edicao quando as colunas existem
└── ficha_formulario_instrutores.test.ts  # novo — gerarProximoIdSequencial_, calculo de Antiguidade/
                                            # Tempo no Setor, normalizacao de Esp_Hab_Obs, serializacao
                                            # da matriz de Preferencia
```

**Structure Decision**: Nenhuma view nova, nenhuma rota nova. O painel de edição existente
(`painelEdicaoInstrutor`, spec 014) é reescrito para servir cadastro e edição com o mesmo deep-link
mecanismo, evitando um segundo painel/rota só para "criar" — mesmo racional de Contenção de Escopo já
usado em specs anteriores deste módulo. A correção em `crudAtualizar` fica em `lib/acoes/crud.ts` (motor
genérico), não duplicada em `lib/acoes/instrutores.ts`, porque beneficia qualquer entidade futura que dependa
de C-06 sem exigir um mecanismo próprio.

## Complexity Tracking

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|---------------------------------------|
| `crudAtualizar` (`lib/acoes/crud.ts`, motor genérico compartilhado por 9 entidades) ganha stamping de `Editado_Por`/`Timestamp_Edicao` | FR-011 exige que esses 2 campos sejam preenchidos pelo backend a cada gravação — hoje `crudAtualizar` nunca os toca (achado desta fase, `crudExcluir` já faz isso desde a spec 003, `crudAtualizar` nunca ganhou o mesmo tratamento), violando C-06 do schema ("toda tabela de cadastro carrega ao menos `Editado_Por, Timestamp_Edicao`") para toda entidade que usa o motor, não só Instrutores | Um wrapper isolado só em `atualizarInstrutor` (`lib/acoes/instrutores.ts`), sem tocar `lib/acoes/crud.ts`: rejeitado — resolveria FR-011 mas deixaria as outras 8 entidades que usam `crudAtualizar` (`usuarios`, `disciplinas`, `instrutor_disciplina` etc.) continuando a violar C-06 sem necessidade, quando a correção no motor genérico é estritamente aditiva (só grava em colunas que já existem no cabeçalho de cada aba, nunca cria coluna, nunca quebra uma aba que não tenha essas 2 colunas) e não exige mecanismo novo |
