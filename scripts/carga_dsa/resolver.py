"""Do bloco da planilha a linha do banco, para QUALQUER turma do modelo — a sincronizacao.

E a generalizacao do piloto (`plano.montar`, C-Exp-Obs-ME 2026) para as regras de leitura que as
outras planilhas trouxeram *(decisoes de Bernardo Villas Boas, 06/10/2026)*:

- **a sigla nao decide nada; decide a DESCRICAO do catalogo** — `FR` e feriado numa planilha e
  farol na outra. Chave que nao e UE de disciplina e classificada pelo texto de BD DISCIPLINAS
  (`_REGRAS_POR_DESCRICAO`), e toda classificacao automatica vai para o relatorio;
- **«(FISCAL)» vira fiscal** da avaliacao, e o responsavel e quem conduz a vista;
- **aula com dois instrutores**: o primeiro e o instrutor, os demais vao em observacoes;
- **«1P»** (primeira aula) e a UE 1;
- **a vista** casa com a prova pelo numero da chave (VP1 ↔ AV1/PM1); sem numero, as sessoes casam
  com as ultimas provas da disciplina, em ordem — a convencao do piloto. Desde a spec 014 (PR 6, FR-042) cada
  vista e uma SESSAO da prova (`vistas_de_avaliacao`): a 2ª vista da mesma prova e a sessao 2, e nao mais AEC;
- **a prova liga ao item do curriculo** (spec 014, FR-036, FR-039): pelo INSTRUMENTO (a descricao e o tipo; a sigla
  da chave nao decide) e pelo numero de ordem dentro da disciplina. Nao casou: entra sem item, e vai para a lista
  de erros de planilha — nada e inventado;
- **dia parado** (feriado, licenca) so e CALENDARIO GLOBAL quando parou todas as turmas; parado so
  de algumas, vira DIA PARADO da turma (`dias_parados`, previsto) — ate a spec 014 virava TAD
  (FR-024, FR-025, FR-025.5; a linha TAD antiga sai na rodada com a marca de reclassificacao);
- **Apoio Individualizado** (spec 014, FR-021, D-AA-12): Monitoria, Portugues para Estrangeiros, BDA e
  BDF; Recepcao e TAD com o tipo *Recepcao aos alunos*; APOINST e AEC com o tipo *Apoio a Instrucao*;
- **responsavel que nao casa com o cadastro** vira PENDENCIA do lote (FR-016), nunca texto livre
  gravado em silencio;
- **celula digitada por cima da formula na IMPRESSAO** e o DSA assinado: vale, salvo as que as
  decisoes da turma recusam;
- **curso por competencias**: aula por disciplina, sem UE, com o topico da planilha.

⚠️ NADA AQUI CRIA CADASTRO. O que falta — instrutor fora do cadastro, habilitacao, UE, vocabulario —
   vira PENDENCIA tipada, para o lote de decisoes. No modo provisorio (so no banco local) o que da
   para carregar sem cadastro e carregado; no remoto, pendencia que bloqueia para tudo.

⚠️ AS VALIDACOES DO LANCAMENTO MANUAL continuam as de `plano.py` (`pode_atuar`, `sem_teto_algum`):
   este modulo as reusa, nao as reescreve. (O teto de TFM saiu em 27/10/2026, com a emenda da
   `RN-DIST-03` (a) — spec 029, `FR-001`, D-4: a regra emendada vale tambem para a sincronizacao.)
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import date

from scripts.carga_dsa import regras_de_prova
from scripts.carga_dsa.planilha import Bloco, Leitura
from scripts.carga_dsa.plano import (
    CATEGORIAS,
    casar_instrutor,
    ler_instrutor,
    normalizar,
    pode_atuar,
    sem_teto_algum,
)

VAZIOS = {"", "-", "--", "---"}


def vazio(texto: str) -> bool:
    """Celula sem responsavel: vazia ou so tracos («------», medido na CAHO em 14/10/2026)."""
    return texto.strip() in VAZIOS or re.fullmatch(r"[-–—\s]+", texto) is not None

# (palavras da descricao, tipo, subtipo) — a PRIMEIRA que casar vale. «VISITA» vem antes de
# «FERIADO» de proposito: ha planilha que cadastra a visita sob a sigla dos feriados.
_REGRAS_POR_DESCRICAO: tuple[tuple[tuple[str, ...], str, str | None], ...] = (
    (("ESTUDO INDIVIDUAL", "TEMPO PARA ESTUDO"), "estudo_individual", "Estudo Individual"),
    # APOINST (apoio a instrucao: pratica de navegacao, posicionamento de sinais) sob a sigla de tempo reserva —
    # pela descricao do catalogo da planilha (decisao de 06/10/2026, item 4 do lote da onda 2).
    # Spec 014 (FR-021, D-2): o tipo passa a ser «Apoio à Instrução», da mesma categoria AEC.
    (("APOINST", "APOIO A INSTRUCAO"), "aec", "Apoio à Instrução"),
    # Spec 014 (FR-021, D-AA-12): Apoio Individualizado — alunos especificos, fora da CHT. Vem ANTES de
    # «INSTRUCAO» (palestra) e de «ADMINISTRACAO», que antes engoliam a Monitoria como TAD.
    (("MONITORIA",), "apoio", "Monitoria"),
    (("PORTUGUES PARA ESTRANGEIRO", "PORTUGUES"), "apoio", "Português para Estrangeiros"),
    (("BDA",), "apoio", "BDA"),
    (("BDF",), "apoio", "BDF"),
    (("VISITA",), "aec", "Visita Técnica"),
    (("FERIADO", "LICENCA", "ROTINA DE DOMINGO", "RECESSO", "PONTO FACULTATIVO"), "dia_parado", None),
    (("PALESTRA", "COLOQUIO", "SEMINARIO", "INSTRUCAO"), "aec", "Palestra"),
    (("TFM", "TREINAMENTO FISICO"), "aec", "Orientação de TFM"),
    (("CERIMONIA", "FORMATURA", "SOLENIDADE"), "tad", "Evento/Cerimônia"),
    (("TEMPO RESERVA",), "tr", "Tempo Reserva"),
    (("EXTRA CLASSE", "EXTRACLASSE", "ASSINCRONA"), "aec", "Atividade Extracurricular"),
    # Spec 014 (FR-021, Q-7): Recepcao sai da tupla da Monitoria e ganha tipo proprio; Departamento de
    # Alunos continua Administracao.
    (("RECEPCAO",), "tad", "Recepção aos alunos"),
    (("ADMINISTRACAO", "DEPARTAMENTO DE ALUNOS"), "tad", "Administração"),
    # DOEP (decisao do piloto, generalizada na onda 2): palestra/oficina do Departamento de Orientacao.
    (("DOEP", "OFICINA"), "aec", "Palestra"),
)

MARCA_DE_DEMAIS = " Demais instrutores: "

# Spec 014 (FR-024): a descricao do dia parado decide o TIPO de parada (`config_listas.tipos_parada`).
# A primeira que casar vale; o que nao casar e NT (parada de turma por outro motivo).
_TIPO_DE_PARADA_POR_DESCRICAO: tuple[tuple[tuple[str, ...], str], ...] = (
    (("LICENCA DE PAGAMENTO", "LICENCA PAGAMENTO"), "LP"),
    (("LICENCA",), "LA"),
    (("FERIADO",), "FR"),
    (("RECESSO",), "RC"),
    (("PONTO FACULTATIVO",), "PF"),
)


def tipo_de_parada(descricao: str) -> str:
    texto = normalizar(descricao)
    for palavras, sigla in _TIPO_DE_PARADA_POR_DESCRICAO:
        if any(p in texto for p in palavras):
            return sigla
    return "NT"


def classificar_pela_descricao(disciplina: str, topico: str) -> tuple[str, str | None] | None:
    descricao = normalizar(f"{disciplina} {topico}")
    for palavras, tipo, subtipo in _REGRAS_POR_DESCRICAO:
        if any(p in descricao for p in palavras):
            return tipo, subtipo
    return None


@dataclass
class Pendencia:
    """O que precisa de decisao ou de cadastro. `bloqueia` = nao vai ao remoto enquanto existir."""

    tipo: str
    turma: str
    detalhe: str
    ta: int = 0
    bloqueia: bool = True
    chave: str = ""  # para agrupar no lote
    # O DIA do bloco que a levantou (vazio = pendencia da turma, nao de um bloco). E o que deixa a sincronizacao saber
    # que o bloco cai da virada em diante (A3.3) — fora do plano, e por isso a pendencia nao para a turma (26/10/2026).
    data: str = ""


@dataclass
class Resolvido:
    turma: dict
    autor: dict
    titulo: str
    aulas: list[dict] = field(default_factory=list)
    avaliacoes: list[dict] = field(default_factory=list)
    atividades: list[dict] = field(default_factory=list)
    calendario: list[dict] = field(default_factory=list)
    # Spec 014 (FR-024): o dia parado so desta turma — `dias_parados`, previsto, codigo DSAP-…-P.
    dias_parados: list[dict] = field(default_factory=list)
    pendencias: list[Pendencia] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)
    erros_de_planilha: list[str] = field(default_factory=list)
    # Spec 014 (FR-036.1, §11-B): os erros com as cinco colunas da lista entregue aos operadores —
    # disciplina · o que diverge · planilha · curriculo · o que o sistema fez.
    erros_tabelados: list[dict] = field(default_factory=list)
    classificadas: dict[str, str] = field(default_factory=dict)  # chave → como foi classificada
    digitadas_adotadas: list[str] = field(default_factory=list)
    instrutores: dict[str, dict] = field(default_factory=dict)
    insumo_epico_8: list[str] = field(default_factory=list)
    # A3.2 (14/10/2026): o codigo da linha que ficou FORA por pendencia de responsavel. Se ela ja esta no
    # banco, a rodada nao a toca (nem atualiza, nem inativa) ate a decisao.
    pendentes: set[str] = field(default_factory=set)
    # Spec 014 (FR-031.8, T227): o tempo da prova e da vista onde o curriculo e mudo, como SUGESTAO da planilha
    # para a turma (`avaliacoes_curriculo_turma`, origem `sugestao_planilha`) — nunca sobre arbitrado confirmado.
    sugestoes: list[dict] = field(default_factory=list)
    # Emenda de 15/10/2026 (RN-AV-12, RN-AV-14): o que a lista mostra como INFORMACAO, nao erro — a prova a mais
    # que o curriculo e as sessoes seguintes de uma mesma prova.
    informativos: list[str] = field(default_factory=list)
    # RN-AV-12: as provas de N sessoes (disciplina, COD, descricao, datas, TA somado), para o relatorio.
    sessoes_de_aplicacao: list[dict] = field(default_factory=list)
    # RN-AV-10: a prova que nao casou, com o COD, a descricao e os itens da disciplina lado a lado.
    provas_sem_casar: list[dict] = field(default_factory=list)
    # RN-RESP-1: o responsavel de nome livre gravado numa atividade (texto fora do cadastro). Tem nome de
    # pessoa: vai para listas FORA do git, nunca para o plano em JSON.
    responsavel_livre: list[dict] = field(default_factory=list)

    def codigos(self) -> dict[str, list[str]]:
        return {
            "registros_aula": [a["codigo"] for a in self.aulas],
            "avaliacoes": [a["codigo"] for a in self.avaliacoes],
            "atividades_nao_letivas": [a["codigo"] for a in self.atividades],
            "dias_parados": [d["codigo"] for d in self.dias_parados],
        }

    def impressao_digital(self) -> str:
        sem_id = lambda linhas: [{k: v for k, v in l.items() if not k.endswith("_id") and not k.startswith("_")} for l in linhas]  # noqa: E731
        corpo = json.dumps(
            {"aulas": sem_id(self.aulas), "avaliacoes": sem_id(self.avaliacoes),
             "atividades": sem_id(self.atividades), "dias_parados": self.dias_parados,
             # `ja_no_banco` e ESTADO do destino, nao plano: no local o dia ja entrou, no remoto ainda nao.
             "calendario": [{k: v for k, v in c.items() if k != "ja_no_banco"} for c in self.calendario],
             "pendencias": sorted(p.detalhe for p in self.pendencias if p.bloqueia)},
            sort_keys=True, ensure_ascii=False, default=str,
        )
        return hashlib.sha256(corpo.encode("utf-8")).hexdigest()[:16]


def slug(turma: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", normalizar(turma)).strip("-")


def _numero(chave_ue: str) -> str:
    achado = re.search(r"(\d+)$", chave_ue)
    return achado.group(1) if achado else ""


def resolver(
    leitura: Leitura,
    ref: dict,
    decisoes: dict,
    titulo: str,
    dias_globais: set[str],
    provisorio: bool,
) -> Resolvido:
    turma, autor = ref["turma"], ref.get("autor") or {}
    nome = turma["codigo"]
    r = Resolvido(turma=turma, autor=autor, titulo=titulo)

    # O bloco que esta sendo resolvido: a pendencia levantada dentro do laco leva o dia dele (`Pendencia.data`).
    no_bloco = {"data": ""}

    def pend(tipo: str, detalhe: str, ta: int = 0, bloqueia: bool = True, chave: str = "") -> None:
        r.pendencias.append(Pendencia(tipo=tipo, turma=nome, detalhe=detalhe, ta=ta, bloqueia=bloqueia, chave=chave, data=no_bloco["data"]))

    if not autor.get("auth_user_id") or autor.get("status") != "ativo":
        pend("autor", "a conta autora nao existe, nao esta ativa ou nao tem credencial neste destino")

    mapa_de_disciplinas = decisoes.get("disciplinas", {})  # COD da planilha → cod_disciplina do banco
    disciplina_por_cod = {d["cod"]: d for d in ref["disciplinas"]}
    isentas = {d["id"] for d in ref["disciplinas"] if d.get("sem_ue")}
    ue_por = {(u["disciplina_id"], str(u["numero"])): u for u in ref["ues"]}
    metodologia_por_sigla = {normalizar(m["sigla"]): m["valor"] for m in ref["metodologias"] if m.get("sigla")}
    categoria_do_subtipo = {t["valor"]: t.get("categoria") for t in ref["tipos_atividade"]}
    locais = {normalizar(k): v for k, v in decisoes.get("locais", {}).items()}
    chaves = decisoes.get("chaves", {})
    padrao_avaliacao = re.compile(decisoes.get("padrao_ue_de_avaliacao", r"(AV|PE|PM|PP|PO|TG|TI|TR|OD)[0-9]*"))
    padrao_vista = re.compile(decisoes.get("padrao_ue_de_vista", r"VP[0-9]*"))
    padrao_primeira = re.compile(r"([0-9]+)P")
    tipo_por_tecnica = decisoes.get("tipo_avaliacao_por_tecnica", {"PP": "Prova Prática", "TG": "Trabalho", "TI": "Trabalho"})
    recusadas = set(decisoes.get("celulas_digitadas_nao_adotadas", {}))
    prefixo = f"DSAP-{slug(nome)}"

    def codigo(bloco: Bloco, sufixo: str) -> str:
        return f"{prefixo}-L{bloco.linha:03d}-{sufixo}"

    def procedencia(bloco: Bloco) -> str:
        return (
            f"Carga da planilha de controle «{titulo}», PREENCHIMENTO linhas "
            f"{bloco.linha}–{bloco.linha + bloco.tempos - 1} (scripts/carga_dsa)."
        )

    def digitado(bloco: Bloco, campo: str) -> str | None:
        valor = leitura.digitadas.get(bloco.linha, {}).get(campo)
        if valor is None or f"L{bloco.linha}.{campo}" in recusadas:
            return None
        return valor

    def ajuste(bloco: Bloco, campo: str) -> str | None:
        for regra in decisoes.get("ajustes", []):
            quando = regra.get("quando", {})
            if campo in regra and all(
                (k != "data" or v == bloco.data.isoformat()) and (k != "cod" or v == bloco.cod)
                and (k != "ue" or v == bloco.ue) and (k != "ta_inicial" or v == bloco.ta_inicial)
                for k, v in quando.items()
            ):
                return regra[campo]
        return None

    def local_de(bloco: Bloco, regra: dict | None = None) -> str | None:
        forcado = ajuste(bloco, "local") or (regra or {}).get("local")
        if forcado:
            return forcado
        bruto = digitado(bloco, "local")
        if bruto is not None:
            r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: local «{bruto}»")
        else:
            bruto = leitura.catalogo[bloco.chave].local
        if bruto.strip() in VAZIOS:
            return None
        achado = locais.get(normalizar(bruto))
        if achado is None:
            pend("local_sem_traducao", f"local «{' '.join(bruto.split())}» sem traducao", bloco.tempos, chave=normalizar(bruto))
            return " ".join(bruto.split())
        return achado

    def tecnica_de(bloco: Bloco) -> tuple[str | None, str]:
        sigla = ajuste(bloco, "tecnica")
        if sigla is None:
            sigla = digitado(bloco, "te")
            if sigla is not None:
                r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: T/E «{sigla}»")
            else:
                sigla = leitura.catalogo[bloco.chave].tecnica
        if sigla.strip() in VAZIOS:
            return None, ""
        if "/" in sigla:
            # «EO/AP», «TG/TI»: duas tecnicas numa celula; vale a PRIMEIRA, como no instrutor (onda 2, CAHO).
            r.alertas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: T/E «{sigla}» traz duas tecnicas; valeu a primeira")
            sigla = sigla.split("/")[0]
        valor = metodologia_por_sigla.get(normalizar(sigla))
        if valor is None:
            pend("tecnica_desconhecida", f"T/E «{sigla}» nao e sigla de metodologia do banco", bloco.tempos, chave=normalizar(sigla))
        return valor, normalizar(sigla)

    def casar(texto_bruto: str, bloco: Bloco, obrigatorio: bool) -> dict | None:
        """Um instrutor do cadastro para um texto «POSTO (ESP) NOME DE GUERRA». Exige exatamente um."""
        lido = ler_instrutor(texto_bruto)
        achados = casar_instrutor(lido, ref["instrutores"], decisoes.get("postos_aceitos_por_codigo")) if lido is not None else []
        if len(achados) > 1:
            # Texto que casa com DOIS do cadastro: o desempate e decisao nominal, versionada POR CODIGO
            # (fontes.json, `desempate_de_instrutor`: «55|58» → «55»), para a sincronizacao semanal aplicar sempre.
            escolhido = decisoes.get("desempate_de_instrutor", {}).get("|".join(sorted(a["codigo"] for a in achados)))
            if escolhido is not None:
                achados = [a for a in achados if a["codigo"] == str(escolhido)]
        if len(achados) == 1:
            r.instrutores[" ".join(texto_bruto.split())] = achados[0]
            return achados[0]
        if obrigatorio:
            limpo = " ".join(re.sub(r"\(\s*FISCAL\s*\)", "", texto_bruto, flags=re.IGNORECASE).split())
            motivo = "nao esta no cadastro" if not achados else f"casa com {len(achados)} do cadastro (codigos {sorted(a['codigo'] for a in achados)})"
            pend("instrutor_nao_casado", f"«{limpo}» {motivo}", bloco.tempos, chave=normalizar(limpo))
        return None

    def instrutores_de(bloco: Bloco) -> tuple[dict | None, str, str]:
        """(primeiro instrutor, demais em texto, texto bruto). Dois instrutores vem separados por «/»."""
        forcado = decisoes.get("instrutor_por_chave", {}).get(f"{bloco.cod}+{bloco.ue}")
        bruto = digitado(bloco, "instrutor")
        if bruto is not None:
            r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: instrutor «{bruto}»")
        else:
            bruto = leitura.catalogo[bloco.chave].instrutor
        if forcado is not None:
            achados = [i for i in ref["instrutores"] if i["codigo"] == str(forcado)]
            return (achados[0] if achados else None), "", bruto
        partes = [p.strip() for p in bruto.split("/") if p.strip()]
        if not partes or bruto.strip() in VAZIOS:
            return None, "", bruto
        # Texto que NAO e pessoa («OFICIAIS-MONITORES»): decisao D3 de 06/10/2026 — a aula entra com o
        # instrutor que a decisao nomeia e a observacao «… (conforme DSA)»; a CH conta normalmente.
        por_texto = decisoes.get("instrutor_por_texto", {}).get(normalizar(partes[0]))
        if por_texto is not None:
            achados = [i for i in ref["instrutores"] if i["codigo"] == str(por_texto["codigo"])]
            if achados:
                r.instrutores[" ".join(partes[0].split())] = achados[0]
                return achados[0], por_texto.get("observacao", ""), bruto
        primeiro = casar(partes[0], bloco, obrigatorio=True)
        return primeiro, "; ".join(partes[1:]), bruto

    def outros_de(demais: str, bloco: Bloco) -> tuple[list[str], str]:
        """Spec 014, FR-046 (D-8): os demais instrutores pelo CODIGO (`outros_instrutores`); o texto que nao
        casa com UM do cadastro continua em `observacoes`, como antes — nada e inventado."""
        if not demais or demais.endswith("(conforme DSA)"):
            return [], demais
        codigos, sobra = [], []
        for parte in [p.strip() for p in demais.split(";") if p.strip()]:
            achado = casar(parte, bloco, obrigatorio=False)
            if achado is None:
                sobra.append(parte)
            else:
                codigos.append(str(achado["codigo"]))
        return codigos, "; ".join(sobra)

    def classificar(bloco: Bloco) -> tuple[str, dict]:
        """(tipo, regra). tipo ∈ aula · avaliacao · vista · nao letivo · dia_parado · calendario · ignorar · pendente."""
        regra = chaves.get(f"{bloco.cod}+{bloco.ue}") or chaves.get(bloco.cod)
        if regra is not None:
            return regra["tipo"], regra
        # O de-para de chave («XXI+PM1» → «MAT+PM1») vale tambem para prova e vista, nao so para aula.
        cod_mapeado, ue_mapeada = (decisoes.get("ues", {}).get(f"{bloco.cod}+{bloco.ue}") or f"{bloco.cod}+{bloco.ue}").split("+", 1)
        cod_do_banco = mapa_de_disciplinas.get(cod_mapeado, cod_mapeado)
        if cod_do_banco in disciplina_por_cod:
            # RN-AV-10 (15/10/2026): «PM1» = «PM 1» = «PM-1» — o padrao da turma casa com a forma colada.
            if padrao_vista.fullmatch(regras_de_prova.cod_colado(ue_mapeada)):
                return "vista", {}
            if padrao_avaliacao.fullmatch(regras_de_prova.cod_colado(ue_mapeada)):
                return "avaliacao", {}
            if ue_mapeada.isdigit() or padrao_primeira.fullmatch(ue_mapeada):
                return "aula", {}
        linha = leitura.catalogo[bloco.chave]
        achado = classificar_pela_descricao(linha.disciplina, linha.topico)
        if achado is None:
            return "pendente", {}
        tipo, subtipo = achado
        r.classificadas[f"{bloco.cod}+{bloco.ue}"] = (
            f"«{linha.disciplina} · {' '.join(linha.topico.split())}» → {tipo}" + (f" / {subtipo}" if subtipo else "")
        )
        return tipo, {"subtipo": subtipo}

    blocos_de_vista: list[tuple[Bloco, dict]] = []
    dias_parados: dict[str, list[tuple[Bloco, dict]]] = {}
    for linha_digitada, campos in sorted(leitura.digitadas.items()):
        bloco_digitado = next((b for b in leitura.blocos if b.linha == linha_digitada), None)
        if "ta" in campos and bloco_digitado is not None and campos["ta"] != str(bloco_digitado.tempos):
            r.erros_de_planilha.append(
                f"IMPRESSAO linha {linha_digitada} ({bloco_digitado.data:%d/%m/%Y}): nº de TA digitado «{campos['ta']}» por cima da formula, "
                f"e o PREENCHIMENTO tem {bloco_digitado.tempos} TA nesse bloco — o painel de CH da planilha fica deslocado dali em diante"
            )

    # R4 (16/10/2026): a chave do catalogo e a coluna D, como o PROCV; a lista aponta onde A + C diz outra coisa.
    for linha_cat, por_ac, por_d in getattr(leitura.catalogo, "divergentes", []):
        r.erros_de_planilha.append(
            f"BD DISCIPLINAS linha {linha_cat}: a chave por A + C «{por_ac}» difere da coluna D «{por_d}» — vale a D, como o PROCV da IMPRESSAO")

    for bloco in leitura.blocos:
        no_bloco["data"] = bloco.data.isoformat()
        if bloco.chave not in leitura.catalogo:
            r.erros_de_planilha.append(
                f"linha {bloco.linha} ({bloco.data:%d/%m/%Y}, {bloco.tempos} TA): a chave {bloco.cod}+{bloco.ue} "
                "nao existe no catalogo (BD DISCIPLINAS) — na IMPRESSAO sai como erro de PROCV"
            )
            pend("chave_sem_catalogo", f"chave {bloco.cod}+{bloco.ue} sem linha no catalogo", bloco.tempos, chave=f"{bloco.cod}+{bloco.ue}")
            continue
        tipo, regra = classificar(bloco)
        linha_do_catalogo = leitura.catalogo[bloco.chave]

        if tipo == "ignorar":
            continue
        if tipo == "pendente":
            pend("chave_sem_regra",
                 f"chave {bloco.cod}+{bloco.ue} («{linha_do_catalogo.disciplina} · {' '.join(linha_do_catalogo.topico.split())}») sem classificacao",
                 bloco.tempos, chave=f"{bloco.cod}+{bloco.ue}")
            continue
        if tipo in ("dia_parado", "calendario"):
            descricao = regra.get("descricao") or " ".join(linha_do_catalogo.topico.split())
            dias_parados.setdefault(bloco.data.isoformat(), []).append((bloco, {**regra, "descricao": descricao, "forcar": tipo == "calendario"}))
            continue

        if tipo in CATEGORIAS:
            subtipo = regra.get("subtipo") or ("Estudo Individual" if tipo == "estudo_individual" else None)
            if subtipo not in categoria_do_subtipo or categoria_do_subtipo[subtipo] != CATEGORIAS[tipo]:
                pend("subtipo_invalido", f"subtipo «{subtipo}» nao e de {CATEGORIAS[tipo]} em `tipos_atividade`", bloco.tempos, chave=str(subtipo))
                continue
            externo = regra.get("responsavel_externo")
            instrutor = None
            if tipo != "estudo_individual" and externo is None and regra.get("responsavel") != "em_branco":
                bruto = digitado(bloco, "instrutor") or linha_do_catalogo.instrutor
                if not vazio(bruto):
                    instrutor = casar(bruto.split("/")[0], bloco, obrigatorio=False)
                    if instrutor is None:
                        # RN-RESP-1 (emenda de 15/10/2026, Bernardo Villas Boas): «Palestra, AEC, estudo individual,
                        # monitoria, orientacao/Apoio Individualizado aceitam responsavel de nome livre, sem cadastro e
                        # sem alerta. (...) texto que nao casa com o cadastro so vira pendencia se a linha for aula de
                        # disciplina com EO.» Atividade nao e aula: o texto vai para `responsavel_externo`, como veio.
                        # (Ate 15/10 virava `responsavel_sem_decisao` e a linha ficava fora — FR-016, A3.2.)
                        externo = " ".join(bruto.split())
                        lido_te = (linha_do_catalogo.tecnica or "").split("/")[0]
                        r.responsavel_livre.append({
                            "texto": externo, "linha": bloco.linha, "data": bloco.data.isoformat(),
                            "chave": f"{bloco.cod}+{bloco.ue}", "tempos": bloco.tempos,
                            "cod_e_disciplina": mapa_de_disciplinas.get(bloco.cod, bloco.cod) in disciplina_por_cod,
                            "tecnica": normalizar(lido_te) if not vazio(lido_te) else "",
                            "tipo": tipo, "subtipo": subtipo,
                            "catalogo": " ".join(f"{linha_do_catalogo.disciplina} · {linha_do_catalogo.topico}".split()),
                        })
            # O texto digitado por cima da formula na IMPRESSAO vale tambem para a ATIVIDADE, como ja vale para a aula
            # (decisao de Bernardo Villas Boas, 16/10/2026, duvida 6): a R4 expôs a lacuna na CAHO de 09/10, que o DSA
            # impresso traz como «SEMANA OCEANOGRAFICA», digitado sobre o PROCV.
            topico_digitado = digitado(bloco, "topico") if tipo != "estudo_individual" else None
            if topico_digitado is not None:
                r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: topico «{topico_digitado}»")
            r.atividades.append({
                "codigo": codigo(bloco, "N"),
                "categoria_normativa": CATEGORIAS[tipo],
                "data": bloco.data.isoformat(),
                "subtipo": subtipo,
                "descricao": "ESTUDO INDIVIDUAL" if tipo == "estudo_individual" else (
                    " ".join(topico_digitado.split()) if topico_digitado else (regra.get("descricao") or " ".join(linha_do_catalogo.topico.split()))),
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
                # O local do EI e sempre o da regra global (Biblioteca, 07/10/2026): o da planilha e ignorado.
                "local": (decisoes.get("local_do_estudo_individual") or local_de(bloco, regra)) if tipo == "estudo_individual" else local_de(bloco, regra),
                "instrutor": instrutor["codigo"] if instrutor else None,
                "instrutor_id": instrutor["id"] if instrutor else None,
                "responsavel_externo": externo,
                "observacoes": procedencia(bloco),
            })
            continue

        cod_mapeado, ue_mapeada = (decisoes.get("ues", {}).get(f"{bloco.cod}+{bloco.ue}") or f"{bloco.cod}+{bloco.ue}").split("+", 1)
        disciplina = disciplina_por_cod[mapa_de_disciplinas.get(cod_mapeado, cod_mapeado)]
        if tipo == "vista":
            blocos_de_vista.append((bloco, disciplina))
            continue

        if tipo == "avaliacao":
            bruto = digitado(bloco, "instrutor") or linha_do_catalogo.instrutor
            eh_fiscal = re.search(r"\(\s*FISCAL\s*\)", bruto, flags=re.IGNORECASE) is not None
            pessoa = casar(bruto.split("/")[0], bloco, obrigatorio=False) if bruto.strip() not in VAZIOS else None
            limpo = " ".join(re.sub(r"\(\s*FISCAL\s*\)", "", bruto, flags=re.IGNORECASE).split())
            metodologia, sigla = tecnica_de(bloco)
            tipo_avaliacao = tipo_por_tecnica.get(sigla, decisoes.get("tipo_avaliacao", "Prova Escrita"))
            if tipo_avaliacao not in ref["tipos_avaliacao"]:
                pend("tipo_de_avaliacao", f"tipo «{tipo_avaliacao}» fora de `tipos_avaliacao`", bloco.tempos)
                continue
            if sigla in ("EO", ""):
                r.erros_de_planilha.append(
                    f"linha {bloco.linha} ({bloco.data:%d/%m/%Y}): a avaliacao {bloco.cod}+{bloco.ue} esta com T/E «{sigla or 'vazia'}» no catalogo"
                )
            if not eh_fiscal and pessoa is None and limpo not in VAZIOS:
                pend("instrutor_nao_casado", f"«{limpo}» nao esta no cadastro (responsavel de avaliacao)", bloco.tempos, chave=normalizar(limpo), bloqueia=False)
            # Spec 014, FR-046: os demais («A / B»), pelo codigo quando casam; o que nao casa vai como veio.
            outros_da_prova = []
            for parte in [x.strip() for x in limpo.split("/")[1:] if x.strip()]:
                achado = casar(parte, bloco, obrigatorio=False)
                outros_da_prova.append(str(achado["codigo"]) if achado else parte)
            r.avaliacoes.append({
                "codigo": codigo(bloco, "V"),
                "chave_ue": ue_mapeada,
                "cod_planilha": bloco.cod,
                "disciplina": disciplina["cod"],
                "disciplina_id": disciplina["id"],
                "tipo_avaliacao": tipo_avaliacao,
                "data_avaliacao": bloco.data.isoformat(),
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
                # «(FISCAL)» vira fiscal; quem conduz a vista vira o responsavel, mais abaixo.
                "instrutor": None if eh_fiscal else (pessoa["codigo"] if pessoa else None),
                "instrutor_responsavel_id": None if eh_fiscal else (pessoa["id"] if pessoa else None),
                "fiscal": pessoa["codigo"] if eh_fiscal and pessoa else None,
                "fiscal_id": pessoa["id"] if eh_fiscal and pessoa else None,
                "nome_fiscal_externo": limpo if eh_fiscal and pessoa is None and limpo not in VAZIOS else None,
                "metodologia": metodologia,
                "local": local_de(bloco),
                "conteudo_resumo": " ".join(linha_do_catalogo.topico.split()) or None,
                # Spec 014 (FR-041, T226): as colunas de vista unica ficam NULAS — a vista e sessao, em `sessoes`.
                "data_vista_prova": None, "ta_inicial_vista": None, "tempos_consumidos_vista": None, "local_vista": None,
                "observacoes": procedencia(bloco),
                "avaliacao_curriculo_id": None,
                "item": None,
                "descricao": " ".join(linha_do_catalogo.topico.split()),
                "linha": bloco.linha,
                "outros_instrutores": outros_da_prova,
                # O texto de aplicador que a linha traz (vazio = nenhum). So a sessao SEM nome herda o da 1ª (RN-AV-12).
                "_aplicador_escrito": not eh_fiscal and limpo not in VAZIOS and not vazio(limpo),
                # P10 (aceita em 16/10/2026): a T/E da linha desempata o `AV` cuja descricao nao nomeia instrumento.
                "_tecnica": sigla,
                "sessoes": [],
                # RN-AV-12 (desenho aprovado em 16/10/2026): as sessoes de aplicacao 2..N, em `sessoes_de_aplicacao`.
                "aplicacoes": [],
                # A2: o instrumento gravado da prova SEM item (`avaliacoes.instrumento_id`); com item, nulo.
                "instrumento_gravado": None,
            })
            faixa = re.search(r"\(\s*U\.?\s*E\.?[^)]*\)", linha_do_catalogo.topico, flags=re.IGNORECASE)
            # Spec 014, FR-033: a faixa «U.E. 3 a 6» vai para `ues_abordadas` — texto, sem consumir TA de UE.
            r.avaliacoes[-1]["ues_abordadas"] = " ".join(faixa.group(0).strip("() ").split()) if faixa else None
            if faixa:
                r.insumo_epico_8.append(f"{disciplina['cod']} {bloco.ue} ({bloco.data:%d/%m/%Y}): {faixa.group(0)}")
            continue

        # ── aula ──
        primeira = padrao_primeira.fullmatch(bloco.ue)
        numero_ue = primeira.group(1) if primeira else bloco.ue
        # A UE da planilha nem sempre e a do catalogo do banco (a planilha lanca uma disciplina
        # inteira como UE de outra, ou abre a UE em topicos): o de-para e DECISAO, nunca inferencia.
        # ⚠️ A CHAVE CRUA PRIMEIRO (R1, decisao de Bernardo Villas Boas, 16/10/2026): na C-Ap-FR e na Ag-Mag, «1P» e a
        #    UE 1 e a chave N e a UE N+1; o de-para «I+1» → «I+2» nao pode pegar a «I+1P», que o numero tambem reduz a 1.
        mapeada = decisoes.get("ues", {}).get(f"{bloco.cod}+{bloco.ue}") or decisoes.get("ues", {}).get(f"{bloco.cod}+{numero_ue}")
        if mapeada is not None:
            cod_do_banco, numero_ue = mapeada.split("+")
            disciplina = disciplina_por_cod[cod_do_banco]
        sem_ue = disciplina["id"] in isentas or bool(turma.get("por_competencias"))
        ue = None if sem_ue else ue_por.get((disciplina["id"], numero_ue))
        if not sem_ue and ue is None:
            pend("ue_inexistente", f"UE {numero_ue} da disciplina {disciplina['cod']} nao existe (ativa) no catalogo do banco", bloco.tempos, chave=f"{disciplina['cod']}+{numero_ue}")
            continue
        instrutor, demais, bruto = instrutores_de(bloco)
        if instrutor is None:
            if bruto.strip() in VAZIOS:
                pend("aula_sem_instrutor", f"aula {bloco.cod}+{bloco.ue} sem instrutor no catalogo", bloco.tempos, chave=f"{bloco.cod}+{bloco.ue}")
            continue
        if not pode_atuar("ministrar", instrutor["id"], disciplina["id"], ref["habilitacoes"]):
            pend("sem_habilitacao", f"instrutor de codigo {instrutor['codigo']} sem habilitacao em {disciplina['cod']} — {disciplina['nome']}",
                 bloco.tempos, chave=f"{instrutor['codigo']}|{disciplina['cod']}")
            if not provisorio:
                continue
        metodologia, _ = tecnica_de(bloco)
        topico_digitado = digitado(bloco, "topico")
        if topico_digitado is not None:
            r.digitadas_adotadas.append(f"L{bloco.linha} {bloco.data:%d/%m} {bloco.cod}+{bloco.ue}: topico «{topico_digitado}»")
        topico_da_planilha = re.sub(r"^\s*[0-9]+\s*[–-]\s*", "", " ".join((topico_digitado or linha_do_catalogo.topico).split()))
        outros, demais = outros_de(demais, bloco)
        r.aulas.append({
            "codigo": codigo(bloco, "A"),
            "data": bloco.data.isoformat(),
            "cod_planilha": bloco.cod,
            "disciplina": disciplina["cod"],
            "ue": ue["codigo"] if ue else None,
            "numero_ue": ue["numero"] if ue else None,
            "unidade_ensino_id": ue["id"] if ue else None,
            # XOR do banco: com UE a disciplina fica nula; sem UE (isenta), a disciplina e obrigatoria.
            "disciplina_sem_ue": None if ue else disciplina["cod"],
            "disciplina_id": None if ue else disciplina["id"],
            "instrutor": instrutor["codigo"],
            "instrutor_id": instrutor["id"],
            "ta_inicial": bloco.ta_inicial,
            "tempos_consumidos": bloco.tempos,
            # Com UE, o topico e o do catalogo do BANCO; sem UE, o da planilha (curso por competencias).
            "conteudo_resumo": ue["topico"] if ue else topico_da_planilha,
            "metodologia": metodologia,
            "local": local_de(bloco),
            "observacoes": procedencia(bloco) + ("" if not demais else f" {demais}" if demais.endswith("(conforme DSA)") else f"{MARCA_DE_DEMAIS}{demais}."),
            "outros_instrutores": outros,
        })
    no_bloco["data"] = ""  # daqui em diante a pendencia e da turma, nao de um bloco

    # RN-AV-12: a janela e DADO do banco (`avaliacao.janela_sessoes_dias`, D-9, decisao de 16/10/2026: 7 dias).
    janela = ref.get("janela_sessoes_dias")
    if janela is None:
        pend("janela_de_sessoes", "o parametro `avaliacao.janela_sessoes_dias` nao existe (ativo) no destino: rode as migrations")
        janela = 7
    _agrupar_sessoes(r, int(janela))
    _ligar_itens(r, ref, decisoes)
    _casar_vistas(r, blocos_de_vista, decisoes, pend, local_de, casar, leitura, codigo=codigo, procedencia=procedencia)
    _sessoes_herdam_o_aplicador(r)
    com_vista = frozenset(ref.get("instrumentos_com_vista") or [])
    instrumentos = {i["valor"]: i.get("nome") or "" for i in ref.get("instrumentos") or []}
    _instrumento_gravado(r, instrumentos)
    _vista_de_prova_sem_item(r, date.today(), com_vista, ref)
    _sugestoes(r, ref)
    _resolver_dias_parados(r, dias_parados, dias_globais, leitura, codigo, procedencia, categoria_do_subtipo)
    _aula_em_dia_parado(r)
    _ch_contra_o_curriculo(r, leitura, decisoes, ref)
    _conferencias_internas(r, leitura, decisoes, pend, set(disciplina_por_cod))
    _tetos(r, ref, pend)
    _calendario_do_banco(r, ref)
    _sessoes_viram_aplicacoes(r)
    return r


def _instrumento_gravado(r: Resolvido, instrumentos: dict[str, str]) -> None:
    """A2 do desenho de 15/10/2026 (aprovado em 16/10/2026): a prova SEM item ligado grava o instrumento que o COD
    nomeia (`avaliacoes.instrumento_id`) — e e por ele que a RN-AV-13 decide a vista dela e a RN-AV-14 a conta na aba.
    Com item, a coluna fica nula: quem le usa a do item. A OD fica de fora (Q-17: e continua)."""
    for prova in _cabecas(r):
        if prova.get("avaliacao_curriculo_id") or _e_od(prova):
            prova["instrumento_gravado"] = None
            continue
        conhecido = prova.get("instrumento") if prova.get("instrumento") in instrumentos else None
        prova["instrumento_gravado"] = conhecido or regras_de_prova.instrumento_da_prova(prova, instrumentos)


def _sessoes_viram_aplicacoes(r: Resolvido) -> None:
    """RN-AV-12 (desenho aprovado em 16/10/2026): a prova em N sessoes e UMA avaliacao. As sessoes 2..N saem de
    `r.avaliacoes` e entram em `aplicacoes` da 1ª, com o codigo da linha delas (`…-L<linha>-SA`) — a mesma celula, o
    mesmo codigo, em toda rodada. A linha antiga da sessao (`…-L<linha>-V`) sai do plano, e a rodada a tira com a marca
    de saida. Quem aplica e quem fiscaliza sao os da prova; a planilha que traz OUTRO aplicador na sessao vira
    informacao. Fica por ULTIMO: as regras anteriores (TA somado, vista, sugestao) ja leram as sessoes como linhas."""
    for cabeca in _cabecas(r):
        seguintes = cabeca.pop("_sessoes_seguintes", [])
        if not seguintes:
            continue
        for k, seguinte in enumerate(seguintes, 2):
            codigo = seguinte["codigo"][:-2] + "-SA" if seguinte["codigo"].endswith("-V") else seguinte["codigo"] + "-SA"
            cabeca["aplicacoes"].append({
                "codigo": codigo, "numero": k, "data": seguinte["data_avaliacao"], "ta_inicial": seguinte["ta_inicial"],
                "tempos_consumidos": seguinte["tempos_consumidos"], "local": seguinte["local"]})
            if seguinte["instrutor_responsavel_id"] not in (None, cabeca["instrutor_responsavel_id"]):
                r.informativos.append(
                    f"{seguinte['disciplina']} {seguinte['chave_ue']} de {seguinte['data_avaliacao']}: a sessao {k} traz outro "
                    "aplicador na planilha; vale o da prova (RN-AV-12: quem aplica e o da avaliacao)")
            # A vista e da PROVA (`_casar_vistas` so olha a 1ª sessao); se alguma ficou na seguinte, passa para a prova.
            for v in seguinte.get("sessoes", []):
                cabeca["sessoes"].append({**v, "numero": len(cabeca["sessoes"]) + 1})
    r.avaliacoes[:] = [p for p in r.avaliacoes if "sessao_de" not in p]


def _e_od(prova: dict) -> bool:
    """A OD e continua (Q-17): pela chave «OD…» ou pela descricao «OBSERVACAO DE DESEMPENHO»."""
    return normalizar(prova.get("chave_ue") or "").startswith("OD") or "OBSERVACAO DE DESEMPENHO" in normalizar(
        prova.get("descricao") or "")


def _sessoes(prova: dict) -> list[dict]:
    """As linhas da prova: a 1ª sessao e as seguintes (RN-AV-12). Prova de uma sessao so: ela mesma."""
    return [prova, *prova.get("_sessoes_seguintes", [])]


def _agrupar_sessoes(r: Resolvido, janela_dias: int) -> None:
    """RN-AV-12 (emenda de 15/10/2026): mesma disciplina, mesmo COD e mesma descricao em dias consecutivos ou
    proximos e UMA prova com N sessoes. A 1ª sessao e a prova; as seguintes ganham `sessao_de` (o codigo da 1ª) e
    `numero_sessao`.

    ⚠️ DESDE O DESENHO APROVADO EM 16/10/2026 (opcao A), as sessoes seguintes vao para `sessoes_de_aplicacao` — quem as
       move e `_sessoes_viram_aplicacoes`, no fim da resolucao. Ate la, elas andam como linhas, para as regras de TA,
       vista e sugestao as lerem; nunca como erro de planilha."""
    for grupo in regras_de_prova.agrupar_sessoes([p for p in r.avaliacoes if not _e_od(p)], janela_dias):
        cabeca = grupo[0]
        if len(grupo) == 1:
            continue
        cabeca["numero_sessao"] = 1
        cabeca["_sessoes_seguintes"] = grupo[1:]
        for k, seguinte in enumerate(grupo[1:], 2):
            seguinte["sessao_de"] = cabeca["codigo"]
            seguinte["numero_sessao"] = k
            r.informativos.append(
                f"{seguinte['disciplina']} {seguinte['chave_ue']} de {seguinte['data_avaliacao']}: sessao {k} da prova de "
                f"{cabeca['data_avaliacao']} (RN-AV-12, mesma descricao) — a mesma prova, nao outra; gravada como sessao de "
                "aplicacao da prova")
        r.sessoes_de_aplicacao.append({
            "disciplina": cabeca["disciplina"], "cod": cabeca["chave_ue"], "descricao": cabeca.get("descricao"),
            "datas": [p["data_avaliacao"] for p in grupo], "ta": sum(p["tempos_consumidos"] or 0 for p in grupo)})


def _sessoes_herdam_o_aplicador(r: Resolvido) -> None:
    """RN-AV-12: a sessao seguinte e a MESMA prova — sem aplicador proprio na linha (nem fiscal), vale o da 1ª sessao.
    Sem isto, a vista que passou para a 1ª sessao levaria junto o aplicador que a linha da sessao 2 tinha herdado dela."""
    for cabeca in _cabecas(r):
        for seguinte in cabeca.get("_sessoes_seguintes", []):
            if (seguinte["instrutor_responsavel_id"] is None and seguinte.get("fiscal_id") is None
                    and seguinte.get("nome_fiscal_externo") is None and not seguinte.get("_aplicador_escrito")):
                seguinte["instrutor"], seguinte["instrutor_responsavel_id"] = cabeca["instrutor"], cabeca["instrutor_responsavel_id"]


def _cabecas(r: Resolvido) -> list[dict]:
    """As provas (1ª sessao de cada uma), sem as sessoes seguintes (RN-AV-12)."""
    return [p for p in r.avaliacoes if "sessao_de" not in p]


def _exige_vista(prova: dict, com_vista: frozenset[str]) -> bool | None:
    """RN-AV-13 pelo instrumento conhecido da prova (a marca do BANCO, `com_vista`); `None` quando nao se sabe."""
    conhecido = prova.get("instrumento") or prova.get("instrumento_gravado")
    if conhecido:
        return regras_de_prova.vista_obrigatoria(conhecido, com_vista)
    lido = regras_de_prova.ler_cod(prova.get("chave_ue") or "")
    regra = regras_de_prova.COD_DA_PLANILHA.get(lido[0]) if lido else None
    if regra is None or regra["instrumentos"] == "todos":
        return None
    exigencias = {regras_de_prova.vista_obrigatoria(i, com_vista) for i in regra["instrumentos"]}
    return exigencias.pop() if len(exigencias) == 1 else None


def _vista_de_prova_sem_item(r: Resolvido, hoje: date, com_vista: frozenset[str], ref: dict | None = None) -> None:
    """Spec 014 (decisao de Bernardo Villas Boas, 14/10/2026): o alerta de vista do sistema conta so a prova LIGADA a
    item do curriculo. A prova SEM item, aplicada ha mais de 7 dias e sem vista na planilha, vai para a lista — nao se
    sabe se o curriculo preve vista, e quem sabe e o operador. O prazo e o do parametro (`avaliacao.prazo_vista_dias`,
    7); aqui ele so decide o que listar, nunca o que gravar.
    RN-AV-13 (15/10/2026; PE em 16/10/2026): a vista e obrigatoria para PM, PO e PE (a marca do banco). Quando o
    instrumento da prova e conhecido — pela «a mais», pelo instrumento gravado ou por um COD que so nomeia instrumentos
    sem vista (PP, T, TG, TI) —, a prova que nao exige vista NAO vai para a lista. Desconhecido continua listado."""
    gravado = _no_sistema(ref or {})
    for prova in _cabecas(r):
        if prova.get("avaliacao_curriculo_id") or any(s.get("sessoes") for s in _sessoes(prova)) or _e_od(prova):
            continue
        if _exige_vista(prova, com_vista) is False:
            continue
        # R7 (16/10/2026): a prova que JA tem vista no sistema, ou que foi ligada ou juntada nele, nao vai para a lista.
        atual = gravado.get(prova.get("codigo")) or {}
        if atual.get("vistas_fora_da_planilha") or atual.get("juntada") or (atual.get("na_tela") and atual.get("item")):
            continue
        if (hoje - date.fromisoformat(prova["data_avaliacao"])).days > 7:
            r.erros_de_planilha.append(
                f"{prova['disciplina']} {prova['chave_ue']} de {prova['data_avaliacao']}: vista nao lancada na planilha, e a"
                " prova nao tem avaliacao do curriculo que diga se ha vista — sem alerta no sistema")


def _no_sistema(ref: dict) -> dict[str, dict]:
    """R7 (decisao de Bernardo Villas Boas, 16/10/2026): o que JA esta gravado, por codigo — a prova juntada como
    sessao de outra, a ligada ao item na tela ou por decisao, o TA com todas as sessoes de aplicacao (inclusive as da
    tela) e as vistas. A lista consulta isto antes de acusar: sem isto, ela repetia o que o sistema ja resolveu (a PP
    da CAHO IV com 40 TA depois da juncao continuava «36 × 40»)."""
    return {a["codigo"]: a for a in (ref.get("atuais") or {}).get("avaliacoes", [])}


def _ligar_itens(r: Resolvido, ref: dict, decisoes: dict | None = None) -> None:
    """Spec 014 (FR-036, FR-036.1, FR-039, T224), emendada em 15/10/2026 (RN-AV-10, RN-AV-11, RN-AV-14):

    - a prova liga ao item pelo COD da prova (a coluna U.E. da planilha: «PM1» = «PM 1» = «PM-1»); a descricao so
      desempata (`regras_de_prova.ligar_ao_curriculo`);
    - COD sem numero: o unico item do instrumento, ou a ordem cronologica de aplicacao;
    - so a 1ª sessao de cada prova liga (RN-AV-12) — as seguintes sao a mesma prova;
    - **prova a mais que o curriculo NAO e erro de planilha** (RN-AV-14): vira INFORMACAO «curriculo preve 1 PP;
      aplicadas 2», e a prova entra sem item, como fato;
    - nao casou (COD que nao nomeia instrumento, instrumento que a disciplina nao tem, ou ambiguidade que a descricao
      nao resolve): entra SEM item e vai para a lista de erros, com o COD, a descricao e os itens lado a lado
      (`provas_sem_casar`) — nada e inventado;
    - o TA diferente do curriculo tambem vai para a lista; na prova de N sessoes conta a SOMA das sessoes.
    Linha `RECON` e disciplina sem avaliacao do curriculo carregada (A4.7) seguem como antes.

    ⚠️ A LIGACAO POR DECISAO VEM ANTES (decisao de Bernardo Villas Boas, 16/10/2026): `itens_por_prova` do lote de
       decisoes da turma liga a prova (pela LINHA da planilha em que ela comeca) ao item nomeado — as 17 provas
       «sem item» por T/E errado, a CAHO I de 12/02 (TG 2) e a C-Espc-HN HN-1102-0710 de 12/03 (TG 1). A prova e o
       item decididos saem da ligacao automatica, e a trilha («decisao de …») vai na observacao da avaliacao.
    ⚠️ R7: antes de acusar, olha o que esta gravado (`_no_sistema`)."""
    itens = ref.get("itens_curriculo") or []
    if not itens:
        return
    gravado = _no_sistema(ref)
    forcadas = {str(k): v for k, v in ((decisoes or {}).get("itens_por_prova") or {}).items()}
    por_disciplina: dict[str, list[dict]] = {}
    for i in itens:
        por_disciplina.setdefault(i["disciplina_id"], []).append(i)
    ajuste = {a["avaliacao_curriculo_id"]: a for a in ref.get("ajustes") or [] if a.get("status", "ativo") == "ativo"}
    rotulo = lambda p: f"{p['disciplina']} {p['chave_ue']} de {p['data_avaliacao']}"  # noqa: E731

    def ja_ligada_no_sistema(prova: dict) -> bool:
        # So o que PERSISTE depois da rodada: a juntada, e o item da linha que a rodada nao toca (tela ou decisao).
        atual = gravado.get(prova.get("codigo")) or {}
        return bool(atual.get("juntada") or (atual.get("na_tela") and atual.get("item")))

    def ta_confere_no_sistema(prova: dict, previsto: object, na_planilha: int) -> bool:
        # O TA que a prova tera depois da rodada: o da planilha mais as sessoes nascidas na tela (a juncao).
        extra = int((gravado.get(prova.get("codigo")) or {}).get("ta_fora_da_planilha") or 0)
        return extra > 0 and na_planilha + extra == int(previsto)  # type: ignore[arg-type]

    def conferir_ta(prova: dict, item: dict) -> None:
        previsto = (ajuste.get(item["id"]) or {}).get("ta_aplicacao") or item.get("ta_aplicacao")
        na_planilha = sum(s["tempos_consumidos"] or 0 for s in _sessoes(prova))
        if previsto is not None and int(previsto) != int(na_planilha):
            if ta_confere_no_sistema(prova, previsto, na_planilha):
                r.informativos.append(f"{rotulo(prova)}: a planilha soma {na_planilha} TA; no sistema a prova tem {previsto} TA, "
                                      f"o do curriculo ({prova['item']}) — resolvido no sistema (R7)")
                return
            r.erros_de_planilha.append(
                f"{rotulo(prova)}: TA de prova diferente — planilha {na_planilha}, curriculo {previsto} ({prova['item']})")

    def registrar_sem_casar(prova: dict, motivo: str, todos: list[dict]) -> None:
        r.erros_de_planilha.append(f"{rotulo(prova)}: a prova nao casa com nenhuma avaliacao do curriculo da disciplina ({motivo})")
        r.provas_sem_casar.append({
            "codigo": prova["codigo"], "disciplina": prova["disciplina"], "cod": prova["chave_ue"], "data": prova["data_avaliacao"],
            "ta": sum(s["tempos_consumidos"] or 0 for s in _sessoes(prova)), "descricao": prova.get("descricao"), "motivo": motivo,
            "itens": [f"{i['instrumento']} {i['numero']}" + (f" ({i['ta_aplicacao']} TA)" if i.get("ta_aplicacao") else "")
                      for i in sorted(todos, key=lambda i: (i["instrumento"], int(i["numero"])))]})

    candidatas: dict[str, list[dict]] = {}
    decididos: dict[str, set[str]] = {}
    for prova in sorted(_cabecas(r), key=lambda a: (a["disciplina"], a["data_avaliacao"], a["ta_inicial"] or 0)):
        if _e_od(prova):
            continue
        decisao = forcadas.get(str(prova.get("linha")))
        if decisao is not None:
            alvo = next((i for i in por_disciplina.get(prova["disciplina_id"], [])
                         if f"{i['instrumento']} {i['numero']}" == " ".join(str(decisao["item"]).split())), None)
            if alvo is None:
                r.erros_de_planilha.append(f"{rotulo(prova)}: a decisao do lote pede o item {decisao['item']}, que a disciplina nao tem — "
                                           "a prova segue a ligacao automatica")
            else:
                prova["avaliacao_curriculo_id"] = alvo["id"]
                prova["item"] = f"{alvo['instrumento']} {alvo['numero']}"
                prova["instrumento"] = alvo["instrumento"]
                prova["_decisao"] = decisao.get("motivo", "decisao do lote")
                prova["observacoes"] = f"{prova['observacoes']} Item do curriculo {prova['item']} por decisao: {prova['_decisao']}."
                decididos.setdefault(prova["disciplina_id"], set()).add(alvo["id"])
                conferir_ta(prova, alvo)
                continue
        if not por_disciplina.get(prova["disciplina_id"]):
            # ⚠️ Nao some da lista (decisao de Bernardo Villas Boas, 14/10/2026): a disciplina sem avaliacao do
            #    curriculo carregada (os 90 itens fora da D-4, A4.7) tambem e prova que nao cumpre item nenhum.
            r.erros_de_planilha.append(f"{rotulo(prova)}: a disciplina nao tem avaliacao do curriculo carregada (A4.7) — entra sem avaliacao do curriculo")
            continue
        if "RECON" in normalizar(prova.get("chave_ue") or "") or "RECON" in normalizar(prova.get("descricao") or ""):
            r.erros_de_planilha.append(f"{rotulo(prova)}: linha sem correspondente no curriculo (RECON) — entra sem avaliacao do curriculo")
            continue
        candidatas.setdefault(prova["disciplina_id"], []).append(prova)

    for disciplina_id, provas in candidatas.items():
        todos_da_disciplina = por_disciplina[disciplina_id]
        da_disciplina = [i for i in todos_da_disciplina if i["id"] not in decididos.get(disciplina_id, set())]
        aplicadas: dict[str, list[dict]] = {}
        for p in _cabecas(r):
            if p.get("_decisao") and p["disciplina_id"] == disciplina_id:
                aplicadas.setdefault(p["instrumento"], []).append(p)
        for n, veredito in sorted(regras_de_prova.ligar_ao_curriculo(provas, da_disciplina).items()):
            prova = provas[n]
            if "nao_casa" in veredito:
                if ja_ligada_no_sistema(prova):
                    r.informativos.append(f"{rotulo(prova)}: a planilha nao casa ({veredito['nao_casa']}), mas no sistema a prova ja esta "
                                          "ligada ou juntada — resolvido no sistema (R7)")
                    continue
                registrar_sem_casar(prova, veredito["nao_casa"], todos_da_disciplina)
                continue
            if "a_mais" in veredito:
                prova["instrumento"] = veredito["a_mais"]
                prova["_sem_item"] = veredito
                aplicadas.setdefault(veredito["a_mais"], []).append(prova)
                continue
            item = veredito["item"]
            prova["avaliacao_curriculo_id"] = item["id"]
            prova["item"] = f"{item['instrumento']} {item['numero']}"
            prova["instrumento"] = item["instrumento"]
            aplicadas.setdefault(item["instrumento"], []).append(prova)
            conferir_ta(prova, item)
        cod = provas[0]["disciplina"]
        for instrumento in sorted({i["instrumento"] for i in todos_da_disciplina} | set(aplicadas)):
            previstos = sum(1 for i in todos_da_disciplina if i["instrumento"] == instrumento)
            # R7: a prova que o sistema juntou como sessao de outra nao conta como aplicada de novo.
            feitas = sorted((p for p in aplicadas.get(instrumento, []) if not (gravado.get(p.get("codigo")) or {}).get("juntada")),
                            key=lambda p: p["data_avaliacao"])
            sem_item = [p for p in feitas if p.get("_sem_item")]
            if len(feitas) > previstos:
                # RN-AV-14: aplicou MAIS que o curriculo preve — informacao, nao erro.
                r.informativos.append(
                    f"{cod}: curriculo preve {previstos} {instrumento}; aplicadas {len(feitas)} "
                    f"({', '.join(p['data_avaliacao'] for p in feitas)}) — RN-AV-14, nao e erro de planilha")
            else:
                # Nao passou do previsto: a prova sem item NAO e «a mais» — o numero do COD nao existe no curriculo, ou
                # repete um item ja aplicado. E «nao casa», e vai para a lista com os itens lado a lado (revisao de
                # 15/10/2026: a CAHO XIX «PP2», com o curriculo so com PP 3, sumia de todas as listas).
                livres = sorted(f"{i['instrumento']} {i['numero']}" for i in todos_da_disciplina
                                if i["instrumento"] == instrumento and not any(p.get("avaliacao_curriculo_id") == i["id"] for p in feitas))
                for prova in sem_item:
                    if ja_ligada_no_sistema(prova):
                        r.informativos.append(f"{rotulo(prova)}: sem item na planilha, mas no sistema a prova ja esta ligada ou juntada — "
                                              "resolvido no sistema (R7)")
                        continue
                    numero = prova["_sem_item"].get("numero")
                    motivo = (f"o COD pede {instrumento} {numero}, que o curriculo nao tem" if numero is not None
                              and not any(i["instrumento"] == instrumento and int(i["numero"]) == numero for i in todos_da_disciplina)
                              else f"o item {instrumento} {numero} ja foi ligado a outra prova" if numero is not None
                              else f"nao sobrou item {instrumento} livre")
                    motivo += f"; sem aplicacao: {', '.join(livres) or 'nenhum'}"
                    registrar_sem_casar(prova, motivo, todos_da_disciplina)
                if len(feitas) < previstos:
                    r.alertas.append(f"{cod}: a planilha tem {len(feitas)} {instrumento} de {previstos} previstas no curriculo (ainda nao aplicadas, ou faltando)")


def _sugestoes(r: Resolvido, ref: dict) -> None:
    """Spec 014 (FR-031.8, T227): onde o curriculo e MUDO sobre o tempo, o da planilha vira sugestao para a turma —
    so se o item nao tem tempo do curriculo e nao ha arbitrado confirmado. Idempotente: a mesma sugestao, zero mudanca.
    Na prova de N sessoes (RN-AV-12), o tempo de aplicacao e a SOMA das sessoes."""
    itens = {i["id"]: i for i in ref.get("itens_curriculo") or []}
    confirmados = {a["avaliacao_curriculo_id"] for a in ref.get("ajustes") or []
                   if a.get("status", "ativo") == "ativo" and (a.get("origem") == "arbitrado" or a.get("confirmado"))}
    vistos: set[str] = set()
    for prova in _cabecas(r):
        item = itens.get(prova.get("avaliacao_curriculo_id") or "")
        if item is None or item["id"] in confirmados or item["id"] in vistos:
            continue
        sem_aplicacao = item.get("origem_ta_aplicacao") is None
        sem_vista = item.get("origem_ta_vista") is None
        if not (sem_aplicacao or sem_vista):
            continue
        vista = sum(v["tempos_consumidos"] or 0 for v in prova.get("sessoes", [])) or None
        ta_aplicacao = sum(s["tempos_consumidos"] or 0 for s in _sessoes(prova)) if sem_aplicacao else None
        ta_vista = vista if sem_vista else None
        # PEND-014-11 (decisao de Bernardo Villas Boas, 16/10/2026): sugestao SEM valor nao e sugestao — a PP sem vista
        # no curriculo e sem vista na planilha gerava uma linha com os dois tempos nulos, que a aba mostrava como
        # «sugestao da planilha, a confirmar» sem nada a confirmar.
        if ta_aplicacao is None and ta_vista is None:
            continue
        r.sugestoes.append({
            "avaliacao_curriculo_id": item["id"],
            "item": prova.get("item"),
            "disciplina": prova["disciplina"],
            "ta_aplicacao": ta_aplicacao,
            "ta_vista": ta_vista,
        })
        vistos.add(item["id"])


def _chave_colada(texto: str) -> str:
    """«III PO», «IIIPO», «iii-po» → «IIIPO»: a chave da aba DATAS AVALIACOES e a da prova, comparaveis."""
    return re.sub(r"[^A-Z0-9]", "", normalizar(texto or ""))


def _casar_vistas(r, blocos_de_vista, decisoes, pend, local_de, casar, leitura, codigo=None, procedencia=None) -> None:
    """A vista vai na MESMA linha da avaliacao (`RN-AVAL-02`). Uma linha guarda UMA sessao de vista.

    ⚠️ R2 (decisao de Bernardo Villas Boas, 16/10/2026): a vista casa pela CHAVE que a aba DATAS AVALIACOES aponta
       (`IIIPO` → `IIIVP3`, `XIPM` → `XIVP1`), e nao so pela data da prova — com duas provas da disciplina no mesmo dia,
       a data levava as duas vistas para a primeira (C-Espc-HN III e XI). E NUNCA para prova aplicada DEPOIS da vista,
       em data e tempo: a `VP1` da BATI, no 1º tempo de 13/03, casava pelo numero com a AV1 do 3º tempo do mesmo dia.
    ⚠️ Decisao por LINHA (16/10/2026): o lote pode nomear a prova da vista pela linha da planilha em que cada uma
       comeca (`{"linha": 1746, "da_prova_linha": 1636}`), e DIVIDIR um bloco de vista entre provas
       (`{"linha": 1162, "dividir": [{"tempos": 1, "da_prova_linha": 1042}, {"tempos": 1, "da_prova_linha": 1148}]}`):
       cada parte vira uma sessao, com o codigo da linha do seu 1º tempo."""
    explicitas = list(decisoes.get("vistas", []))
    por_linha = {int(v["linha"]): v for v in explicitas if "linha" in v}
    # A aba DATAS AVALIACOES, quando existe, diz QUAL vista e de QUAL prova (chave a chave, com as datas):
    # vale como decisao explicita, antes de qualquer regra por numero (onda 2, C-Ap-HN e C-Espc-HN).
    mapa = decisoes.get("disciplinas", {})
    for d in getattr(leitura, "datas_avaliacoes", []):
        if d["data_vista"] and d["data_prova"] and d["chave_vista"]:
            explicitas.append({"disciplina": mapa.get(d["cod"], d["cod"]), "data": d["data_vista"].isoformat(),
                               "da_prova_de": d["data_prova"].isoformat(), "origem": "DATAS AVALIACOES",
                               "chave_prova": _chave_colada(d.get("chave_prova", "")), "chave_vista": _chave_colada(d["chave_vista"])})
    por_disciplina: dict[str, list[tuple[Bloco, dict]]] = {}
    for bloco, disciplina in blocos_de_vista:
        por_disciplina.setdefault(disciplina["cod"], []).append((bloco, disciplina))

    def antes_da_vista(prova: dict, data: str, ta: int) -> bool:
        return (prova["data_avaliacao"], prova["ta_inicial"] or 0) < (data, ta)

    for cod, sessoes in por_disciplina.items():
        sessoes.sort(key=lambda s: (s[0].data, s[0].ta_inicial))
        # RN-AV-12: a vista e da PROVA — so a 1ª sessao de cada uma e candidata.
        provas = sorted((a for a in _cabecas(r) if a["disciplina"] == cod), key=lambda a: (a["data_avaliacao"], a["ta_inicial"]))
        da_linha = {a.get("linha"): a for a in _cabecas(r)}
        # Sem numero: a sessao e a vista da ULTIMA prova aplicada ANTES dela (data e TA) que ainda nao tem
        # vista. Medido na onda 1 (C-Exp-Ag-Mag, 06/10/2026): a convencao anterior — k sessoes casam com as
        # ultimas k provas — mandava a vista de 24/03 para a prova de 31/03, e o banco recusava
        # (`aval_vista_apos_aplicacao`). A vista nunca precede a prova; e essa a regra que decide.
        # A prova que uma vista NUMERADA ja reivindica (pelo numero, antes dela) nao e candidata do recuo abaixo: medido
        # no ensaio de 16/10/2026, a «VP3» da CAHO VI (24/06, antes da PM3 de 02/07) caia no trabalho T2 de 23/06, que
        # tem os comentarios dele (VT2) — o recuo da BATI vale para a prova que nenhuma vista nomeia, so.
        reivindicadas: set[int] = set()
        for bloco, _disciplina in sessoes:
            if _numero(bloco.ue):
                pelo_numero = [a for a in provas if _numero(a["chave_ue"]) == _numero(bloco.ue)
                               and antes_da_vista(a, bloco.data.isoformat(), bloco.ta_inicial)]
                if pelo_numero:
                    reivindicadas.add(id(pelo_numero[-1]))
        for bloco, _disciplina in sessoes:
            data, ta = bloco.data.isoformat(), bloco.ta_inicial
            partes: list[tuple[dict | None, int, int, int]] = []  # (prova, linha do 1º tempo, ta inicial, tempos)
            por_decisao = por_linha.get(bloco.linha)
            if por_decisao is not None and "dividir" in por_decisao:
                inicio, linha = bloco.ta_inicial, bloco.linha
                for parte in por_decisao["dividir"]:
                    partes.append((da_linha.get(int(parte["da_prova_linha"])), linha, inicio, int(parte["tempos"])))
                    inicio, linha = inicio + int(parte["tempos"]), linha + int(parte["tempos"])
            else:
                if por_decisao is not None:
                    alvo = da_linha.get(int(por_decisao["da_prova_linha"]))
                else:
                    chave_da_vista = _chave_colada(f"{bloco.cod}{bloco.ue}")
                    decisao = next((v for v in explicitas if v.get("chave_vista") and v["disciplina"] == cod
                                    and v["chave_vista"] == chave_da_vista and v["data"] == data), None)
                    decisao = decisao or next((v for v in explicitas if "linha" not in v and v["disciplina"] == cod and v["data"] == data
                                               and v.get("ta_inicial", bloco.ta_inicial) == bloco.ta_inicial), None)
                    if decisao is not None:
                        candidatas = [a for a in provas if any(x["data_avaliacao"] == decisao["da_prova_de"] for x in _sessoes(a))
                                      and antes_da_vista(a, data, ta)]
                        pela_chave = [a for a in candidatas if decisao.get("chave_prova")
                                      and _chave_colada(f"{a['cod_planilha']}{a['chave_ue']}") == decisao["chave_prova"]]
                        alvo = (pela_chave or candidatas or [None])[0]
                    elif _numero(bloco.ue) and any(_numero(a["chave_ue"]) == _numero(bloco.ue) for a in provas):
                        candidatas = [a for a in provas if _numero(a["chave_ue"]) == _numero(bloco.ue) and antes_da_vista(a, data, ta)]
                        alvo = candidatas[-1] if candidatas else None
                        if alvo is None:
                            # O numero aponta prova aplicada DEPOIS da vista (BATI, VP1 de 13/03): vale a regra sem numero,
                            # entre as provas que nenhuma outra vista numerada reivindica.
                            anteriores = [a for a in provas if antes_da_vista(a, data, ta) and not a["sessoes"]
                                          and id(a) not in reivindicadas]
                            alvo = anteriores[-1] if anteriores else None
                    else:
                        # Sem numero — ou com numero que nenhuma prova da disciplina tem (C-Espc-HN: provas «PM», vistas
                        # «VP1/VP2/VP3»): a sessao e a vista da ultima prova aplicada antes dela que ainda nao tem vista.
                        anteriores = [a for a in provas if antes_da_vista(a, data, ta) and not a["sessoes"]]
                        if not anteriores:
                            # Toda prova anterior ja tem sessao: a vista e a SESSAO SEGUINTE da prova mais recente (FR-042).
                            anteriores = [a for a in provas if antes_da_vista(a, data, ta)]
                        alvo = anteriores[-1] if anteriores else None
                partes.append((alvo, bloco.linha, bloco.ta_inicial, bloco.tempos))
            # Quem CONDUZ a sessao (FR-043): o instrutor da linha da vista; sem casar, o texto como veio.
            bruto = leitura.digitadas.get(bloco.linha, {}).get("instrutor") or leitura.catalogo[bloco.chave].instrutor
            limpo_vista = " ".join(re.sub(r"\(\s*FISCAL\s*\)", "", bruto, flags=re.IGNORECASE).split())
            pessoa = casar(limpo_vista.split("/")[0], bloco, obrigatorio=False) if limpo_vista.strip() not in VAZIOS else None
            for alvo, linha, inicio, tempos in partes:
                if alvo is None:
                    pend("vista_sem_prova", f"vista {cod}+{bloco.ue} de {bloco.data:%d/%m/%Y} nao casa com nenhuma prova da disciplina", tempos, chave=f"{cod}+{bloco.ue}")
                    continue
                # ⚠️ Spec 014 (FR-042, T225): a 2ª vista da mesma prova e a SESSAO 2 — a chave `vista_extra_como_aec` do
                #    lote de decisoes (07/10/2026, C06) fica SEM EFEITO: ela existia porque a linha da avaliacao guardava
                #    uma sessao so. A AEC antiga sai pela rodada (ela deixa de estar no plano) e volta como sessao.
                alvo["sessoes"].append({
                    "codigo": (f"{codigo(bloco, 'S').rsplit('-L', 1)[0]}-L{linha:03d}-S" if codigo is not None else f"S{linha}"),
                    "numero": len(alvo["sessoes"]) + 1,
                    "data": data,
                    "ta_inicial": inicio,
                    "tempos_consumidos": tempos,
                    "local": local_de(bloco),
                    "conduz": pessoa["codigo"] if pessoa else None,
                    "conduz_nome_externo": None if pessoa or limpo_vista.strip() in VAZIOS else limpo_vista.split("/")[0].strip(),
                })
                # quem conduz a vista e o responsavel pela avaliacao, quando a prova so trazia o fiscal
                if alvo["instrutor_responsavel_id"] is None and pessoa is not None:
                    alvo["instrutor"], alvo["instrutor_responsavel_id"] = pessoa["codigo"], pessoa["id"]


def _resolver_dias_parados(r, dias_parados, dias_globais, leitura, codigo, procedencia, categoria_do_subtipo) -> None:
    """Dia parado de TODAS as turmas e calendario global; so de algumas, vira DIA PARADO da turma.

    ⚠️ SPEC 014 (FR-024, FR-025, FR-025.5, D-3 do plan): ate aqui o dia parado so desta turma virava
       TAD — e inflava o TAD (D-AA-12). Agora vai para `dias_parados`, PREVISTO (a planilha o planejou),
       com o codigo estavel `DSAP-<turma>-L<linha>-P` e o tipo de parada pela descricao. A linha TAD
       antiga (`…-N`) sai pela regra de «saiu da planilha», com a marca de reclassificacao.
    """
    for dia, blocos in sorted(dias_parados.items()):
        descricao = blocos[0][1]["descricao"]
        if dia in dias_globais or any(regra.get("forcar") for _b, regra in blocos):
            r.calendario.append({"data": dia, "descricao": descricao, "tempos": sum(b.tempos for b, _ in blocos)})
            continue
        for bloco, regra in blocos:
            r.dias_parados.append({
                "codigo": codigo(bloco, "P"),
                "data": dia,
                "ta_inicial": bloco.ta_inicial,
                "tempos": bloco.tempos,
                "tipo_parada": regra.get("tipo_parada") or tipo_de_parada(regra["descricao"]),
                "motivo": regra["descricao"],
                "prevista": True,
            })


def _aula_em_dia_parado(r) -> None:
    """FR-036.1 (spec 014, §11-B): aula num TEMPO que a planilha marcou parado entra como FATO (a planilha manda) e
    vai para a lista de erros de planilha — sem abortar a carga.

    ⚠️ E POR TEMPO, NAO POR DIA (decisao de Bernardo Villas Boas, 16/10/2026, achado R5 — emenda da FR-036.1 e da
       D3.6): por dia, a conferencia so acusava a parada de PARTE do dia (licenca no 9º tempo, cerimonia de manha),
       que nunca e conflito — os 6 avisos da rodada `2026-10-14T1916` eram todos assim. So acusa a aula cujos tempos
       caem nos tempos parados."""
    for a in r.aulas:
        fim = a["ta_inicial"] + a["tempos_consumidos"] - 1
        for p in r.dias_parados:
            fim_parado = p["ta_inicial"] + p["tempos"] - 1
            if p["data"] == a["data"] and a["ta_inicial"] <= fim_parado and p["ta_inicial"] <= fim:
                r.erros_tabelados.append({
                    "disciplina": a["disciplina"],
                    "diverge": f"aula em {a['data']} nos tempos {a['ta_inicial']}–{fim}, no dia que a mesma planilha marca parado",
                    "planilha": f"aula {a.get('ue') or a['disciplina']} e parada {p['tipo_parada']} — {p['motivo']} (tempos {p['ta_inicial']}–{p['ta_inicial'] + p['tempos'] - 1})",
                    "curriculo": "—",
                    "fez": "a aula entrou como fato; a parada tambem",
                })
                break


def _conferencias_internas(r, leitura, decisoes, pend, disciplinas_do_curso) -> None:
    """As conferencias da planilha contra ela mesma — OBRIGATORIAS (o gabarito e opcional).

    1. chave × «CH CONCLUIDA»: o que o leitor contou em cada chave fecha com o que a PROPRIA
       planilha conta (CONT.SE sobre o ESPELHO). Diverge = o leitor errou, ou a planilha tem linha
       que ele nao viu. BLOQUEIA.
    2. disciplina × CONTROLE: aulas + provas + vistas fecham com a «CH. CUMPRIDA» do CONTROLE.
       BLOQUEIA — salvo o que ficou de fora por pendencia, que e dito com o numero.
    3. chave × CH PREVISTA do catalogo: informativo. «Passou» e «falta» sao estados que a planilha
       mesma registra (coluna OK / PASSOU / FALTA); so viram erro de planilha em turma encerrada.
    """
    lido: dict[tuple[str, str], int] = {}
    for b in leitura.blocos:
        lido[b.chave] = lido.get(b.chave, 0) + b.tempos
    for chave, ta in sorted(lido.items()):
        linha = leitura.catalogo.get(chave)
        if linha is None or linha.ch_concluida is None:
            continue
        if linha.ch_concluida != ta:
            pend("contagem_diverge", f"chave {chave[0]}+{chave[1]}: o leitor contou {ta} TA e a planilha conta {linha.ch_concluida} em CH CONCLUIDA", abs(ta - linha.ch_concluida), chave=f"{chave[0]}+{chave[1]}")

    # ⚠️ A soma e pelo codigo DA PLANILHA, que e como o CONTROLE conta — a planilha pode lancar
    #    uma disciplina sob o codigo de outra, e ai o de-para muda a disciplina do banco, nao a conta.
    carregado: dict[str, int] = {}
    for a in r.aulas:
        carregado[a["cod_planilha"]] = carregado.get(a["cod_planilha"], 0) + a["tempos_consumidos"]
    for a in r.avaliacoes:
        carregado[a["cod_planilha"]] = carregado.get(a["cod_planilha"], 0) + a["tempos_consumidos"] + sum(
            v["tempos_consumidos"] or 0 for v in a.get("sessoes", []))
    for cod_planilha, (_prevista, cumprida) in sorted(leitura.controle.items()):
        if cumprida is None:
            continue
        # O CONTROLE de alguns cursos (CAHO) lista tambem AD, FE, PL, TR — siglas de atividade, nao de
        # disciplina; o fechamento e por disciplina, e so por ela.
        if decisoes.get("disciplinas", {}).get(cod_planilha, cod_planilha) not in disciplinas_do_curso:
            continue
        no_plano = carregado.get(cod_planilha, 0)
        if no_plano != cumprida:
            de_fora = sum(p.ta for p in r.pendencias if p.tipo in ("instrutor_nao_casado", "ue_inexistente", "aula_sem_instrutor", "vista_sem_prova", "vista_em_mais_de_uma_sessao", "sem_habilitacao") and p.bloqueia)
            pend("controle_diverge",
                 f"disciplina {cod_planilha}: o plano soma {no_plano} TA e o CONTROLE conta {cumprida} (diferenca {cumprida - no_plano}; ha {de_fora} TA da turma fora do plano por pendencia)",
                 abs(cumprida - no_plano), chave=cod_planilha)

    em_andamento = bool(decisoes.get("turma_em_andamento"))
    for chave, linha in sorted(leitura.catalogo.items()):
        if linha.ch is None or not chave[1].isdigit() or chave not in lido:
            continue
        if decisoes.get("disciplinas", {}).get(chave[0], chave[0]) not in disciplinas_do_curso:
            continue  # so UE de disciplina: licenca, feriado e afins nao tem carga prevista a cumprir
        if lido[chave] != linha.ch and not (em_andamento and lido[chave] < linha.ch):
            estado = "PASSOU" if lido[chave] > linha.ch else "FALTA"
            r.erros_de_planilha.append(f"UE {chave[0]}+{chave[1]}: {lido[chave]} TA lancados e {linha.ch} previstos no catalogo ({estado})")


def _tetos(r, ref, pend) -> None:
    """`RN-DIST-03`: o recomendado so alerta; fim de curso, nada; o TFM, como qualquer disciplina.

    ⚠️ Ate 27/10/2026 o TFM acima de `dsa.teto_tfm_semana` (6) saia aqui com o aviso proprio «o teto de
       TFM e 6» (a tela recusava; a sincronizacao so avisava). A emenda da `RN-DIST-03` (a) (spec 029,
       `FR-001`, D-2 a D-4) tirou o ramo: acima de 25 o TFM recebe o mesmo alerta do recomendado que
       qualquer disciplina, e a chave do TFM nem e lida — a falta dela nao cala mais o recomendado.
    """
    try:
        recomendado = float(ref["tetos"]["dsa.teto_recomendado_semana"])
    except (KeyError, ValueError):
        r.alertas.append("tetos: parametro ausente em `config_parametros` — o teto cala, nao e inventado")
        return
    nome_por_cod = {d["cod"]: d["nome"] for d in ref["disciplinas"]}
    soma: dict[tuple[tuple[int, int], str], int] = {}

    def somar(dia: str | None, cod: str, tempos: int | None) -> None:
        if not dia or not tempos:
            return
        ano, semana, _ = date.fromisoformat(dia).isocalendar()
        soma[((ano, semana), cod)] = soma.get(((ano, semana), cod), 0) + tempos

    for a in r.aulas:
        somar(a["data"], a["disciplina"], a["tempos_consumidos"])
    for a in r.avaliacoes:
        somar(a["data_avaliacao"], a["disciplina"], a["tempos_consumidos"])
        for v in a.get("sessoes", []):
            somar(v["data"], a["disciplina"], v["tempos_consumidos"])
    for ((ano, semana), cod), ta in sorted(soma.items()):
        nome = nome_por_cod.get(cod, cod)
        if sem_teto_algum(nome):
            continue
        if ta > recomendado:
            r.alertas.append(f"semana {semana}/{ano}: «{nome}» tem {ta} TA; o recomendado e {recomendado:g} (alerta, nao bloqueio)")


def _calendario_do_banco(r, ref) -> None:
    bloqueados = {f["data"]: f for f in ref["feriados"] if f["impacto"] == "dia_inteiro"}
    for c in r.calendario:
        c["ja_no_banco"] = c["data"] in bloqueados
    dias = {a["data"] for a in r.aulas} | {a["data_avaliacao"] for a in r.avaliacoes} | {a["data"] for a in r.atividades if a["categoria_normativa"] != "Estudo_Individual"}
    for dia in sorted(dias & set(bloqueados)):
        r.alertas.append(f"{dia}: ha lancamento num dia que o calendario do banco marca como dia inteiro («{bloqueados[dia]['descricao']}»)")


def _ch_contra_o_curriculo(r, leitura, decisoes, ref) -> None:
    """FR-036.1 (spec 014, §11-B): a CH PREVISTA da planilha (CONTROLE, por disciplina; BD DISCIPLINAS, por
    UE) contra a do CURRICULO no banco. Diverge = erro de planilha; o sistema NAO muda o catalogo (D-CUR-1)."""
    mapa = decisoes.get("disciplinas", {})
    por_cod = {d["cod"]: d for d in ref["disciplinas"]}
    for cod_planilha, (prevista, _cumprida) in sorted(leitura.controle.items()):
        disciplina = por_cod.get(mapa.get(cod_planilha, cod_planilha))
        if disciplina is None or prevista is None or disciplina.get("ch") is None:
            continue
        if int(prevista) != int(disciplina["ch"]):
            r.erros_tabelados.append({
                "disciplina": disciplina["cod"],
                "diverge": "CH da disciplina",
                "planilha": f"{int(prevista)} TA (CONTROLE)",
                "curriculo": f"{int(disciplina['ch'])} TA",
                "fez": "nada no catalogo (D-CUR-1); os lancamentos entraram como estao",
            })
    ue_por = {(u["disciplina_id"], str(u["numero"])): u for u in ref["ues"]}
    de_para = decisoes.get("ues", {})
    # R1 (16/10/2026): com de-para de UE, a linha do catalogo se compara com a UE que o de-para aponta (pelo nome) — e
    # duas linhas que caem na MESMA UE somam (Ag-Mag: I+3 e a «Ultima Aula» I+4 sao, as duas, a UE 4).
    por_ue: dict[tuple[str, str], tuple[dict, dict, int]] = {}
    for (cod, ue), linha in sorted(leitura.catalogo.items()):
        mapeada = de_para.get(f"{cod}+{ue}")
        if mapeada is not None and "+" in mapeada:
            cod, ue = mapeada.split("+", 1)
        if linha.ch is None or not ue.isdigit():
            continue
        disciplina = por_cod.get(mapa.get(cod, cod))
        if disciplina is None:
            continue
        u = ue_por.get((disciplina["id"], ue))
        if u is None or u.get("ch") is None:
            continue
        _d, _u, soma = por_ue.get((disciplina["id"], ue), (disciplina, u, 0))
        por_ue[(disciplina["id"], ue)] = (disciplina, u, soma + int(linha.ch))
    for (_id, ue), (disciplina, u, soma) in por_ue.items():
        if soma != int(u["ch"]):
            r.erros_tabelados.append({
                "disciplina": disciplina["cod"],
                "diverge": f"CH da UE {ue}",
                "planilha": f"{soma} TA (BD DISCIPLINAS)",
                "curriculo": f"{int(u['ch'])} TA",
                "fez": "nada no catalogo (D-CUR-1)",
            })
