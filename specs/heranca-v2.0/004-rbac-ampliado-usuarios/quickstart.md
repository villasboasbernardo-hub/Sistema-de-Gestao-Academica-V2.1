# Quickstart — Validar o Épico F (RBAC Ampliado e Gestão de Usuários)

## O que pode ser validado hoje (sem tocar a banco de produção)

O núcleo de decisão de escopo do Operador (`cursoDentroDoEscopoOperador_`) é função pura.

```powershell
cd CIAARA-11-v2
pnpm vitest run tests/regras_normativas.test.ts tests/regras_de_negocio_backend.test.ts
```

Cobre: `Escopo_Curso = Geral` sempre autoriza; `Regular`/`Expedito`/`Estagio_Qualificacao` casam
por `cursos.Classificacao`; `EAD_Semipresencial` casa por `turmas.Modalidade`; curso
`Especial`/`Aperfeiçoamento Avançado` só autorizado para `Geral`; `RN-RBAC-01` (e-mail não
cadastrado/inativo nunca executa nada, primeiro teste nomeado desta regra na suíte) e
`RN-RBAC-02` ampliada (Operador/Divisão de Administração Acadêmica autorizados a escrever em
`instrutores`/`instrutor_disciplina`, outros perfis bloqueados); `instrutorHabilitado_` corrigida
(instrutor inativo nunca habilitado, mesmo com vínculo `Ativo`).

## O que exige o banco V2.0 publicada e implantação via `o fluxo Git → Vercel`

- `getContextoInicial`/`getPainelavaliacoesCurso`/`getCronos`/`getDsaSemanal`/`getRelatorio` de
  ponta a ponta com os 9 perfis.
- `cadastrarUsuario`/`atualizarUsuario`/`desativarUsuario`/`vincularUsuarioACurso` (`app/(app)/admin/usuarios/page.tsx`).
- `cadastrarInstrutor`/`atualizarInstrutor`/`desativarInstrutor`/`criarVinculoHabilitacao`
  (`app/(app)/instrutores/page.tsx`).

Quando implantado (protocolo padrão de `o histórico de deploys da Vercel`, `o SHA do commit` incrementado):

1. Cadastrar um usuário de teste para cada um dos 9 perfis (`app/(app)/admin/usuarios/page.tsx`) e, com cada
   conta  correspondente (ou simulando via `Session` de teste), confirmar que consegue
   logar e que só vê os botões/telas que seu perfil autoriza.
2. Como `Encarregado_Curso`, confirmar leitura restrita ao(s) curso(s) vinculados — tentar acessar
   um curso fora do vínculo (via chamada direta, se possível testar) e confirmar o bloqueio no
   servidor, não só a ausência do botão.
3. Como `Operador` com `Escopo_Curso = Expedito`, confirmar que só turmas de cursos com
   `Classificacao = Expedito` aparecem nos seletores; trocar para `EAD_Semipresencial` e confirmar
   que a comparação passa a ser por `Modalidade`, não por `Classificacao`.
4. Cadastrar um instrutor e criar seu vínculo de habilitação como `Operador` (sem precisar de
   Admin) — confirmar que ele passa a ser aceito como aplicador em `registrarAvaliacao` (Épico I).
5. Desativar esse instrutor e confirmar que `registrarAvaliacao` volta a bloqueá-lo como aplicador,
   mesmo que o vínculo de habilitação em si não tenha sido tocado (research.md, achado 5).
6. Tentar cadastrar um usuário com um e-mail já existente e confirmar a rejeição com mensagem
   clara, sem duplicar o registro.
7. Como `Visualizacao`, abrir `app/(app)/atividades/page.tsx`/`app/(app)/cursos/[curso]/page.tsx`/`app/(app)/turmas/[turma]/dsa/page.tsx` e
   confirmar que nenhum botão de escrita (agendar, lançar, aplicar no DSA, cancelar, registrar
   vista) aparece — a tela deve mostrar só leitura, nunca um botão que gera erro de acesso negado
   ao ser clicado.
8. Como Encarregado da Divisão de Orientação Educacional e Pedagógica, editar uma disciplina e um
   item do catálogo de avaliações planejadas (`app/(app)/disciplinas/page.tsx`); confirmar que um Operador
   consegue editar a disciplina mas é bloqueado ao tentar editar o catálogo de avaliações
   planejadas.

## O que NÃO esperar desta feature

- Retrofit de escopo de curso em funções de leitura que nenhum épico ainda criou (Diagrama de
  Alocação completo, motor preditivo) — cada épico futuro aplica o guard na própria função nova
  (research.md, achado 4).
- Autenticação por senha/PIN — RF-AUTH-01 preservado integralmente (decisão D1).
- RBAC por área de dado ainda não implementada por nenhum épico (ex.: escrita de Cronograma/DSA
  completos) — recebe sua whitelist quando esse épico específico existir.
- Interface para o próprio perfil de Instrutor (autoatendimento) — adiado para v3.0 (documento 01,
  Tema S).
