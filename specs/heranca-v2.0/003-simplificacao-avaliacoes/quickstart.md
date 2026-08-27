# Quickstart — Validar o Épico I (Simplificação do Módulo de Avaliações)

## O que pode ser validado hoje (sem tocar a banco de produção)

O núcleo de casamento/classificação do painel (`painelavaliacoesCurso_`) é função pura — recebe
dado sintético (incluindo a data de referência como parâmetro, research.md achado 4), não toca
o cliente Supabase.

```powershell
cd CIAARA-11-v2
pnpm vitest run tests/regras_normativas.test.ts tests/regras_de_negocio_backend.test.ts
```

Cobre: item planejado sem lançamento → `Sem correspondência`; lançamento com `TA_Inicial`
preenchido → `Concluída`; lançamento sem `TA_Inicial` e data prevista = hoje → `Em andamento`;
data no passado → `Atrasada`; data no futuro → `Pendente`; item com múltiplos lançamentos casados
(reaplicação/recuperação, edge case do spec); lançamento `Cancelada` → não conta como Pendente nem
Atrasada; `RN-INST-01` (aplicador exige habilitação, fiscal não) e `RN-AVAL-02` (aplicação/vista
atualizam a linha existente, nunca criam uma segunda) — os dois com teste nomeado pela primeira vez
(achado C1/E1 do `/speckit-analyze`), usando o mock do cliente Supabase já existente.

## O que exige o banco V2.0 publicada e implantação via `o fluxo Git → Vercel`

- `registrarAvaliacao` (agendamento) e `aplicarAvaliacaoNoDsa` (aplicação) de ponta a ponta.
- `registrarVistaProva` de ponta a ponta (update sobre linha já aplicada).
- `getPainelavaliacoesCurso`/`cancelarAvaliacao`/`getDsaSemanal` lendo/escrevendo dado real.
- Qualquer verificação do frontend (`app/(app)/cursos/[curso]/page.tsx`, `app/(app)/turmas/[turma]/dsa/page.tsx`).

Quando implantado (protocolo padrão de `o histórico de deploys da Vercel`, `o SHA do commit` incrementado):

1. **Agendar** uma avaliação (turma, disciplina, tipo, data prevista) e confirmar que (a) nenhum
   campo de TA é exigido, (b) a CHD da disciplina não se altera, e (c) ela aparece na prévia do DSA
   da semana da data prevista como sugestão, ainda sem TA atribuído.
2. **Aplicar** essa mesma avaliação no DSA (informar TA inicial e tempos consumidos) e confirmar
   que só agora a CHD da disciplina sobe, e que a linha atualizada é a mesma do agendamento (não
   surgiu um segundo `ID_Avaliacao`).
3. Abrir a `Página do Curso` e confirmar que o painel mostra a situação correta em cada etapa:
   antes de aplicar → Pendente/Em andamento/Atrasada conforme a data; depois de aplicar →
   Concluída — sem nenhum campo de fórmula de nota ou caráter eliminatório em nenhuma tela do
   módulo.
4. Tentar agendar uma avaliação com um instrutor **não habilitado** na disciplina como
   `ID_Instrutor_Responsavel` e confirmar o bloqueio ("O instrutor responsável não está habilitado
   nesta disciplina.").
5. Registrar a vista de prova da avaliação já aplicada usando (a) um instrutor não habilitado como
   fiscal e (b) uma pessoa sem cadastro de instrutor como fiscal — confirmar que ambos são aceitos
   sem erro, e que a CHD sobe de novo com o consumo da vista.
6. Deixar uma avaliação aplicada sem vista registrada por mais de 7 dias corridos (ou usar uma já
   existente na base migrada) e confirmar `Status_Vista = Atrasada` no painel, sem ação manual.
7. Cancelar (exclusão lógica) um agendamento — antes e depois de aplicado no DSA — e confirmar que
   ele some do painel como pendência mas a linha continua existindo em `avaliacoes` com
   `Status = Cancelada`.

## O que NÃO esperar desta feature

- Grade posicional por TA na prévia do DSA (drag-and-drop, detecção de conflito) ou motor de
  sugestão automática de horário — a prévia desta feature é uma lista simples de avaliações
  agendadas-não-aplicadas na semana; a grade completa continua sendo o Épico H (research.md,
  achado 6).
- Edição do catálogo `avaliacoes_planejadas` (CRUD do catálogo em si) — fora de escopo, o catálogo
  é tratado como estático nesta feature, igual à V1.0.
- RBAC ampliado (perfis além de Admin/Operador) — Épico F.
- Prazo de graça configurável para a avaliação atrasada (hoje é zero-graça, decisão registrada em
  `spec.md`/`research.md` achado 7 — viraria `config_parametros` só se o responsável pedir).
- AppState completo e Design System completo — Épicos D e A, mesma ressalva do Épico E.
