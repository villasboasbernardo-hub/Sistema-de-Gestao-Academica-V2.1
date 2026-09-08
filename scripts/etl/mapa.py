"""O de-para coluna a coluna, em forma declarativa (documento 31).

O QUÊ  : para cada aba da v2.0, qual coluna vira qual coluna do destino, e com que
         transformação.

PARA QUÊ: o documento 30 §5.2 previa **um módulo Python por tabela**. Um registro
         declarativo é melhor para o mesmo fim, e pela razão que o próprio documento 30
         dá em §2.6: *"garante que a política seja EXATAMENTE a mesma nas 24 tabelas, e
         não 24 variações parecidas"*. Vinte e cinco arquivos com `for` e `insert`
         escritos à mão são vinte e cinco oportunidades de divergir em silêncio.

         Aqui a política vive em `_comum.py` e em `carregar.py`; este arquivo guarda
         **só o de-para**, que é o que muda de tabela para tabela.

COMO   : um `MapaDeTabela` por aba, com a lista de colunas e o tipo de transformação.
         Coluna descartada é **declarada como descartada**, não omitida — omissão não
         se distingue de esquecimento.

⚠️ ESTE ARQUIVO É TRANSCRIÇÃO, NÃO INTERPRETAÇÃO. Cada entrada sai do documento 31,
   seção por seção. Onde o documento marca ⚠️, o comentário reproduz o risco.

Fonte: `docs/fase-3/31-Mapa-De-Para-Sheets-PostgreSQL.md`
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class Transformacao(str, Enum):
    """As transformações do documento 31, nomeadas."""

    TEXTO = "btrim"
    TEXTO_OU_NULO = "nullif(btrim(x),'')"
    INTEIRO = "::int"
    DECIMAL = "virgula->ponto, ::numeric"
    DATA_CIVIL = "date, SEM fuso (FR-019)"
    INSTANTE = "timestamptz em America/Sao_Paulo (FR-019.1)"
    DOMINIO = "minusculo + underscore, dominio FECHADO"
    STATUS = "vazio -> 'ativo' EXPLICITO (documento 30 §6.3)"
    PROCEDENCIA = "<tabela_origem>:<chave_original> (FR-002.1)"
    EMAIL_PARA_UUID = "e-mail -> usuarios.id; nao resolvido -> NULL + log"
    DESCARTADA = "nao migra — declarada, nao omitida"
    GERADA = "GENERATED no banco; o ETL NAO escreve"


@dataclass(frozen=True)
class Coluna:
    origem: str | None
    destino: str | None
    transformacao: Transformacao
    nota: str = ""


@dataclass(frozen=True)
class MapaDeTabela:
    aba: str
    tabela: str
    linhas_esperadas: int
    colunas: tuple[Coluna, ...]
    observacao: str = ""
    dominios: dict[str, dict[str, str]] = field(default_factory=dict)

    def migraveis(self) -> tuple[Coluna, ...]:
        return tuple(
            c
            for c in self.colunas
            if c.transformacao not in (Transformacao.DESCARTADA, Transformacao.GERADA)
        )


# =================================================================================
# 1. Cad_Cursos → cursos  (documento 31 §1)
# =================================================================================
CURSOS = MapaDeTabela(
    aba="Cad_Cursos",
    tabela="cursos",
    linhas_esperadas=24,
    observacao=(
        "Perde a titularidade dos parametros de regime, que passam a derivar de "
        "curso_regime_historico. As sete colunas de regime sao DESCARTADAS aqui e "
        "reaparecem la — nao se perde dado, muda-se de dono."
    ),
    dominios={
        "modalidade": {"Presencial": "presencial", "EAD": "ead", "Híbrido": "hibrido"},
    },
    colunas=(
        Coluna("ID_Curso", "codigo", Transformacao.TEXTO, "chave de negocio; alvo de todo JOIN de FK"),
        Coluna("Nome_Curso", "nome_curso", Transformacao.TEXTO),
        Coluna(None, "nome_normalizado", Transformacao.GERADA, "app.normalizar_texto()"),
        Coluna("Classificacao", "classificacao", Transformacao.DOMINIO, "⚠️ CHECK != 'geral'; valor fora do dominio ABORTA (P-5)"),
        Coluna("Modalidade", "modalidade", Transformacao.DOMINIO, "⚠️ dominio observado, nao declarado (P-4)"),
        Coluna("Proposito", "proposito", Transformacao.TEXTO_OU_NULO),
        Coluna("Limite_Turmas_Ano", "limite_turmas_ano", Transformacao.INTEIRO, "default 1; CHECK >= 1"),
        Coluna("Duracao_Semanas", "duracao_semanas", Transformacao.DECIMAL, "CHECK > 0"),
        Coluna("Duracao_Dias", "duracao_dias", Transformacao.INTEIRO, "CHECK > 0"),
        Coluna("Prioridade_Alocacao", "prioridade_alocacao", Transformacao.DOMINIO, "⚠️ dominio nao declarado na v2.0 (P-2)"),
        Coluna("Status", "status", Transformacao.STATUS, "gera evento `corrigido` no log"),
        Coluna("Regime_Padrao_Tempos", None, Transformacao.DESCARTADA, "FORMULA de exibicao -> vw_cursos_regime_vigente"),
        Coluna("TA_Padrao", None, Transformacao.DESCARTADA, "idem"),
        Coluna("Intervalo_Padrao", None, Transformacao.DESCARTADA, "idem"),
        Coluna("Config_Horario_Padrao", None, Transformacao.DESCARTADA, "⚠️ coluna das chaves orfas D/E"),
        Coluna("Regime_Excecao", None, Transformacao.DESCARTADA, "vira a linha tipo_regime='excecao'"),
        Coluna("Config_Horario_Excecao", None, Transformacao.DESCARTADA, "idem"),
        Coluna("Limite_Diario_EAD", None, Transformacao.DESCARTADA, "vira curso_regime_historico.limite_diario_ead_horas"),
        Coluna("ID_Curso", "origem_migracao_v1", Transformacao.PROCEDENCIA, "C-07"),
        Coluna("Editado_Por", "editado_por", Transformacao.EMAIL_PARA_UUID),
        Coluna("Timestamp_Edicao", "editado_em", Transformacao.INSTANTE),
    ),
)

# =================================================================================
# 4. Turmas_Ativas → turmas  (documento 31 §4)
# =================================================================================
TURMAS = MapaDeTabela(
    aba="Turmas_Ativas",
    tabela="turmas",
    linhas_esperadas=29,
    dominios={"modalidade": {"Presencial": "presencial", "EAD": "ead", "Híbrido": "hibrido"}},
    colunas=(
        Coluna("ID_Turma", "codigo", Transformacao.TEXTO),
        Coluna("ID_Curso", "curso_id", Transformacao.TEXTO, "FK resolvida por codigo (documento 30 §2.5)"),
        Coluna("Turma", "identificacao", Transformacao.TEXTO),
        Coluna("Ano_Letivo", "ano_letivo", Transformacao.INTEIRO),
        Coluna("Alunos", "quantidade_alunos", Transformacao.INTEIRO),
        Coluna("Modalidade", "modalidade", Transformacao.DOMINIO),
        Coluna("Data_Inicio", "data_inicio", Transformacao.DATA_CIVIL, "⚠️ date NAO leva fuso (FR-019)"),
        Coluna("Data_Termino", "data_termino", Transformacao.DATA_CIVIL, "idem"),
        Coluna("Sala_Alocada", "sala", Transformacao.TEXTO_OU_NULO),
        Coluna("Status", "status", Transformacao.STATUS),
        Coluna("Nome_Completo_Curso", None, Transformacao.DESCARTADA, "derivavel de cursos.nome_curso"),
        Coluna("ID_Turma", "origem_migracao_v1", Transformacao.PROCEDENCIA),
        Coluna("Editado_Por", "editado_por", Transformacao.EMAIL_PARA_UUID),
        Coluna("Timestamp_Edicao", "editado_em", Transformacao.INSTANTE),
    ),
)

# =================================================================================
# 21. Config_Listas → config_listas  (documento 31 §21)
#
# É a tabela **numero 1** da ordem de carga. Quatro gatilhos validam valor contra ela;
# carrega-la depois faz os 1.566 registros de aula falharem com "valor fora do
# dominio", e a mensagem NAO diz que o problema e a ordem (contrato pipeline P-5).
# =================================================================================
CONFIG_LISTAS = MapaDeTabela(
    aba="Config_Listas",
    tabela="config_listas",
    linhas_esperadas=72,
    observacao="Formato LARGO na v2.0 -> LONGO no destino (uma linha por valor).",
    colunas=(
        Coluna("Chave", "chave", Transformacao.TEXTO),
        Coluna("Valor", "valor", Transformacao.TEXTO),
        Coluna("Rotulo", "rotulo", Transformacao.TEXTO_OU_NULO),
        Coluna("Ordem", "ordem", Transformacao.INTEIRO),
        Coluna("Status", "status", Transformacao.STATUS),
        Coluna("Chave", "origem_migracao_v1", Transformacao.PROCEDENCIA),
    ),
)


# ---------------------------------------------------------------------------------
# O registro. Tabela sem mapa **não é carregada**, e `carregar.py` reclama por nome —
# silencio aqui produziria tabela vazia com carga verde, que e o pior desfecho.
# ---------------------------------------------------------------------------------
MAPAS: dict[str, MapaDeTabela] = {
    m.tabela: m for m in (CONFIG_LISTAS, CURSOS, TURMAS)
}

# As 22 restantes do documento 31, ainda por transcrever. Declaradas aqui para que a
# ausência seja **visível e contável**, em vez de descoberta quando a carga rodar.
PENDENTES: tuple[str, ...] = (
    "config_parametros", "perfil_permissao", "configuracoes_horario",
    "horarios_tempos_aula", "curso_regime_historico", "instrutores", "disciplinas",
    "turma_disciplina", "instrutor_disciplina", "usuarios", "usuario_curso",
    "responsaveis_curso", "avaliacoes_planejadas", "registros_aula", "avaliacoes",
    "arquivo_avaliacoes_v1", "atividades_nao_letivas", "feriados", "janelas_curso",
    "reservas_proens", "planejamento_anual", "migracao_log",
)
