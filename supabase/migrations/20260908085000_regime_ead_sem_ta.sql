-- =================================================================================
-- Os CHECKs de regime que o curso EAD refuta
--
-- O QUÊ  : admite `0` em `regime_tempos` e `ta_duracao_min` **quando, e somente
--          quando**, a linha é de regime EAD — isto é, quando
--          `limite_diario_ead_horas` está preenchido.
--
-- PARA QUÊ: as mesmas 4 de 29 linhas de `Cad_Cursos_Regime_Historico` que já não
--          tinham hora de início de turno (migration `…_not_null_que_o_dado_real…`,
--          item 1) também trazem `Regime_Tempos = 0` e `TA_Duracao_Min = 0`. A
--          própria planilha justifica na coluna de observação: "Curso EAD/
--          semipresencial sem regime de TA presencial".
--
--          `regime_tempos_valido` exige 1 a 12 e `regime_duracao_normativa` exige 45
--          ou 50 — os dois descrevem o TEMPO DE AULA presencial, que num curso a
--          distância não existe. O `0` da v2.0 é a forma dela de escrever "não se
--          aplica".
--
-- ⚠️ POR QUE ADMITIR O `0` E NÃO CONVERTER PARA NULL: converter seria mais bonito no
--    modelo, mas o ETL **transporta, não corrige** (FR-003). O `0` é o valor que a
--    Divisão digitou e é o valor que a reconciliação vai conferir contra a origem.
--    Trocá-lo por NULL faria a contagem de conferência divergir de propósito, e a
--    primeira pergunta de quem lesse o relatório seria "quem mudou isto?".
--
-- ⚠️ A REGRA NÃO AFROUXA PARA CURSO PRESENCIAL. A porta é `limite_diario_ead_horas
--    is not null`, que é exatamente a marca de regime EAD (e que tem o seu próprio
--    CHECK exigindo `> 0`). Regime presencial continua obrigado a 1–12 tempos e a
--    TA de 45 ou 50 minutos, como o RNF-NORM-03 manda.
--
-- Aplicado sob a autorização de 08/09/2026 de consertar os defeitos do Épico 1.
-- =================================================================================

alter table public.curso_regime_historico drop constraint regime_tempos_valido;
alter table public.curso_regime_historico add constraint regime_tempos_valido check (
  (regime_tempos >= 1 and regime_tempos <= 12)
  or (regime_tempos = 0 and limite_diario_ead_horas is not null)
);

alter table public.curso_regime_historico drop constraint regime_duracao_normativa;
alter table public.curso_regime_historico add constraint regime_duracao_normativa check (
  ta_duracao_min = any (array[45, 50])
  or (ta_duracao_min = 0 and limite_diario_ead_horas is not null)
);

comment on constraint regime_tempos_valido on public.curso_regime_historico is
  'De 1 a 12 tempos de aula por dia. EXCECAO: regime EAD (limite_diario_ead_horas '
  'preenchido) aceita 0 — curso a distancia nao tem tempo de aula presencial. Sao 4 '
  'das 29 linhas da v2.0.';

comment on constraint regime_duracao_normativa on public.curso_regime_historico is
  'TA de 45 ou 50 minutos (RNF-NORM-03). EXCECAO: regime EAD aceita 0, pela mesma '
  'razao do `regime_tempos_valido`.';

-- =================================================================================
-- PLANO DE REVERSÃO
--   drop/add dos dois constraints com a definição anterior:
--     regime_tempos_valido      check (regime_tempos >= 1 and regime_tempos <= 12)
--     regime_duracao_normativa  check (ta_duracao_min = any (array[45, 50]))
--   ⚠️ Falha enquanto as 4 linhas EAD estiverem carregadas.
-- =================================================================================
