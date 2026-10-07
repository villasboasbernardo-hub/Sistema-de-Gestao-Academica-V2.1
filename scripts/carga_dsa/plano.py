"""Do bloco da planilha a linha do banco: resolver, VALIDAR e montar a transacao.

⚠️ AS VALIDACOES SAO AS DO LANCAMENTO MANUAL (`lib/acoes/dsa.ts`, funcao `lancar`), reescritas
   aqui porque esta carga nao passa pela Server Action — e o banco, medido em 05/10/2026, NAO
   recusa instrutor nao habilitado (nao ha FK nem gatilho). O que a acao confere, este modulo
   confere, na mesma ordem:

   1. curso × disciplina      a disciplina do bloco e do curso da turma (e a FK composta confirma)
   2. UE da disciplina        a UE existe, esta ativa e e daquela disciplina. ⚠️ Faltou UE: RECUSA.
                              Este script NUNCA cria unidade de ensino.
   3. habilitacao             `RN-INST-01` (Risco: Alto), por `pode_atuar` — o porte literal de
                              `podeAtuar` em `lib/dominio/habilitacao.ts`: ministrar e ser
                              responsavel EXIGEM vinculo ATIVO; avaliacao e vista de prova NAO.
   4. teto de TFM             `RN-DIST-03` (a), o UNICO bloqueio do DSA — porte de
                              `avaliarTetosDaSemana` em `lib/dominio/dsa/tetos.ts`. Fim de curso nao
                              tem teto algum; o recomendado e ALERTA (`RN-DEG-02`), nunca recusa.

⚠️ CONFLITO COM OUTRA TURMA E RELATORIO, NUNCA BLOQUEIO (o mesmo criterio de
   `public.conflitos_da_semana`: sobreposicao de TA no mesmo dia com o mesmo instrutor ou local).

⚠️ O TOPICO GRAVADO E O DO CATALOGO DE UE DO BANCO, nunca o texto da planilha — e o que o
   formulario do lancamento faz ao pre-preencher o conteudo a partir da UE.

⚠️ `origem_migracao_v1` FICA NULA, E E DE PROPOSITO. A grade trata como «herdado» todo fato com
   procedencia de ETL e nunca editado, e manda para a faixa «Sem posicao» a avaliacao herdada no
   1º TA (`posicao-herdada.ts`, Q-12). Estes lancamentos tem posicao REAL: nascem como os da tela
   — sem procedencia de ETL e COM auditoria (`criado_por` = o autor que autorizou a carga) —, e
   a procedencia fica escrita em `observacoes` e no `codigo`.
"""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from dataclasses import dataclass, field
from datetime import date

from scripts.carga_dsa.banco import lit
from scripts.carga_dsa.planilha import Bloco, Leitura

CATEGORIAS = {"aec": "AEC", "tad": "TAD", "tr": "TR", "estudo_individual": "Estudo_Individual"}
SENTINELA_DO_ENSAIO = "ENSAIO_DESFEITO"


def normalizar(valor: str | None) -> str:
    """Maiusculas, sem acento, sem pontuacao, espacos colapsados — para comparar como gente."""
    sem_acento = "".join(
        c for c in unicodedata.normalize("NFD", valor or "") if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"\s+", " ", re.sub(r"[^A-Za-z0-9 ]", " ", sem_acento)).strip().upper()


# ── RN-INST-01 ─ porte de `lib/dominio/habilitacao.ts` ───────────────────────────────────────────

EXIGE_HABILITACAO = {"ministrar": True, "responsavel": True, "avaliacao": False, "vista_de_prova": False}


def pode_atuar(atuacao: str, instrutor_id: str, disciplina_id: str, vinculos: list[dict]) -> bool:
    if not EXIGE_HABILITACAO[atuacao]:
        return True
    return any(
        v["instrutor_id"] == instrutor_id and v["disciplina_id"] == disciplina_id and v["status"] == "ativo"
        for v in vinculos
    )


# ── RN-DIST-03 ─ porte de `lib/dominio/dsa/tetos.ts` ─────────────────────────────────────────────


def eh_tfm(nome: str) -> bool:
    n = normalizar(nome).lower()
    return "tfm" in n or "treinamento fisico" in n


def sem_teto_algum(nome: str) -> bool:
    n = normalizar(nome).lower()
    return "lhfc" in n or "fim de curso" in n


# ── O instrutor da planilha × o cadastro ─────────────────────────────────────────────────────────


@dataclass(frozen=True)
class InstrutorDaPlanilha:
    texto: str
    posto: str  # normalizado: «1TEN», «CC», «SO»
    especialidade: str  # o que veio entre parenteses ou depois do hifen do posto
    guerra: str  # normalizado


def ler_instrutor(bruto: str) -> InstrutorDaPlanilha | None:
    """«CC (T) FULANO», «1TEN (RM2-T) FULANA», «SO-ME (RM1) FULANO» → posto, especialidade, guerra.

    ⚠️ O casamento e por POSTO + NOME DE GUERRA INTEIRO, nunca por pedaco do nome: ha homonimos
       de nome de guerra em postos diferentes, e um «contem» os casaria errado sem erro nenhum.
    """
    limpo = re.sub(r"\(\s*FISCAL\s*\)", " ", bruto, flags=re.IGNORECASE).strip()
    if limpo in ("", "--", "-"):
        return None
    # «1º SG-HN FULANO» e «1ºSG-HN FULANO» sao o mesmo posto: o espaco depois do ordinal e digitacao.
    limpo = re.sub(r"^(\d+)\s*[ºo°]\s+(?=[A-Za-z])", r"\1º", limpo)
    parenteses = re.findall(r"\(([^)]*)\)", limpo)
    sem_parenteses = re.sub(r"\([^)]*\)", " ", limpo)
    partes = sem_parenteses.split()
    if len(partes) < 2:
        return None
    posto, _, sufixo = partes[0].partition("-")
    nome = partes[1:]
    # «3SG EP FULANO»: a especialidade solta depois do posto, sem hifen (onda 2, CAHO). Uma sigla de
    # 2 ou 3 letras maiusculas antes do nome e especialidade, nao nome de guerra.
    if not sufixo and len(nome) >= 2 and re.fullmatch(r"[A-Z]{2,3}", nome[0]):
        sufixo, nome = nome[0], nome[1:]
    especialidade = " ".join(([sufixo] if sufixo else []) + parenteses)
    return InstrutorDaPlanilha(
        texto=bruto,
        posto=normalizar(posto).replace(" ", ""),
        especialidade=especialidade.strip(),
        guerra=normalizar(" ".join(nome)),
    )


# Como a planilha escreve um posto que o cadastro guarda com outra sigla.
POSTOS_EQUIVALENTES = {"PROF": "SC", "PROFA": "SC", "PROFO": "SC",
                       # «1T»/«2T» e «1TEN»/«2TEN» sao o mesmo posto (medido na onda 2: C-Espc-FR)
                       "1T": "1TEN", "2T": "2TEN", "CT": "CT", "GM": "GM"}


def casar_instrutor(lido: InstrutorDaPlanilha, instrutores: list[dict], postos_por_codigo: dict | None = None) -> list[dict]:
    """Os instrutores ATIVOS do cadastro com o mesmo posto e o mesmo nome de guerra.

    Com `nome_guerra` preenchido, vale a igualdade. Vazio (o caso de quase toda a base hoje), o
    nome de guerra da planilha tem de estar no nome completo, PALAVRA POR PALAVRA INTEIRA.
    """
    palavras = lido.guerra.split()
    achados = []
    # «PROFº»/«PROFª» na planilha e o servidor civil do cadastro (posto «SC»).
    posto = POSTOS_EQUIVALENTES.get(lido.posto, lido.posto)
    for i in instrutores:
        # `postos_por_codigo`: o posto que a planilha ainda (ou ja) escreve para aquele instrutor — promocao.
        # Decisao nominal versionada POR CODIGO (fontes.json, `postos_aceitos_por_codigo`), sem nome de pessoa.
        aceitos = {normalizar(i["posto"]).replace(" ", "")} | set((postos_por_codigo or {}).get(str(i["codigo"]), []))
        if posto not in aceitos:
            continue
        guerra = normalizar(i.get("guerra"))
        nome = normalizar(i["nome"]).split()
        if guerra and guerra == lido.guerra:
            achados.append(i)
            continue
        # Com nome de guerra no cadastro e texto DIFERENTE dele («FULANO SICRANO» × «SICRANO BELTRANO»): ainda vale o
        # nome completo, palavra por palavra inteira — o nome de guerra preenchido nao pode fazer a planilha
        # que escreve outra forma deixar de casar (medido na onda 2, 06/10/2026). Homonimo continua acusado.
        if all(p in nome for p in palavras):
            achados.append(i)
    # Dois do mesmo posto e nome de guerra: a ESPECIALIDADE da planilha desempata, quando ela a traz
    # («2º SG-HN FULANO»: um -HN e um -GC no cadastro; medido na onda 2, C-Espc-HN).
    if len(achados) > 1 and lido.especialidade:
        esp = normalizar(lido.especialidade).replace(" ", "")
        com_esp = [i for i in achados if esp and esp in normalizar(i.get("esp") or "").replace(" ", "")]
        if len(com_esp) == 1:
            return com_esp
    return achados


# ── O plano ──────────────────────────────────────────────────────────────────────────────────────


@dataclass
class Plano:
    turma: dict
    autor: dict
    arquivo: str
    aulas: list[dict] = field(default_factory=list)
    avaliacoes: list[dict] = field(default_factory=list)
    atividades: list[dict] = field(default_factory=list)
    calendario: list[dict] = field(default_factory=list)  # dias que NAO viram lancamento
    recusas: list[str] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)
    conflitos: list[str] = field(default_factory=list)
    instrutores: dict[str, dict] = field(default_factory=dict)  # texto da planilha → cadastro

    def impressao_digital(self) -> str:
        """O plano em chaves NATURAIS (codigos, nunca `id`): igual no local e no remoto, ou parar."""
        corpo = json.dumps(
            {
                "aulas": [{k: v for k, v in a.items() if not k.endswith("_id")} for a in self.aulas],
                "avaliacoes": [{k: v for k, v in a.items() if not k.endswith("_id")} for a in self.avaliacoes],
                "atividades": [{k: v for k, v in a.items() if not k.endswith("_id")} for a in self.atividades],
                # `ja_no_banco` e ESTADO do destino, nao plano: muda depois da primeira gravacao.
                "calendario": [{k: v for k, v in c.items() if k != "ja_no_banco"} for c in self.calendario],
                "recusas": self.recusas,
            },
            sort_keys=True,
            ensure_ascii=False,
            default=str,
        )
        return hashlib.sha256(corpo.encode("utf-8")).hexdigest()[:16]


def _slug(turma: str) -> str:
    return re.sub(r"[^A-Z0-9]+", "-", normalizar(turma)).strip("-")


def _casa(regra: dict, bloco: Bloco) -> bool:
    quando = regra.get("quando", {})
    return (
        ("data" not in quando or quando["data"] == bloco.data.isoformat())
        and ("cod" not in quando or quando["cod"] == bloco.cod)
        and ("ue" not in quando or quando["ue"] == bloco.ue)
        and ("ta_inicial" not in quando or quando["ta_inicial"] == bloco.ta_inicial)
    )


def _semana_iso(dia: date) -> tuple[int, int]:
    ano, semana, _ = dia.isocalendar()
    return ano, semana


def montar(leitura: Leitura, ref: dict, decisoes: dict, arquivo: str, hoje: str) -> Plano:
    """Resolve cada bloco contra o retrato do banco e aplica as validacoes do lancamento manual."""
    turma, autor = ref["turma"], ref.get("autor")
    plano = Plano(turma=turma, autor=autor or {}, arquivo=arquivo)

    if not autor or not autor.get("auth_user_id") or autor.get("status") != "ativo":
        plano.recusas.append(
            "autor: a conta informada nao existe, nao esta ativa ou nao tem credencial neste destino — "
            "sem autor a linha nasceria sem procedencia E sem auditoria"
        )

    disciplina_por_cod = {d["cod"]: d for d in ref["disciplinas"]}
    disciplina_por_id = {d["id"]: d for d in ref["disciplinas"]}
    ue_por = {(u["disciplina_id"], str(u["numero"])): u for u in ref["ues"]}
    metodologia_por_sigla = {normalizar(m["sigla"]): m["valor"] for m in ref["metodologias"] if m.get("sigla")}
    categoria_do_subtipo = {t["valor"]: t.get("categoria") for t in ref["tipos_atividade"]}
    locais = {normalizar(k): v for k, v in decisoes.get("locais", {}).items()}
    chaves = decisoes.get("chaves", {})
    padrao_avaliacao = re.compile(decisoes.get("padrao_ue_de_avaliacao", r"(AV|PE)\d+"))
    padrao_vista = re.compile(decisoes.get("padrao_ue_de_vista", r"VP\d*"))
    slug = _slug(turma["codigo"])

    def codigo(bloco: Bloco, sufixo: str) -> str:
        return f"DSAP-{slug}-L{bloco.linha:03d}-{sufixo}"

    def procedencia(bloco: Bloco) -> str:
        ate = bloco.linha + bloco.tempos - 1
        return (
            f"Carga da planilha de controle «{arquivo}», PREENCHIMENTO linhas {bloco.linha}–{ate} "
            f"(scripts/carga_dsa, {hoje})."
        )

    def ajuste(bloco: Bloco, campo: str) -> str | None:
        for regra in decisoes.get("ajustes", []):
            if campo in regra and _casa(regra, bloco):
                return regra[campo]
        return None

    def local_de(bloco: Bloco, regra: dict | None = None) -> str | None:
        forcado = ajuste(bloco, "local") or (regra or {}).get("local")
        if forcado:
            return forcado
        bruto = leitura.catalogo[bloco.chave].local
        if bruto in ("", "--", "-"):
            return None
        if normalizar(bruto) not in locais:
            plano.recusas.append(
                f"linha {bloco.linha}: o local «{bruto}» do catalogo nao tem traducao nas decisoes da turma"
            )
            return None
        return locais[normalizar(bruto)]

    def tecnica_de(bloco: Bloco) -> str | None:
        sigla = ajuste(bloco, "tecnica") or leitura.catalogo[bloco.chave].tecnica
        if sigla in ("", "--", "-"):
            return None
        valor = metodologia_por_sigla.get(normalizar(sigla))
        if valor is None:
            plano.recusas.append(
                f"linha {bloco.linha}: a tecnica «{sigla}» nao e sigla de nenhuma metodologia da lista do banco"
            )
        return valor

    def instrutor_de(bloco: Bloco) -> dict | None:
        bruto = leitura.catalogo[bloco.chave].instrutor
        forcado = decisoes.get("instrutor_por_chave", {}).get(f"{bloco.cod}+{bloco.ue}")
        if forcado is not None:
            achados = [i for i in ref["instrutores"] if i["codigo"] == str(forcado)]
        else:
            lido = ler_instrutor(bruto)
            if lido is None:
                plano.recusas.append(f"linha {bloco.linha}: nao li posto e nome de guerra em «{bruto}»")
                return None
            achados = casar_instrutor(lido, ref["instrutores"])
        if len(achados) != 1:
            plano.recusas.append(
                f"linha {bloco.linha}: «{bruto}» casa com {len(achados)} instrutor(es) ativo(s) do cadastro "
                f"(codigos {sorted(a['codigo'] for a in achados)}) — o casamento exige exatamente um"
            )
            return None
        plano.instrutores[bruto] = achados[0]
        return achados[0]

    vistas_decididas = decisoes.get("vistas", [])
    blocos_de_vista: list[tuple[Bloco, dict]] = []

    for bloco in leitura.blocos:
        regra = chaves.get(f"{bloco.cod}+{bloco.ue}") or chaves.get(bloco.cod)
        disciplina = disciplina_por_cod.get(bloco.cod)

        # ── o que as decisoes da turma nomeiam: calendario, nao letiva, ou ignorar ──
        if regra is not None:
            tipo = regra["tipo"]
            if tipo == "ignorar":
                continue
            if tipo == "calendario":
                plano.calendario.append(
                    {"data": bloco.data.isoformat(), "linha": bloco.linha, "tempos": bloco.tempos,
                     "descricao": regra.get("descricao") or leitura.catalogo[bloco.chave].topico}
                )
                continue
            if tipo not in CATEGORIAS:
                plano.recusas.append(f"linha {bloco.linha}: tipo «{tipo}» desconhecido nas decisoes")
                continue
            subtipo = regra.get("subtipo") or ("Estudo Individual" if tipo == "estudo_individual" else None)
            if subtipo is None or subtipo not in categoria_do_subtipo:
                plano.recusas.append(f"linha {bloco.linha}: subtipo «{subtipo}» nao esta em `tipos_atividade`")
                continue
            if categoria_do_subtipo[subtipo] != CATEGORIAS[tipo]:
                plano.recusas.append(
                    f"linha {bloco.linha}: o subtipo «{subtipo}» e da categoria "
                    f"{categoria_do_subtipo[subtipo]} no banco, e as decisoes pedem {CATEGORIAS[tipo]}"
                )
                continue
            externo = regra.get("responsavel_externo")
            instrutor = None
            if externo is None and regra.get("responsavel") == "instrutor":
                instrutor = instrutor_de(bloco)
            descricao = (
                "ESTUDO INDIVIDUAL"
                if tipo == "estudo_individual"
                else (regra.get("descricao") or leitura.catalogo[bloco.chave].topico)
            )
            plano.atividades.append({
                "codigo": codigo(bloco, "N"),
                "categoria_normativa": CATEGORIAS[tipo],
                "data": bloco.data.isoformat(),
                "subtipo": subtipo,
                "descricao": descricao,
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
                "local": None if tipo == "estudo_individual" and not regra.get("local") else local_de(bloco, regra),
                "instrutor": instrutor["codigo"] if instrutor else None,
                "instrutor_id": instrutor["id"] if instrutor else None,
                "responsavel_externo": externo,
                "observacoes": procedencia(bloco),
            })
            continue

        # ── o que e de disciplina: aula, avaliacao ou vista ──
        if disciplina is None:
            plano.recusas.append(
                f"linha {bloco.linha}: o codigo «{bloco.cod}» nao e disciplina ativa do curso "
                f"{turma['curso']} nem tem regra nas decisoes da turma"
            )
            continue

        if padrao_vista.fullmatch(bloco.ue):
            blocos_de_vista.append((bloco, disciplina))
            continue

        if padrao_avaliacao.fullmatch(bloco.ue):
            instrutor = instrutor_de(bloco)
            if instrutor is None:
                continue
            # RN-INST-01 delimitada: avaliacao NAO exige habilitacao. O porteiro e chamado e
            # devolve verdadeiro por decisao da regra, como em `lancar`.
            assert pode_atuar("avaliacao", instrutor["id"], disciplina["id"], ref["habilitacoes"])
            tipo_avaliacao = decisoes.get("tipo_avaliacao")
            if tipo_avaliacao not in ref["tipos_avaliacao"]:
                plano.recusas.append(f"linha {bloco.linha}: tipo de avaliacao «{tipo_avaliacao}» fora da lista do banco")
                continue
            plano.avaliacoes.append({
                "codigo": codigo(bloco, "V"),
                "disciplina": disciplina["cod"],
                "disciplina_id": disciplina["id"],
                "tipo_avaliacao": tipo_avaliacao,
                "data_avaliacao": bloco.data.isoformat(),
                "ta_inicial": bloco.ta_inicial,
                "tempos_consumidos": bloco.tempos,
                "instrutor": instrutor["codigo"],
                "instrutor_responsavel_id": instrutor["id"],
                "metodologia": tecnica_de(bloco),
                "local": local_de(bloco),
                # O titulo da prova e o da PLANILHA (decisao de Bernardo Villas Boas, 06/10/2026):
                # a avaliacao nao aponta UE, entao nao ha topico de catalogo a preferir.
                "conteudo_resumo": leitura.catalogo[bloco.chave].topico or None,
                "data_vista_prova": None,
                "ta_inicial_vista": None,
                "tempos_consumidos_vista": None,
                "local_vista": None,
                "observacoes": procedencia(bloco),
            })
            continue

        ue = ue_por.get((disciplina["id"], bloco.ue))
        if ue is None:
            plano.recusas.append(
                f"linha {bloco.linha}: a UE {bloco.ue} da disciplina {bloco.cod} NAO existe (ativa) no "
                "catalogo do banco — este script nao cria unidade de ensino"
            )
            continue
        instrutor = instrutor_de(bloco)
        if instrutor is None:
            continue
        if not pode_atuar("ministrar", instrutor["id"], disciplina["id"], ref["habilitacoes"]):
            plano.recusas.append(
                f"linha {bloco.linha}: o instrutor de codigo {instrutor['codigo']} nao esta habilitado em "
                f"{disciplina['cod']} — {disciplina['nome']} (RN-INST-01). Habilite-o na ficha do instrutor."
            )
            continue
        plano.aulas.append({
            "codigo": codigo(bloco, "A"),
            "data": bloco.data.isoformat(),
            "disciplina": disciplina["cod"],
            "ue": ue["codigo"],
            "numero_ue": ue["numero"],
            "unidade_ensino_id": ue["id"],
            "instrutor": instrutor["codigo"],
            "instrutor_id": instrutor["id"],
            "ta_inicial": bloco.ta_inicial,
            "tempos_consumidos": bloco.tempos,
            "conteudo_resumo": ue["topico"],
            "metodologia": tecnica_de(bloco),
            "local": local_de(bloco),
            "observacoes": procedencia(bloco),
        })

    # ── a vista vai na MESMA linha da avaliacao (RN-AVAL-02): `UPDATE` na tela, coluna aqui ──
    for bloco, disciplina in blocos_de_vista:
        decisao = next(
            (v for v in vistas_decididas
             if v["disciplina"] == disciplina["cod"] and v["data"] == bloco.data.isoformat()
             and v.get("ta_inicial", bloco.ta_inicial) == bloco.ta_inicial),
            None,
        )
        if decisao is None:
            plano.recusas.append(
                f"linha {bloco.linha}: vista de prova de {disciplina['cod']} em {bloco.data:%d/%m/%Y} sem "
                "decisao dizendo de QUAL prova ela e"
            )
            continue
        alvo = next(
            (a for a in plano.avaliacoes
             if a["disciplina"] == disciplina["cod"] and a["data_avaliacao"] == decisao["da_prova_de"]),
            None,
        )
        if alvo is None:
            plano.recusas.append(
                f"linha {bloco.linha}: a vista aponta para a prova de {disciplina['cod']} em "
                f"{decisao['da_prova_de']}, que nao esta entre as avaliacoes lidas"
            )
            continue
        if alvo["data_vista_prova"] is not None:
            plano.recusas.append(
                f"linha {bloco.linha}: a prova {alvo['codigo']} ja recebeu vista — a linha guarda UMA"
            )
            continue
        alvo["data_vista_prova"] = bloco.data.isoformat()
        alvo["ta_inicial_vista"] = bloco.ta_inicial
        alvo["tempos_consumidos_vista"] = bloco.tempos
        alvo["local_vista"] = local_de(bloco)
        alvo["observacoes"] += f" Vista: linhas {bloco.linha}–{bloco.linha + bloco.tempos - 1}."

    _conferencias_internas(plano, leitura, decisoes, disciplina_por_cod)
    _avaliar_tetos(plano, ref, disciplina_por_id)
    _avaliar_calendario(plano, ref)
    _avaliar_conflitos(plano, ref)
    _avaliar_ja_existentes(plano, ref)
    return plano


def _conferencias_internas(plano: Plano, leitura: Leitura, decisoes: dict, disciplina_por_cod: dict) -> None:
    """As duas conferencias da planilha contra ela mesma — OBRIGATORIAS, com ou sem gabarito.

    1. UE × CH do catalogo da planilha: o que foi lancado em cada UE fecha com a CH que a aba
       BD DISCIPLINAS declara. Passar da CH e sempre recusa; ficar abaixo so e aceito (como
       alerta) quando as decisoes declaram `turma_em_andamento`.
    2. disciplina × aba CONTROLE: aulas + provas + vistas de cada disciplina fecham com a
       «CH. CUMPRIDA» que a propria planilha conta por outro caminho (o ESPELHO).

    ⚠️ O gabarito e opcional (decisao de Bernardo Villas Boas, 06/10/2026); estas duas nao sao.
       Elas nao dependem de segunda leitura: usam contagens que a planilha ja traz.
    """
    em_andamento = bool(decisoes.get("turma_em_andamento"))

    por_ue: dict[tuple[str, str], int] = {}
    for a in plano.aulas:
        chave = (a["disciplina"], str(a["numero_ue"]))
        por_ue[chave] = por_ue.get(chave, 0) + a["tempos_consumidos"]
    for (cod, ue), linha in sorted(leitura.catalogo.items()):
        if cod not in disciplina_por_cod or not ue.isdigit() or linha.ch is None:
            continue
        lancado = por_ue.get((cod, ue), 0)
        if lancado == linha.ch:
            continue
        frase = f"UE {cod}+{ue}: lancado {lancado} TA, e o catalogo da planilha declara {linha.ch}"
        if lancado < linha.ch and em_andamento:
            plano.alertas.append(frase + " (turma em andamento)")
        else:
            plano.recusas.append(frase)

    for cod in sorted(disciplina_por_cod):
        if cod not in leitura.controle:
            plano.recusas.append(f"disciplina {cod}: nao esta na aba CONTROLE da planilha")
            continue
        _, cumprida = leitura.controle[cod]
        total = sum(a["tempos_consumidos"] for a in plano.aulas if a["disciplina"] == cod) + sum(
            a["tempos_consumidos"] + (a["tempos_consumidos_vista"] or 0)
            for a in plano.avaliacoes
            if a["disciplina"] == cod
        )
        if cumprida != total:
            plano.recusas.append(
                f"disciplina {cod}: o plano soma {total} TA (aulas + provas + vistas), e a aba CONTROLE "
                f"conta {cumprida} de CH cumprida"
            )


def _avaliar_tetos(plano: Plano, ref: dict, disciplina_por_id: dict) -> None:
    """`RN-DIST-03`: TFM acima do teto BLOQUEIA; o recomendado so alerta; fim de curso, nada."""
    try:
        tfm = float(ref["tetos"]["dsa.teto_tfm_semana"])
        recomendado = float(ref["tetos"]["dsa.teto_recomendado_semana"])
    except (KeyError, ValueError):
        plano.alertas.append("tetos: parametro ausente em `config_parametros` — o teto cala, nao e inventado")
        return

    nome_por_cod = {d["cod"]: d["nome"] for d in disciplina_por_id.values()}
    cod_por_id = {d["id"]: d["cod"] for d in disciplina_por_id.values()}
    soma: dict[tuple[tuple[int, int], str], int] = {}

    def somar(dia: str, cod: str | None, tempos: int | None) -> None:
        if cod is None or not tempos:
            return
        chave = (_semana_iso(date.fromisoformat(dia)), cod)
        soma[chave] = soma.get(chave, 0) + tempos

    codigos_do_plano = {a["codigo"] for a in plano.aulas} | {a["codigo"] for a in plano.avaliacoes}
    ja_gravados = set(ref["codigos"]["registros_aula"]) | set(ref["codigos"]["avaliacoes"])
    if not (codigos_do_plano & ja_gravados):
        # Numa reexecucao o que ja esta no banco E o proprio plano: nao se soma duas vezes.
        for o in ref["da_turma"]:
            somar(o["data"], cod_por_id.get(o.get("disciplina_id")), o.get("tempos"))
    for a in plano.aulas:
        somar(a["data"], a["disciplina"], a["tempos_consumidos"])
    for a in plano.avaliacoes:
        somar(a["data_avaliacao"], a["disciplina"], a["tempos_consumidos"])
        if a["data_vista_prova"]:
            somar(a["data_vista_prova"], a["disciplina"], a["tempos_consumidos_vista"])

    for ((ano, semana), cod), ta in sorted(soma.items()):
        nome = nome_por_cod.get(cod, cod)
        if sem_teto_algum(nome):
            continue
        if eh_tfm(nome):
            if ta > tfm:
                plano.recusas.append(
                    f"semana {semana}/{ano}: «{nome}» teria {ta} TA; o teto de TFM e {tfm:g} (RN-DIST-03)"
                )
        elif ta > recomendado:
            plano.alertas.append(
                f"semana {semana}/{ano}: «{nome}» tem {ta} TA; o recomendado e {recomendado:g} (alerta, nao bloqueio)"
            )


def _avaliar_calendario(plano: Plano, ref: dict) -> None:
    """Lancamento em dia de feriado `dia_inteiro` e ALERTA: a planilha registra que houve aula."""
    bloqueados = {f["data"]: f for f in ref["feriados"] if f["impacto"] == "dia_inteiro"}
    dias = (
        [a["data"] for a in plano.aulas]
        + [a["data_avaliacao"] for a in plano.avaliacoes]
        + [a["data"] for a in plano.atividades]
    )
    for dia in sorted(set(dias) & set(bloqueados)):
        plano.alertas.append(
            f"{dia}: ha lancamento num dia que o calendario do banco marca como dia inteiro "
            f"(«{bloqueados[dia]['descricao']}»)"
        )
    for c in plano.calendario:
        c["ja_no_banco"] = c["data"] in bloqueados


def _avaliar_conflitos(plano: Plano, ref: dict) -> None:
    """O criterio de `public.conflitos_da_semana`: mesmo dia, TA sobrepostos, mesmo instrutor ou local."""
    meus = (
        [(a["data"], a["ta_inicial"], a["tempos_consumidos"], a["instrutor_id"], a["local"]) for a in plano.aulas]
        + [(a["data_avaliacao"], a["ta_inicial"], a["tempos_consumidos"], a["instrutor_responsavel_id"], a["local"])
           for a in plano.avaliacoes]
        + [(a["data_vista_prova"], a["ta_inicial_vista"], a["tempos_consumidos_vista"], a["instrutor_responsavel_id"],
            a["local_vista"]) for a in plano.avaliacoes if a["data_vista_prova"]]
        + [(a["data"], a["ta_inicial"], a["tempos_consumidos"], a["instrutor_id"], a["local"]) for a in plano.atividades]
    )
    for dia, ta, tempos, instrutor_id, local in meus:
        fim = ta + tempos - 1
        for o in ref["de_outras_turmas"]:
            if o["data"] != dia or o["ta_inicial"] is None or o["ta_final"] is None:
                continue
            if o["ta_inicial"] > fim or o["ta_final"] < ta:
                continue
            mesmo_instrutor = instrutor_id is not None and instrutor_id in (o.get("instrutor_id"), o.get("fiscal_id"))
            mesmo_local = bool(local) and bool(o.get("local")) and normalizar(local) == normalizar(o["local"])
            if mesmo_instrutor or mesmo_local:
                plano.conflitos.append(
                    f"{dia} TA {ta}–{fim}: {'instrutor' if mesmo_instrutor else 'local'} em comum com "
                    f"{o['turma']} (TA {o['ta_inicial']}–{o['ta_final']})"
                )


def _avaliar_ja_existentes(plano: Plano, ref: dict) -> None:
    """A turma ja tem lancamento que NAO e desta carga? Para: quem decide o que fazer e gente."""
    meus = (
        {a["codigo"] for a in plano.aulas}
        | {a["codigo"] for a in plano.avaliacoes}
        | {a["codigo"] for a in plano.atividades}
    )
    for tabela, codigos in ref["codigos"].items():
        alheios = sorted(set(codigos) - meus)
        if alheios:
            plano.recusas.append(
                f"a turma ja tem {len(alheios)} linha(s) em `{tabela}` que nao sao desta carga "
                f"(ex.: {alheios[:3]}) — PARE e mostre"
            )


# ── A transacao ──────────────────────────────────────────────────────────────────────────────────


def _valores(linhas: list[list[object]]) -> str:
    return ",\n    ".join("(" + ", ".join(lit(v) for v in linha) + ")" for linha in linhas)


def sql(plano: Plano, decisoes: dict, ensaio: bool) -> str:
    """Um bloco `DO` — atomico. No ensaio ele termina levantando a sentinela, e tudo se desfaz.

    ⚠️ SEQUENCIA NAO OBEDECE A `ROLLBACK` (gotcha 6): por isso NENHUM codigo desta carga sai de
       sequencia — todos sao derivados da linha da planilha, e o ensaio nao consome numero.
    """
    turma_id, curso_id = plano.turma["id"], plano.turma["curso_id"]
    autor = plano.autor["auth_user_id"]
    partes: list[str] = []

    if plano.aulas:
        partes.append(
            "  insert into public.registros_aula\n"
            "    (codigo, data, turma_id, curso_id, unidade_ensino_id, instrutor_id, ta_inicial,\n"
            "     tempos_consumidos, conteudo_resumo, metodologia, local, observacoes, criado_por)\n"
            "  select v.codigo, v.data::date, " + lit(turma_id) + "::uuid, " + lit(curso_id) + "::uuid,\n"
            "         v.ue::uuid, v.instrutor::uuid, v.ta::smallint, v.tempos::smallint, v.conteudo,\n"
            "         v.metodologia, v.local, v.obs, " + lit(autor) + "::uuid\n"
            "    from (values\n    "
            + _valores([[a["codigo"], a["data"], a["unidade_ensino_id"], a["instrutor_id"], a["ta_inicial"],
                         a["tempos_consumidos"], a["conteudo_resumo"], a["metodologia"], a["local"],
                         a["observacoes"]] for a in plano.aulas])
            + "\n    ) as v(codigo, data, ue, instrutor, ta, tempos, conteudo, metodologia, local, obs)\n"
            "  on conflict (codigo) do nothing;\n"
            "  get diagnostics n_aulas = row_count;"
        )

    if plano.avaliacoes:
        partes.append(
            "  insert into public.avaliacoes\n"
            "    (codigo, turma_id, curso_id, disciplina_id, tipo_avaliacao, data_avaliacao, ta_inicial,\n"
            "     tempos_consumidos, instrutor_responsavel_id, conteudo_resumo, metodologia, local,\n"
            "     data_vista_prova, ta_inicial_vista, tempos_consumidos_vista, local_vista, observacoes, criado_por)\n"
            "  select v.codigo, " + lit(turma_id) + "::uuid, " + lit(curso_id) + "::uuid, v.disciplina::uuid,\n"
            "         v.tipo, v.data::date, v.ta::smallint, v.tempos::smallint, v.instrutor::uuid, v.conteudo,\n"
            "         v.metodologia, v.local, v.data_vista::date, v.ta_vista::smallint, v.tempos_vista::smallint,\n"
            "         v.local_vista, v.obs, " + lit(autor) + "::uuid\n"
            "    from (values\n    "
            + _valores([[a["codigo"], a["disciplina_id"], a["tipo_avaliacao"], a["data_avaliacao"], a["ta_inicial"],
                         a["tempos_consumidos"], a["instrutor_responsavel_id"], a["conteudo_resumo"],
                         a["metodologia"], a["local"], a["data_vista_prova"], a["ta_inicial_vista"],
                         a["tempos_consumidos_vista"], a["local_vista"], a["observacoes"]]
                        for a in plano.avaliacoes])
            + "\n    ) as v(codigo, disciplina, tipo, data, ta, tempos, instrutor, conteudo, metodologia, local,\n"
            "           data_vista, ta_vista, tempos_vista, local_vista, obs)\n"
            "  on conflict (codigo) do nothing;\n"
            "  get diagnostics n_avaliacoes = row_count;"
        )

    if plano.atividades:
        partes.append(
            "  insert into public.atividades_nao_letivas\n"
            "    (codigo, categoria_normativa, escopo, turma_id, data, subtipo, descricao, ta_inicial,\n"
            "     tempos_consumidos, local, instrutor_id, responsavel_externo, observacoes, criado_por)\n"
            "  select v.codigo, v.categoria::public.categoria_normativa, 'turma', " + lit(turma_id) + "::uuid,\n"
            "         v.data::date, v.subtipo, v.descricao, v.ta::smallint, v.tempos::smallint, v.local,\n"
            "         v.instrutor::uuid, v.externo, v.obs, " + lit(autor) + "::uuid\n"
            "    from (values\n    "
            + _valores([[a["codigo"], a["categoria_normativa"], a["data"], a["subtipo"], a["descricao"],
                         a["ta_inicial"], a["tempos_consumidos"], a["local"], a["instrutor_id"],
                         a["responsavel_externo"], a["observacoes"]] for a in plano.atividades])
            + "\n    ) as v(codigo, categoria, data, subtipo, descricao, ta, tempos, local, instrutor, externo, obs)\n"
            "  on conflict (codigo) do nothing;\n"
            "  get diagnostics n_atividades = row_count;"
        )

    # Os dias de calendario NAO viram lancamento; so entram em `feriados` se as decisoes mandarem
    # incluir E o dia ainda nao estiver la como dia inteiro.
    if decisoes.get("incluir_dias_de_calendario_ausentes"):
        for c in plano.calendario:
            partes.append(
                "  if not exists (select 1 from public.feriados where data = " + lit(c["data"]) + "::date\n"
                "                    and impacto = 'dia_inteiro' and status = 'ativo') then\n"
                "    insert into public.feriados (codigo, ano, data, descricao, impacto, abrangencia, criado_por)\n"
                "    select 'FER-' || lpad((coalesce(max(substring(codigo from '^FER-(\\d+)$')::int), 0) + 1)::text, 6, '0'),\n"
                "           extract(year from " + lit(c["data"]) + "::date)::smallint, " + lit(c["data"]) + "::date,\n"
                "           " + lit(c["descricao"]) + ", 'dia_inteiro', " + lit(decisoes.get("abrangencia_do_calendario")) + ",\n"
                "           " + lit(autor) + "::uuid\n"
                "      from public.feriados;\n"
                "    n_feriados := n_feriados + 1;\n"
                "  end if;"
            )

    resumo = (
        "json_build_object('aulas', n_aulas, 'avaliacoes', n_avaliacoes, 'atividades', n_atividades, "
        "'feriados', n_feriados)::text"
    )
    fim = (
        f"  raise exception '{SENTINELA_DO_ENSAIO} %', {resumo};"
        if ensaio
        else "  null;"
    )
    return (
        "do $carga$\n"
        "declare\n"
        "  n_aulas int := 0; n_avaliacoes int := 0; n_atividades int := 0; n_feriados int := 0;\n"
        "begin\n"
        "  perform 1 from public.turmas where id = " + lit(turma_id) + "::uuid and codigo = " + lit(plano.turma["codigo"]) + ";\n"
        "  if not found then raise exception 'A turma do plano nao e a do destino.'; end if;\n\n"
        + "\n\n".join(partes)
        + "\n\n"
        + fim
        + "\nend $carga$;\n"
    )
