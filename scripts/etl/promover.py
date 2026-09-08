"""Etapa 4 — promoção `staging` → `public`, com resolução de chave estrangeira.

O QUÊ  : monta e executa, para cada tabela da ordem de carga, um
         `INSERT … SELECT … LEFT JOIN` que converte texto em tipo e resolve as FKs
         por `codigo`.

PARA QUÊ: é o ponto onde o dado deixa de ser retrato e vira base. Toda tabela passa
         por aqui, o que garante que a política de conversão, de procedência e de
         abortar seja **a mesma nas 25** — e não 25 variações parecidas.

COMO   : o SQL é **gerado a partir do `mapa.py`**, coluna a coluna. Não há SQL escrito
         à mão por tabela: a transformação declarada no mapa vira expressão aqui.

⚠️ VERIFICAÇÃO DE ÓRFÃOS ANTES DE GRAVAR (documento 30 §2.6): cada FK é conferida por
   `LEFT JOIN` antes do `INSERT`. Órfão **aborta a transação inteira** — nunca vira
   `NULL` silencioso, que é como uma migração perde vínculo sem ninguém notar.

⚠️ DOIS MODOS, e a diferença importa:
   · `--diagnostico` tenta todas as tabelas, coleta TODOS os erros e faz `ROLLBACK`.
     É para descobrir os 25 problemas de uma vez, em vez de um por execução.
   · sem a flag, é **uma transação única**: o primeiro erro derruba tudo (FR-005).
"""

from __future__ import annotations

import re
import unicodedata
from dataclasses import dataclass, field
from pathlib import Path

import psycopg

from . import mapa, ordem
from .mapa import T

CONEXAO_LOCAL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
NORMALIZADO = Path(__file__).parent / "dados" / "normalizado"

# Tabelas de destino cuja FK aponta para outra tabela — o alvo do `JOIN … ON codigo`.
# Declarado aqui e não adivinhado do nome: `instrutor_responsavel_id` e `fiscal_id`
# apontam ambas para `instrutores`, e nenhuma regra de sufixo acertaria isso.
ALVO_DA_FK: dict[str, str] = {
    "curso_id": "cursos",
    "turma_id": "turmas",
    "disciplina_id": "disciplinas",
    "instrutor_id": "instrutores",
    "usuario_id": "usuarios",
    "configuracao_id": "configuracoes_horario",
    "configuracao_horario_id": "configuracoes_horario",
    "instrutor_responsavel_id": "instrutores",
    "fiscal_id": "instrutores",
    "item_planejado_id": "avaliacoes_planejadas",
    "avaliacao_destino_id": "avaliacoes",
    "turma_prevista_id": "turmas",
    "unidade_ensino_id": "unidades_ensino",
}


@dataclass
class Resultado:
    inseridas: dict[str, int] = field(default_factory=dict)
    erros: list[tuple[str, str]] = field(default_factory=list)
    orfaos: list[str] = field(default_factory=list)
    puladas: dict[str, str] = field(default_factory=dict)
    dominios_sem_destino: list[str] = field(default_factory=list)
    vocabulario_semeado: list[tuple[str, str]] = field(default_factory=list)


def _col(nome: str) -> str:
    return f'"{nome}"'


def _id(bruto: str) -> str:
    from .carregar import _identificador

    return _identificador(bruto)


def _origem(c) -> str:
    """A expressão que lê a coluna de origem na staging, já normalizada de nome."""
    from .carregar import _identificador

    return _col(_identificador(c.origem)) if c.origem else "null"


def expressao(c, aba: str) -> str | None:
    """Converte a transformação declarada no mapa em expressão SQL.

    Devolve `None` para o que não se promove — o chamador simplesmente omite a coluna.
    """
    o = _origem(c)
    match c.transf:
        case T.DESCARTADA | T.GERADA | T.STAGING:
            return None
        case T.TEXTO:
            return f"nullif(btrim({o}), '')"
        case T.TEXTO_OU_NULO | T.BRUTO:
            return f"nullif(btrim({o}), '')"
        case T.INTEIRO:
            return f"nullif(regexp_replace({o}, '[^0-9-]', '', 'g'), '')::integer"
        case T.DECIMAL:
            return f"nullif(replace(btrim({o}), ',', '.'), '')::numeric"
        case T.HORA:
            return f"nullif(btrim({o}), '')::time"
        case T.BOOLEANO:
            return f"(upper(btrim({o})) in ('TRUE','VERDADEIRO','SIM','1'))"
        case T.DATA_CIVIL:
            # ⚠️ SEM conversão de fuso (FR-019). Dia civil não tem fuso, e convertê-lo
            # é precisamente como se produz o deslocamento de um dia.
            return f"nullif(left(btrim({o}), 10), '')::date"
        case T.INSTANTE:
            return f"(nullif(btrim({o}), '')::timestamp at time zone 'America/Sao_Paulo')"
        case T.DOMINIO:
            # minúsculo + underscore. O ENUM do banco recusa o que não estiver no
            # domínio — e recusar é o comportamento correto (documento 30 §6.7).
            return f"nullif(lower(translate(btrim({o}), ' -', '__')), '')"
        case T.STATUS:
            # vazio → 'ativo' EXPLÍCITO. É decisão da migração, não observação.
            return f"coalesce(nullif(lower(btrim({o})), ''), 'ativo')"
        case T.PROCEDENCIA:
            return f"'{aba}:' || btrim({o})"
        case T.LITERAL:
            return _literal_da_nota(c)
        case T.DERIVADA:
            return None  # tratada fora do gerador; ver `unidade_ensino_id`
        case T.FK | T.FK_OPCIONAL:
            return None  # resolvida por JOIN; ver `montar_insert`
        case T.EMAIL_UUID:
            return None  # resolvida por JOIN em `usuarios`
    return None


def _literal_da_nota(c) -> str:
    """`T.LITERAL` guarda o valor no INÍCIO da nota — extrai-o, ou devolve `null`.

    ⚠️ POR QUE "no início", e não "em qualquer lugar": a primeira versão procurava a
    primeira aspa simples da nota inteira. Notas como
    `"NULL na carga. CHECK exige nao-nulo se status='substituido'"` faziam a regex
    devolver `'substituido'` — e o `INSERT` tentava gravar essa palavra numa coluna
    `uuid`. O valor é o que a nota AFIRMA, e a convenção do mapa é afirmá-lo antes do
    travessão (`'ativo' — coluna nova`). Aspa no meio de uma frase é prosa, não valor.
    """
    achado = re.match(r"\s*'([^']*)'", c.nota or "")
    return f"'{achado.group(1)}'" if achado else "null"



def _chave(v: str) -> str:
    """Normaliza um rótulo para comparação: sem acento, minúsculo, `_` no lugar de espaço.

    É a MESMA normalização aplicada dos dois lados — ao valor da origem e ao rótulo do
    ENUM. Comparar normalizado e devolver o rótulo VERBATIM é o que faz `AEC` continuar
    `AEC` (o ENUM `categoria_normativa` é maiúsculo) enquanto `Dedicação Exclusiva` vira
    `dedicacao_exclusiva`. Um `lower()` cru quebraria o primeiro caso em silêncio — e foi
    exatamente o que a primeira versão fez.
    """
    sem = unicodedata.normalize("NFKD", v.strip())
    sem = "".join(c for c in sem if not unicodedata.combining(c))
    sem = sem.lower().replace(" ", "_").replace("-", "_")
    while "__" in sem:
        sem = sem.replace("__", "_")
    return sem.strip("_")


def rotulos_do_enum(con: psycopg.Connection, tipo: str) -> list[str]:
    with con.cursor() as k:
        k.execute(
            "select e.enumlabel from pg_type t join pg_enum e on e.enumtypid = t.oid "
            "where t.typname = %s order by e.enumsortorder",
            (tipo,),
        )
        return [r[0] for r in k.fetchall()]


def traducao(con: psycopg.Connection, tabela: str, destino: str, tipo: str) -> dict[str, str]:
    """`chave normalizada da origem -> rótulo do ENUM`, na ordem de precedência.

    1. O próprio rótulo do ENUM — resolve a maioria sem ninguém declarar nada.
    2. O `DE_PARA_DOMINIO` do mapa, que VENCE: é a tradução escrita à mão, com
       justificativa, para quando a v2.0 usa outra palavra.
    """
    de_para: dict[str, str] = {_chave(r): r for r in rotulos_do_enum(con, tipo)}
    for origem, alvo in mapa.DE_PARA_DOMINIO.get((tabela, destino), {}).items():
        de_para[_chave(origem)] = alvo
    return de_para


def _normalizada_em_sql(o: str) -> str:
    """A `_chave()` acima, escrita em SQL. As duas TÊM de concordar — se divergirem, o
    pré-voo aprova um valor que o `CASE` depois não reconhece, e o `INSERT` grava nulo.
    """
    return (
        "btrim(regexp_replace(lower(extensions.unaccent(btrim({}))), "
        "'[ -]+', '_', 'g'), '_')"
    ).format(o)


def resolver_dominio(o: str, de_para: dict[str, str], tipo: str, padrao: str | None) -> str:
    """Monta o `CASE` que converte o texto da origem no rótulo do ENUM.

    O `CASE` nasce dos RÓTULOS, nunca dos dados: rodar duas vezes produz o mesmo SQL.
    Valor que não casa cai no `else null` — e é para que isso nunca aconteça calado que
    `conferir_dominios()` roda antes.
    """
    ramos = "\n            ".join(
        "when '{}' then '{}'".format(k, v) for k, v in sorted(de_para.items()) if k
    )
    alvo = "nullif({}, '')".format(_normalizada_em_sql(o))
    caso = "(case {}\n            {}\n            else null end)".format(alvo, ramos)
    if padrao:
        caso = "coalesce({}, '{}')".format(caso, padrao)
    return "({})::public.{}".format(caso, tipo)


class DominioSemDestino(RuntimeError):
    """Valor de domínio na origem que nenhum rótulo e nenhum de-para alcança."""


class ChaveOrfa(RuntimeError):
    """Chave estrangeira da origem que não encontra destino. Aborta a carga inteira."""


def conferir_orfaos(con: psycopg.Connection) -> list[str]:
    """Pré-voo: toda chave estrangeira da origem que não acha destino, com contagem.

    ⚠️ ISTO ESTAVA PROMETIDO NO CABEÇALHO DO MÓDULO E NÃO ACONTECIA. `montar_insert`
    montava a lista de FKs a conferir e o chamador a descartava (`sql, _ = …`). O
    efeito prático: um `LEFT JOIN` sem correspondência devolve NULL, e onde a coluna
    aceitasse nulo a linha entraria **com o vínculo perdido e sem erro nenhum** — que é
    exatamente o modo como uma migração perde vínculo sem ninguém notar. Foi assim que
    as 12 reservas do PROENS chegaram ao `INSERT` com `curso_id` nulo.

    Aqui a conferência é feita de verdade, ANTES de escrever, e cobre `T.FK` e
    `T.FK_OPCIONAL` — a diferença entre as duas é se a coluna aceita nulo no destino,
    não se a chave pode apontar para o vazio. Valor declarado em `SENTINELAS_DE_FK` não
    conta como órfão: ele significa, por combinação, "não aponta para nada".
    """
    from .carregar import _identificador

    problemas: list[str] = []
    for nome in ordem.ORDEM_DE_CARGA:
        m = mapa.MAPAS.get(nome)
        if not m:
            continue
        for c in m.colunas:
            if c.transf not in (T.FK, T.FK_OPCIONAL) or not c.origem or not c.destino:
                continue
            alvo = ALVO_DA_FK.get(c.destino)
            if not alvo:
                continue
            col = _identificador(c.origem)
            fora = mapa.SENTINELAS_DE_FK.get((nome, c.destino), frozenset())
            excecao = ""
            if (nome, c.destino) in mapa.MULTIVALORADAS:
                # A lista é conferida instrutor a instrutor pela carga da junção, que
                # aborta se algum deles não existir. Conferi-la aqui como chave única
                # acusaria órfão em toda linha múltipla, que é ruído, não achado.
                excecao += ' and btrim(s."{}") not like \'%,%\''.format(col)
            if fora:
                excecao = " and btrim(s.\"{}\") not in ({})".format(
                    col, ", ".join("'{}'".format(x) for x in sorted(fora))
                )
            try:
                with con.cursor() as k:
                    k.execute(
                        'select btrim(s."{c}") v, count(*) from staging."{a}" s '
                        'where nullif(btrim(s."{c}"), \'\') is not null{e} '
                        "  and not exists (select 1 from public.{t} d "
                        '                  where d.codigo = btrim(s."{c}")) '
                        "group by 1 order by 2 desc".format(
                            c=col, a=m.aba, e=excecao, t=alvo
                        )
                    )
                    achados = k.fetchall()
            except psycopg.Error:
                con.rollback()
                continue
            for valor, n in achados:
                problemas.append(
                    "{}.{} -> {}: {!r} em {} linha(s) — nao existe em {}.codigo".format(
                        nome, c.destino, alvo, valor, n, alvo
                    )
                )
    return problemas


def conferir_parametros_superados(con: psycopg.Connection) -> list[str]:
    """Os 13 pares chave-legada / chave-canônica declaram o MESMO número?

    ⚠️ POR QUE ISTO ABORTA EM VEZ DE INFORMAR: desativar a chave da v2.0 é seguro
    enquanto ela disser a mesma coisa que a canônica. Se os números divergirem, não há
    duplicidade de nomenclatura: há duas afirmações incompatíveis sobre qual é a norma,
    e desativar uma delas escolheria a resposta em silêncio. A carga para, nomeia as
    duas chaves e os dois valores, e alguém decide.

    Confere contra a ORIGEM em `staging`, e não contra `public`, porque no momento em
    que roda a linha da v2.0 ainda não foi gravada — é justamente o que se quer: saber
    antes de escrever.
    """
    problemas: list[str] = []
    with con.cursor() as k:
        for legada, canonica in sorted(mapa.PARAMETROS_SUPERADOS_PELO_SEED.items()):
            k.execute(
                """
                select (select btrim(s."valor") from staging."Config_Parametros" s
                         where lower(btrim(s."chave")) = %s),
                       (select btrim(p.valor) from public.config_parametros p
                         where p.chave = %s and p.origem_migracao_v1 is null)
                """,
                (legada, canonica),
            )
            na_v20, no_seed = k.fetchone()
            if na_v20 is None:
                problemas.append(
                    f"{legada}: declarada como superada, mas NAO EXISTE em "
                    f"Config_Parametros — a declaracao esta velha"
                )
            elif no_seed is None:
                problemas.append(
                    f"{canonica}: e a chave canonica de {legada}, mas NAO FOI SEMEADA "
                    f"pela migration — desativar {legada} perderia o parametro"
                )
            elif na_v20 != no_seed:
                problemas.append(
                    f"{legada} = {na_v20!r} mas {canonica} = {no_seed!r} — nao e "
                    f"duplicidade de nome, e conflito sobre qual e a norma"
                )
    return problemas


def conferir_dominios(con: psycopg.Connection) -> list[str]:
    """Pré-voo: lista todo valor de domínio sem destino, com a contagem de linhas.

    ⚠️ É o irmão de `conferir_antes_de_escrever()`, e existe pela mesma razão: um valor
    fora do domínio só aparece no `INSERT`, derruba a transação depois de dezesseis
    tabelas promovidas, e a mensagem do PostgreSQL diz o valor mas não diz QUANTAS linhas
    nem DE QUE COLUNA. Aqui diz as três coisas, antes de escrever qualquer uma.
    """
    from .carregar import _identificador

    problemas: list[str] = []
    for nome in ordem.ORDEM_DE_CARGA:
        m = mapa.MAPAS.get(nome)
        if not m:
            continue
        tipos = tipos_do_destino(con, nome)
        for c in m.colunas:
            if c.transf not in (T.DOMINIO, T.STATUS) or not c.destino or not c.origem:
                continue
            t = tipos.get(c.destino)
            if not t or t[0] != "USER-DEFINED":
                continue
            de_para = traducao(con, nome, c.destino, t[1])
            col = _identificador(c.origem)
            citada = chr(34) + col + chr(34)
            try:
                with con.cursor() as k:
                    k.execute(
                        "select {} v, count(*) from staging.{} "
                        "where nullif(btrim({}), '') is not null group by 1".format(
                            _normalizada_em_sql(citada), chr(34) + m.aba + chr(34), citada
                        )
                    )
                    achados = k.fetchall()
            except psycopg.Error:
                con.rollback()
                continue
            for valor, n in achados:
                if valor and valor not in de_para:
                    problemas.append(
                        "{}.{} [{}]: {!r} em {} linha(s) — sem rotulo e sem de-para".format(
                            nome, c.destino, t[1], valor, n
                        )
                    )
    return problemas


def metadados_do_destino(
    con: psycopg.Connection, tabela: str
) -> dict[str, tuple[str, str | None]]:
    """`coluna -> (is_nullable, column_default)` — para deixar o DEFAULT fazer o dele.

    ⚠️ POR QUE ISTO EXISTE: um `INSERT` que passa `NULL` EXPLICITAMENTE **não aciona o
    DEFAULT da coluna** — o DEFAULT só vale para coluna omitida da lista. Como o gerador
    monta uma lista fixa de colunas, `cursos.modalidade` (13 origens vazias, default
    `'presencial'`) e os três `criado_em` (default `now()`) falhavam no `NOT NULL` com o
    default a um centímetro de distância. `coalesce(expr, <default>)` reconstrói o
    comportamento pretendido sem tirar a coluna da lista — e mantém o valor da origem
    quando ele existe, que é o ponto.
    """
    with con.cursor() as k:
        k.execute(
            "select column_name, is_nullable, column_default from information_schema.columns "
            "where table_schema='public' and table_name=%s",
            (tabela,),
        )
        return {r[0]: (r[1], r[2]) for r in k.fetchall()}


def tipos_do_destino(con: psycopg.Connection, tabela: str) -> dict[str, tuple[str, str]]:
    """`coluna -> (data_type, udt_name)` da tabela de destino.

    POR QUE CONSULTAR EM VEZ DE DECLARAR: o schema tem **18 ENUMs**, e `text` nao vira
    `escopo_curso` sozinho — o PostgreSQL exige `cast` explicito. Declarar os 18 no
    codigo seria uma segunda fonte de verdade sobre tipo, que divergiria na primeira
    migration. O catalogo do banco ja sabe; perguntar a ele e mais barato e nao mente.
    """
    with con.cursor() as k:
        k.execute(
            "select column_name, data_type, udt_name from information_schema.columns "
            "where table_schema='public' and table_name=%s",
            (tabela,),
        )
        return {r[0]: (r[1], r[2]) for r in k.fetchall()}


def montar_insert(
    con: psycopg.Connection, nome: str, m, tipos: dict[str, tuple[str, str]]
) -> tuple[str, list[str]]:
    """Devolve o `INSERT … SELECT` e a lista de FKs a conferir antes."""
    meta = metadados_do_destino(con, nome)
    destinos: list[str] = []
    expressoes: list[str] = []
    joins: list[str] = []
    fks: list[str] = []
    apelido = 0
    apelido_da_turma: str | None = None

    for c in m.colunas:
        if not c.destino:
            continue
        if c.transf in (T.FK, T.FK_OPCIONAL):
            alvo = ALVO_DA_FK.get(c.destino)
            if not alvo:
                continue
            apelido += 1
            a = f"fk{apelido}"
            # A sentinela é NEUTRALIZADA antes do JOIN: `GERAL` vira nulo aqui, e não
            # chega a ser procurada em `cursos`. É o que separa "não aponta para nada"
            # de "aponta para algo que não existe" — a segunda aborta.
            chave_sql = f"nullif(btrim(s.{_origem(c)}), '')"
            for sentinela in sorted(mapa.SENTINELAS_DE_FK.get((nome, c.destino), ())):
                chave_sql = f"nullif({chave_sql}, '{sentinela}')"
            # Célula com vírgula é lista, e lista não é chave: o atalho fica nulo e a
            # atribuição inteira vai para a tabela de junção. Ver `MULTIVALORADAS`.
            if (nome, c.destino) in mapa.MULTIVALORADAS:
                chave_sql = f"(case when {chave_sql} like '%,%' then null else {chave_sql} end)"
            joins.append(f"left join public.{alvo} {a} on {a}.codigo = {chave_sql}")
            destinos.append(_col(c.destino))
            expressoes.append(f"{a}.id")
            if alvo == "turmas":
                apelido_da_turma = a
            if c.transf is T.FK:
                fks.append(f"{c.destino}->{alvo} via {c.origem}")
            continue
        if c.transf is T.EMAIL_UUID:
            apelido += 1
            a = f"fk{apelido}"
            joins.append(
                f"left join public.usuarios {a} on lower({a}.email) = lower(nullif(btrim(s.{_origem(c)}), ''))"
            )
            destinos.append(_col(c.destino))
            expressoes.append(f"{a}.id")
            continue
        tipo = tipos.get(c.destino)
        # Domínio com destino ENUM não passa pelo gerador genérico: vai pelo `CASE`
        # que traduz rótulo a rótulo. É a única conversão do ETL que precisa
        # consultar o banco, porque o domínio de chegada mora lá.
        if c.transf in (T.DOMINIO, T.STATUS) and tipo and tipo[0] == "USER-DEFINED":
            if not c.origem:
                continue
            destinos.append(_col(c.destino))
            expressoes.append(
                resolver_dominio(
                    f"s.{_origem(c)}",
                    traducao(con, nome, c.destino, tipo[1]),
                    tipo[1],
                    "ativo" if c.transf is T.STATUS else None,
                )
            )
            continue

        e = expressao(c, m.aba)
        if e is None:
            continue
        e = e.replace(_origem(c), f"s.{_origem(c)}") if c.origem else e

        # Domínio em coluna `text` com CHECK (não ENUM): traduz o que o de-para declara
        # e DEIXA PASSAR o resto. Difere do caso ENUM de propósito — ali o domínio é
        # fechado e o desconhecido tem de abortar; aqui o CHECK do banco é quem julga,
        # e adivinhar por ele seria tirar-lhe o trabalho.
        if c.transf is T.DOMINIO and c.origem:
            declarado = mapa.DE_PARA_DOMINIO.get((nome, c.destino), {})
            if declarado:
                ramos = " ".join(
                    "when '{}' then '{}'".format(_chave(k), v) for k, v in declarado.items()
                )
                e = "(case {} {} else {} end)".format(
                    _normalizada_em_sql(f"s.{_origem(c)}"), ramos, e
                )

        # `cast` explicito quando o destino e tipo definido pelo usuario (ENUM). Vale
        # inclusive para `null` de T.LITERAL: um `null` cru chega ao INSERT tipado como
        # `text`, e o PostgreSQL recusa `text` numa coluna `uuid` mesmo sendo nulo.
        if tipo and tipo[0] == "USER-DEFINED":
            e = f"({e})::public.{tipo[1]}"
        elif tipo and c.transf is T.LITERAL:
            e = f"({e})::{tipo[1]}"
        destinos.append(_col(c.destino))
        expressoes.append(e)

    # ⚠️ `status = inativo` para a chave da v2.0 que o seed normativo da v2.1 superou.
    #    Sai no próprio INSERT, e não num UPDATE depois: a linha nunca chega a existir
    #    ativa, o que evita a janela em que duas chaves valeriam ao mesmo tempo.
    #    Exclusão LÓGICA — a linha é transportada, o valor fica legível, a chave antiga
    #    fica rastreável (regra 4 do CLAUDE.md; decisão de Bernardo de 08/09/2026).
    if nome == "config_parametros" and mapa.PARAMETROS_SUPERADOS_PELO_SEED:
        legadas = ", ".join(
            f"'{x}'" for x in sorted(mapa.PARAMETROS_SUPERADOS_PELO_SEED)
        )
        alvo = _col("status")
        if alvo in destinos:
            i = destinos.index(alvo)
            expressoes[i] = (
                f"(case when {_normalizada_em_sql(chr(115) + chr(46) + chr(34) + 'chave' + chr(34))}"
                f" in ({legadas}) then 'inativo' else {expressoes[i]}::text end)"
                f"::public.status_registro"
            )

    # ⚠️ `natureza` DECLARADA, em `config_parametros`. Tem de sair no proprio INSERT e
    #    nao num UPDATE depois: o CHECK `config_param_normativo_tem_fundamento` dispara
    #    na inserção, e a linha operacional seria recusada antes de haver o que corrigir.
    if nome == "config_parametros" and "natureza" in meta:
        chaves = ", ".join(f"'{x}'" for x in sorted(mapa.PARAMETROS_OPERACIONAIS))
        destinos.append(_col("natureza"))
        expressoes.append(
            f"(case when {_normalizada_em_sql('s.\"chave\"')} in ({chaves}) "
            f"then 'operacional' else 'normativo' end)"
        )

    # ⚠️ `curso_id` DERIVADO DA TURMA — `registros_aula` e `avaliacoes` são `NOT NULL`
    #    em `curso_id`, e a origem não traz a coluna: na v2.0 o curso se lia atravessando
    #    a turma, que é a mesma coisa que fazemos aqui, uma vez, no `JOIN` que já existe.
    #    NÃO é uma segunda fonte de verdade: `turmas.curso_id` continua sendo a única, e
    #    esta coluna é a desnormalização que o Épico 1 escolheu para a RLS de escopo
    #    poder filtrar por curso sem um segundo salto.
    if "curso_id" in meta and meta["curso_id"][0] == "NO" and '"curso_id"' not in destinos:
        if apelido_da_turma:
            destinos.append(_col("curso_id"))
            expressoes.append(f"{apelido_da_turma}.curso_id")

    # O DEFAULT da coluna cobre a origem vazia, em toda coluna NOT NULL que tenha um.
    for i, d in enumerate(destinos):
        nulavel, padrao = meta.get(d.strip('"'), ("YES", None))
        if nulavel == "NO" and padrao and not expressoes[i].startswith("coalesce("):
            expressoes[i] = f"coalesce({expressoes[i]}, {padrao})"

    if not destinos:
        return "", fks

    distinto = "distinct " if nome in ordem.NASCE_DE_ABA_COMPARTILHADA else ""

    # ⚠️ LINHA SEM A CHAVE DA ORIGEM NÃO É LINHA. `Turmas_Ativas` tem uma linha com tudo
    #    vazio menos `Ano_Letivo=2027` e `Status=Planejada` — resto de digitação numa
    #    planilha viva, não uma turma. Transportá-la criaria um registro fantasma de
    #    código nulo. É descartada aqui e **contada**, para sair na reconciliação:
    #    descartar em silêncio é que seria perda de dado.
    #
    #    A chave não é declarada: é a coluna de `T.PROCEDENCIA`, que por definição
    #    guarda o `ID_*` da v2.0. Uma fonte de verdade, não duas.
    filtro = ""
    chave = next((c.origem for c in m.colunas if c.transf is T.PROCEDENCIA and c.origem), None)
    if chave:
        filtro = f"""\nwhere nullif(btrim(s."{_id(chave)}"), '') is not null"""

    sql = (
        f"insert into public.{nome} ({', '.join(destinos)})\n"
        f"select {distinto}{', '.join(expressoes)}\n"
        f'from staging."{m.aba}" s\n'
        + ("\n".join(joins) if joins else "")
        + filtro
    )
    return sql, fks


# As quatro amarrações `coluna -> lista` que os gatilhos impõem (documento 31 §334,
# §335, §377 e a definição dos triggers). Declaradas aqui porque a semeadura precisa
# saber onde procurar o vocabulário realmente usado.
AMARRACOES = (
    ("Registro_Aulas_E_Atividades", "tipo_atividade", "tipos_atividade"),
    ("Registro_Aulas_E_Atividades", "metodologia", "metodologias"),
    ("Avaliacoes", "tipo_avaliacao", "tipos_avaliacao"),
    ("Avaliacoes", "metodologia", "metodologias"),
)


def semear_vocabulario_usado(con: psycopg.Connection) -> list[tuple[str, str]]:
    """Acrescenta a `config_listas` os valores que o histórico usa e a lista não tem.

    ⚠️ O ACHADO QUE ISTO RESOLVE: `Registro_Aulas.Tipo_Atividade` da v2.0 guarda
    `Aula Teórica` e `Aula Prática`; a lista `Tipos_Atividade` da mesma planilha guarda
    `Aula`, `Avaliação`, `Palestra`… — **os dois nunca foram o mesmo vocabulário**. A
    v2.0 não tinha como impor a lista (é planilha), então a coluna divergiu dela em
    silêncio por toda a vida do sistema. O gatilho `validar_dominio_config_lista` da
    v2.1 é a primeira vez que alguém confere, e ele recusa o histórico inteiro.

    ⚠️ POR QUE SEMEAR E NÃO TRADUZIR: traduzir `Aula Teórica` para `Aula` apagaria a
    distinção teórica/prática de 1.566 lançamentos — dado que existe e que o DSA
    imprime. `config_listas` é, por decisão de arquitetura, o "domínio operacional
    ADMINISTRÁVEL" (BRIEF §Convenções de banco): acrescentar valor a ela é a operação
    que ela existe para suportar. Os valores semeados ficam marcados por
    `origem_migracao_v1`, de modo que se distingam à vista dos que a Divisão cadastrou.
    """
    novos: list[tuple[str, str]] = []
    with con.cursor() as k:
        for aba, coluna, lista in AMARRACOES:
            k.execute(
                f'''select distinct nullif(btrim(s."{coluna}"), '')
                     from staging."{aba}" s
                     where nullif(btrim(s."{coluna}"), '') is not null
                       and not exists (select 1 from public.config_listas c
                                       where c.lista = %s and c.valor = btrim(s."{coluna}"))''',
                (lista,),
            )
            for (valor,) in k.fetchall():
                k.execute(
                    "insert into public.config_listas (lista, valor, rotulo_exibicao, ordem, "
                    "ativo, origem_migracao_v1) values (%s, %s, %s, %s, true, %s) "
                    "on conflict do nothing",
                    # `rotulo_exibicao` = o proprio valor: e literalmente como a v2.0
                    # o mostrava na tela. Inventar rotulo diferente do valor seria
                    # criar vocabulario novo, e o ponto aqui e nao criar nenhum.
                    (lista, valor, valor, 900 + len(novos),
                     f"{aba}.{coluna}:usado_sem_cadastro"),
                )
                novos.append((lista, valor))
    return novos


def carregar_juncao_instrutores(con: psycopg.Connection) -> int:
    """Explode `Turma_Disciplina.ID_Instrutor` em `turma_disciplina_instrutor`.

    Uma linha por par (turma_disciplina, instrutor) — inclusive quando o par é único.
    O `codigo` é composto pelos dois códigos de origem, o que o torna determinístico:
    reexecutar produz as mesmas chaves, que é o que a idempotência do FR-006 exige.

    ⚠️ `join` e não `left join`: instrutor citado na lista e inexistente em
    `instrutores` é ÓRFÃO, e a conferência de contagem logo abaixo o denuncia. Aqui um
    `left join` gravaria a linha com instrutor nulo — a coluna é `NOT NULL`, então o
    banco recusaria; mas a mensagem falaria de nulo, não do instrutor que sumiu.
    """
    with con.cursor() as k:
        k.execute(
            """
            insert into public.turma_disciplina_instrutor
              (codigo, turma_disciplina_id, instrutor_id, ch_prevista_tempos,
               origem_migracao_v1)
            select td.codigo || '#' || i.codigo,
                   td.id,
                   i.id,
                   nullif(replace(btrim(s."ch_prevista_por_instrutor"), ',', '.'), '')::numeric,
                   'Turma_Disciplina:' || btrim(s."id_turma_disciplina") || '#' || i.codigo
            from staging."Turma_Disciplina" s
            cross join lateral unnest(string_to_array(btrim(s."id_instrutor"), ',')) as parte(v)
            join public.instrutores i on i.codigo = btrim(parte.v)
            join public.turma_disciplina td on td.codigo = btrim(s."id_turma_disciplina")
            where nullif(btrim(s."id_instrutor"), '') is not null
            on conflict do nothing
            """
        )
        gravadas = k.rowcount

        # PROVA, NÃO DECLARAÇÃO: quantas atribuições a origem tem, contadas de novo e
        # por outro caminho. Se as duas contagens divergirem, algum instrutor da lista
        # não existe em `instrutores` — e a carga para aqui, não na reconciliação.
        k.execute(
            """
            select sum(cardinality(string_to_array(btrim("id_instrutor"), ',')))
            from staging."Turma_Disciplina"
            where nullif(btrim("id_instrutor"), '') is not null
            """
        )
        esperadas = k.fetchone()[0] or 0
    if gravadas != esperadas:
        raise ChaveOrfa(
            f"turma_disciplina_instrutor: a origem declara {esperadas} atribuicoes e "
            f"apenas {gravadas} acharam instrutor. A diferenca sao instrutores citados "
            f"em Turma_Disciplina.ID_Instrutor que nao existem em Cad_Instrutor."
        )
    return gravadas


def promover(conexao: str = CONEXAO_LOCAL, *, diagnostico: bool = False) -> Resultado:
    res = Resultado()
    with psycopg.connect(conexao) as con:
        con.autocommit = False

        # PRÉ-VOO: domínio sem destino aborta ANTES de qualquer escrita.
        superados = conferir_parametros_superados(con)
        if superados:
            raise DominioSemDestino(
                "Parametros superados pelo seed em conflito — nada foi escrito:\n  "
                + "\n  ".join(superados)
            )

        res.dominios_sem_destino = conferir_dominios(con)
        if res.dominios_sem_destino and not diagnostico:
            raise DominioSemDestino(
                "Valores de dominio sem destino — nada foi escrito:\n  "
                + "\n  ".join(res.dominios_sem_destino)
            )

        # A conferência de órfãos precisa das tabelas de destino JÁ POVOADAS para ter
        # contra o que comparar, e no início da transação elas estão vazias. Roda,
        # portanto, ao FIM — antes do commit, e num modo em que abortar ainda desfaz
        # tudo. Ver a chamada depois do laço.

        for nome in ordem.ORDEM_DE_CARGA:
            if nome in mapa.SEM_DE_PARA:
                res.puladas[nome] = mapa.SEM_DE_PARA[nome]
                continue
            m = mapa.MAPAS.get(nome)
            if m is None:
                res.erros.append((nome, "sem mapa — nao carregada"))
                continue

            tipos = tipos_do_destino(con, nome)
            sql, _ = montar_insert(con, nome, m, tipos)
            if not sql:
                res.puladas[nome] = "nenhuma coluna promovivel"
                continue

            # `config_listas` precisa do vocabulário completo ANTES das tabelas cujos
            # gatilhos a consultam — e a ordem de carga já garante que ela vem primeiro.
            if nome == "registros_aula" and not res.vocabulario_semeado:
                res.vocabulario_semeado = semear_vocabulario_usado(con)

            ponto = f"sp_{nome}"
            try:
                with con.cursor() as k:
                    if diagnostico:
                        k.execute(f"savepoint {ponto}")
                    k.execute(sql)
                    res.inseridas[nome] = k.rowcount
                # A junção sai da MESMA aba do pai e depende das linhas dele já
                # gravadas — por isso aqui, e não como uma 26ª entrada da ordem.
                if nome == "turma_disciplina":
                    res.inseridas["turma_disciplina_instrutor"] = (
                        carregar_juncao_instrutores(con)
                    )
            except psycopg.Error as erro:
                msg = str(erro).split("\n")[0][:180]
                res.erros.append((nome, msg))
                if diagnostico:
                    with con.cursor() as k:
                        k.execute(f"rollback to savepoint {ponto}")
                else:
                    con.rollback()
                    raise

        # ÓRFÃOS: agora que as tabelas de destino estão povoadas, a comparação tem
        # sentido. Ainda dentro da transação — abortar aqui desfaz as 25 tabelas.
        res.orfaos = conferir_orfaos(con)
        if res.orfaos and not diagnostico:
            con.rollback()
            raise ChaveOrfa(
                "Chaves estrangeiras sem destino — nada foi escrito:\n  "
                + "\n  ".join(res.orfaos)
            )

        con.rollback() if diagnostico else con.commit()
    return res


if __name__ == "__main__":
    import sys

    diag = "--diagnostico" in sys.argv
    res = promover(diagnostico=diag)

    print(f"{'DIAGNOSTICO (rollback)' if diag else 'CARGA (commit)'}\n")
    total = 0
    for nome in list(ordem.ORDEM_DE_CARGA) + ["turma_disciplina_instrutor"]:
        if nome in res.inseridas:
            n = res.inseridas[nome]
            total += n
            print(f"  [ok]    {nome:<26} {n:>6}")
        elif nome in res.puladas:
            print(f"  [pulo]  {nome:<26} {res.puladas[nome][:44]}")
    print(f"\n  total inserido: {total}")
    if res.vocabulario_semeado:
        print(f"\n  {len(res.vocabulario_semeado)} valor(es) semeados em config_listas "
              f"(usados pelo historico, ausentes da lista):")
        for lista, valor in res.vocabulario_semeado:
            print(f"    {lista:<20} {valor}")
    if res.orfaos:
        print(f"\n  {len(res.orfaos)} chave(s) estrangeira(s) orfa(s):")
        for v in res.orfaos:
            print(f"    {v}")
    if res.dominios_sem_destino:
        print(f"\n  {len(res.dominios_sem_destino)} valor(es) de dominio sem destino:")
        for v in res.dominios_sem_destino:
            print(f"    {v}")
    if res.erros:
        print(f"\n  {len(res.erros)} tabela(s) com erro:")
        for nome, msg in res.erros:
            print(f"    {nome:<26} {msg}")
        sys.exit(1)
