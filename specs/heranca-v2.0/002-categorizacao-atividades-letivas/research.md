# Research — Épico E: Categorização de Atividades Letivas

## Achado 1 — Fatia mínima da arquitetura modular, não monólito nem matriz completa

**Decision**: Este plano cria apenas o subconjunto de `docs/arquitetura/02-modularizacao.md` que as
5 User Stories do spec exigem para funcionar de ponta a ponta (listado no Project Structure do
`plan.md`) — não um monólito de transição (tipo V1.0), e não a matriz completa de 15+ arquivos que
o documento de arquitetura descreve como alvo final.

**Rationale**: ` e `app/` estão vazios — nenhum código de V2.0 existe ainda,
e nenhum épico anterior (C foi só dado) criou uma base para herdar. Duas leituras eram possíveis:
(a) portar o monólito inteiro de `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)`/`index.html` primeiro, adaptado para o
schema V2.0, e só modularizar de fato no Épico B; ou (b) escrever direto nos arquivos modulares que
`02-modularizacao.md` já define, só para o que este épico precisa. O próprio documento de
arquitetura resolve isso no seu parágrafo de abertura: existe "para que os épicos seguintes (C em
diante) tenham onde colocar cada função nova" — ou seja, a intenção documentada é que E já escreva
nos arquivos modulares, não num monólito temporário. A leitura (a) foi descartada. A frase do
documento 06 que justifica a ordem dos épicos — "Épico B... se beneficia de já partir de dados e
permissões limpos" — é sobre **dado** (Épico C) e **permissões** (Épico F) limpos, não sobre "app
já existir primeiro"; não contradiz a leitura (b).

**Alternatives considered**: Portar ``lib/` (monólito da v1.0, hoje dividido por domínio)`/`index.html` como monólito único adaptado ao schema
V2.0. Rejeitado — contrariaria a intenção documentada de `02-modularizacao.md`, criaria um arquivo
grande que o Épico B teria que desmontar de qualquer forma, e violaria o Princípio VI (mudança
cirúrgica, unidades pequenas) ao empacotar funcionalidade não pedida por este épico (RBAC completo,
motor preditivo, etc.) só para "ter um app funcionando".

**Consequência prática**: `lib/supabase/server.ts`, ``lib/supabase/middleware.ts` + policies RLS`, `lib/acoes/crud.ts` e ``app/layout.tsx` + `lib/supabase/server.ts`` — infraestrutura
genérica sem um épico "dono" único na tabela de `02-modularizacao.md` — precisam de uma versão
mínima criada por este plano (só as funções que `lib/acoes/aulas.ts`/`lib/acoes/avaliacoes.ts`/`lib/acoes/cronograma.ts`/`lib/acoes/dsa.ts`/
`lib/acoes/relatorio.ts` desta feature efetivamente chamam), documentada como tal no Project Structure. Épicos
futuros (F para RBAC ampliado, B para o CRUD genérico completo) estendem esses arquivos, não os
recriam.

---

## Achado 2 — Nível de alerta da ultrapassagem de teto

**Decision**: Ultrapassar um dos três tetos (AEC/TAD/TR) é um **Aviso Nível 2** do sistema de
alertas do Design System (`docs/arquitetura/03-design-system.md` §5) — banner amarelo no topo do
módulo, dispensável (botão "Ciente/Ignorar") — nunca Alerta Crítico Nível 3 (banner vermelho
persistente, ação bloqueada).

**Rationale**: RN-DEG-02 e RF-EXTRA-04/doc10 são explícitos que ultrapassar teto "gera alerta,
nunca bloqueio". O Design System já define exatamente essa semântica no Nível 2 ("dispensável...
quando a regra permitir flexibilidade temporária"), e reserva o Nível 3 explicitamente para "uma
regra RN- classificada Risco: Alto que foi violada" de um jeito que **bloqueia** a ação — o que
contradiria RN-DEG-02 se usado aqui. Nível 1 (notificação/toast, 5s) é curto demais para uma
condição que deve continuar visível enquanto o teto continuar ultrapassado.

**Alternatives considered**: Nível 3 (crítico). Rejeitado — bloquearia o lançamento, contrariando
RN-DEG-02 explicitamente. Nível 1 (toast). Rejeitado — desaparece em 5s, mas a condição "curso com
teto ultrapassado" é duradoura, não um evento pontual; o Operador precisa continuar vendo o aviso
ao voltar à tela do curso, não só no momento do lançamento.

---

## Achado 3 — CHD/CHR são totais curriculares, não "executado até a data"

**Decision**: O denominador dos três tetos (soma das CHD do curso para AEC; CHR para TAD/TR) é o
total **curricular/planejado** — soma de `disciplinas.Carga_Horaria_Tempos` do curso —, não uma
soma do que já foi lançado/executado até o momento do cálculo.

**Rationale**: Glossário DEnsM §2 define CHR como "somatório **estrito**/exclusivo das cargas
horárias de **todas as disciplinas integrantes do currículo**" — uma propriedade do currículo, fixa
para o curso, não uma métrica que cresce ao longo do ano conforme aulas são lançadas. Usar o
executado-até-agora como denominador faria o teto de AEC começar em 0% de base (permitindo
literalmente zero AEC) no início do curso e só "liberar" espaço conforme aulas fossem lançadas — um
comportamento operacionalmente absurdo e sem fundamento no texto normativo. Já registrado
diretamente em `spec.md`, FR-006, sem precisar de pergunta ao responsável (resolvido pelo próprio
Glossário).

**Alternatives considered**: Denominador = soma do executado (`registros_aula`/
`avaliacoes` já lançados, filtrados por curso). Rejeitado pela definição normativa acima.

---

## Achado 4 — Estratégia de teste sem banco de produção

**Decision**: Toda lógica de cálculo (validação de categoria, cálculo de percentual de teto,
agrupamento dos 5 totalizadores) é escrita como função pura — recebe dado já carregado como
parâmetro, devolve resultado, nunca chama o cliente Supabase diretamente — e ganha teste `pnpm vitest run`
imediatamente, sem esperar o banco V2.0 estar publicada. Só a camada fina de I/O
(`lerAbaComoObjetos_`, `crudCriar`, o próprio `app/layout.tsx`) fica sem teste automatizado nesta fase,
verificável apenas manualmente contra a banco de produção quando ela existir (`quickstart.md`).

**Rationale**: `docs/fase-1/10-Plano-de-Execucao-Spec-Kit.md` (linha 146) já recomenda esse padrão
("rodam em Node sem nenhuma adaptação... dá feedback em segundos em vez de exigir
colar-publicar-clicar"), e é a única forma de ter cobertura de teste real para as regras RN-EVT-01/
RN-EVT-03 (Risco Alto) **antes** do bloqueio operacional da banco de produção ser resolvido —
consistente com o Princípio II (verificação por invariante, não por clique manual).

**Alternatives considered**: Esperar a banco de produção existir para escrever qualquer teste.
Rejeitado — atrasaria toda a validação do épico por um bloqueio de infraestrutura que não depende
deste plano, e deixaria RN-EVT-01/RN-EVT-03 sem nenhuma rede de segurança automatizada até lá.

---

## Achado 5 — `registrarEventoExtracurricular`/`registrarAvaliacao`: adaptação, não reescrita

**Decision**: As duas funções são portadas de `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` (linhas 1006 e 914,
respectivamente), preservando a estrutura de validação existente, com estas mudanças pontuais:

- `registrarEventoExtracurricular`: `Tipo` (texto livre) vira `Subtipo` (texto livre, opcional) +
  `Categoria_Normativa` (obrigatório, `ENUM` fechado); `ID_Turma` obrigatório vira condicional a
  `Escopo = Turma` (se `Escopo = Global`, a função aplica o lançamento a todas as turmas ativas na
  data em vez de exigir uma turma); depois de `crudCriar`, chama `calcularTetoAEC_/TAD_/TR_` do
  curso afetado e devolve o resultado do cálculo junto com o registro criado, para o frontend
  decidir se mostra o Aviso Nível 2.
- `registrarAvaliacao`: ganha os campos `Tempos_Consumidos`/`TA_Inicial` (já no schema do Épico C)
  como obrigatórios, e o cômputo de CHD passa a ser automático no mesmo ato (RN-EVT-03) — não requer
  mudança na validação de turma/matéria/instrutor já existente, só adiciona o efeito colateral de
  now contar para a CHD.

**Rationale**: `docs/arquitetura/02-modularizacao.md` afirma explicitamente que toda função listada
"é a função já existente e funcionando na V1.0... reagrupada por domínio — não é uma reescrita", e
RF-MOD-02 exige que nomes de função referenciados pelo front-end sejam preservados. Reescrever do
zero ignoraria validação já testada em produção (ex.: checagem de habilitação do instrutor,
correspondência turma↔curso).

**Alternatives considered**: Reescrever as funções do zero a partir só do spec. Rejeitado — motivo
acima; risco desnecessário de perder validação implícita que só existe hoje em produção.
