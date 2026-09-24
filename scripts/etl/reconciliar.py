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
from datetime import datetime
from pathlib import Path

import psycopg

from psycopg import sql as psql

from . import correcoes, mapa, ordem

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

    # ⚠️ CONTRA QUAL BASE ISTO FOI MEDIDO. O relatório é um arquivo só, sobrescrito por
    #    qualquer execução, e sem esta linha ele não diz se o veredito veio do banco do
    #    Docker ou do projeto remoto. Em 23/09/2026 o custo apareceu: um BLOQUEADA vindo
    #    do remoto foi lido como sujeira da base local, e as duas leituras cabiam no mesmo
    #    arquivo (`CLAUDE.md`, regra 9.2 — número medido nomeia o artefato).
    medido_contra: str = ""
    medido_em: str = ""

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
# TABELAS EM QUE A PRÓPRIA CARGA ESCREVE — e como separar o transportado do criado
#
# ⚠️ ESTA LISTA NASCEU DE UMA DIVERGÊNCIA REAL, em 18/09/2026, e o registro importa mais
#    que a correção. A carga da fatia (a) do Épico 5 passou a gravar em `migracao_log` um
#    evento `corrigido` por grafia de sala reconciliada (`FR-029.8`) — 9 eventos. A R-01 e
#    a R-06 contavam a TABELA INTEIRA contra a linha de base da origem (930) e passaram a
#    acusar 939.
#
#    ⚠️ **E A CORREÇÃO NÃO FOI TROCAR 930 POR 939.** Trocar o número seria atualizar o
#    esperado para igualar o que saiu — e a partir daí a verificação não pegaria mais uma
#    linha de origem perdida, porque qualquer total passaria a ser "o total". O esperado
#    da ORIGEM continua **930**, e o que mudou foi *o que se conta*: só o transportado.
#    Os eventos criados pela carga ganharam verificação PRÓPRIA, na R-06, que confere que
#    cada um descreve uma correção que de fato aconteceu.
#
#    O separador é `observacao`, declarada no de-para como "coluna nova para eventos da
#    v2.1": linha vinda da planilha a tem NULA, por construção.
NASCEM_DA_PROPRIA_CARGA: dict[str, str] = {
    "migracao_log": "observacao is null",
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


# =====================================================================================
# LINHAS QUE NASCEM DA PLATAFORMA — procedência nula é o registro certo, não é lacuna
#
# ⚠️ EXCEÇÃO ÚNICA, DELIMITADA E DATADA — *"a exceção da R-05 vale só para `usuarios`, só
#    para linha vinculada a uma credencial do Auth, e não dispensa procedência em nenhuma
#    outra tabela"* (autorização de Bernardo Villas Boas, 23/09/2026).
#
# O QUE ACONTECEU: a reconciliação da carga contra o projeto REMOTO saiu **BLOQUEADA** por
#    uma linha só — `USR-ADMIN-001`, perfil `admin`, `origem_migracao_v1` nula. Ela não veio
#    da planilha da v2.0: é a conta que abriu o próprio ambiente, criada pelo Supabase Auth.
#    Exigir procedência dela é exigir que declare uma origem que não existe, e preencher o
#    campo para acalmar a verificação seria inventar migração — o contrário do que a R-05
#    existe para garantir.
#
# ⚠️ POR QUE A CONDIÇÃO É `auth_user_id`, E NÃO "a tabela `usuarios` é isenta": porque
#    `usuarios` RECEBE linhas migradas, e elas têm de continuar declarando procedência. A
#    coluna separa as duas populações sem ambiguidade: é FK para `auth.users` (migration
#    `20260830000111`) e quem a preenche é `app.vincular_credencial()` (migration
#    `20260911230000`), uma vez só, no primeiro acesso de quem aceitou o convite. Ela é
#    portanto a marca de uma conta que existe de verdade. Linha de `usuarios` sem
#    procedência **e sem credencial** continua bloqueando, e esse é justamente o caso de
#    uma linha migrada que perdeu a marca — e o de um convite ainda não aceito.
#
# ⚠️ E A ISENÇÃO NÃO ALCANÇA NENHUMA OUTRA TABELA. O dicionário é lido por nome: o que não
#    está aqui é conferido como sempre foi. Acrescentar tabela aqui é decisão do Bernardo,
#    não manutenção.
# =====================================================================================

NASCEM_DA_PLATAFORMA: dict[str, str] = {
    "usuarios": "auth_user_id is not null",
}


# =====================================================================================
# LINHAS QUE O APLICATIVO CRIOU DEPOIS DA CARGA — a segunda isenção, e esta é GERAL
#
# ⚠️ DECISÃO DE BERNARDO VILLAS BOAS, 24/09/2026: *"o banco remoto passa a ser a fonte da
#    verdade dos CADASTROS (cursos, turmas, instrutores; disciplinas quando a fatia (b) for
#    mesclada). Testadores vão editar e completar esses dados pelo preview."* A partir daí,
#    linha sem procedência deixa de ser sintoma de carga incompleta e passa a ser o registro
#    normal do que **nasceu na tela** — exigir `origem_migracao_v1` dela seria exigir que
#    declarasse uma migração que não houve.
#
# ⚠️ O QUE SEPARA AS DUAS POPULAÇÕES É A AUDITORIA, e ela não se preenche sozinha:
#    `criado_por` vem do gatilho `app.set_auditoria()`, a partir de `auth.uid()` — isto é,
#    **só existe quando houve sessão autenticada**. O ETL carrega pela `service_role`, sem
#    sessão: tudo que ele grava sai com `criado_por` NULO. Logo:
#
#      sem procedência **e** COM auditoria  ->  nasceu no aplicativo, é legítima
#      sem procedência **e** SEM auditoria  ->  continua BLOQUEANDO, como sempre
#
#    A segunda linha é o que mantém a regra viva: é o caso da linha migrada que perdeu a
#    marca, e o do dado inserido à mão por fora do sistema.
#
# ⚠️ E ELA NÃO SUBSTITUI A ISENÇÃO DE `usuarios`, ACIMA — as duas convivem, por motivos
#    diferentes e MEDIDOS. `USR-ADMIN-001`, a conta que abriu o ambiente, tem credencial do
#    Auth e `criado_por` **nulo**; medido no projeto remoto em 24/09/2026, os quatro
#    cadastros anteriores à decisão têm `criado_por` nulo e só o quinto — criado pela tela em
#    23/09 — o tem preenchido. Trocar uma isenção pela outra faria a conta do Admin voltar a
#    bloquear.
#
# ⚠️ A ISENÇÃO SÓ VALE ONDE A COLUNA EXISTE. Tabela sem `criado_por` não ganha nada: o
#    recorte é montado a partir das colunas lidas do catálogo, e não de uma lista à mão.
# =====================================================================================

CRIADA_PELO_APLICATIVO = "criado_por is not null"


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
            elif tabela in NASCEM_DA_PROPRIA_CARGA:
                # ⚠️ `migracao_log` NÃO TEM `origem_migracao_v1` — e a ausência é
                #    deliberada (mapa §24: "o log É o rastro; um rastro do rastro seria
                #    recursão sem informação"). Mas a partir de 18/09/2026 o ETL passou a
                #    ESCREVER nela: cada correção de grafia de sala vira um evento
                #    `corrigido` (`FR-029.8`). Contar a tabela inteira passou a misturar
                #    o que veio da origem com o que esta carga criou.
                #
                #    O separador é `observacao`, que o próprio de-para declara como
                #    "coluna nova para eventos da v2.1": linha transportada a tem NULA.
                #    Contar só essas mede exatamente o que a origem entregou — que é o
                #    que a R-01 sempre quis dizer.
                obtido = _uma(
                    k, f"select count(*) from public.{tabela} where {NASCEM_DA_PROPRIA_CARGA[tabela]}"
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
                # ⚠️ O RECORTE É POR TABELA **E** POR CONDIÇÃO — ver `NASCEM_DA_PLATAFORMA`.
                #    Sem a segunda metade a isenção viraria "a tabela inteira é isenta", e
                #    uma linha migrada que perdesse a marca passaria despercebida.
                # ⚠️ E OS PARÊNTESES NÃO SÃO ESTILO: `and` liga mais forte que `or`, então
                #    sem eles o recorte se aplicaria só ao segundo lado do `or` e a
                #    verificação mudaria de sentido calada.
                # ⚠️ DUAS ISENÇÕES, LIGADAS POR `or`, cada uma com o seu motivo: a nominal
                #    de `usuarios` (credencial do Auth, 23/09/2026) e a geral de quem nasceu
                #    na tela (auditoria preenchida, 24/09/2026).
                isencoes = [CRIADA_PELO_APLICATIVO] if "criado_por" in colunas else []
                nascida_aqui = NASCEM_DA_PLATAFORMA.get(tabela)
                if nascida_aqui:
                    isencoes.append(nascida_aqui)
                recorte = f" and not ({' or '.join(isencoes)})" if isencoes else ""
                sem = _uma(
                    k,
                    f"select count(*) from public.{tabela} where "
                    f"(origem_migracao_v1 is null or btrim(origem_migracao_v1) = ''){recorte}",
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
        # ⚠️ SÓ O TRANSPORTADO — ver `NASCEM_DA_PROPRIA_CARGA`. A tabela é append-only e
        #    a própria carga escreve nela desde 18/09/2026; comparar o total com a origem
        #    passou a acusar os eventos que o ETL criou de propósito.
        transportadas = _uma(
            k, "select count(*) from public.migracao_log where observacao is null"
        )
        no_destino = _uma(k, "select count(*) from public.migracao_log")
        if transportadas != na_origem:
            achados.append(
                Divergencia("R-06", "migracao_log", "linhas transportadas",
                            f"{na_origem}", f"{transportadas}")
            )

        # Os eventos que ESTA carga criou: cada um tem de descrever uma correção que de
        # fato aconteceu. Contar quantos são não prova nada — o que prova é que o valor
        # registrado como "depois" é o que está gravado na turma hoje.
        # ⚠️ SÓ OS EVENTOS DA NORMALIZAÇÃO DE SALA. A partir de 22/09/2026 existe uma
        #    segunda origem de evento com `observacao`: a camada de correções de origem,
        #    que corrige **qualquer** tabela — e a primeira versão desta verificação, que
        #    supunha `turmas` para todo evento, acusou 14 falsos positivos na primeira
        #    carga com correções de `cursos`. A verificação estava certa em reclamar: ela
        #    é que era estreita demais. As correções têm conferência própria, logo abaixo.
        k.execute(
            """
            select l.codigo, l.destino_chave, l.valor_antes, l.valor_depois, t.sala_alocada
              from public.migracao_log l
              left join public.turmas t on t.codigo = l.destino_chave
             where l.observacao is not null and l.origem_tabela = 'Turmas_Ativas'
             order by l.codigo
            """
        )
        for codigo, turma, antes, depois, atual in k.fetchall():
            if atual is None:
                achados.append(
                    Divergencia("R-06", "migracao_log", f"evento {codigo}",
                                "aponta para uma turma existente", f"turma {turma!r} nao existe")
                )
            elif atual != depois:
                achados.append(
                    Divergencia("R-06", "migracao_log", f"evento {codigo}",
                                f"a turma {turma} com sala {depois!r}", f"sala {atual!r}")
                )
            elif antes == depois:
                achados.append(
                    Divergencia("R-06", "migracao_log", f"evento {codigo}",
                                "uma correcao de verdade", f"antes e depois iguais: {antes!r}")
                )
        # As CORREÇÕES DE ORIGEM, conferidas contra o arquivo que as declara — e não
        # contra o evento: o arquivo é quem diz tabela, registro, coluna e valor novo,
        # então a conferência vale para qualquer tabela que venha a ser corrigida.
        for c in correcoes.ler():
            k.execute(
                psql.SQL("select {}::text from public.{} where codigo = %s").format(
                    psql.Identifier(c.coluna), psql.Identifier(c.tabela)
                ),
                (c.registro,),
            )
            linha_atual = k.fetchone()
            atual = None if linha_atual is None else linha_atual[0]
            if atual != c.para:
                achados.append(
                    Divergencia("R-06", f"{c.tabela}.{c.coluna}", f"correcao da linha {c.linha}",
                                f"{c.registro} em {c.para!r}", f"{atual!r}")
                )
            k.execute(
                "select count(*) from public.migracao_log where observacao = %s and acao = 'corrigido'",
                (f"correcoes-de-origem.md:{c.linha}",),
            )
            if int(k.fetchone()[0]) != 1:
                achados.append(
                    Divergencia("R-06", "migracao_log", f"rastro da correcao da linha {c.linha}",
                                "exatamente 1 evento `corrigido`", "outro numero")
                )

        k.execute(
            "select count(*) from public.migracao_log "
            "where observacao is not null and acao <> 'corrigido'"
        )
        fora_do_verbo = int(k.fetchone()[0])
        if fora_do_verbo:
            achados.append(
                Divergencia("R-06", "migracao_log", "verbo dos eventos da carga",
                            "todos `corrigido`", f"{fora_do_verbo} com outro verbo")
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
def _fks_da_tabela(k, tabela: str) -> dict[str, tuple[str, str]]:
    """`coluna -> (tabela_alvo, coluna_alvo)` das chaves estrangeiras de uma coluna só."""
    k.execute(
        """
        select a.attname, c.confrelid::regclass::text, f.attname
          from pg_constraint c
          join pg_attribute a on a.attrelid = c.conrelid  and a.attnum = c.conkey[1]
          join pg_attribute f on f.attrelid = c.confrelid and f.attnum = c.confkey[1]
         where c.contype = 'f' and c.conrelid = ('public.' || %s)::regclass
           and array_length(c.conkey, 1) = 1
        """,
        (tabela,),
    )
    achadas = {r[0]: (r[1], r[2]) for r in k.fetchall()}
    # Só serve para o checksum a FK cujo alvo tem `codigo` — a chave de NEGÓCIO, estável
    # entre cargas. `auth.users` não tem: o `auth_user_id` é criado pelo Supabase Auth,
    # não pelo ETL. A coluna é excluída do checksum em vez de entrar como UUID cru, o
    # que reintroduziria a instabilidade que esta função existe para eliminar.
    com_codigo = {}
    for coluna, (alvo, coluna_alvo) in achadas.items():
        k.execute(
            "select count(*) from information_schema.columns "
            "where table_schema || '.' || table_name = replace(%s, 'public.', 'public.') "
            "  and column_name = 'codigo'",
            (alvo if "." in alvo else f"public.{alvo}",),
        )
        com_codigo[coluna] = (alvo, coluna_alvo) if k.fetchone()[0] else None
    return com_codigo


def r08_checksums(con: psycopg.Connection) -> dict[str, str]:
    """`md5()` canônico por tabela — estável entre cargas, sensível ao que importa.

    ⚠️ A COLUNA DE FK ENTRA PELO `codigo` DO ALVO, NUNCA PELO UUID. O FR-006.1 manda
    excluir `id` e o quarteto de auditoria, e isso é necessário mas **não é suficiente**:
    `turmas.curso_id` guarda o `gen_random_uuid()` de `cursos`, que é outro a cada carga.
    Com o UUID cru, **13 das 23 tabelas davam hash diferente em duas cargas idênticas** —
    a verificação reprovava por construção, e a "correção" natural seria excluir toda
    coluna `uuid`. Isso a esvaziaria: mover um lançamento de turma deixaria de mudar o
    hash, que é precisamente o que a R-08 existe para pegar.

    Trocar o UUID pelo `codigo` do alvo mantém as duas propriedades ao mesmo tempo:
    estável entre execuções e sensível a **para onde a linha aponta**.

    Descoberto pela prova T042 (`provar_carregador.py`), que é exatamente para isso que
    a prova existe — a definição do FR-006.1 estava incompleta desde que foi escrita.
    """
    resultado: dict[str, str] = {}
    with con.cursor() as k:
        for tabela in ordem.ORDEM_DE_CARGA:
            if tabela in ordem.FORA_DA_IDEMPOTENCIA or tabela not in mapa.MAPAS:
                continue
            fks = _fks_da_tabela(k, tabela)
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
            partes: list[str] = []
            for c in colunas:
                if c in fks and fks[c] is None:
                    continue  # FK sem `codigo` no alvo: fora do checksum, ver acima
                if c in fks:
                    alvo, coluna_alvo = fks[c]
                    partes.append(
                        f"coalesce((select d.codigo from {alvo} d "
                        f"where d.{coluna_alvo} = t.{c}), '')"
                    )
                else:
                    partes.append(f"coalesce(t.{c}::text, '')")
            concat = " || '' || ".join(partes)
            # ⚠️ ORDENA PELA PRÓPRIA CONCATENAÇÃO, não por uma coluna eleita. Nem toda
            #    tabela tem `codigo` — `horarios_tempos_aula` não tem — e a eleição
            #    anterior caía em `configuracao_id`, que se repete 8 vezes por
            #    configuração: `string_agg` sem chave única não garante ordem, e duas
            #    cargas idênticas produziam hashes diferentes por permutação. Ordenar
            #    pelo próprio conteúdo torna o hash um resumo canônico do CONJUNTO,
            #    sem depender de nenhuma coluna ser única.
            ordenacao = concat
            resultado[tabela] = (
                _uma(
                    k,
                    f"select md5(coalesce(string_agg({concat}, '' "
                    f"order by {ordenacao}), ''))  from public.{tabela} t",
                )
                or ""
            )
    return resultado


# =====================================================================================
# U-01 a U-03 — informativos. NÃO bloqueiam (contrato C-5).
# =====================================================================================
def u_informativos(
    con: psycopg.Connection,
) -> tuple[list[Divergencia], list[Divergencia], list[Divergencia]]:
    """Informativos, esperados — e o que a decisão de 08/09 tornou BLOQUEANTE.

    A terceira lista existe porque a decisão sobre as chaves duplicadas mudou a
    natureza da verificação: enquanto ninguém tinha escolhido, "duas chaves para o
    mesmo teto" era informação. Escolhida a canônica, deixar a legada ativa passa a ser
    defeito — e defeito bloqueia.
    """
    informa: list[Divergencia] = []
    esperado: list[Divergencia] = []
    bloqueia: list[Divergencia] = []
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
        # ⚠️ A CHAVE CANÔNICA É A ÚNICA ATIVA. Decisão de Bernardo, 08/09/2026: das 13
        #    duplicidades de nomenclatura, fica valendo a chave da v2.1 semeada pela
        #    migration; a da v2.0 é transportada e chega `inativo`.
        #
        #    A primeira versão desta verificação casava as chaves por um `replace` de
        #    padrão — e só achou 4 dos 13 pares, porque só o formato `ch_docente`
        #    coincidia com o padrão. Agora lê a lista DECLARADA, que é a mesma que o
        #    carregador usa: uma fonte de verdade, não duas heurísticas parecidas.
        for legada, canonica in sorted(mapa.PARAMETROS_SUPERADOS_PELO_SEED.items()):
            estado = _uma(
                k,
                "select status::text from public.config_parametros where chave = %s",
                (legada,),
            )
            ativa_canonica = _uma(
                k,
                "select status::text from public.config_parametros where chave = %s",
                (canonica,),
            )
            if estado != "inativo" or ativa_canonica != "ativo":
                # Bloqueante: a decisão era manter EXCLUSIVAMENTE a canônica ativa.
                bloqueia.append(
                    Divergencia(
                        "R-05", "config_parametros", f"{legada} → {canonica}",
                        "legada inativo, canonica ativo",
                        f"legada {estado}, canonica {ativa_canonica}",
                    )
                )
        esperado.append(
            Divergencia(
                "U-03", "config_parametros", "chaves legadas desativadas",
                "previsto — decisão de 08/09/2026, a canônica da v2.1 é a que vale",
                f"{len(mapa.PARAMETROS_SUPERADOS_PELO_SEED)}",
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
    return informa, esperado, bloqueia


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
        # Sem usuário nem senha: o que identifica a base é o endereço dela.
        i = con.info
        v.medido_contra = f"{i.host}:{i.port}/{i.dbname}"
        v.medido_em = datetime.now().astimezone().strftime("%d/%m/%Y %H:%M %z")
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
        informa, esperado, bloqueia = u_informativos(con)
        v.informativos.extend(informa)
        v.esperados.extend(esperado)
        v.bloqueantes.extend(bloqueia)
    return v


def escrever_relatorio(v: Veredito, destino: Path = RELATORIO) -> Path:
    linhas: list[str] = [
        "# Relatório de reconciliação — Épico 2",
        "",
        f"**Veredito: {'APROVADA' if v.aprovada else 'BLOQUEADA'}**",
        "",
        f"**Medido contra:** `{v.medido_contra}` · **em** {v.medido_em}",
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
