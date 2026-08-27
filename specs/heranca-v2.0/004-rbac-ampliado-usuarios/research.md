# Research — Épico F: RBAC Ampliado e Gestão de Usuários

Sem `[NEEDS CLARIFICATION]` remanescente no Technical Context. Os achados abaixo são de
arquitetura/escopo, no mesmo formato dos épicos anteriores.

## Achado 0 — Domínio canônico dos 9 perfis (valores literais)

**Decisão**: `usuarios.Perfil` usa os 9 valores ASCII/Snake_Case abaixo, definidos por este plano
(nenhuma migração ainda os fixou — Épico C só criou a coluna, `git grep` em `migracao/*.py`
confirma que nenhum script popula `Perfil` com um domínio específico):

```
Admin, Chefe_Departamento_Ensino, Encarregado_Divisao_Administracao_Academica,
Ajudante_Divisao_Administracao_Academica, Encarregado_Divisao_Orientacao_Educacional_Pedagogica,
Ajudante_Divisao_Orientacao_Educacional_Pedagogica, Operador, Encarregado_Curso, Visualizacao
```

**Racional**: mesmo padrão ASCII/Snake_Case já usado nos outros ENUMs do schema V2.0
(`Estagio_Qualificacao`, `EAD_Semipresencial`, C-01). Os nomes seguem o vocabulário exato do
documento 01 §2.2 (inclusive "Encarregado de Curso", já renomeado de "Coordenador de Curso" pela
proposta P-13). `Ajudante_*` fica como valor próprio, distinto de `Encarregado_*`, mesmo com
permissão idêntica — a distinção é hierárquica (documento 01 §2.3), preservada para rastreabilidade
e para o caso de uma futura regra diferenciar os dois.

**Alternativas consideradas**: nomes mais curtos/abreviados (rejeitado — o projeto já usa nomes
longos e explícitos em ENUMs quando a alternativa curta seria ambígua, ex.
`Estagio_Qualificacao` em vez de `Estagio`).

## Achado 1 — `CRUD_CONFIG` precisa de `leitura` além de `escrita`; `crudListar` ignora a config

**Decisão**: `CRUD_CONFIG[aba]` ganha um segundo campo, `leitura` (lista de perfis autorizados a
`crudListar`), ao lado do `escrita` já existente. `crudListar` passa a chamar
`exigirFuncao(cfg.leitura)` em vez do `['Admin', 'Operador']` hardcoded hoje.

**Racional**: hoje `crudListar` (`lib/acoes/crud.ts`) ignora completamente `CRUD_CONFIG` para controle de
acesso — usa um literal fixo, o mesmo problema que bloqueia `getContextoInicial`/
`getPainelavaliacoesCurso`/`getCronos`/`getDsaSemanal`/`getRelatorio` para 7 dos 9 perfis. Como
RN-CRUD-01 já estabelece que o motor genérico é "orientado pelo cabeçalho real... sem exigir
alteração de código", faz sentido que a autorização também seja dirigida por config, não por
literal espalhado — mesmo espírito, aplicado a controle de acesso.

**Alternativas consideradas**: manter `crudListar` com o literal fixo e resolver só via
`getContextoInicial`/telas (rejeitado — `crudListar` é chamada diretamente por `app/(app)/admin/usuarios/page.tsx`/
`app/(app)/instrutores/page.tsx` desta feature; deixá-la fixa em `['Admin','Operador']` bloquearia a própria
tela de gestão de usuários para qualquer perfil que não seja esses dois, incluindo o próprio fluxo
de leitura da lista de instrutores por um Operador).

## Achado 2 — `crudAtualizar` genérico já existe em V1.0, nunca foi portado

**Decisão**: portar `crudAtualizar(nomeAba, id, obj)` de `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linha 694 para
`lib/acoes/crud.ts` — localiza a linha pelo valor da primeira coluna (`ID`), escreve só os campos presentes
em `obj`, nunca sobrescreve o próprio ID nem colunas de fórmula (mesmo padrão de `crudCriar`).

**Racional**: V1.0 já resolveu exatamente este problema, para as mesmas abas que este épico
precisa editar (`usuarios`, `instrutores`) — `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` linhas 63-77 mostra
`CRUD_CONFIG` cobrindo `usuarios`/`instrutores`/`Instrutor_Materia` de forma genérica desde
sempre, sem nenhuma função bespoke de edição. O Épico I já havia decidido **não** criar um
`crudAtualizar` genérico (research.md do Épico I, achado 2) porque as duas escritas por linha
existente daquele épico (`aplicarAvaliacaoNoDsa`, `registrarVistaProva`) tinham validação própria
demais para valer a pena um genérico — mas agora há um precedente direto em V1.0 mostrando que,
para edição simples de cadastro (sem regra de negócio further além de "só o perfil certo pode
escrever"), o genérico é exatamente a ferramenta certa, e evita reescrever a mesma busca-por-ID
três vezes (`usuarios`, `instrutores`, e qualquer aba futura).

**Alternativas consideradas**: funções bespoke `atualizarUsuario_`/`atualizarInstrutor_` cada uma
com sua própria busca de linha (rejeitado — duplicaria exatamente o código que V1.0 já
generalizou, sem nenhum ganho de clareza).

## Achado 3 — Cadastro de instrutor/usuário é configuração, não port de lógica de negócio

**Decisão**: `lib/acoes/usuarios.ts`/`lib/acoes/instrutores.ts` (novos) são wrappers finos sobre `crudCriar`/
`crudAtualizar`/`crudExcluir` — a única lógica de negócio própria é a validação de e-mail
duplicado (`cadastrarUsuario`) e a checagem de que `instrutor_disciplina` referencia um `ID_Grade`
existente (`criarVinculoHabilitacao`).

**Racional**: `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` não tem nenhuma função `cadastrarInstrutor`/
`cadastrarUsuario`/`editarInstrutor` — só duas exceções especiais,
`excluirInstrutorComVinculos`/`reativarInstrutor` (linhas 1458-1486), que faziam cascata manual
sobre `Cad_Matérias.ID_Instrutor` (uma lista separada por vírgula, esquema antigo). Essa cascata
**não existe mais em V2.0**: `instrutor_disciplina` já é uma tabela de vínculo N:N própria (Épico
C), então desativar um instrutor não precisa tocar nenhuma outra aba — só o próprio
`instrutores.Status` (via `crudExcluir` genérico, já entregue pelo Épico I). Isso reduz a User
Story 3 de "portar lógica de negócio" para "configurar `CRUD_CONFIG` + telas + validação leve" —
muito mais barato do que a spec estimava (`spec.md`, Assumptions).

**Alternativas consideradas**: portar a cascata de `excluirInstrutorComVinculos` mesmo assim, por
segurança (rejeitado — não há mais lista comma-separated para limpar; a única coisa que sobraria
seria desativar em cascata os vínculos de `instrutor_disciplina` do instrutor, avaliado e
rejeitado no achado 5 abaixo, que resolve o mesmo problema de forma mais simples).

## Achado 4 — Escopo de leitura: onde a restrição é aplicada, e o que fica de fora

**Decisão**: escopo de curso (Operador não-`Geral`, Encarregado de Curso) é aplicado em dois
lugares: (a) `getContextoInicial` filtra as listas de cursos/turmas que alimentam **todos** os
seletores do sistema; (b) um guard novo, `exigirEscopoCurso_`/`exigirEscopoTurma_` (`lib/supabase/middleware.ts` + policies RLS), é
chamado no início de cada função de leitura **já existente** que recebe `idCurso`/`idTurma`
diretamente — `getPainelavaliacoesCurso`, `getCronos`, `getDsaSemanal`, `getRelatorio`,
`calcularTetosDoCurso`. Funções de leitura que **este épico não cria nem já existiam antes dele**
não são retrofitadas — ficam para o épico que as criar aplicar o mesmo guard (ex.: um futuro
`getDiagramaAlocacao` do Épico G).

**Racional**: RN-RBAC-02 exige validação de servidor "independentemente do que a interface
mostra" — só filtrar o seletor não bastaria, porque um usuário com uma URL/chamada direta ainda
poderia pedir `idCurso` fora do escopo dele. O guard nas 5 funções listadas cobre exatamente as
funções de leitura por curso/turma que já existem hoje no projeto (Épicos E/I), fechando o gap
real sem precisar reabrir Cronograma/DSA/Diagrama completos, que são escopo do Épico G/H. Isso é
uma decisão de contenção de escopo explícita (constitution, Princípio IX) — retrofit de escopo em
cada função nova é responsabilidade de quem a cria, não uma dívida retroativa deste épico.

**Alternativas consideradas**: aplicar o guard só no seletor (`getContextoInicial`), sem retrofit
nas funções de leitura existentes (rejeitado — deixaria uma chamada direta `gs('getCronos',
'TUR-FORA-DO-ESCOPO')` funcionando mesmo para um Operador restrito, violando RN-RBAC-02
explicitamente); reabrir e generalizar completamente `lib/acoes/cronograma.ts`/`lib/acoes/dsa.ts`/`lib/acoes/relatorio.ts` neste
épico (rejeitado — antecipa trabalho do Épico G sem necessidade, quando um guard de duas linhas em
cada função já resolve o requisito real desta feature).

**Detalhe descoberto na implementação (`usuarioTemAcessoAoCurso_`, `lib/supabase/middleware.ts` + policies RLS, T010):**
`turmas.Modalidade` é por **turma**, não por curso — então um curso, sozinho, não tem uma
`Modalidade` própria para comparar contra `Escopo_Curso = EAD_Semipresencial`. Resolvido lendo
todas as turmas do curso e considerando o curso "dentro do escopo" se **pelo menos uma** delas
bate a modalidade — um curso com qualquer turma EAD/Semipresencial já é visível a um Operador
escopado assim. Curso sem nenhuma turma cadastrada cai no caso `turma=null` de
`cursoDentroDoEscopoOperador_` (nunca bate `EAD_Semipresencial`, mas `Regular`/`Expedito`/
`Estagio_Qualificacao` continuam funcionando pela `Classificacao` do próprio curso).

## Achado 5 — `instrutorHabilitado_` (Épico I) não checa se o instrutor está ativo

**Decisão**: `instrutorHabilitado_(idInstrutor, idGrade)` passa a checar também
`instrutores.Status = 'Ativo'`, além do `instrutor_disciplina.Status = 'Ativo'` que já checava.

**Racional**: achado real durante o planejamento — hoje um instrutor desativado
(`instrutores.Status = 'Inativo'`) continua "habilitado" para qualquer disciplina cujo vínculo
em `instrutor_disciplina` não tenha sido tocado individualmente, porque `instrutorHabilitado_` só
olha a segunda tabela. Como este é o **primeiro épico que efetivamente desativa um instrutor**
(User Story 3), é o momento certo de fechar esse gap — sem isso, `registrarAvaliacao` (Épico I)
aceitaria um aplicador desativado como se estivesse ativo.

**Alternativas consideradas**: desativar em cascata todos os vínculos de `instrutor_disciplina` do
instrutor ao desativá-lo, espelhando `excluirInstrutorComVinculos` de V1.0 (rejeitado — checar
`instrutores.Status` no momento da validação é uma correção mais simples, uma linha, sem exigir
uma segunda escrita em cascata; também preserva o histórico de quais vínculos existiam quando o
instrutor foi desativado, útil se ele for reativado depois — reativar não precisa "adivinhar" quais
vínculos religar).

## Achado 6 — Nenhuma migração nova necessária

**Decisão**: nenhum script em `migracao/` é criado por este épico.

**Racional**: `usuarios.Perfil`/`Escopo_Curso`/`Status` e `usuario_curso` já foram entregues
fisicamente pelo Épico C (schema, dados). O domínio de valores de `Perfil` (achado 0) é uma decisão
de aplicação, não uma migração de dado — usuários já cadastrados (`Admin`/`Operador` herdados de
V1.0) continuam válidos, porque esses dois valores já fazem parte do domínio de 9.

## Achado 7 — FR-009 (escrita da Divisão de Orientação Pedagógica) ficou fora do plano original

**Decisão**: acrescentar `CRUD_CONFIG['disciplinas']` (escrita: `Admin` +
`PERFIS_DIVISAO_ADMIN_ACADEMICA` + `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` — documento 01 §2.2 dá
escrita em disciplinas para **ambas** as divisões) e `CRUD_CONFIG['avaliacoes_planejadas']`
(escrita: `Admin` + `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` **só**, essa área não está na lista de
escrita da Divisão de Administração Acadêmica). Um arquivo novo, `lib/acoes/disciplinas.ts`, com wrappers
finos (`listarDisciplinas`/`atualizarDisciplina`/`listaravaliacoesPlanejadas`/
`atualizarAvaliacaoPlanejada`), e uma tela nova, `app/(app)/disciplinas/page.tsx` — **User Story 4**.

**Racional**: achado C1 do `/speckit-analyze` — FR-009 (parte do próprio cenário 5 da User Story
1, P1/MVP) não tinha nenhuma cobertura em `research.md`/`data-model.md`/`contracts/`/`tasks.md`
originais; a constante `PERFIS_DIVISAO_ORIENTACAO_PEDAGOGICA` (T002) era criada e nunca
consumida — sinal de que o achado passou despercebido. `Versão 1.0/`lib/` (monólito da v1.0, hoje dividido por domínio)` confirma o mesmo
padrão dos achados 2/3: `Cad_Matérias`/`Avaliacoes_Planejadas` já eram `CRUD_CONFIG` genérico em
V1.0 (linhas 68 e 74), sem nenhuma função bespoke — o mesmo motor genérico já portado
(`crudCriar`/`crudAtualizar`/`crudListar`) cobre o cadastro, só falta a entrada de config e a
tela, exatamente como para `instrutores` (achado 3).

**Nota de leitura de documento 01 (decisão própria, de baixo risco):** a matriz descreve a escrita
da Divisão de Orientação Pedagógica como "disciplinas, avaliações planejadas **e agendadas**" — o
mesmo termo ambíguo ("agendadas") que a spec original de FR-009 herdou sem resolver. Interpretação
adotada: refere-se ao catálogo `avaliacoes_planejadas` (itens "planejados e já postos na agenda do
curso"), não à tabela `avaliacoes` de execução real — essa já é escrita exclusiva de Operador
(documento 01, linha do perfil Operador) e o papel da Divisão de Orientação Pedagógica é descrito
no documento 01 §1.1 como **consumidor** dos dados de execução ("é a consumidora natural dos
dados de execução do sistema"), não produtor. Se essa leitura estiver errada, o ajuste é uma linha
a mais em `CRUD_CONFIG['avaliacoes'].escrita` — baixo custo de correção.

**Alternativas consideradas**: dar à Divisão de Orientação Pedagógica escrita também em
`avaliacoes` (execução real) — rejeitado pela leitura acima, mas registrado como reversível.

## Achado 8 — RF-AUTH-04 precisa retrofit nas 3 telas herdadas dos Épicos E/I

**Decisão**: `app/(app)/atividades/page.tsx`, `app/(app)/cursos/[curso]/page.tsx` e `app/(app)/turmas/[turma]/dsa/page.tsx` passam a esconder
seus botões de escrita (agendar, aplicar no DSA, cancelar, registrar vista, lançar AEC/TAD/TR)
quando `AppState.ctx.usuario.perfil` não está entre `['Admin','Operador']` — usando o helper
`perfilEm_` (Foundational desta feature).

**Racional**: achado H1 do `/speckit-analyze` — a User Story 1 amplia leitura para os 9 perfis
nas funções que essas 3 telas consomem, mas antes deste épico nenhum perfil além de
`Admin`/`Operador` conseguia sequer alcançá-las (bloqueados em `getContextoInicial`). Depois de
US1, um `Visualizacao`/`Chefe_Departamento_Ensino`/etc. alcança as telas e veria botões que
FR-012 bloqueia no clique — um erro de acesso negado em vez de o elemento simplesmente não
existir, violando FR-004 diretamente para os perfis recém-desbloqueados por este próprio épico.

**Alternativas considerados**: aceitar o botão visível e deixar o erro de clique como
"suficiente" (rejeitado — FR-004 é explícito sobre esconder, não só bloquear no clique; a UX de
erro depois do clique é pior que a ausência do botão, e o retrofit é barato reusando o helper que
US1 já cria).
