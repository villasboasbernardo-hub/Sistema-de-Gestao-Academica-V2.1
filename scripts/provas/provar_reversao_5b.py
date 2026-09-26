"""T010 — o plano de reversao das SETE migrations do PR 1 da fatia (b), EXECUTADO.

    python -m scripts.provas.provar_reversao_5b

O QUE  : tira a impressao digital da estrutura **sem** as sete migrations; aplica as sete;
         executa o plano de reversao escrito no cabecalho de cada uma, na ordem inversa; exige
         que a impressao digital volte a ser **a de antes**; e roda, na base revertida, os
         arquivos pgTAP que existiam **antes** desta fatia, que tem de ficar verdes.

PARA QUE: plano de reversao escrito e nunca executado e promessa, nao plano. O `CLAUDE.md` exige
         migration "aplicada em preview e **revertivel**, com o plano de reversao escrito no PR";
         o que este arquivo acrescenta e a execucao — e a unica forma de saber que ela funciona e
         comparar o retrato de antes com o de depois.

⚠️ **E FOI ELA QUE ACHOU O DEFEITO QUE A M7 CONSERTA.** A impressao digital de antes trazia
   `WITH (security_invoker='true')` em `vw_instrutor_carga_prevista`; a de depois, nao. `create or
   replace view` **nao preserva as reloptions**, e a PARTE F da M5 recriou a view sem o `with (...)`.
   A view passou a rodar com os direitos do dono, que tem `rolbypassrls` — a RLS das tabelas de
   baixo deixou de valer para quem le. Nenhuma assercao da suite media OPCAO de view. Uma prova de
   reversao que so respondesse "sim, reverte" teria calado isso.

⚠️ **COMO SE OBTEM O "ANTES": tirando as sete do lugar e resetando.** Nao ha `db reset --version`
   nesta CLI, entao os sete arquivos sao movidos para fora de `supabase/migrations/` (para um
   diretorio temporario desta prova), o banco e recriado com as anteriores, e a impressao digital e
   tirada. Depois eles voltam, o banco e recriado com todas, e a reversao roda.

⚠️ **NUNCA CONTRA O REMOTO.** Ela recria o banco local tres vezes.

⚠️ **O QUE A REVERSAO NAO DESFAZ, e esta declarado nos cabecalhos**: dado. Codigo ja gerado fica
   com o valor que recebeu; `exclusoes_registradas` **com linha** nao e apagada e
   `turma_disciplina_unidade` **com linha** tampouco — apagar rastro e historico e o que a regra 4
   existe para impedir; o parametro dos 30 dias vai a `inativo`, nao a `delete`; e o evento de ida
   em `migracao_log` **nao** e apagado, porque corrigir ali e logar evento novo (regra 5).
"""

from __future__ import annotations

import shutil
import subprocess
import sys
from pathlib import Path

from scripts.provas.provar_defeitos_deliberados import diferenca, estrutura, pgtap, sql

RAIZ = Path(__file__).resolve().parents[2]
MIGRACOES = RAIZ / "supabase" / "migrations"
TESTES = RAIZ / "supabase" / "tests"
GUARDA = RAIZ / ".reversao-5b"

AS_SETE = (
    "20260925135041_sequencias_dis_e_ue.sql",
    "20260925135044_exclusao_com_rastro.sql",
    "20260925135048_aposentar_colunas_de_atribuicao.sql",
    "20260925135051_periodo_e_rpc_disciplina.sql",
    "20260925135054_rateio_por_instrutor.sql",
    "20260925135058_curriculo_modelo_e_parametro.sql",
    "20260926005750_ch_prevista_com_security_invoker.sql",
)

# Os arquivos pgTAP que NASCERAM nesta fatia. Na base revertida eles nao tem o que medir, e sao
# tirados do caminho — o que a T010 pede e que os **anteriores** fiquem verdes.
PGTAP_DESTA_FATIA = (
    "106_sequencias_dis_ue.sql",
    "107_exclusao_com_rastro.sql",
    "108_atribuicao_aposentada.sql",
    "109_periodo_e_rpc_disciplina.sql",
    "110_rateio_por_instrutor.sql",
    "111_curriculo_modelo_parametro.sql",
)

# ⚠️ E DOIS ARQUIVOS ANTERIORES FORAM EMENDADOS POR ESTA FATIA — `010_estrutura.sql` (inventario,
#    contagem de policies e agora a opcao das views) e `105_curso_inativo.sql` (lista de tabelas
#    protegidas). Na base revertida eles reprovam COM RAZAO: medem a estrutura NOVA. Para que "os
#    anteriores verdes" signifique algo, a prova repoe a VERSAO DE ANTES DA FATIA dos dois, do
#    proprio git, e os roda assim.
COMMIT_ANTES_DA_FATIA = "0f2d225"
PGTAP_EMENDADOS = ("010_estrutura.sql", "105_curso_inativo.sql")

# A definicao ANTERIOR da view de CH prevista, e os tres comentarios anteriores das colunas
# aposentadas, vem dos arquivos que os escreveram — transcrever a mao seria a quarta copia.
ORIGEM_DA_VIEW = "20260915084854_carga_prevista_por_instrutor.sql"
ORIGEM_DOS_COMENTARIOS_M3 = (
    ("comment on column public.turma_disciplina.instrutor_id is",
     "20260908051909_p6_turma_disciplina_instrutor.sql"),
    ("comment on column public.turma_disciplina.ch_prevista_por_instrutor is",
     "20260908051909_p6_turma_disciplina_instrutor.sql"),
    ("comment on column public.disciplinas.instrutores_atribuidos is",
     "20260829233423_cadastro_e_unidades_ensino.sql"),
)

# ⚠️ A M1 TAMBEM REESCREVE COMENTARIO, e a primeira execucao desta prova foi quem mostrou: o plano
#    do cabecalho dela largava sequencia, funcao e `DEFAULT`, e a impressao digital voltava com 4
#    linhas diferentes — os dois comentarios de `codigo` que ela trocou para explicar o `DIS-` e o
#    `UE-`. **Comentario e estrutura**: ele esta no `pg_dump` e some da comparacao so se for
#    reposto. O cabecalho da M1 foi corrigido para dizer isso.
ORIGEM_DOS_COMENTARIOS_M1 = (
    ("comment on column public.disciplinas.codigo is",
     "20260829233423_cadastro_e_unidades_ensino.sql"),
    ("comment on column public.unidades_ensino.codigo is",
     "20260829233423_cadastro_e_unidades_ensino.sql"),
)


def _rodar(comando_do_shell: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        comando_do_shell, shell=True, cwd=RAIZ, capture_output=True,
        text=True, encoding="utf-8", errors="replace",
    )


def reset() -> None:
    r = _rodar("pnpm exec supabase db reset")
    if r.returncode != 0:
        raise SystemExit(f"[NAO CONFERIDA] o db reset falhou:\n{(r.stdout + r.stderr)[-900:]}")


def comando(arquivo: str, prefixo: str) -> str:
    """O comando SQL inteiro que comeca em `prefixo`, dentro de `arquivo` — ate o `;` que o fecha.

    ⚠️ Ler do arquivo que escreveu o comando, em vez de transcreve-lo aqui, e o que mantem o plano
    de reversao casado com a migration: se o texto de la mudar, esta prova pega a versao nova; se o
    comando desaparecer, ela para com erro em vez de reverter para um estado inventado.
    """
    texto = (MIGRACOES / arquivo).read_text(encoding="utf-8")
    inicio = texto.find(prefixo)
    if inicio < 0:
        raise SystemExit(f"[NAO CONFERIDA] `{prefixo}` nao esta em {arquivo}")
    linhas: list[str] = []
    for linha in texto[inicio:].splitlines():
        linhas.append(linha)
        if linha.rstrip().endswith(";"):
            return "\n".join(linhas) + "\n"
    raise SystemExit(f"[NAO CONFERIDA] o comando `{prefixo}` de {arquivo} nao termina em `;`")


REVERSAO_M7 = """
-- ⚠️ A reversao da M7 esta CONTIDA na da M5, e isto nao e esquecimento: a M7 recria a view com o
--    corpo da M5 MAIS a opcao `security_invoker`, e a reversao da M5 recria a view de 15/09/2026
--    por inteiro — corpo e opcao. Executar a da M7 antes seria repor o defeito para larga-lo no
--    comando seguinte. Declarado para nao parecer migration sem plano.
select 1 as reversao_da_m7_contida_na_m5;
"""

REVERSAO_M6 = """
alter table public.cursos      drop column if exists curriculo_modelo;
alter table public.disciplinas drop column if exists sem_unidades_ensino;
-- ⚠️ `update`, nunca `delete`: parametro nao e apagado (regra 4).
update public.config_parametros set status = 'inativo'
 where chave = 'disciplinas.aviso_inicio_dias';
"""

# ⚠️ A ORDEM DENTRO DA M5 IMPORTA, E A PRIMEIRA EXECUCAO DESTA PROVA PEGOU ISSO. O cabecalho da
#    migration listava `drop table public.turma_disciplina_unidade` ANTES de "recriar a view", e
#    assim o `drop` e recusado:
#
#      ERROR: cannot drop table turma_disciplina_unidade because other objects depend on it
#      DETAIL: view vw_instrutor_carga_prevista depends on table turma_disciplina_unidade
#              view vw_instrutor_carga_anual depends on view vw_instrutor_carga_prevista
#
#    A view NOVA le a tabela nova (o caso 5, rateio por UE); a de 15/09/2026 nao. Entao a view
#    volta a ser a de antes PRIMEIRO, e e isso que solta a tabela. `drop ... cascade` levaria
#    `vw_instrutor_carga_anual` embora — reversao que derruba objeto de outra fatia nao e reversao.
#    O cabecalho da M5 foi corrigido para esta ordem.
REVERSAO_M5_ANTES_DA_VIEW = """
drop trigger  if exists trg_tdi_soma_do_rateio on public.turma_disciplina_instrutor;
drop trigger  if exists trg_tdu_soma_do_rateio on public.turma_disciplina_unidade;
drop function if exists public.definir_instrutores_da_turma(uuid, jsonb, jsonb);
drop function if exists app.definir_instrutores_da_turma(uuid, jsonb, jsonb);
drop function if exists app.trg_soma_do_rateio();
alter table public.turma_disciplina_instrutor drop constraint if exists tdi_ch_prevista_inteira;
"""

REVERSAO_M5_DEPOIS_DA_VIEW = """
do $reversao$
begin
  -- ⚠️ SO SE VAZIA (regra 4): com linha, a tabela e historico de atribuicao por UE e FICA.
  if (select count(*) from public.turma_disciplina_unidade) = 0 then
    drop table public.turma_disciplina_unidade;
  else
    raise notice 'turma_disciplina_unidade tem linha — a tabela FICA (regra 4)';
  end if;
end
$reversao$;
drop function if exists app.proximo_codigo_turma_disciplina_unidade();
drop sequence if exists app.turma_disciplina_unidade_codigo_seq;
alter table public.turma_disciplina drop constraint if exists td_id_disciplina;
alter table public.unidades_ensino  drop constraint if exists ue_id_disciplina;
"""

REVERSAO_M4 = """
drop trigger  if exists trg_turma_disciplina_janela on public.turma_disciplina;
drop function if exists app.trg_turma_disciplina_janela();
drop function if exists public.criar_disciplina(jsonb);
drop function if exists public.reativar_disciplina(uuid);
drop function if exists app.criar_disciplina(jsonb);
drop function if exists app.reativar_disciplina(uuid);
drop function if exists app.nascer_disciplina_nas_turmas(uuid, uuid);
"""

REVERSAO_M3 = """
do $reversao$
declare
  v_codigos text[] := array['53 - C-Ap-FR - XIII', '41 - C-Ap-HN - XVIII', '20 - CAHO - XVIII'];
  v_codigo  text;
  v_mudadas integer;
begin
  foreach v_codigo in array v_codigos loop
    update public.disciplinas set modo_atribuicao_padrao = 'dividido'
     where codigo = v_codigo and modo_atribuicao_padrao = 'simultaneo';
    get diagnostics v_mudadas = row_count;
    -- ⚠️ Evento NOVO, espelhando a ida; a linha da ida NAO e reescrita (regra 5). Em base
    --    recriada isto casa ZERO linhas, porque a marcacao depende da carga do ETL.
    if v_mudadas > 0 then
      insert into public.migracao_log
        (codigo, origem_tabela, origem_chave, destino_tabela, destino_chave,
         acao, regra_aplicada, valor_antes, valor_depois, observacao)
      values ('MLOG-5B-MODO-REV-' || upper(regexp_replace(v_codigo, '[^0-9A-Za-z]+', '', 'g')),
              'disciplinas', v_codigo, 'disciplinas', v_codigo,
              'corrigido', 'RN-MAT-05 / FR-040', 'simultaneo', 'dividido',
              'Reversao da marcacao da migration 20260925135048, executada pela T010.');
    end if;
  end loop;
end
$reversao$;
"""

REVERSAO_M2 = """
drop function if exists public.excluir_disciplina(uuid, text);
drop function if exists public.excluir_unidade_ensino(uuid, text);
drop function if exists public.impedimentos_de_exclusao_da_disciplina(uuid);
drop function if exists public.impedimentos_de_exclusao_da_unidade_ensino(uuid);
drop function if exists app.excluir_disciplina(uuid, text);
drop function if exists app.excluir_unidade_ensino(uuid, text);
drop function if exists app.impedimentos_de_exclusao_da_disciplina(uuid);
drop function if exists app.impedimentos_de_exclusao_da_unidade_ensino(uuid);
drop trigger  if exists trg_exclusoes_imutaveis on public.exclusoes_registradas;
drop trigger  if exists trg_exclusoes_sem_truncate on public.exclusoes_registradas;
drop function if exists app.exclusoes_registradas_imutaveis();
do $reversao$
begin
  -- ⚠️ SO SE VAZIA (regra 4): com linha, ela e o rastro de uma exclusao que ja aconteceu.
  if (select count(*) from public.exclusoes_registradas) = 0 then
    drop table public.exclusoes_registradas;
  else
    raise notice 'exclusoes_registradas tem linha — a tabela FICA (regra 4)';
  end if;
end
$reversao$;
"""

REVERSAO_M1 = """
alter table public.disciplinas     alter column codigo drop default;
alter table public.unidades_ensino alter column codigo drop default;
drop function if exists app.proximo_codigo_disciplina();
drop function if exists app.proximo_codigo_unidade_ensino();
drop sequence if exists app.disciplinas_codigo_seq;
drop sequence if exists app.unidades_ensino_codigo_seq;
"""


def plano_de_reversao() -> list[tuple[str, str]]:
    """O plano de cada cabecalho, na ORDEM INVERSA da aplicacao — M7 primeiro, M1 por ultimo."""
    a_view_como_era = (
        comando(ORIGEM_DA_VIEW, "create view public.vw_instrutor_carga_prevista")
        .replace("create view", "create or replace view", 1)
        + comando(ORIGEM_DA_VIEW, "comment on view public.vw_instrutor_carga_prevista is")
        + comando(ORIGEM_DA_VIEW, "grant select on public.vw_instrutor_carga_prevista")
        + comando(ORIGEM_DA_VIEW, "revoke all on public.vw_instrutor_carga_prevista")
        + comando(
            ORIGEM_DA_VIEW,
            "revoke insert, update, delete, truncate on public.vw_instrutor_carga_prevista",
        )
    )
    os_tres_comentarios = "".join(
        comando(origem, prefixo) for prefixo, origem in ORIGEM_DOS_COMENTARIOS_M3
    )
    os_dois_comentarios_de_codigo = "".join(
        comando(origem, prefixo) for prefixo, origem in ORIGEM_DOS_COMENTARIOS_M1
    )
    return [
        ("M7 — a opcao `security_invoker` da view", REVERSAO_M7),
        ("M6 — modelo de curriculo e o parametro dos 30 dias", REVERSAO_M6),
        ("M5 — rateio por instrutor, e a view de CH prevista como era",
         REVERSAO_M5_ANTES_DA_VIEW + a_view_como_era + REVERSAO_M5_DEPOIS_DA_VIEW),
        ("M4 — janela do periodo e as RPCs de disciplina", REVERSAO_M4),
        ("M3 — as tres colunas aposentadas e as tres disciplinas `simultaneo`",
         REVERSAO_M3 + os_tres_comentarios),
        ("M2 — exclusao com rastro", REVERSAO_M2),
        ("M1 — sequencias de codigo de disciplina e de UE",
         REVERSAO_M1 + os_dois_comentarios_de_codigo),
    ]


def pgtap_dos_anteriores() -> tuple[bool, str]:
    """A suite pgTAP ANTERIOR a esta fatia, rodada na base revertida."""
    fora = GUARDA / "testes"
    fora.mkdir(parents=True, exist_ok=True)
    try:
        for nome in PGTAP_DESTA_FATIA:
            shutil.move(str(TESTES / nome), str(fora / nome))
        for nome in PGTAP_EMENDADOS:
            shutil.move(str(TESTES / nome), str(fora / nome))
            r = _rodar(f"git show {COMMIT_ANTES_DA_FATIA}:supabase/tests/{nome}")
            if r.returncode != 0:
                raise SystemExit(f"[NAO CONFERIDA] git show de {nome} falhou: {r.stderr[:200]}")
            (TESTES / nome).write_text(r.stdout, encoding="utf-8")
        v = pgtap()
        detalhe = f" · reprovou: {', '.join(v.reprovados)}" if not v.passou else ""
        return v.passou, v.resumo + detalhe
    finally:
        for nome in PGTAP_EMENDADOS:
            (TESTES / nome).unlink(missing_ok=True)
        for nome in PGTAP_DESTA_FATIA + PGTAP_EMENDADOS:
            if (fora / nome).exists():
                shutil.move(str(fora / nome), str(TESTES / nome))
        fora.rmdir()


def main() -> int:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    if GUARDA.exists():
        raise SystemExit(f"[NAO CONFERIDA] {GUARDA} existe — execucao anterior interrompida?")
    GUARDA.mkdir()
    problemas: list[str] = []

    try:
        # -- 1. o ANTES: as sete fora do lugar ---------------------------------------
        for nome in AS_SETE:
            shutil.move(str(MIGRACOES / nome), str(GUARDA / nome))
        print(f"as {len(AS_SETE)} migrations sairam do lugar; recriando o banco com as anteriores...")
        reset()
        antes = estrutura()
        print(f"  impressao digital ANTES: {len(antes.splitlines())} linhas de pg_dump")
    finally:
        for nome in AS_SETE:
            if (GUARDA / nome).exists():
                shutil.move(str(GUARDA / nome), str(MIGRACOES / nome))
    print("  as sete voltaram ao lugar")

    try:
        # -- 2. com as sete ----------------------------------------------------------
        print("recriando o banco com todas...")
        reset()
        com_as_sete = estrutura()
        crescimento = len(com_as_sete.splitlines()) - len(antes.splitlines())
        print(f"  impressao digital COM as sete: {len(com_as_sete.splitlines())} linhas (+{crescimento})")
        if crescimento <= 0:
            print("X as sete nao acrescentaram estrutura nenhuma — a prova nao tem o que reverter")
            return 1

        # -- 3. a reversao, na ordem inversa ---------------------------------------
        print("\nexecutando o plano de reversao de cada cabecalho, na ORDEM INVERSA:")
        for rotulo, comandos in plano_de_reversao():
            sql(comandos)
            print(f"  OK {rotulo}")

        depois = estrutura()
        fora = diferenca(antes, depois)
        print(f"\n  impressao digital DEPOIS: {len(depois.splitlines())} linhas")
        if fora:
            problemas.append(f"a estrutura nao voltou a de antes — {len(fora)} linha(s)")
            print(f"  X a estrutura NAO voltou — {len(fora)} linha(s) diferentes:")
            for linha in fora[:30]:
                print(f"      {linha}")
        else:
            print("  OK a impressao digital voltou a ser EXATAMENTE a de antes das sete migrations")

        # -- 4. a suite anterior, na base revertida -------------------------------
        print("\nrodando os arquivos pgTAP ANTERIORES a esta fatia, na base revertida...")
        passou, resumo = pgtap_dos_anteriores()
        if passou:
            print(f"  OK a suite anterior fica VERDE na base revertida — {resumo}")
        else:
            problemas.append(f"a suite anterior reprovou na base revertida ({resumo})")
            print(f"  X a suite anterior REPROVOU na base revertida — {resumo}")
    finally:
        GUARDA.rmdir()
        print("\nrecriando o banco para deixar a base no estado das migrations...")
        reset()

    print(f"\n{'=' * 78}")
    if problemas:
        for p in problemas:
            print(f"X {p}")
        print("\nNAO PROVADO: o plano de reversao esta incompleto no que esta acima.")
        return 1
    print("PROVADO: o plano de reversao das sete foi executado, a estrutura voltou byte a byte,")
    print("         e a suite pgTAP anterior a esta fatia fica verde na base revertida.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
