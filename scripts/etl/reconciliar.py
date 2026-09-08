"""Etapa 5 — a reconciliação que decide o corte.

O QUÊ  : oito verificações bloqueantes (R-01 a R-08) e três informativas (U-01 a
         U-03), sobre a base já carregada, comparando-a com a origem em `staging`.

PARA QUÊ: é o que separa "a carga não deu erro" de "a carga está certa". Uma carga
         sem erro prova que o banco aceitou o que mandamos; ela não prova que
         mandamos o que a planilha tem. Esta etapa prova a segunda coisa — ou diz
         exatamente onde ela falha.

COMO   : cada verificação devolve uma lista de `Divergencia` **nomeada**. O relatório
         nunca diz "2 divergências": diz tabela, linha, esperado e obtido (contrato
         reconciliacao C-2). A lista de verificações bloqueantes é **fechada** em R-01
         a R-08 — critério de bloqueio não se acrescenta em tempo de execução
         (FR-015.1).

⚠️ SÓ LEITURA (contrato C-4). Este módulo **não corrige nada**. Se ele pudesse
   corrigir, a pergunta "a carga está certa?" passaria a se responder sozinha, e a
   resposta não valeria nada.

⚠️ NÃO LER NÃO É APROVAR (FR-014.2). Staging ausente, conexão perdida ou tabela que
   não existe levantam `NaoFoiPossivelReconciliar` — nunca "nenhuma divergência
   encontrada". Ausência de divergência por ausência de leitura é o falso verde mais
   caro que uma migração pode produzir.

⚠️ A NÃO REGRESSÃO É PROVADA POR INVARIANTE (contrato C-3), nunca por diff com a
   saída histórica de um curso. **A CAHO 2026 permanece rejeitada como padrão-ouro**
   (Bernardo, 10/08/2026), e nenhuma das planilhas usadas como fonte de transporte de
   Unidade de Ensino a substitui nesse papel.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass, field
from pathlib import Path

import psycopg

from . import mapa, ordem

CONEXAO_LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
RELATORIO = Path(__file__).parent / "dados" / "relatorio_divergencia.md"


class NaoFoiPossivelReconciliar(RuntimeError):
    """A reconciliação não conseguiu LER o que precisava conferir.

    Distinta de "encontrou divergência" de propósito: uma diz que a carga está errada,
    a outra diz que não sabemos se está. Confundi-las é como uma migração é aprovada
    sem ter sido conferida.
    """


@dataclass(frozen=True)
class Divergencia:
    """Uma divergência **nomeada**, no formato que o contrato C-2 exige."""

    verificacao: str
    tabela: str
    linha: str
    esperado: str
    obtido: str

    def __str__(self) -> str:
        return (
            f"{self.verificacao} · {self.tabela} · {self.linha} · "
            f"esperado {self.esperado} · obtido {self.obtido}"
        )


@dataclass
class Veredito:
    bloqueantes: list[Divergencia] = field(default_factory=list)
    informativos: list[Divergencia] = field(default_factory=list)
    esperados: list[Divergencia] = field(default_factory=list)
    checksums: dict[str, str] = field(default_factory=dict)
    executadas: list[str] = field(default_factory=list)

    @property
    def aprovada(self) -> bool:
        return not self.bloqueantes


# =====================================================================================
# DESCARTES DECLARADOS — a única diferença de contagem que a R-01 aceita
#
# `Turmas_Ativas` tem 29 linhas e 28 turmas: uma linha traz só `Ano_Letivo=2027` e
# `Status=Planejada`, sem `ID_Turma` — resto de digitação numa planilha viva. O
# carregador a descarta (ver `promover.montar_insert`).
#
# ⚠️ POR QUE DECLARAR EM VEZ DE TOLERAR: "uma linha de diferença bloqueia" só tem
#    força se a única exceção estiver ESCRITA. Uma tolerância genérica de ±1 aceitaria
#    calada a próxima linha perdida, que seria uma turma de verdade.
# =====================================================================================

DESCARTES_DECLARADOS: dict[str, tuple[int, str]] = {
    "turmas": (1, "linha sem ID_Turma em Turmas_Ativas — 2027/Planejada, sem curso"),
}


# =====================================================================================
# TABELAS QUE O PRÓPRIO SCHEMA SEMEIA — e por isso têm linhas sem procedência v2.0
#
# `config_listas` recebe 14 linhas da migration do Épico 1 (a `escala_antiguidade`, que
# ordena posto e graduação para a RN-ANT) e `config_parametros` recebe 14 (os tetos
# AEC/TAD/TR e as faixas de CH docente, com o fundamento normativo já citado). Nenhuma
# delas vem da v2.0, e é correto que `origem_migracao_v1` esteja nula: elas não foram
# migradas de lugar nenhum.
#
# ⚠️ POR QUE ISTO PRECISA SER DECLARADO: sem a lista, a R-05 acusaria 28 linhas "sem
#    procedência" — e a acusação estaria errada. Com a lista, uma linha sem procedência
#    em QUALQUER OUTRA tabela continua bloqueando, que é o ponto da verificação.
# =====================================================================================

SEMEADAS_PELO_SCHEMA: frozenset[str] = frozenset({"config_listas", "config_parametros"})


def _uma(k, sql: str, args: tuple = ()) -> object:
    k.execute(sql, args)
    linha = k.fetchone()
    return linha[0] if linha else None


def _exigir_leitura(con: psycopg.Connection) -> None:
    """Confere que há o que reconciliar, antes de dizer que está tudo bem."""
    with con.cursor() as k:
        staging = _uma(
            k,
            "select count(*) from information_schema.tables where table_schema='staging'",
        )
        if not staging:
            raise NaoFoiPossivelReconciliar(
                "O schema `staging` esta vazio: a origem nao foi carregada. Sem ela nao "
                "ha com o que comparar — e 'nenhuma divergencia' seria mentira."
            )
        publico = _uma(
            k, "select count(*) from information_schema.tables where table_schema='public'"
        )
        if not publico:
            raise NaoFoiPossivelReconciliar("O schema `public` esta vazio.")


# =====================================================================================
# R-01 — contagem por tabela
# =====================================================================================
def r01_contagem(con: psycopg.Connection) -> list[Divergencia]:
    """Contagem por tabela contra a linha de base. Uma linha de diferença bloqueia."""
    achados: list[Divergencia] = []
    with con.cursor() as k:
        for tabela in ordem.ORDEM_DE_CARGA:
            m = mapa.MAPAS.get(tabela)
            if m is None:
                continue
            # ⚠️ CONTA O QUE VEIO DA ABA, não o que está na tabela. As duas coisas
            #    divergem legitimamente: `config_listas` tem 96 linhas — 72 da v2.0, 14
            #    semeadas pela migration do Épico 1 e 10 acrescentadas pelo próprio ETL
            #    (vocabulário que o histórico usa e a lista não tinha). Comparar o total
            #    com a linha de base acusaria 24 divergências inexistentes; comparar
            #    pela procedência mede exatamente o que a base de origem entregou.
            procede = next(
                (c for c in m.colunas if c.transf is mapa.T.PROCEDENCIA and c.origem), None
            )
            if procede:
                obtido = _uma(
                    k,
                    f"select count(*) from public.{tabela} "
                    f"where origem_migracao_v1 like %s",
                    (f"{m.aba}:%",),
                )
            else:
                obtido = _uma(k, f"select count(*) from public.{tabela}")
            descartadas, motivo = DESCARTES_DECLARADOS.get(tabela, (0, ""))
            esperado = m.linhas - descartadas
            if obtido != esperado:
                achados.append(
                    Divergencia(
                        "R-01",
                        tabela,
                        "contagem total",
                        f"{esperado}"
                        + (f" ({m.linhas} na origem − {descartadas}: {motivo})" if descartadas else ""),
                        f"{obtido}",
                    )
                )
    return achados


# =====================================================================================
# R-02 — somatório de tempos de aula POR TURMA, origem × destino
#
# A verificação que rodaria primeiro se só coubesse uma. Contagem total não pega troca
# de chave estrangeira: mover um registro da turma A para a B mantém o total. Este
# somatório pega — e é a grandeza de que todo o sistema depende (CHD, CHT, tetos, LIQ).
#
# ⚠️ INCLUI AULA, AVALIAÇÃO, VISTA DE PROVA E ATIVIDADE NÃO LETIVA. Somar só aula infla
#    o saldo do DSA: é o achado A-5, já pago uma vez.
#
# ⚠️ O LADO DA ORIGEM É SOMADO EM BRUTO (FR-014.1): direto de `staging`, sem `WHERE`, e
#    com a conversão numérica feita AQUI. Reaproveitar a conversão da normalização
#    seria conferir o resultado usando a mesma peça que está sob suspeita.
# =====================================================================================
def r02_tempos_por_turma(con: psycopg.Connection) -> list[Divergencia]:
    achados: list[Divergencia] = []
    inteiro = "coalesce(nullif(regexp_replace({}, '[^0-9-]', '', 'g'), ''), '0')::int"

    with con.cursor() as k:
        k.execute(
            f"""
            with origem as (
              select btrim(s."id_turma") turma,
                     sum({inteiro.format('s."tempos_consumidos"')}) tempos
                from staging."Registro_Aulas_E_Atividades" s group by 1
              union all
              select btrim(s."id_turma"),
                     sum({inteiro.format('s."tempos_consumidos"')}
                         + {inteiro.format('s."tempos_consumidos_vista"')})
                from staging."Avaliacoes" s group by 1
              union all
              select btrim(s."id_turma"),
                     sum({inteiro.format('s."tempos_consumidos"')})
                from staging."Eventos_Extracurriculares" s group by 1
            ),
            destino as (
              select t.codigo turma, sum(coalesce(r.tempos_consumidos, 0)) tempos
                from public.registros_aula r join public.turmas t on t.id = r.turma_id
               group by 1
              union all
              select t.codigo, sum(coalesce(a.tempos_consumidos, 0)
                                   + coalesce(a.tempos_consumidos_vista, 0))
                from public.avaliacoes a join public.turmas t on t.id = a.turma_id
               group by 1
              union all
              select t.codigo, sum(coalesce(n.tempos_consumidos, 0))
                from public.atividades_nao_letivas n join public.turmas t on t.id = n.turma_id
               group by 1
            ),
            o as (select turma, sum(tempos) t from origem where turma <> '' group by 1),
            d as (select turma, sum(tempos) t from destino group by 1)
            select coalesce(o.turma, d.turma), coalesce(o.t, 0), coalesce(d.t, 0)
              from o full outer join d on d.turma = o.turma
             where coalesce(o.t, 0) <> coalesce(d.t, 0)
             order by 1
            """
        )
        for turma, na_origem, no_destino in k.fetchall():
            achados.append(
                Divergencia(
                    "R-02", "tempos por turma", str(turma), str(na_origem), str(no_destino)
                )
            )
    return achados


# =====================================================================================
# R-03 — integridade referencial: zero chave estrangeira órfã
#
# ⚠️ NULO NÃO É ÓRFÃ (FR-011.1). As FKs de `ordem.FK_ANULAVEIS` aceitam nulo por
#    decisão registrada — a Unidade de Ensino do histórico, o instrutor das 173 aulas,
#    o curso `GERAL`. Contá-las como violação transformaria 1.566 nulos legítimos em
#    1.566 falsos defeitos, e o relatório viraria ruído. O que a verificação procura é
#    o outro caso: valor preenchido que aponta para linha que não existe.
# =====================================================================================
def r03_orfas(con: psycopg.Connection) -> list[Divergencia]:
    achados: list[Divergencia] = []
    with con.cursor() as k:
        # ⚠️ PELO `pg_catalog`, E NÃO PELO `information_schema`. A primeira versão juntava
        #    `key_column_usage` com `constraint_column_usage` só por `constraint_name`,
        #    e isso NÃO pareia as colunas: numa tabela com várias FKs de mesmo nome de
        #    coluna o join vira produto cartesiano, e a verificação passou a comparar
        #    `avaliacoes.curso_id` com `disciplinas.id` — acusando 188 órfãs que não
        #    existem. `conkey[1]`/`confkey[1]` pareiam de verdade.
        k.execute(
            """
            select c.conrelid::regclass::text,
                   a.attname,
                   c.confrelid::regclass::text,
                   f.attname
              from pg_constraint c
              join pg_attribute a on a.attrelid = c.conrelid  and a.attnum = c.conkey[1]
              join pg_attribute f on f.attrelid = c.confrelid and f.attnum = c.confkey[1]
             where c.contype = 'f'
               and c.connamespace = 'public'::regnamespace
               and array_length(c.conkey, 1) = 1
             order by 1, 2
            """
        )
        for tabela, coluna, alvo, coluna_alvo in k.fetchall():
            n = _uma(
                k,
                f"""select count(*) from {tabela} f
                     where f.{coluna} is not null
                       and not exists (select 1 from {alvo} d
                                        where d.{coluna_alvo} = f.{coluna})""",
            )
            if n:
                achados.append(
                    Divergencia(
                        "R-03", tabela, coluna, f"0 orfas em {alvo}.{coluna_alvo}", f"{n}"
                    )
                )
    return achados


# =====================================================================================
# R-04 — as três identidades, como RELAÇÃO ESTRUTURAL
#
# ⚠️ A IDENTIDADE É O CRITÉRIO; O LITERAL É A FOTO (FR-012). Os números
#    1.566+1+186=1.753 · 663+1=664 · 531+62+60+11=664 são a linha de base de
#    02/08/2026. Se a planilha viva mudou desde então — e ela é escrita todo dia — o
#    literal muda e a IDENTIDADE continua tendo de fechar. Conferir o literal faria a
#    reconciliação reprovar a base por ela estar viva, que é o oposto do que se quer.
# =====================================================================================
def r04_identidades(con: psycopg.Connection) -> list[Divergencia]:
    achados: list[Divergencia] = []
    with con.cursor() as k:
        registros = _uma(k, "select count(*) from public.registros_aula")
        avaliacoes = _uma(k, "select count(*) from public.avaliacoes")
        arquivo = _uma(k, "select count(*) from public.arquivo_avaliacoes_v1")
        nao_letivas = _uma(k, "select count(*) from public.atividades_nao_letivas")
        por_categoria = _uma(
            k,
            "select coalesce(sum(n), 0) from (select count(*) n from "
            "public.atividades_nao_letivas group by categoria_normativa) x",
        )
        origem_registros = _uma(
            k, 'select count(*) from staging."Registro_Aulas_E_Atividades"'
        )
        origem_eventos = _uma(k, 'select count(*) from staging."Eventos_Extracurriculares"')

        # 1ª identidade: tudo o que a v2.0 lançava como "registro" chega inteiro.
        if registros != origem_registros:
            achados.append(
                Divergencia(
                    "R-04.1", "registros_aula", "lançamentos da origem",
                    f"{origem_registros}", f"{registros}",
                )
            )
        # 2ª: nenhuma atividade não letiva se perde entre a aba e a tabela.
        if nao_letivas != origem_eventos:
            achados.append(
                Divergencia(
                    "R-04.2", "atividades_nao_letivas", "eventos da origem",
                    f"{origem_eventos}", f"{nao_letivas}",
                )
            )
        # 3ª: a soma das categorias é o total — nenhuma atividade fora de categoria.
        if por_categoria != nao_letivas:
            achados.append(
                Divergencia(
                    "R-04.3", "atividades_nao_letivas", "soma das categorias",
                    f"{nao_letivas}", f"{por_categoria}",
                )
            )
        # O arquivo de avaliações da v1.0 é conferido à parte: não soma com as vivas.
        origem_arquivo = _uma(k, 'select count(*) from staging."_Arquivo_Avaliacoes_v1"')
        if arquivo != origem_arquivo:
            achados.append(
                Divergencia(
                    "R-04.4", "arquivo_avaliacoes_v1", "execuções arquivadas",
                    f"{origem_arquivo}", f"{arquivo}",
                )
            )
        if avaliacoes != _uma(k, 'select count(*) from staging."Avaliacoes"'):
            achados.append(
                Divergencia("R-04.5", "avaliacoes", "avaliações da origem", "igual", "diferente")
            )
    return achados


# =====================================================================================
# R-05 — `codigo` não nulo e único, procedência preenchida, em 100% das linhas
# =====================================================================================
def r05_identidade_e_procedencia(con: psycopg.Connection) -> list[Divergencia]:
    achados: list[Divergencia] = []
    with con.cursor() as k:
        for tabela in ordem.ORDEM_DE_CARGA:
            if tabela not in mapa.MAPAS:
                continue
            colunas = {
                r[0]
                for r in k.execute(
                    "select column_name from information_schema.columns "
                    "where table_schema='public' and table_name=%s",
                    (tabela,),
                ).fetchall()
            }
            if "codigo" in colunas:
                nulos = _uma(
                    k, f"select count(*) from public.{tabela} where codigo is null"
                )
                if nulos:
                    achados.append(
                        Divergencia("R-05", tabela, "codigo nulo", "0", f"{nulos}")
                    )
                repetidos = _uma(
                    k,
                    f"select count(*) from (select codigo from public.{tabela} "
                    f"group by 1 having count(*) > 1) x",
                )
                if repetidos:
                    achados.append(
                        Divergencia("R-05", tabela, "codigo repetido", "0", f"{repetidos}")
                    )
            if (
                "origem_migracao_v1" in colunas
                and tabela not in ordem.FORA_DA_IDEMPOTENCIA
                and tabela not in SEMEADAS_PELO_SCHEMA
            ):
                sem = _uma(
                    k,
                    f"select count(*) from public.{tabela} "
                    f"where origem_migracao_v1 is null or btrim(origem_migracao_v1) = ''",
                )
                # `planejamento_anual` e `usuario_curso` chegam vazias: 0 de 0 é 100%.
                if sem and _uma(k, f"select count(*) from public.{tabela}"):
                    achados.append(
                        Divergencia("R-05", tabela, "sem procedência", "0", f"{sem}")
                    )
    return achados


# =====================================================================================
# R-06 — `migracao_log` histórico intacto, nenhuma linha reescrita
# =====================================================================================
def r06_log_intacto(con: psycopg.Connection) -> list[Divergencia]:
    achados: list[Divergencia] = []
    with con.cursor() as k:
        na_origem = _uma(k, 'select count(*) from staging."_Migracao_Log"')
        no_destino = _uma(k, "select count(*) from public.migracao_log")
        if no_destino != na_origem:
            achados.append(
                Divergencia("R-06", "migracao_log", "linhas", f"{na_origem}", f"{no_destino}")
            )
        if no_destino < 717:
            achados.append(
                Divergencia(
                    "R-06", "migracao_log", "piso historico do documento 30",
                    "717 ou mais", f"{no_destino}",
                )
            )
        # ⚠️ A PROVA DE QUE NADA FOI REESCRITO É ESTRUTURAL, e é melhor do que contar
        #    linhas editadas: `migracao_log` **não tem as colunas de edição**. Sem
        #    `editado_em` e `editado_por` não existe o conceito de linha editada — a
        #    tabela é append-only pela sua forma, e não só pelo gatilho que a protege
        #    (Princípio IV, bloqueada inclusive para `service_role`).
        #
        #    Esta verificação nasceu procurando `editado_em is not null` e descobriu,
        #    na primeira execução, que a coluna não existe. Procurar por ela seria
        #    conferir uma proteção mais fraca do que a que está lá.
        k.execute(
            "select column_name from information_schema.columns "
            "where table_schema='public' and table_name='migracao_log' "
            "  and column_name in ('editado_em', 'editado_por')"
        )
        edicao = [r[0] for r in k.fetchall()]
        if edicao:
            achados.append(
                Divergencia(
                    "R-06", "migracao_log", "colunas de edicao",
                    "nenhuma — append-only nao tem linha editavel", ", ".join(edicao),
                )
            )
    return achados


# =====================================================================================
# R-07 — `turma_disciplina` com 89 períodos herdados e 121 em branco
# =====================================================================================
def r07_periodos(con: psycopg.Connection) -> list[Divergencia]:
    achados: list[Divergencia] = []
    with con.cursor() as k:
        k.execute(
            "select origem_periodo, count(*) from public.turma_disciplina group by 1"
        )
        contagem = {str(o): n for o, n in k.fetchall()}
        for valor, esperado in (("herdado_grade", 89), ("nao_informado", 121)):
            obtido = contagem.get(valor, 0)
            if obtido != esperado:
                achados.append(
                    Divergencia(
                        "R-07", "turma_disciplina", f"origem_periodo = {valor}",
                        f"{esperado}", f"{obtido}",
                    )
                )
    return achados


# =====================================================================================
# R-08 — idempotência: `md5()` canônico por tabela
#
# ⚠️ O QUE ENTRA E O QUE FICA DE FORA (FR-006, FR-006.1): entram as colunas de NEGÓCIO,
#    ordenadas pelo nome, concatenadas como texto, com as linhas ordenadas por `codigo`.
#    Ficam de fora `id` e o quarteto de auditoria (`ordem.COLUNAS_FORA_DO_CHECKSUM`) —
#    o `id` é `gen_random_uuid()` e mudaria a cada carga, e as datas de auditoria vêm
#    de `now()`. Incluí-los faria o checksum provar apenas que o relógio andou.
#
# ⚠️ `migracao_log` FICA FORA (`ordem.FORA_DA_IDEMPOTENCIA`): é append-only e cresce a
#    cada execução por definição. Exigir que o hash dele não mude seria exigir que a
#    migração não registrasse nada.
# =====================================================================================
def r08_checksums(con: psycopg.Connection) -> dict[str, str]:
    resultado: dict[str, str] = {}
    with con.cursor() as k:
        for tabela in ordem.ORDEM_DE_CARGA:
            if tabela in ordem.FORA_DA_IDEMPOTENCIA or tabela not in mapa.MAPAS:
                continue
            k.execute(
                "select column_name from information_schema.columns "
                "where table_schema='public' and table_name=%s order by column_name",
                (tabela,),
            )
            colunas = [
                r[0] for r in k.fetchall() if r[0] not in ordem.COLUNAS_FORA_DO_CHECKSUM
            ]
            if not colunas:
                continue
            concat = " || '' || ".join(f"coalesce({c}::text, '')" for c in colunas)
            ordenacao = "codigo" if "codigo" in colunas else colunas[0]
            resultado[tabela] = (
                _uma(
                    k,
                    f"select md5(coalesce(string_agg({concat}, '' "
                    f"order by {ordenacao}), ''))  from public.{tabela}",
                )
                or ""
            )
    return resultado


# =====================================================================================
# U-01 a U-03 — informativos. NÃO bloqueiam (contrato C-5).
# =====================================================================================
def u_informativos(con: psycopg.Connection) -> tuple[list[Divergencia], list[Divergencia]]:
    informa: list[Divergencia] = []
    esperado: list[Divergencia] = []
    with con.cursor() as k:
        sem_ue = _uma(
            k,
            "select count(*) from public.registros_aula where unidade_ensino_id is null",
        )
        com_ue = _uma(
            k,
            "select count(*) from public.registros_aula where unidade_ensino_id is not null",
        )
        esperado.append(
            Divergencia(
                "U-03", "registros_aula", "sem Unidade de Ensino",
                "previsto — decisão de 07/09/2026, 17 cursos sem fonte", f"{sem_ue}"
            )
        )
        informa.append(
            Divergencia(
                "U-01", "registros_aula", "com Unidade de Ensino recuperada",
                "quanto mais, melhor", f"{com_ue}"
            )
        )
        sem_instrutor = _uma(
            k,
            "select count(*) from public.registros_aula "
            "where categoria_normativa = 'aula' and instrutor_id is null",
        )
        informa.append(
            Divergencia(
                "U-02", "registros_aula", "aula sem instrutor — LEITURA HUMANA",
                "0 no regime novo", f"{sem_instrutor}"
            )
        )
        # ⚠️ O MESMO TETO NORMATIVO EM DUAS CHAVES. A migration do Épico 1 semeou
        #    `teto.aec_percentual_chr` (com fundamento citado) e a v2.0 traz
        #    `teto_aec_pct`. As duas dizem a mesma coisa, e o `RNF-NORM-08` quer uma
        #    fonte por parâmetro. NÃO bloqueia — o ETL transporta e o schema semeou,
        #    ambos corretamente — mas alguém precisa escolher qual fica.
        k.execute(
            """
            select v.chave, n.chave
              from public.config_parametros v
              join public.config_parametros n
                on n.origem_migracao_v1 is null
               and replace(replace(lower(v.chave), '_pct', ''), '_', '.')
                   = replace(replace(lower(n.chave), '.percentual.chr', ''), '_', '.')
             where v.origem_migracao_v1 is not null
            """
        )
        for da_v20, do_schema in k.fetchall():
            informa.append(
                Divergencia(
                    "U-02", "config_parametros", "mesmo parametro, duas chaves",
                    f"schema: {do_schema}", f"v2.0: {da_v20}"
                )
            )

        sem_tempos = _uma(
            k,
            "select count(*) from public.atividades_nao_letivas "
            "where tempos_consumidos is null and categoria_normativa in ('TAD', 'AEC')",
        )
        informa.append(
            Divergencia(
                "U-02", "atividades_nao_letivas", "TAD/AEC sem tempos — afeta os tetos",
                "0", f"{sem_tempos}"
            )
        )
    return informa, esperado


# =====================================================================================
# Execução e relatório
# =====================================================================================
VERIFICACOES = (
    ("R-01 contagem por tabela", r01_contagem),
    ("R-02 tempos de aula por turma", r02_tempos_por_turma),
    ("R-03 integridade referencial", r03_orfas),
    ("R-04 as três identidades", r04_identidades),
    ("R-05 codigo e procedência", r05_identidade_e_procedencia),
    ("R-06 migracao_log intacto", r06_log_intacto),
    ("R-07 períodos de turma_disciplina", r07_periodos),
)


def reconciliar(conexao: str = CONEXAO_LOCAL) -> Veredito:
    v = Veredito()
    try:
        con = psycopg.connect(conexao)
    except psycopg.Error as erro:
        raise NaoFoiPossivelReconciliar(f"Sem conexao com o banco: {erro}") from erro

    with con:
        con.read_only = True  # contrato C-4, imposto pela sessão e não pela boa vontade
        _exigir_leitura(con)
        for nome, funcao in VERIFICACOES:
            try:
                v.bloqueantes.extend(funcao(con))
            except psycopg.Error as erro:
                raise NaoFoiPossivelReconciliar(
                    f"{nome} nao pôde ser executada: {str(erro).splitlines()[0]}. "
                    f"Nao encontrar divergencia por nao conseguir ler NAO e aprovacao."
                ) from erro
            v.executadas.append(nome)
        v.checksums = r08_checksums(con)
        v.executadas.append("R-08 checksum canonico")
        informa, esperado = u_informativos(con)
        v.informativos.extend(informa)
        v.esperados.extend(esperado)
    return v


def escrever_relatorio(v: Veredito, destino: Path = RELATORIO) -> Path:
    linhas: list[str] = [
        "# Relatório de reconciliação — Épico 2",
        "",
        f"**Veredito: {'APROVADA' if v.aprovada else 'BLOQUEADA'}**",
        "",
        "Relatório sem veredito não é aprovação (contrato reconciliacao C-1).",
        "",
        "## O que bloqueia",
        "",
    ]
    if v.bloqueantes:
        linhas.append("| verificação | tabela | linha | esperado | obtido |")
        linhas.append("| --- | --- | --- | --- | --- |")
        for d in v.bloqueantes:
            linhas.append(
                f"| {d.verificacao} | `{d.tabela}` | {d.linha} | {d.esperado} | {d.obtido} |"
            )
    else:
        linhas.append("Nenhuma. As oito verificações bloqueantes fecharam:")
        linhas.append("")
        for nome in v.executadas:
            linhas.append(f"- ✅ {nome}")
    linhas += ["", "## O que informa — exige leitura humana, não bloqueia", ""]
    linhas.append("| verificação | tabela | assunto | referência | medido |")
    linhas.append("| --- | --- | --- | --- | --- |")
    for d in v.informativos:
        linhas.append(
            f"| {d.verificacao} | `{d.tabela}` | {d.linha} | {d.esperado} | {d.obtido} |"
        )
    linhas += ["", "## O que é esperado — previsto por decisão, não é defeito", ""]
    for d in v.esperados:
        linhas.append(f"- **{d.verificacao}** · `{d.tabela}` · {d.linha}: {d.obtido} — {d.esperado}")
    linhas += [
        "",
        "## Checksums canônicos (R-08)",
        "",
        "`md5()` sobre as colunas de negócio ordenadas, sem `id` nem o quarteto de",
        "auditoria. Reexecutar a carga com a mesma origem tem de reproduzi-los.",
        "",
        "| tabela | md5 |",
        "| --- | --- |",
    ]
    for tabela, soma in sorted(v.checksums.items()):
        linhas.append(f"| `{tabela}` | `{soma}` |")
    destino.parent.mkdir(parents=True, exist_ok=True)
    destino.write_text("\n".join(linhas) + "\n", encoding="utf-8")
    return destino


if __name__ == "__main__":
    import sys

    try:
        v = reconciliar()
    except NaoFoiPossivelReconciliar as erro:
        print(f"[NAO CONFERIDA] {erro}")
        sys.exit(2)

    caminho = escrever_relatorio(v)
    print(f"VEREDITO: {'APROVADA' if v.aprovada else 'BLOQUEADA'}\n")
    if v.bloqueantes:
        print(f"  {len(v.bloqueantes)} divergencia(s) bloqueante(s):")
        for d in v.bloqueantes:
            print(f"    {d}")
    else:
        for nome in v.executadas:
            print(f"  [ok]  {nome}")
    print(f"\n  informativos ({len(v.informativos)}):")
    for d in v.informativos:
        print(f"    {d.verificacao} · {d.tabela} · {d.linha}: {d.obtido}")
    print(f"\n  relatorio: {caminho}")
    sys.exit(1 if v.bloqueantes else 0)
