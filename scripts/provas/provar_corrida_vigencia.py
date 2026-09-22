"""Prova da corrida do `FR-021.3` / R-7 — corrigir vigencia enquanto alguem lanca aula.

⚠️ POR QUE ESTA PROVA NAO E pgTAP NEM VITEST, e por que ela existe como script:

    Corrida precisa de DUAS SESSOES CONCORRENTES, cada uma com a sua transacao aberta ao mesmo
    tempo. O pgTAP roda numa sessao so, dentro de um `begin … rollback`; a suite de RLS fala com o
    PostgREST, que nao da controle de transacao. Um teste sequencial NAO PRODUZ a corrida que diz
    medir — ele mede a sequencia, que e justamente o caso que nunca falha.

    Aqui sao duas conexoes `psycopg` — a mesma biblioteca que o ETL ja usa; nenhuma dependencia
    nova — e o veredito e o codigo de saida. Roda a mao, como as provas do carregador
    (`scripts/etl/provar_r02.py`), com a saida registrada no PR. Leva-la ao CI e a `PEND-5a-4`.

⚠️ E ELA TEM AS DUAS METADES, porque so a segunda mostra o que a trava muda:

    1. COM a trava (o codigo real): a sessao B, que lanca a aula, ESPERA a sessao A terminar a
       correcao — e a aula nasce sob a vigencia ja corrigida.
    2. SEM a trava (defeito deliberado, `app.travar_curso_para_correcao` trocada por um no-op): B
       nao espera, grava a aula e confirma no meio da correcao.

⚠️ E O QUE FOI MEDIDO EM 18/09/2026 CONTRARIA A EXPECTATIVA DE QUEM ESCREVEU ESTA PROVA — por isso
   ela reporta TRES desfechos, e nao dois:

       COM a trava  -> B bloqueia, a correcao passa, a aula nasce sob a vigencia corrigida.
       SEM a trava  -> B nao bloqueia, e a correcao e RECUSADA com `vigencia_com_lancamento`.

   **Sem a trava NAO houve corrupcao: houve recusa tardia.** O motivo e que ha DUAS defesas
   independentes, e so uma delas e a trava: a RPC confere lancamento OUTRA VEZ, ja dentro dela, e
   em `READ COMMITTED` cada comando tira um retrato novo — entao a segunda conferencia enxerga a
   aula que a primeira nao viu. A janela que sobra para corrupcao de verdade e a que vai da
   conferencia INTERNA da RPC ate o `COMMIT` dela, e **essa nao e forcavel de fora**: a RPC e um
   comando so.

   O que a prova estabelece, entao, e mais preciso do que "sem a trava corrompe": a trava
   **serializa** — transforma uma recusa tardia (ou a janela estreita que sobra) numa espera, e a
   aula passa a nascer sob a vigencia que de fato vale. Dizer mais do que isso seria dizer o que a
   medicao nao mostrou.

Uso:  python -m scripts.provas.provar_corrida_vigencia
"""

import sys
import uuid

import psycopg

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

CONEXAO = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"

REGIME = """{"regime_tempos":8,"ta_duracao_min":45,"intervalo_manha_min":10,
             "intervalo_tarde_min":10,"hora_inicio_manha":"07:30","hora_inicio_tarde":"13:30",
             "vigente_de":"2044-01-01"}"""

NO_OP = """
create or replace function app.travar_curso_para_correcao(p_curso_id uuid)
returns void language plpgsql security definer set search_path = pg_catalog, public
as $$ begin return; end; $$;
"""

TRAVA_REAL = None  # preenchido na carga: a definicao original, para restaurar


def semear(con, sufixo: str) -> dict:
    """Curso com regime, turma, disciplina, unidade e instrutor — o minimo para lancar aula."""
    with con.cursor() as k:
        k.execute(
            "select (public.criar_curso_com_regime(%s::jsonb, %s::jsonb)).id",
            (
                '{"codigo":"CORRIDA-%s","nome_curso":"Curso da corrida %s","classificacao":"regular",'
                '"modalidade":"presencial","duracao_dias":300}' % (sufixo, sufixo),
                REGIME,
            ),
        )
        curso = k.fetchone()[0]

        k.execute(
            "insert into public.turmas (curso_id, turma, ano_letivo, status, modalidade,"
            " data_inicio, data_termino) values (%s, 'T1', 2044, 'ativa', 'presencial',"
            " '2044-01-05', '2044-11-30') returning id",
            (curso,),
        )
        turma = k.fetchone()[0]

        k.execute(
            "insert into public.disciplinas (codigo, curso_id, cod_disciplina, nome_disciplina,"
            " carga_horaria_tempos) values (%s, %s, %s, 'Disciplina da corrida', 30) returning id",
            (f"CORRIDA-{sufixo}-D", curso, f"C{sufixo}"),
        )
        disciplina = k.fetchone()[0]

        k.execute(
            "insert into public.unidades_ensino (codigo, disciplina_id, curso_id, numero_ue,"
            " topico, ch_prevista_tempos) values (%s, %s, %s, 1, 'Unidade da corrida', 30)"
            " returning id",
            (f"CORRIDA-{sufixo}-UE", disciplina, curso),
        )
        unidade = k.fetchone()[0]

        k.execute(
            "insert into public.instrutores (codigo, posto_graduacao, esp_hab_obs, nome_completo,"
            " categoria, om) values (%s, 'CT', '-EF', 'Instrutor da corrida', 'Militar', 'CIAARA')"
            " returning id",
            (f"CORRIDA-{sufixo}-INS",),
        )
        instrutor = k.fetchone()[0]

        k.execute(
            "select id from public.curso_regime_historico where curso_id = %s and status = 'ativo'",
            (curso,),
        )
        vigencia = k.fetchone()[0]

    return {
        "curso": curso,
        "turma": turma,
        "unidade": unidade,
        "instrutor": instrutor,
        "vigencia": vigencia,
        "sufixo": sufixo,
    }


def lancar_aula(cur, amostra: dict, codigo: str) -> None:
    cur.execute(
        "insert into public.registros_aula (codigo, data, turma_id, unidade_ensino_id, curso_id,"
        " tempos_consumidos, ta_inicial, categoria_normativa, instrutor_id)"
        " values (%s, '2044-03-10', %s, %s, %s, 2, 1, 'atividade_extraclasse', %s)",
        (codigo, amostra["turma"], amostra["unidade"], amostra["curso"], amostra["instrutor"]),
    )


def invariante_respeitada(con, amostra: dict) -> tuple[bool, str]:
    """Nenhum lancamento gravado ANTES da correcao cai dentro da janela corrigida."""
    with con.cursor() as k:
        k.execute(
            """
            select r.codigo, r.data, r.criado_em, s.codigo, s.vigente_de, s.criado_em
              from public.curso_regime_historico s
              join public.registros_aula r
                on r.curso_id = s.curso_id
               and r.data >= s.vigente_de
               and r.criado_em < s.criado_em
             where s.curso_id = %s and s.status = 'ativo'
             limit 1
            """,
            (amostra["curso"],),
        )
        linha = k.fetchone()
    if linha is None:
        return True, "nenhum lancamento anterior a correcao caiu na janela corrigida"
    return False, (
        f"o lancamento {linha[0]} de {linha[1]}, gravado em {linha[2]}, ficou sob a vigencia "
        f"{linha[3]} (a partir de {linha[4]}), criada DEPOIS dele, em {linha[5]} — "
        "reinterpretacao silenciosa"
    )


def rodar(com_trava: bool) -> bool:
    sufixo = uuid.uuid4().hex[:6].upper()
    principal = psycopg.connect(CONEXAO)
    principal.autocommit = True
    amostra = semear(principal, sufixo)

    if not com_trava:
        with principal.cursor() as k:
            k.execute(NO_OP)

    a = psycopg.connect(CONEXAO)   # quem CORRIGE
    b = psycopg.connect(CONEXAO)   # quem LANCA
    a.autocommit = False
    b.autocommit = False
    bloqueou = None

    try:
        # --- A abre a correcao e trava (ou nao, no defeito deliberado)
        with a.cursor() as ka:
            ka.execute("select app.travar_curso_para_correcao(%s)", (amostra["curso"],))
            ka.execute(
                "select * from app.lancamentos_que_travam_vigencia(%s, '2044-01-01')",
                (amostra["vigencia"],),
            )
            viu = ka.fetchone()

        # --- B tenta lancar a aula, com prazo curto: se a trava existe, ele ESPERA e estoura
        with b.cursor() as kb:
            kb.execute("set local statement_timeout = '2s'")
            try:
                lancar_aula(kb, amostra, f"CORRIDA-{sufixo}-REG")
                bloqueou = False
            except psycopg.errors.QueryCanceled:
                bloqueou = True
                b.rollback()

        # --- B, quando NAO foi bloqueado, confirma antes de A: e a corrida acontecendo
        if not bloqueou:
            b.commit()

        # --- A conclui a correcao com o que enxergou
        with a.cursor() as ka:
            ka.execute(
                "select public.corrigir_vigencia_regime(%s, '{\"regime_tempos\":6}'::jsonb)",
                (amostra["vigencia"],),
            )
        a.commit()

        # --- B, se foi bloqueado, agora passa: a aula nasce sob a vigencia ja corrigida
        if bloqueou:
            with b.cursor() as kb:
                lancar_aula(kb, amostra, f"CORRIDA-{sufixo}-REG")
            b.commit()

        ok, motivo = invariante_respeitada(principal, amostra)
        desfecho = "corrigiu" if ok else "corrompeu"
    except psycopg.errors.CheckViolation as erro:
        # ⚠️ ISTO NAO E CORRUPCAO, E A SEGUNDA DEFESA AGINDO. A RPC confere lancamento de novo, ja
        #    dentro dela, e em READ COMMITTED enxerga o que B confirmou depois da primeira
        #    conferencia. Contar esta recusa como "invariante violada" era o erro da primeira
        #    versao desta prova — e teria produzido um veredito falso e tranquilizador.
        a.rollback()
        b.rollback()
        desfecho = "recusou"
        ok, motivo = True, f"a correcao foi RECUSADA: {str(erro).splitlines()[0]}"
    except Exception as erro:  # noqa: BLE001 — o veredito e o que importa, e ele e impresso
        a.rollback()
        b.rollback()
        desfecho = "erro"
        ok, motivo = False, f"excecao inesperada: {erro}"
        viu = None
    finally:
        a.close()
        b.close()
        if not com_trava and TRAVA_REAL:
            with principal.cursor() as k:
                k.execute(TRAVA_REAL)
        principal.close()

    rotulo = "COM a trava (codigo real)" if com_trava else "SEM a trava (defeito deliberado)"
    print(f"\n=== {rotulo} ===")
    print(f"  B foi bloqueado pela trava?            {'sim' if bloqueou else 'nao'}")
    print(f"  A enxergou lancamento na 1a conferencia? {'sim' if viu else 'nao'}")
    print(f"  desfecho da correcao:                  {desfecho}")
    print(f"  invariante: {'RESPEITADA' if ok else 'VIOLADA'} — {motivo}")
    return {"bloqueou": bool(bloqueou), "desfecho": desfecho, "invariante": ok}


def main() -> int:
    global TRAVA_REAL
    con = psycopg.connect(CONEXAO)
    con.autocommit = True
    with con.cursor() as k:
        k.execute("select pg_get_functiondef('app.travar_curso_para_correcao(uuid)'::regprocedure)")
        TRAVA_REAL = k.fetchone()[0]
    con.close()

    print("PROVA DA CORRIDA — FR-021.3 / R-7 · duas sessoes concorrentes")
    com = rodar(com_trava=True)
    sem = rodar(com_trava=False)

    print("\n=== VEREDITO ===")

    if not com["invariante"] or not sem["invariante"]:
        print("  REPROVADA: houve REINTERPRETACAO SILENCIOSA — um lancamento gravado antes da")
        print("  correcao ficou sob a vigencia corrigida. E exatamente o que a RN-2027-09 proibe.")
        return 1

    if not com["bloqueou"]:
        print("  REPROVADA: com a trava no lugar, a sessao que lanca NAO esperou. A trava nao esta")
        print("  fazendo o trabalho — ou a FK que a sustenta deixou de existir.")
        return 1

    if sem["bloqueou"]:
        print("  INCONCLUSIVA: o defeito deliberado nao produziu a corrida — a sessao que lanca")
        print("  esperou mesmo sem a trava. Sem a corrida, nada foi medido.")
        return 2

    print("  APROVADA, e com a leitura precisa do que foi medido:")
    print(f"    · COM a trava: B espera ({com['desfecho']}), e a aula nasce sob a vigencia corrigida.")
    print(f"    · SEM a trava: B nao espera, e a correcao {sem['desfecho']}.")
    if sem["desfecho"] == "recusou":
        print("  ⚠️ Sem a trava NAO houve corrupcao: houve RECUSA TARDIA. Sao duas defesas")
        print("     independentes — a trava e a reconferencia dentro da RPC, que em READ COMMITTED")
        print("     tira retrato novo. A trava serializa; a reconferencia pega o que escapou.")
        print("     A janela que sobra vai da conferencia interna ao COMMIT, e nao e forcavel de")
        print("     fora, porque a RPC e um comando so. Dizer que 'sem a trava corrompe' seria")
        print("     dizer o que esta medicao nao mostrou.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
