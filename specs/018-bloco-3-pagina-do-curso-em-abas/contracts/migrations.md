# Contrato da migration — Bloco 3

**Uma migration**, `<carimbo UTC>_regimes_nomeados_por_curso.sql`, gerada por `supabase migration new`. Pela regra 9.4
(emenda de 19/10/2026) ela **só acrescenta** — tabela nova, coluna nova nulável, funções novas — e recria
`vw_dias_parados_turma` com o mesmo resultado para o dado de hoje (nenhuma turma tem regime escolhido): segue o rito
do remoto sem parar, com a prova da SC-009.

## O que ela faz, na ordem

1. **Sequência e código**: `app.regimes_de_horario_codigo_seq` e `app.proximo_codigo_regime_de_horario()` →
   `RGH-NNNNNN`; `grant execute … to authenticated, service_role` (o `DEFAULT` roda com os direitos de quem insere,
   gotcha 5.1).
2. **`public.regimes_de_horario`** (colunas em `data-model.md`), com:
   - `check`s espelhando os de `curso_regime_historico` (1–12 TA, 45/50 min, intervalos 0–120, a tarde depois da
     manhã) e o nome de 1 a 60 caracteres;
   - `unique (id, curso_id)` e o índice único parcial do nome ativo por curso;
   - `app.set_auditoria()` e o quarteto; `origem_migracao_v1`;
   - RLS ligada, três policies (ler, criar, editar — `cursos.ler`/`horarios.criar`/`horarios.editar`, com
     `app.alcanca_curso` e, na escrita, `app.curso_em_oferta`), `revoke delete, truncate … from authenticated, anon`.
3. **As três funções de apoio** (`security definer`, `stable`, `search_path` fixo, `revoke all` de `public`/`anon` e
   `grant execute` só a quem precisa): `app.turma_tem_lancamento_no_dsa`, `app.regime_escolhivel`,
   `app.regime_em_uso_com_lancamento`.
4. **Guarda do regime** (`app.guardar_regime_de_horario`, `BEFORE UPDATE`): curso, quantidade e duração imutáveis
   (`23514`, `regime_curricular_imutavel`); relógio imutável com lançamento (`23514`, `regime_em_uso_com_lancamento`);
   situação só com `horarios.desativar` (`42501`, `sem_permissao_de_desativar`). `coalesce(…, false)` (gotcha 15).
5. **`turmas.regime_de_horario_id`** + a FK composta + `app.guardar_regime_da_turma` (`BEFORE INSERT OR UPDATE OF
   regime_de_horario_id`), com o corpo **sem a palavra *status***: recusa a troca com lançamento
   (`regime_da_turma_travado`) e o regime inativo (`regime_inativo`).
6. **`vw_dias_parados_turma`** recriada com `create or replace view … with (security_invoker = true)`, mesmas colunas,
   o TA do dia `coalesce(regime da turma, padrão vigente do curso, 8)`.

## O caso que discrimina (DoD 8)

- **pgTAP 142**: a turma **com** regime de 9 TA e um dia parado de dia inteiro conta **9** TA; a mesma turma sem regime
  contava o padrão do curso (8). Antes da migration a coluna nem existe.
- **RLS**: o **Operador** cria e edita regime (tem `horarios.criar/editar`) e **não** inativa (não tem
  `horarios.desativar`) — é o perfil que separa as duas permissões; a **Visualização** não cria (`42501`).

## Efeito medido (SC-009)

Sobre a cópia do remoto, com o local recriado **sem** e **com** a migration: md5 do conteúdo de
`vw_dias_parados_turma` e de `vw_carga_horaria_turma` (as colunas de antes), que têm de ser **iguais**.
Registrado no `plano-de-aplicacao-no-remoto.md` com os números: `[pendente]`.

## Reversão

`specs/018-bloco-3-pagina-do-curso-em-abas/reversao.sql`, por `psql -v ON_ERROR_STOP=1`: recusa se
`regimes_de_horario` tiver linha ou alguma turma tiver regime (regra 4: com dado, apagar é decisão de Bernardo);
recria `vw_dias_parados_turma` com o corpo de `20261014051943`, guardando e repondo os privilégios; tira o gatilho, a FK
e a coluna de `turmas`; tira a tabela, as funções e a sequência. Provada numa base limpa: a impressão digital volta à
da `main` de partida (`bb6e48a8…`, 2.137 objetos).
