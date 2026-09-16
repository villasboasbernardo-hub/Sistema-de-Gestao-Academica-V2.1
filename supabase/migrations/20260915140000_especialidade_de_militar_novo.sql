-- =================================================================================
-- Especialidade/habilitacao obrigatoria no cadastro NOVO de militar (RN-INST-03 delimitado)
--
-- O QUE  : gatilho `BEFORE INSERT` em `instrutores` que recusa, com `23514`, instrutor MILITAR criado
--          sem especialidade/habilitacao.
--
-- DECISAO DE BERNARDO VILLAS BOAS, 15/09/2026 (CHK008 e CHK012): o `RN-INST-03` mantem os CINCO
--   obrigatorios, com delimitacao registrada — especialidade/habilitacao se aplica a instrutor militar.
--   E, na mesma data, a recusa ao salvar vale so para CADASTRO NOVO: ficha ja existente sem
--   especialidade continua salvando, e fica no quadro de avisos ate alguem preencher.
--
-- ⚠️ POR QUE GATILHO DE INSERT, E NAO `CHECK`. Um `CHECK` vale para toda linha, a cada `UPDATE`, e
--    travaria de novo a ficha dos 15 militares da base real sem sufixo de especialidade — o defeito
--    corrigido na rodada anterior. So o gatilho distingue criar de editar.
--
-- ⚠️ CIVIL E `SC` OU `SCNS`, pelo posto, como o `FR-002` da spec 006 define — nao pela coluna
--    `categoria`. Medido em 15/09/2026: os 6 de posto `SC` sao os 6 de categoria `SCNS`. Posto fora da
--    escala nao e civil. A mesma lista vive em `lib/dominio/militar-ou-civil.ts`; muda nos dois.
--
-- ⚠️ LINHA MIGRADA NAO E CADASTRO NOVO. O ETL grava `origem_migracao_v1` nas 177 linhas, e 15 delas
--    sao militares sem especialidade: o gatilho so vale com `origem_migracao_v1` nulo, e a carga do
--    corte passa. E a mesma fronteira das catracas do Epico 2 (achado 3), aplicada so a criacao.
--
-- ⚠️ O NOME DA RESTRICAO E NOSSO E ESTAVEL: `instrutores_esp_hab_obs_de_militar_novo`. A Server Action
--    traduz a recusa por ele, como faz com os `CHECK` de `20260915054204`. Texto so com espacos continua
--    recusado pelo `CHECK` `instrutores_esp_hab_obs_preenchido`, que roda depois deste gatilho.
-- =================================================================================

create or replace function app.exigir_especialidade_de_militar_novo()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $$
begin
  if new.origem_migracao_v1 is null
     and nullif(btrim(new.posto_graduacao), '') is not null
     and btrim(new.posto_graduacao) not in ('SC', 'SCNS')
     and new.esp_hab_obs is null then
    raise exception 'instrutores_esp_hab_obs_de_militar_novo: especialidade/habilitacao e obrigatoria no cadastro de militar'
      using errcode = '23514',
            constraint = 'instrutores_esp_hab_obs_de_militar_novo',
            table = 'instrutores',
            column = 'esp_hab_obs';
  end if;
  return new;
end;
$$;

comment on function app.exigir_especialidade_de_militar_novo() is
  'RN-INST-03 delimitado (decisao de Bernardo Villas Boas, 15/09/2026): recusa com 23514 instrutor '
  'MILITAR (posto preenchido que nao e SC nem SCNS, FR-002) criado sem especialidade/habilitacao. So '
  'INSERT e so linha sem origem_migracao_v1: ficha existente e linha migrada continuam salvando.';

create trigger trg_instrutores_especialidade_de_militar_novo
  before insert on public.instrutores
  for each row execute function app.exigir_especialidade_de_militar_novo();

-- =================================================================================
-- PLANO DE REVERSAO
--
--   drop trigger if exists trg_instrutores_especialidade_de_militar_novo on public.instrutores;
--   drop function if exists app.exigir_especialidade_de_militar_novo();
--
-- ⚠️ Reverter volta a aceitar militar novo sem especialidade por qualquer caminho; o Zod da tela
--    continua recusando, mas deixa de ser a regra do banco (FR-006).
-- =================================================================================
