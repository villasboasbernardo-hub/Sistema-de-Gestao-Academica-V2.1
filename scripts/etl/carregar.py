"""Etapas 3 e 4 — staging textual e promoção para `public`, numa transação única.

O QUÊ  : carrega os CSV brutos em `staging` (tudo `text`) e promove para `public`,
         resolvendo as chaves estrangeiras por `codigo`.

PARA QUÊ: é o coração do ETL. Toda tabela passa por aqui, o que garante que a política
         de resolução de chave, de procedência e de abortar seja **a mesma nas 25** —
         e não 25 variações parecidas (documento 30 §2.6).

COMO   : a etapa 3 cria as tabelas de staging **a partir do cabeçalho do CSV**, todas
         `text`; a etapa 4 percorre `ordem.ORDEM_DE_CARGA` e promove cada uma.

⚠️ POR QUE A STAGING NASCE DO CABEÇALHO, e não de migration: ela é **efêmera por
   definição** (data-model §2) e espelha a origem, que pode mudar de coluna entre
   snapshots. Uma migration por aba criaria 24 definições a manter em sincronia com
   uma planilha que não controlamos — e a primeira divergência seria silenciosa.
   Nascer do cabeçalho torna a divergência **visível na hora**: coluna nova aparece,
   coluna sumida some, e a conferência do mapa acusa.

⚠️ TUDO NUMA TRANSAÇÃO (FR-005): ou as 25 tabelas entram, ou nenhuma. Estado parcial é
   o pior estado numa migração — é o único em que ninguém sabe se o certo é continuar
   ou voltar.
"""

from __future__ import annotations

import csv
from dataclasses import dataclass, field
from pathlib import Path

import psycopg

from . import mapa, ordem

BRUTO = Path(__file__).parent / "dados" / "bruto" / "v20"
NORMALIZADO = Path(__file__).parent / "dados" / "normalizado"
CONEXAO_LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"


class CoberturaIncompleta(RuntimeError):
    """A ordem de carga e o de-para discordam. Aborta **antes** de qualquer escrita."""


class OrfaoNaOrigem(RuntimeError):
    """Chave estrangeira que não encontra destino. Aborta a transação inteira."""


@dataclass
class Relatorio:
    staging: dict[str, int] = field(default_factory=dict)
    promovidas: dict[str, int] = field(default_factory=dict)
    orfaos: list[str] = field(default_factory=list)
    puladas: list[str] = field(default_factory=list)


def _identificador(bruto: str) -> str:
    """Nome de coluna seguro para `staging`, sem aspas e sem surpresa.

    A origem tem cabeçalhos como `E-mail`, `Regime de trabalho` e
    `Docente ≤ 2 disciplinas?`. Citá-los exigiria aspas em toda consulta; normalizá-los
    aqui mantém o SQL legível — e o mapa guarda o nome original, que é o que importa
    para a rastreabilidade.
    """
    fora = str.maketrans(" -.?/()≤²", "_________")
    limpo = bruto.strip().translate(fora).lower()
    limpo = "".join(c for c in limpo if c.isalnum() or c == "_")
    while "__" in limpo:
        limpo = limpo.replace("__", "_")
    return limpo.strip("_") or "coluna_sem_nome"


def preparar_staging(con: psycopg.Connection, rel: Relatorio) -> None:
    """Etapa 3 — `truncate` + `COPY` de cada CSV bruto para `staging`, tudo `text`.

    A staging é **truncada no início desta execução**, não descartada ao fim da
    anterior (achado CHK012): é isso que faz `--somente-reconciliar` ter contra o que
    comparar depois de uma carga.
    """
    for arquivo in sorted(BRUTO.glob("*.csv")):
        aba = arquivo.stem
        with arquivo.open(encoding="utf-8", newline="") as h:
            leitor = csv.reader(h)
            cabecalho = next(leitor, None)
            if not cabecalho:
                continue
            colunas = [_identificador(c) for c in cabecalho]
            # nomes repetidos na origem viram col, col_2, col_3…
            vistos: dict[str, int] = {}
            unicas: list[str] = []
            for c in colunas:
                vistos[c] = vistos.get(c, 0) + 1
                unicas.append(c if vistos[c] == 1 else f"{c}_{vistos[c]}")

            tabela = f'staging."{aba}"'
            defs = ", ".join(f'"{c}" text' for c in unicas)
            with con.cursor() as k:
                k.execute(f"drop table if exists {tabela}")
                k.execute(f"create table {tabela} ({defs})")
                alvo = ", ".join(f'"{c}"' for c in unicas)
                # Formato TEXTO, não `format csv`: o `write_row` do psycopg serializa em
                # texto separado por tabulação, e declarar `csv` faz o servidor tentar
                # ler tabulação como campo único — "missing data for column".
                # Custou uma execução para descobrir; fica escrito para não custar duas.
                with k.copy(f"copy {tabela} ({alvo}) from stdin") as copia:
                    n = 0
                    for linha in leitor:
                        if not any(x.strip() for x in linha):
                            continue
                        linha = (linha + [""] * len(unicas))[: len(unicas)]
                        copia.write_row(linha)
                        n += 1
            rel.staging[aba] = n


# =================================================================================
# A VERIFICAÇÃO PRÉVIA — as dez conferências do `FR-019.6`
# =================================================================================
#
# ⚠️ ELAS LEEM O `staging` JÁ PREPARADO, E NÃO O CSV. O CSV é o artefato de origem, mas
#    o que a promoção vai ler é o `staging` — e entre um e outro há o `COPY`, que é
#    exatamente onde uma diferença de aspas ou de fim de linha apareceria. Conferir o
#    arquivo e carregar a tabela é conferir uma coisa e usar outra.
#
# ⚠️ E ELAS REÚNEM **TODAS** AS FALHAS, DE **TODAS** AS CONFERÊNCIAS, ANTES DE ABORTAR.
#    Parar na primeira transformaria a carga numa sequência de dez execuções, cada uma
#    revelando um problema — e quem migra precisa da lista inteira para decidir se
#    corrige a origem ou muda a regra.
#
# ⚠️ AS DEZ FICAM, INCLUSIVE AS QUE HOJE DÃO ZERO (decisão de Bernardo Villas Boas,
#    17/09/2026): *"uma verificação prévia que cobre só um dos modos de aborto é meia
#    verificação. Retornar zero hoje é justamente o argumento para incluí-las: custam
#    quase nada e servem no dia em que deixarem de retornar zero."*


@dataclass
class Falha:
    """Uma linha de origem que a carga recusaria, e por quê."""

    conferencia: int
    titulo: str
    requisito: str
    linha: str
    detalhe: str

    def __str__(self) -> str:
        return (
            f"[conferencia {self.conferencia}] {self.titulo} ({self.requisito}) "
            f"· {self.linha}: {self.detalhe}"
        )


class OrigemRecusada(RuntimeError):
    """A origem tem linha que a carga recusaria. Aborta **antes** de qualquer `INSERT`."""


def _staging_existe(con: psycopg.Connection, aba: str) -> bool:
    with con.cursor() as k:
        k.execute(
            "select 1 from information_schema.tables "
            "where table_schema='staging' and table_name=%s",
            (aba,),
        )
        return k.fetchone() is not None


def _consultar(con: psycopg.Connection, sql: str) -> list[tuple]:
    with con.cursor() as k:
        k.execute(sql)
        return k.fetchall()


# ---------------------------------------------------------------- 1 a 9, sobre o staging
def _c1_curso_sem_vigencia_padrao(con: psycopg.Connection) -> list[Falha]:
    """Curso sem vigência `Padrao` ATIVA — o gatilho adiado do `FR-019.5` recusaria no COMMIT."""
    linhas = _consultar(
        con,
        """
        select c.id_curso, c.nome_curso
          from staging."Cad_Cursos" c
         where coalesce(btrim(c.id_curso), '') <> ''
           and not exists (
             select 1 from staging."Cad_Cursos_Regime_Historico" r
              where btrim(r.id_curso) = btrim(c.id_curso)
                and lower(btrim(r.tipo_regime)) = 'padrao'
                and lower(btrim(r.status)) = 'ativo'
           )
         order by 1
        """,
    )
    return [
        Falha(1, "curso sem vigencia `Padrao` ativa", "FR-019.5",
              f"Cad_Cursos {cod}", f"{nome} — nenhuma linha Padrao/Ativo em Cad_Cursos_Regime_Historico")
        for cod, nome in linhas
    ]


def _c2_classificacao_recusada(con: psycopg.Connection) -> list[Falha]:
    """Classificação que o banco recusa. `geral` não é curso — é a sentinela (achado 4 do Épico 2)."""
    traduzidos = {k.strip().lower() for k in mapa.DE_PARA_DOMINIO.get(("cursos", "classificacao"), {})}
    linhas = _consultar(
        con,
        """
        select id_curso, coalesce(btrim(classificacao), '')
          from staging."Cad_Cursos"
         where coalesce(btrim(id_curso), '') <> ''
         order by 1
        """,
    )
    falhas: list[Falha] = []
    for cod, valor in linhas:
        chave = valor.lower()
        destino = mapa.DE_PARA_DOMINIO.get(("cursos", "classificacao"), {}).get(valor)
        if chave in ("geral", "ead_semipresencial") or destino in ("geral", "ead_semipresencial"):
            falhas.append(
                Falha(2, "classificacao que o banco recusa", "FR-003.1",
                      f"Cad_Cursos {cod}", f"{valor!r} — `geral` e a sentinela, nao um curso")
            )
        elif chave and chave not in traduzidos and destino is None:
            falhas.append(
                Falha(2, "classificacao sem destino no dominio", "FR-003.1",
                      f"Cad_Cursos {cod}", f"{valor!r} nao esta no de-para de `escopo_curso`")
            )
    return falhas


def _c3_curso_sem_modalidade_ou_duracao(con: psycopg.Connection) -> list[Falha]:
    """Curso sem duração em dias — e, SEPARADAMENTE, sem modalidade.

    ⚠️ **AS DUAS METADES DESTA CONFERÊNCIA TÊM DESFECHOS DIFERENTES, E ISSO É A DECISÃO
    E-6 (Bernardo Villas Boas, 17/09/2026), não uma exceção improvisada.**

    - **Duração ausente ABORTA**: `cursos.duracao_dias` é `NOT NULL` sem catraca.
    - **Modalidade ausente NÃO aborta**: a catraca
      `cursos_modalidade_so_nula_no_historico` aceita nulo em linha **migrada e nunca
      editada**, que é exatamente o que o ETL grava. Os **13** cursos que a v2.0 deixou
      em branco entram **visivelmente ausentes**, em vez de receber um `presencial`
      inventado que nenhum relatório distinguiria de escolha real.

    ⚠️ **E ELES SÃO RELATADOS MESMO SEM ABORTAR.** Silenciá-los porque "a catraca
    resolve" faria a carga passar sem que ninguém soubesse que 13 dos 24 cursos entraram
    sem modalidade — que é um fato sobre o dado, não sobre o schema. Esta era, aliás, a
    conferência cujo *"0"* fora medido na base **carregada**, onde o `DEFAULT 'presencial'`
    já havia preenchido o vazio da origem.
    """
    sem_duracao = _consultar(
        con,
        """
        select id_curso, nome_curso
          from staging."Cad_Cursos"
         where coalesce(btrim(id_curso), '') <> ''
           and coalesce(btrim(duracao_dias), '') = ''
         order by 1
        """,
    )
    return [
        Falha(3, "curso sem duracao em dias", "FR-015",
              f"Cad_Cursos {cod}", f"{nome} — `duracao_dias` e NOT NULL e nao tem catraca")
        for cod, nome in sem_duracao
    ]


def _c3_avisos_modalidade(con: psycopg.Connection) -> list[str]:
    """A metade informativa da conferência 3 — não aborta, mas é dita em voz alta."""
    linhas = _consultar(
        con,
        """
        select id_curso
          from staging."Cad_Cursos"
         where coalesce(btrim(id_curso), '') <> ''
           and coalesce(btrim(modalidade), '') = ''
         order by 1
        """,
    )
    if not linhas:
        return []
    codigos = ", ".join(r[0] for r in linhas)
    return [
        f"conferencia 3 (informativa) · {len(linhas)} curso(s) SEM MODALIDADE na origem: {codigos}. "
        f"Entram com modalidade NULA, amparados pela catraca "
        f"`cursos_modalidade_so_nula_no_historico` (FR-015.1, decisao E-6 de 17/09/2026). "
        f"Nao e aborto: e ausencia VISIVEL, preferida a um `presencial` inventado."
    ]


def _c4_turma_sem_modalidade(con: psycopg.Connection) -> list[Falha]:
    """Turma sem modalidade — `turmas.modalidade` é `NOT NULL` e **nunca** copiada do curso."""
    linhas = _consultar(
        con,
        """
        select id_turma, id_curso
          from staging."Turmas_Ativas"
         where coalesce(btrim(id_turma), '') <> ''
           and coalesce(btrim(modalidade), '') = ''
         order by 1
        """,
    )
    return [
        Falha(4, "turma sem modalidade", "FR-015, FR-027",
              f"Turmas_Ativas {t}", f"curso {c} — a modalidade da turma decide a capacidade diaria")
        for t, c in linhas
    ]


def _c5_sala_fora_da_lista(con: psycopg.Connection) -> list[Falha]:
    """Sala sem correspondência **depois** da substituição — o gatilho `sala_fora_da_lista`.

    ⚠️ Casa por `app.normalizar_texto()`, que é a MESMA regra da substituição da
    `normalizar_salas()`: conferir por igualdade exata acusaria as 9 turmas de
    `Laboratório de informática` que a promoção vai corrigir sozinha — falso positivo que
    faria a carga abortar por um problema que ela mesma resolve.
    """
    linhas = _consultar(
        con,
        """
        select t.id_turma, btrim(t.sala_alocada)
          from staging."Turmas_Ativas" t
         where coalesce(btrim(t.id_turma), '') <> ''
           and coalesce(btrim(t.sala_alocada), '') <> ''
           and not exists (
             select 1 from public.config_listas c
              where c.lista = 'salas'
                and app.normalizar_texto(c.valor) = app.normalizar_texto(btrim(t.sala_alocada))
           )
         order by 1
        """,
    )
    return [
        Falha(5, "sala sem correspondencia na lista", "FR-029, FR-029.8",
              f"Turmas_Ativas {t}", f"{sala!r} nao casa com nenhuma sala do inventario, nem por normalizacao")
        for t, sala in linhas
    ]


def _c6_rotulo_fora_da_forma(con: psycopg.Connection) -> list[Falha]:
    """Rótulo fora de `T<n>` — o CHECK `turmas_rotulo_forma`. Vazio é legítimo (turma única)."""
    linhas = _consultar(
        con,
        """
        select id_turma, btrim(turma)
          from staging."Turmas_Ativas"
         where coalesce(btrim(id_turma), '') <> ''
           and coalesce(btrim(turma), '') <> ''
           and btrim(turma) !~ '^T[1-9][0-9]*$'
         order by 1
        """,
    )
    return [
        Falha(6, "rotulo fora da forma `T<n>`", "FR-025.2",
              f"Turmas_Ativas {t}", f"rotulo {r!r} — a forma aceita e T1, T2, T3…")
        for t, r in linhas
    ]


def _c7_codigo_de_turma_divergente(con: psycopg.Connection) -> list[Falha]:
    """Código ≠ `sigla [rótulo] ano` — o gatilho `codigo_de_turma_divergente` do `FR-025.1`.

    ⚠️ A conta é a MESMA do gatilho: sigla, rótulo quando houver, e ano, separados por um
    espaço. Escrevê-la de outro jeito aqui faria a conferência aprovar o que o banco
    recusa — e a carga abortaria no meio da promoção, que é o desfecho que ela existe
    para evitar.
    """
    linhas = _consultar(
        con,
        """
        select id_turma,
               btrim(id_curso)
                 || case when coalesce(btrim(turma), '') = '' then '' else ' ' || btrim(turma) end
                 || ' ' || btrim(ano_letivo)
          from staging."Turmas_Ativas"
         where coalesce(btrim(id_turma), '') <> ''
           and btrim(id_turma) <> (
             btrim(id_curso)
               || case when coalesce(btrim(turma), '') = '' then '' else ' ' || btrim(turma) end
               || ' ' || btrim(ano_letivo)
           )
         order by 1
        """,
    )
    return [
        Falha(7, "codigo de turma diferente de `sigla [rotulo] ano`", "FR-025.1",
              f"Turmas_Ativas {t}", f"o banco geraria {esperado!r}")
        for t, esperado in linhas
    ]


def _c8_rotulo_repetido(con: psycopg.Connection) -> list[Falha]:
    """Duas turmas com o mesmo rótulo — **vazio incluído** — no mesmo curso e ano.

    ⚠️ O VAZIO CONTA, e é por isso que a restrição do banco é `UNIQUE NULLS NOT DISTINCT`:
    duas turmas únicas no mesmo curso e ano são duas turmas sem rótulo, e é justamente o
    caso que um `UNIQUE` comum deixaria passar.
    """
    linhas = _consultar(
        con,
        """
        select btrim(id_curso), btrim(ano_letivo), coalesce(btrim(turma), ''),
               string_agg(btrim(id_turma), ', ' order by btrim(id_turma))
          from staging."Turmas_Ativas"
         where coalesce(btrim(id_turma), '') <> ''
         group by 1, 2, 3
        having count(*) > 1
         order by 1, 2, 3
        """,
    )
    return [
        Falha(8, "duas turmas com o mesmo rotulo no mesmo curso e ano", "FR-026",
              f"{curso} {ano} rotulo {rotulo!r}", f"turmas: {turmas}")
        for curso, ano, rotulo, turmas in linhas
    ]


def _c9_vigencia_sem_sucessora(con: psycopg.Connection) -> list[Falha]:
    """Vigência ativa com `Vigente_Ate` e sem sucessora ativa no dia seguinte (`FR-020`).

    ⚠️ Só olha as `Padrao`: a `Excecao` não forma cadeia — ela convive com a padrão em
    vez de suceder a anterior.
    """
    linhas = _consultar(
        con,
        """
        select r.id_regime, btrim(r.id_curso), btrim(r.vigente_ate)
          from staging."Cad_Cursos_Regime_Historico" r
         where lower(btrim(r.status)) = 'ativo'
           and lower(btrim(r.tipo_regime)) = 'padrao'
           and coalesce(btrim(r.vigente_ate), '') <> ''
           and not exists (
             select 1 from staging."Cad_Cursos_Regime_Historico" s
              where btrim(s.id_curso) = btrim(r.id_curso)
                and lower(btrim(s.status)) = 'ativo'
                and lower(btrim(s.tipo_regime)) = 'padrao'
                and btrim(s.vigente_a_partir_de)::date = btrim(r.vigente_ate)::date + 1
           )
         order by 1
        """,
    )
    return [
        Falha(9, "vigencia encerrada sem sucessora no dia seguinte", "FR-020",
              f"Cad_Cursos_Regime_Historico {reg}", f"curso {curso} — termina em {ate} e nada comeca em {ate}+1")
        for reg, curso, ate in linhas
    ]


# ---------------------------------------------------------------- 10, sobre a ordem
def _c10_ordem_de_carga(ordem_usada: tuple[str, ...] | None = None) -> list[Falha]:
    """A ordem de carga, conferida como **precedência**, não como lista literal.

    ⚠️ **NÃO COMPARA COM UMA CÓPIA DA LISTA CERTA** — isso só detectaria que alguém mexeu,
    e obrigaria a manter duas listas em sincronia. O que importa são as precedências que,
    quebradas, produzem erro que **não menciona a ordem**: `turmas` depois de
    `disciplinas` faz o gatilho do `FR-032.2` nascer a grade vazia, e as linhas explícitas
    de `turma_disciplina` colidem com `uq_turma_disciplina_ativo`.
    """
    seq = list(ordem_usada if ordem_usada is not None else ordem.ORDEM_DE_CARGA)
    posicao = {t: i for i, t in enumerate(seq)}
    exigencias: tuple[tuple[str, str, str], ...] = (
        ("cursos", "curso_regime_historico", "FR-019.4"),
        ("turmas", "disciplinas", "FR-032.2"),
        ("curso_regime_historico", "registros_aula", "FR-019.4"),
        ("curso_regime_historico", "avaliacoes", "FR-019.4"),
        ("curso_regime_historico", "atividades_nao_letivas", "FR-019.4"),
    )
    falhas: list[Falha] = []
    for antes, depois, requisito in exigencias:
        if antes not in posicao or depois not in posicao:
            falhas.append(
                Falha(10, "ordem de carga incompleta", requisito,
                      "scripts/etl/ordem.py", f"{antes!r} ou {depois!r} fora de ORDEM_DE_CARGA")
            )
        elif posicao[antes] > posicao[depois]:
            falhas.append(
                Falha(10, "ordem de carga invertida", requisito,
                      "scripts/etl/ordem.py",
                      f"{antes!r} (posicao {posicao[antes]}) deveria vir ANTES de "
                      f"{depois!r} (posicao {posicao[depois]})")
            )
    return falhas


AS_DEZ = (
    _c1_curso_sem_vigencia_padrao,
    _c2_classificacao_recusada,
    _c3_curso_sem_modalidade_ou_duracao,
    _c4_turma_sem_modalidade,
    _c5_sala_fora_da_lista,
    _c6_rotulo_fora_da_forma,
    _c7_codigo_de_turma_divergente,
    _c8_rotulo_repetido,
    _c9_vigencia_sem_sucessora,
)

ABAS_EXIGIDAS = ("Cad_Cursos", "Turmas_Ativas", "Cad_Cursos_Regime_Historico")


def verificacao_previa(con: psycopg.Connection) -> tuple[list[Falha], list[str]]:
    """As dez conferências do `FR-019.6`. Devolve (falhas bloqueantes, avisos).

    ⚠️ RODA TODAS AS DEZ, mesmo depois de a primeira falhar.
    """
    falhas: list[Falha] = []
    avisos: list[str] = []

    faltando = [a for a in ABAS_EXIGIDAS if not _staging_existe(con, a)]
    if faltando:
        falhas.append(
            Falha(0, "staging incompleta", "FR-019.6", "staging",
                  f"aba(s) ausente(s): {', '.join(faltando)} — a verificacao nao tem o que ler")
        )
        return falhas, avisos

    for conferencia in AS_DEZ:
        falhas.extend(conferencia(con))
    avisos.extend(_c3_avisos_modalidade(con))
    falhas.extend(_c10_ordem_de_carga())
    return falhas, avisos


def _colunas_reais(con: psycopg.Connection, tabela: str) -> set[str]:
    with con.cursor() as k:
        k.execute(
            "select column_name from information_schema.columns "
            "where table_schema='public' and table_name=%s",
            (tabela,),
        )
        return {r[0] for r in k.fetchall()}


def conferir_antes_de_escrever(con: psycopg.Connection) -> list[str]:
    """Confere o de-para contra o **banco real**, antes de qualquer `INSERT`.

    Coluna de destino que não existe é o defeito que produziria carga verde com dado
    perdido: o `INSERT` a ignoraria, ou falharia no meio da transação — tarde, depois
    de dezesseis tabelas já promovidas.
    """
    problemas: list[str] = []
    cobertura = mapa.conferir_cobertura(ordem.ORDEM_DE_CARGA)
    for chave, faltantes in cobertura.items():
        for t in faltantes:
            problemas.append(f"{chave}: {t}")

    for nome, m in mapa.MAPAS.items():
        reais = _colunas_reais(con, nome)
        if not reais:
            problemas.append(f"tabela de destino inexistente no banco: {nome}")
            continue
        for c in m.migraveis():
            if c.destino and c.destino not in reais:
                problemas.append(f"{nome}.{c.destino} — no de-para, ausente no banco")

    # As dez conferências do `FR-019.6`, sobre o `staging` já preparado. Ficam aqui, na
    # mesma função, porque o contrato é um só: **nada é escrito em `public` enquanto
    # houver problema conhecido**, venha ele do de-para ou da origem.
    falhas, avisos = verificacao_previa(con)
    problemas.extend(str(f) for f in falhas)
    for aviso in avisos:
        print(f"  (aviso) {aviso}")
    return problemas


# ---------------------------------------------------------------------------------
# As quatro sequências de código e de onde sai o maior valor já carregado.
#
# ⚠️ O MOTIVO É MEDIDO, E ESTÁ ESCRITO AQUI PORQUE QUEM TESTAR PELO CAMINHO BOM CONCLUI
#    QUE ESTE PASSO É REDUNDANTE (17/09/2026). Aplicando as migrations SOBRE A BASE JÁ
#    CARREGADA, o `setval` da migration 4 posiciona a sequência no maior código
#    existente — medido: 210 — e o passo parece desnecessário. No caminho INVERSO, que é
#    o de todo dia (`pnpm db:reset` primeiro, carga depois), as migrations rodam sobre
#    base VAZIA, a sequência fica em 1, o ETL grava `TDI-000001` a `TDI-000210`
#    explicitamente, e A PRIMEIRA TURMA NOVA COLIDE COM `23505`. Mesmo princípio do
#    `--no-file-parallelism`: sinalizador sem motivo registrado é sinalizador apagado.
#
# ⚠️ E O CÓDIGO NÃO É SEMPRE `PREFIXO-NNNNNN`: `instrutores.codigo` é numérico puro. Por
#    isso a extração do número é declarada por tabela, e não adivinhada.
SEQUENCIAS_DE_CODIGO: tuple[tuple[str, str, str], ...] = (
    # (sequência, tabela, expressão SQL que extrai o número do código)
    ("app.turma_disciplina_codigo_seq", "turma_disciplina",
     "case when codigo ~ '^TDI-[0-9]+$' then substring(codigo from 5)::bigint end"),
    ("app.curso_regime_historico_codigo_seq", "curso_regime_historico",
     "case when codigo ~ '^REG-[0-9]+$' then substring(codigo from 5)::bigint end"),
    # As duas da fatia (c). Elas ainda têm a rede do `MAX+1` dentro da própria função
    # (pendência T132 da spec 006), mas depender dela é depender de uma rede que a T132
    # vai tirar — e o dia em que ela sair, a colisão volta sem aviso.
    ("app.instrutor_disciplina_codigo_seq", "instrutor_disciplina",
     "case when codigo ~ '^VIN-[0-9]+$' then substring(codigo from 5)::bigint end"),
    ("app.instrutores_codigo_seq", "instrutores",
     "case when codigo ~ '^[0-9]+$' then codigo::bigint end"),
)


def avancar_sequencias(con: psycopg.Connection) -> dict[str, int]:
    """Põe cada sequência de código à frente do maior valor CARREGADO.

    ⚠️ RODA DEPOIS DA PROMOÇÃO E DENTRO DA MESMA TRANSAÇÃO — está definida aqui, com o
    resto da carga, mas é chamada por `promover.promover()`: ela lê `public`, que no
    início da carga está vazia. Fora da transação, uma promoção desfeita deixaria as
    sequências avançadas para linhas que não existem.

    ⚠️ `setval(..., n, true)` significa "o último valor USADO foi n", então o próximo
    `nextval` devolve n+1 — que é exatamente o que se quer. Com `false` o próximo seria
    n, e a primeira turma nova colidiria com a última carregada: o erro mais caro
    possível, porque só aparece na primeira escrita de quem usa o sistema.
    """
    avancadas: dict[str, int] = {}
    with con.cursor() as k:
        for sequencia, tabela, extrair in SEQUENCIAS_DE_CODIGO:
            k.execute(f"select coalesce(max({extrair}), 0) from public.{tabela}")
            maior = int(k.fetchone()[0] or 0)
            if maior <= 0:
                # Tabela vazia: a sequência fica onde está. `setval(seq, 0)` é erro.
                avancadas[sequencia] = 0
                continue
            k.execute("select setval(%s, %s, true)", (sequencia, maior))
            avancadas[sequencia] = maior
    return avancadas


class DestinoJaCarregado(RuntimeError):
    """`--primeira-carga` contra destino que já tem dado carregado. Recusa antes de escrever."""


def dados_ja_carregados(con: psycopg.Connection) -> list[tuple[str, int]]:
    """As tabelas do destino que já têm dado vindo de uma carga anterior.

    ⚠️ **ISTO É O QUE A AMBIENTE-2 EXIGE** *(decisão de Bernardo Villas Boas, 21/09/2026,
    amarrada em 22/09)*: **nenhuma carga contra o remoto antes de o script recusar
    `--primeira-carga` contra destino com dados.** Até aqui, o que impedia uma segunda
    carga era **colisão de chave no meio da promoção** — transação desfeita, saída 3, mas
    **por acidente**: a recusa vinha de uma `unique`, não de uma decisão. Proteção
    acidental é exatamente o que esta fatia vem eliminando.

    ⚠️ **O CRITÉRIO É A PROCEDÊNCIA, e não "a tabela tem linha".** `origem_migracao_v1`
    marca o que veio da v2.0; o que a plataforma ou uma migration semeiam — a matriz de
    permissões, a escala de antiguidade, o primeiro usuário — **não** conta, e é por isso
    que um destino recém-migrado continua elegível. `migracao_log` entra pela contagem,
    porque ela é o rastro e não carrega procedência (mapa §24).
    """
    achados: list[tuple[str, int]] = []
    with con.cursor() as k:
        for tabela in ordem.ORDEM_DE_CARGA:
            if tabela == "migracao_log":
                k.execute("select count(*) from public.migracao_log")
            else:
                k.execute(
                    "select count(*) from information_schema.columns where table_schema='public' "
                    "and table_name=%s and column_name='origem_migracao_v1'",
                    (tabela,),
                )
                if not k.fetchone()[0]:
                    continue
                k.execute(
                    f"select count(*) from public.{tabela} where origem_migracao_v1 is not null"
                )
            n = int(k.fetchone()[0])
            if n:
                achados.append((tabela, n))
    return achados


def carregar(conexao: str = CONEXAO_LOCAL, *, somente_conferir: bool = False,
             primeira_carga: bool = False) -> Relatorio:
    rel = Relatorio()
    with psycopg.connect(conexao) as con:
        con.autocommit = False

        # ⚠️ A ORDEM AQUI MUDOU EM 18/09/2026, E A MUDANÇA É O PONTO: a verificação prévia
        #    do `FR-019.6` lê o `staging`, então o `staging` precisa existir antes dela.
        #    Preparar staging é escrita — mas em `staging`, que é efêmero por definição, e
        #    DENTRO desta transação: se a verificação recusar, o `rollback` desfaz até a
        #    criação das tabelas (DDL é transacional no PostgreSQL), e a base fica
        #    **byte a byte** como estava. É isso que faz "nada foi escrito" ser uma
        #    afirmação conferível, e não uma promessa.
        # A recusa da AMBIENTE-2 vem ANTES de qualquer outra coisa: se o destino já tem
        # carga, nem o `staging` precisa ser mexido.
        if primeira_carga:
            ja = dados_ja_carregados(con)
            if ja:
                con.rollback()
                raise DestinoJaCarregado(
                    "`--primeira-carga` contra destino que JA TEM DADO CARREGADO — nada foi escrito:\n  "
                    + "\n  ".join(f"public.{t}: {n} linha(s)" for t, n in ja)
                    + "\n  A primeira carga e a ULTIMA (AMBIENTE-2, 21/09/2026). Se a intencao e"
                    "\n  recarregar o ambiente local, rode `pnpm db:reset` antes. Contra o remoto,"
                    "\n  recarregar exige decisao registrada: o que ja esta la foi conferido contra"
                    "\n  a origem."
                )

        preparar_staging(con, rel)

        problemas = conferir_antes_de_escrever(con)
        if problemas:
            con.rollback()
            raise CoberturaIncompleta(
                "A carga foi recusada ANTES de escrever em `public` — nada foi gravado:\n  "
                + "\n  ".join(problemas[:40])
                + (f"\n  … e mais {len(problemas) - 40}" if len(problemas) > 40 else "")
            )
        if somente_conferir:
            con.rollback()
            return rel

        con.commit()
    return rel


if __name__ == "__main__":
    import sys

    conferir = "--conferir" in sys.argv
    try:
        rel = carregar(somente_conferir=conferir)
    except CoberturaIncompleta as erro:
        print(f"[ABORTADO] {erro}")
        sys.exit(1)

    if conferir:
        print("[OK] de-para conferido contra o banco: nenhuma divergencia")
        sys.exit(0)

    total = sum(rel.staging.values())
    print(f"staging carregada: {len(rel.staging)} tabelas, {total} linhas\n")
    for aba, n in sorted(rel.staging.items(), key=lambda kv: -kv[1])[:10]:
        print(f"  {aba:<32} {n:>6}")
