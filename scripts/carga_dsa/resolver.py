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

⚠️ AS VALIDACOES DO LANCAMENTO MANUAL continuam as de `plano.py` (`pode_atuar`, teto de TFM): este
   modulo as reusa, nao as reescreve.
"""

from __future__ import annotations

import hashlib
import json
import re
from dataclasses import dataclass, field
from datetime import date

from scripts.carga_dsa.planilha import Bloco, Leitura
from scripts.carga_dsa.plano import (
    CATEGORIAS,
    casar_instrutor,
    eh_tfm,
    ler_instrutor,
    normalizar,
    pode_atuar,
    sem_teto_algum,
)

VAZIOS = {"", "-", "--", "---"}

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

    def codigos(self) -> dict[str, list[str]]:
        return {
            "registros_aula": [a["codigo"] for a in self.aulas],
            "avaliacoes": [a["codigo"] for a in self.avaliacoes],
            "atividades_nao_letivas": [a["codigo"] for a in self.atividades],
            "dias_parados": [d["codigo"] for d in self.dias_parados],
        }

    def impressao_digital(self) -> str:
        sem_id = lambda linhas: [{k: v for k, v in l.items() if not k.endswith("_id")} for l in linhas]  # noqa: E731
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

    def pend(tipo: str, detalhe: str, ta: int = 0, bloqueia: bool = True, chave: str = "") -> None:
        r.pendencias.append(Pendencia(tipo=tipo, turma=nome, detalhe=detalhe, ta=ta, bloqueia=bloqueia, chave=chave))

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
            if padrao_vista.fullmatch(ue_mapeada):
                return "vista", {}
            if padrao_avaliacao.fullmatch(ue_mapeada):
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

    for bloco in leitura.blocos:
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
                if bruto.strip() not in VAZIOS:
                    instrutor = casar(bruto.split("/")[0], bloco, obrigatorio=False)
                    if instrutor is None:
                        texto = " ".join(bruto.split())
                        # Spec 014, FR-016: o texto que nao casa com o cadastro NAO e gravado como externo em
                        # silencio. Ou o lote ja decidiu (`responsavel_externo_aceito`: entidade ou palestrante),
                        # ou vira PENDENCIA com as tres saidas (casar com instrutor, externo, cadastrar).
                        # A3.6 (14/10/2026): o palestrante (nome de pessoa) vem como SHA-256 do texto normalizado (D4.6).
                        aceitos_sha = set(decisoes.get("responsavel_externo_aceito_sha256", []))
                        if (normalizar(texto) in {normalizar(t) for t in decisoes.get("responsavel_externo_aceito", [])}
                                or hashlib.sha256(normalizar(texto).encode("utf-8")).hexdigest() in aceitos_sha):
                            externo = texto
                        else:
                            # Decisao A3.2 (Bernardo Villas Boas, 14/10/2026): a pendencia trava SO A LINHA. A
                            # atividade fica fora do plano e e listada; o resto da turma entra. Vale nos dois
                            # bancos — no local tambem —, para o ensaio do local ser o plano do remoto.
                            pend("responsavel_sem_decisao",
                                 f"responsavel «{texto}» da atividade {bloco.cod}+{bloco.ue} nao casa com o cadastro: "
                                 "decidir no lote — casar com instrutor (`instrutor_por_texto`), aceitar como entidade ou "
                                 "palestrante externo (`responsavel_externo_aceito`) ou cadastrar a pessoa",
                                 bloco.tempos, bloqueia=False, chave=normalizar(texto))
                            r.pendentes.add(codigo(bloco, "N"))
                            continue
            r.atividades.append({
                "codigo": codigo(bloco, "N"),
                "categoria_normativa": CATEGORIAS[tipo],
                "data": bloco.data.isoformat(),
                "subtipo": subtipo,
                "descricao": "ESTUDO INDIVIDUAL" if tipo == "estudo_individual" else (regra.get("descricao") or " ".join(linha_do_catalogo.topico.split())),
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
                "sessoes": [],
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
        mapeada = decisoes.get("ues", {}).get(f"{bloco.cod}+{numero_ue}")
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

    _ligar_itens(r, ref)
    _casar_vistas(r, blocos_de_vista, decisoes, pend, local_de, casar, leitura, codigo=codigo, procedencia=procedencia)
    _vista_de_prova_sem_item(r, date.today())
    _sugestoes(r, ref)
    _resolver_dias_parados(r, dias_parados, dias_globais, leitura, codigo, procedencia, categoria_do_subtipo)
    _aula_em_dia_parado(r)
    _ch_contra_o_curriculo(r, leitura, decisoes, ref)
    _conferencias_internas(r, leitura, decisoes, pend, set(disciplina_por_cod))
    _tetos(r, ref, pend)
    _calendario_do_banco(r, ref)
    return r


_PREFIXO_DA_DESCRICAO = re.compile(r"^\s*([A-Z]{2,3})\s*([0-9]*)\s*[–—-]")


def _da_descricao(prova: dict, itens: list[dict]) -> tuple[str, int | None] | None:
    """O instrumento e o numero escritos NA DESCRICAO da linha — «PM4 – FISICA … (U.E. 7)», «TI1 – …», «PM – …» —,
    so se o instrumento for um dos que a disciplina tem. Medido em 14/10/2026: e assim que as planilhas escrevem."""
    # A descricao CRUA, em maiusculas: `normalizar` tira o travessao, que e o que separa o prefixo do titulo.
    achado = _PREFIXO_DA_DESCRICAO.match((prova.get("descricao") or "").upper())
    if achado is None or achado.group(1) not in {i["instrumento"] for i in itens}:
        return None
    return achado.group(1), (int(achado.group(2)) if achado.group(2) else None)


def _instrumento(prova: dict, itens: list[dict]) -> str | None:
    """O instrumento da prova (FR-036): a DESCRICAO da linha do catalogo, depois o tipo da avaliacao; a sigla da chave
    nao decide (a planilha usa «PE»/«PM» com sentidos que mudam entre cursos). So os instrumentos que a disciplina tem."""
    da_disciplina = {i["instrumento"]: i for i in itens}
    prefixo = _da_descricao(prova, itens)
    if prefixo is not None:
        return prefixo[0]
    descricao = normalizar(prova.get("descricao") or "")
    for valor, item in da_disciplina.items():
        nome = normalizar(item.get("instrumento_nome") or "")
        if nome and nome in descricao:
            return valor
    tipo = normalizar(prova.get("tipo_avaliacao") or "")
    for valor, item in da_disciplina.items():
        if normalizar(item.get("instrumento_nome") or "") == tipo:
            return valor
    # ⚠️ SEM RECURSO A «o unico instrumento da disciplina»: medido na rodada local de 14/10/2026, ele ligava Prova
    #    Pratica e OD a itens PM — inferencia, que a regra do ETL proibe. Sem descricao nem tipo que nomeie, nao casa.
    return None


def _e_od(prova: dict) -> bool:
    """A OD e continua (Q-17): pela chave «OD…» ou pela descricao «OBSERVACAO DE DESEMPENHO»."""
    return normalizar(prova.get("chave_ue") or "").startswith("OD") or "OBSERVACAO DE DESEMPENHO" in normalizar(
        prova.get("descricao") or "")


def _vista_de_prova_sem_item(r: Resolvido, hoje: date) -> None:
    """Spec 014 (decisao de Bernardo Villas Boas, 14/10/2026): o alerta de vista do sistema conta so a prova LIGADA a
    item do curriculo. A prova SEM item, aplicada ha mais de 7 dias e sem vista na planilha, vai para a lista — nao se
    sabe se o curriculo preve vista, e quem sabe e o operador. O prazo e o do parametro (`avaliacao.prazo_vista_dias`,
    7); aqui ele so decide o que listar, nunca o que gravar."""
    for prova in r.avaliacoes:
        if prova.get("avaliacao_curriculo_id") or prova.get("sessoes") or _e_od(prova):
            continue
        if (hoje - date.fromisoformat(prova["data_avaliacao"])).days > 7:
            r.erros_de_planilha.append(
                f"{prova['disciplina']} {prova['chave_ue']} de {prova['data_avaliacao']}: vista nao lancada na planilha, e a"
                " prova nao tem avaliacao do curriculo que diga se ha vista — sem alerta no sistema")


def _ligar_itens(r: Resolvido, ref: dict) -> None:
    """Spec 014 (FR-036, FR-036.1, FR-039, T224): a prova da planilha aponta o item do curriculo pelo instrumento e
    pelo numero de ordem dentro da disciplina. Nao casou — linha `RECON`, instrumento que a disciplina nao tem, ou
    prova a mais que os itens —, entra SEM item, como fato, e vai para a lista de erros de planilha. O TA diferente do
    curriculo tambem vai para a lista; a prova entra com o TA da planilha (o DSA assinado)."""
    itens = ref.get("itens_curriculo") or []
    if not itens:
        return
    por_disciplina: dict[str, list[dict]] = {}
    for i in itens:
        por_disciplina.setdefault(i["disciplina_id"], []).append(i)
    ajuste = {a["avaliacao_curriculo_id"]: a for a in ref.get("ajustes") or [] if a.get("status", "ativo") == "ativo"}
    contagem: dict[tuple[str, str], int] = {}
    for prova in sorted(r.avaliacoes, key=lambda a: (a["disciplina"], a["data_avaliacao"], a["ta_inicial"] or 0)):
        da_disciplina = por_disciplina.get(prova["disciplina_id"], [])
        rotulo = f"{prova['disciplina']} {prova['chave_ue']} de {prova['data_avaliacao']}"
        # A OD e continua (Q-17): nao tem item de aplicacao a ligar, e nao e erro de planilha.
        if _e_od(prova):
            continue
        if not da_disciplina:
            # ⚠️ Nao some da lista (decisao de Bernardo Villas Boas, 14/10/2026): a disciplina sem avaliacao do
            #    curriculo carregada (os 90 itens fora da D-4, A4.7) tambem e prova que nao cumpre item nenhum.
            r.erros_de_planilha.append(f"{rotulo}: a disciplina nao tem avaliacao do curriculo carregada (A4.7) — entra sem avaliacao do curriculo")
            continue
        if "RECON" in normalizar(prova.get("chave_ue") or "") or "RECON" in normalizar(prova.get("descricao") or ""):
            r.erros_de_planilha.append(f"{rotulo}: linha sem correspondente no curriculo (RECON) — entra sem avaliacao do curriculo")
            continue
        instrumento = _instrumento(prova, da_disciplina)
        if instrumento is None:
            r.erros_de_planilha.append(f"{rotulo}: a prova nao casa com nenhuma avaliacao do curriculo da disciplina")
            continue
        contagem[(prova["disciplina_id"], instrumento)] = contagem.get((prova["disciplina_id"], instrumento), 0) + 1
        # O numero ESCRITO na descricao («PM4») vence a ordem de aplicacao: a planilha aplica a PM 4 antes da PM 1.
        prefixo = _da_descricao(prova, da_disciplina)
        numero = prefixo[1] if prefixo and prefixo[1] is not None else contagem[(prova["disciplina_id"], instrumento)]
        item = next((i for i in da_disciplina if i["instrumento"] == instrumento and int(i["numero"]) == numero), None)
        if item is None:
            r.erros_de_planilha.append(f"{rotulo}: prova a mais — o curriculo preve {sum(1 for i in da_disciplina if i['instrumento'] == instrumento)} {instrumento}")
            continue
        prova["avaliacao_curriculo_id"] = item["id"]
        prova["item"] = f"{instrumento} {numero}"
        previsto = (ajuste.get(item["id"]) or {}).get("ta_aplicacao") or item.get("ta_aplicacao")
        if previsto is not None and int(previsto) != int(prova["tempos_consumidos"] or 0):
            r.erros_de_planilha.append(
                f"{rotulo}: TA de prova diferente — planilha {prova['tempos_consumidos']}, curriculo {previsto} ({instrumento} {numero})")
    for (disciplina_id, instrumento), n in contagem.items():
        previstos = sum(1 for i in por_disciplina.get(disciplina_id, []) if i["instrumento"] == instrumento)
        if n < previstos:
            cod = next((a["disciplina"] for a in r.avaliacoes if a["disciplina_id"] == disciplina_id), "?")
            r.alertas.append(f"{cod}: a planilha tem {n} {instrumento} de {previstos} previstas no curriculo (ainda nao aplicadas, ou faltando)")


def _sugestoes(r: Resolvido, ref: dict) -> None:
    """Spec 014 (FR-031.8, T227): onde o curriculo e MUDO sobre o tempo, o da planilha vira sugestao para a turma —
    so se o item nao tem tempo do curriculo e nao ha arbitrado confirmado. Idempotente: a mesma sugestao, zero mudanca."""
    itens = {i["id"]: i for i in ref.get("itens_curriculo") or []}
    confirmados = {a["avaliacao_curriculo_id"] for a in ref.get("ajustes") or []
                   if a.get("status", "ativo") == "ativo" and (a.get("origem") == "arbitrado" or a.get("confirmado"))}
    vistos: set[str] = set()
    for prova in r.avaliacoes:
        item = itens.get(prova.get("avaliacao_curriculo_id") or "")
        if item is None or item["id"] in confirmados or item["id"] in vistos:
            continue
        sem_aplicacao = item.get("origem_ta_aplicacao") is None
        sem_vista = item.get("origem_ta_vista") is None
        if not (sem_aplicacao or sem_vista):
            continue
        vista = sum(v["tempos_consumidos"] or 0 for v in prova.get("sessoes", [])) or None
        r.sugestoes.append({
            "avaliacao_curriculo_id": item["id"],
            "item": prova.get("item"),
            "disciplina": prova["disciplina"],
            "ta_aplicacao": prova["tempos_consumidos"] if sem_aplicacao else None,
            "ta_vista": vista if sem_vista else None,
        })
        vistos.add(item["id"])


def _casar_vistas(r, blocos_de_vista, decisoes, pend, local_de, casar, leitura, codigo=None, procedencia=None) -> None:
    """A vista vai na MESMA linha da avaliacao (`RN-AVAL-02`). Uma linha guarda UMA sessao de vista."""
    explicitas = list(decisoes.get("vistas", []))
    # A aba DATAS AVALIACOES, quando existe, diz QUAL vista e de QUAL prova (chave a chave, com as datas):
    # vale como decisao explicita, antes de qualquer regra por numero (onda 2, C-Ap-HN e C-Espc-HN).
    mapa = decisoes.get("disciplinas", {})
    for d in getattr(leitura, "datas_avaliacoes", []):
        if d["data_vista"] and d["data_prova"] and d["chave_vista"]:
            explicitas.append({"disciplina": mapa.get(d["cod"], d["cod"]), "data": d["data_vista"].isoformat(),
                               "da_prova_de": d["data_prova"].isoformat(), "origem": "DATAS AVALIACOES"})
    por_disciplina: dict[str, list[tuple[Bloco, dict]]] = {}
    for bloco, disciplina in blocos_de_vista:
        por_disciplina.setdefault(disciplina["cod"], []).append((bloco, disciplina))

    for cod, sessoes in por_disciplina.items():
        sessoes.sort(key=lambda s: (s[0].data, s[0].ta_inicial))
        provas = sorted((a for a in r.avaliacoes if a["disciplina"] == cod), key=lambda a: (a["data_avaliacao"], a["ta_inicial"]))
        # Sem numero: a sessao e a vista da ULTIMA prova aplicada ANTES dela (data e TA) que ainda nao tem
        # vista. Medido na onda 1 (C-Exp-Ag-Mag, 06/10/2026): a convencao anterior — k sessoes casam com as
        # ultimas k provas — mandava a vista de 24/03 para a prova de 31/03, e o banco recusava
        # (`aval_vista_apos_aplicacao`). A vista nunca precede a prova; e essa a regra que decide.
        for bloco, _disciplina in sessoes:
            decisao = next((v for v in explicitas if v["disciplina"] == cod and v["data"] == bloco.data.isoformat()
                            and v.get("ta_inicial", bloco.ta_inicial) == bloco.ta_inicial), None)
            if decisao is not None:
                alvo = next((a for a in provas if a["data_avaliacao"] == decisao["da_prova_de"]), None)
            elif _numero(bloco.ue) and any(_numero(a["chave_ue"]) == _numero(bloco.ue) for a in provas):
                candidatas = [a for a in provas if _numero(a["chave_ue"]) == _numero(bloco.ue) and a["data_avaliacao"] <= bloco.data.isoformat()]
                alvo = candidatas[-1] if candidatas else None
            else:
                # Sem numero — ou com numero que nenhuma prova da disciplina tem (C-Espc-HN: provas «PM», vistas
                # «VP1/VP2/VP3»): a sessao e a vista da ultima prova aplicada antes dela que ainda nao tem vista.
                anteriores = [a for a in provas if (a["data_avaliacao"], a["ta_inicial"] or 0) < (bloco.data.isoformat(), bloco.ta_inicial)
                              and not a["sessoes"]]
                if not anteriores:
                    # Toda prova anterior ja tem sessao: a vista e a SESSAO SEGUINTE da prova mais recente (FR-042).
                    anteriores = [a for a in provas if (a["data_avaliacao"], a["ta_inicial"] or 0) < (bloco.data.isoformat(), bloco.ta_inicial)]
                alvo = anteriores[-1] if anteriores else None
            if alvo is None:
                pend("vista_sem_prova", f"vista {cod}+{bloco.ue} de {bloco.data:%d/%m/%Y} nao casa com nenhuma prova da disciplina", bloco.tempos, chave=f"{cod}+{bloco.ue}")
                continue
            # ⚠️ Spec 014 (FR-042, T225): a 2ª vista da mesma prova e a SESSAO 2 — a chave `vista_extra_como_aec` do lote
            #    de decisoes (07/10/2026, C06) fica SEM EFEITO: ela existia porque a linha da avaliacao guardava uma
            #    sessao so. A AEC antiga sai pela rodada (ela deixa de estar no plano) e volta como sessao.
            # Quem CONDUZ a sessao (FR-043): o instrutor da linha da vista; sem casar, o texto como veio.
            bruto = leitura.digitadas.get(bloco.linha, {}).get("instrutor") or leitura.catalogo[bloco.chave].instrutor
            limpo_vista = " ".join(re.sub(r"\(\s*FISCAL\s*\)", "", bruto, flags=re.IGNORECASE).split())
            pessoa = casar(limpo_vista.split("/")[0], bloco, obrigatorio=False) if limpo_vista.strip() not in VAZIOS else None
            alvo["sessoes"].append({
                "codigo": codigo(bloco, "S") if codigo is not None else f"S{bloco.linha}",
                "numero": len(alvo["sessoes"]) + 1,
                "data": bloco.data.isoformat(),
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
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
    """FR-036.1 (spec 014, §11-B): aula no MESMO DIA que a planilha marcou parado entra como FATO (a
    planilha manda) e vai para a lista de erros de planilha — sem abortar a carga.

    ⚠️ E POR DIA, NAO POR TEMPO: uma celula da planilha tem uma chave so, entao aula e parada nunca dividem
       o mesmo TA; o erro que a §11-B descreve e o dia marcado parado que ainda assim teve aula."""
    for a in r.aulas:
        fim = a["ta_inicial"] + a["tempos_consumidos"] - 1
        for p in r.dias_parados:
            if p["data"] == a["data"]:
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
    """`RN-DIST-03`: TFM acima do teto BLOQUEIA; o recomendado so alerta; fim de curso, nada."""
    try:
        tfm = float(ref["tetos"]["dsa.teto_tfm_semana"])
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
        if eh_tfm(nome):
            if ta > tfm:
                # Regra 6 do projeto: regra normativa vira ALERTA, nunca bloqueio (RN-DEG-02) — e a tela tambem so avisa.
                r.alertas.append(f"semana {semana}/{ano}: «{nome}» tem {ta} TA; o teto de TFM e {tfm:g} (RN-DIST-03 — alerta, nao bloqueio)")
        elif ta > recomendado:
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
    for (cod, ue), linha in sorted(leitura.catalogo.items()):
        if linha.ch is None or not ue.isdigit():
            continue
        disciplina = por_cod.get(mapa.get(cod, cod))
        if disciplina is None:
            continue
        u = ue_por.get((disciplina["id"], ue))
        if u is None or u.get("ch") is None:
            continue
        if int(linha.ch) != int(u["ch"]):
            r.erros_tabelados.append({
                "disciplina": disciplina["cod"],
                "diverge": f"CH da UE {ue}",
                "planilha": f"{int(linha.ch)} TA (BD DISCIPLINAS)",
                "curriculo": f"{int(u['ch'])} TA",
                "fez": "nada no catalogo (D-CUR-1)",
            })
