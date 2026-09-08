"""Ordem de carga das 25 tabelas — a ÚNICA definição no repositório (FR-016).

O QUÊ  : a sequência em que as tabelas são promovidas de `staging` para `public`.
PARA QUÊ: nenhum módulo de tabela conhece a ordem. Reordenar aqui é a **forma
          suportada** de reordenar; qualquer outra é acidente esperando acontecer.
COMO   : lista simples, na ordem do grafo de FK (documento 30 §4), da raiz às folhas.

Fonte: `docs/fase-3/30-Plano-de-Migracao-ETL.md` §4.
"""

# ---------------------------------------------------------------------------------
# A ordem. Três posições NÃO são óbvias e estão comentadas onde estão — porque quem
# as mover vai receber um erro que não menciona a ordem.
# ---------------------------------------------------------------------------------
ORDEM_DE_CARGA: tuple[str, ...] = (
    # `config_listas` é a PRIMEIRA, e não uma tabela de configuração qualquer.
    # Quatro gatilhos validam valor contra ela — trg_reg_aula_tipo_atividade,
    # trg_reg_aula_metodologia, trg_avaliacoes_tipo e trg_avaliacoes_metodologia.
    # Carregá-la depois faz os 1.566 registros de aula falharem com "valor fora do
    # domínio", e a mensagem NÃO diz que o problema é a ordem (contrato pipeline P-5).
    "config_listas",
    "config_parametros",
    "perfil_permissao",
    "cursos",
    "configuracoes_horario",
    "horarios_tempos_aula",
    "curso_regime_historico",
    "turmas",
    # `instrutores` antes de `disciplinas`, ainda que não haja FK declarada entre elas.
    # A dependência é o `uuid[]` de `instrutores_atribuidos`, validado por gatilho
    # (documento 30 §2.7a).
    "instrutores",
    "disciplinas",
    "turma_disciplina",
    "instrutor_disciplina",
    "usuarios",
    "usuario_curso",
    "responsaveis_curso",
    "avaliacoes_planejadas",
    "registros_aula",
    "avaliacoes",
    "arquivo_avaliacoes_v1",
    "atividades_nao_letivas",
    "feriados",
    "janelas_curso",
    "reservas_proens",
    "planejamento_anual",
    # `migracao_log` por ÚLTIMO, e só por último. Ela é append-only por gatilho
    # (`trg_migracao_log_imutavel`, FOR EACH STATEMENT), e o log é acumulado em
    # memória e gravado em bloco no fim — dentro da mesma transação (FR-004.3).
    "migracao_log",
)

# Tabelas que ficam FORA da comparação de idempotência (FR-006.1).
# `migracao_log` cresce a cada execução, e isso é o comportamento CORRETO dela:
# exigir que ficasse idêntica seria exigir que a segunda carga não fosse registrada.
# Tabelas da v2.1 que nascem de uma aba JÁ USADA por outra tabela — e por isso
# precisam de `select distinct`. A v2.0 guardava numa planilha só o que o schema
# normalizou em pai e filho: `Horarios_Tempos_Aula` tem 40 linhas (5 configurações ×
# 8 tempos); `configuracoes_horario` quer as 5, `horarios_tempos_aula` quer as 40.
# Sem `distinct`, a primeira tenta inserir 40 linhas com 5 códigos e bate na UNIQUE.
NASCE_DE_ABA_COMPARTILHADA: frozenset[str] = frozenset({"configuracoes_horario"})

FORA_DA_IDEMPOTENCIA: frozenset[str] = frozenset({"migracao_log"})

# Colunas excluídas do checksum (FR-006). As cinco variam a cada execução POR
# CONSTRUÇÃO: `id` vem de `gen_random_uuid()` e o quarteto vem do gatilho
# `app.set_auditoria()`. Incluí-las tornaria a idempotência insatisfazível.
COLUNAS_FORA_DO_CHECKSUM: frozenset[str] = frozenset(
    {
        "id",
        "criado_por",
        "criado_em",
        "editado_por",
        "editado_em",
        # `arquivo_avaliacoes_v1.arquivado_em` e `arquivado_por` são o `now()` e o autor
        # DA CARGA, não fatos sobre a avaliação arquivada. São o quarteto de auditoria
        # com outro nome, e ficam fora pela mesma razão: duas cargas idênticas rodam em
        # instantes diferentes, e um checksum que mudasse por isso não provaria nada.
        # Achado pela prova T042 em 08/09/2026.
        "arquivado_em",
        "arquivado_por",
    }
)

# Chaves estrangeiras ANULÁVEIS. Nulo aqui é legítimo e NÃO é órfã (FR-011.1).
# Sem esta lista, uma verificação genérica contaria os ~1.566 nulos de
# `unidade_ensino_id` — o histórico dos 17 cursos sem fonte — como violação.
FK_ANULAVEIS: dict[str, tuple[str, ...]] = {
    "registros_aula": ("unidade_ensino_id", "instrutor_id"),
    "turma_disciplina": ("instrutor_id",),
    "atividades_nao_letivas": ("turma_id",),
    "responsaveis_curso": ("curso_id",),
}


def validar_ordem(tabelas_no_banco: set[str]) -> list[str]:
    """Devolve o que está no banco e não está na ordem — nunca o contrário.

    Tabela nova que entre no schema sem entrar aqui **não é carregada**, e o
    silêncio é o pior desfecho possível: a carga passa verde e a tabela fica vazia.
    """
    return sorted(tabelas_no_banco - set(ORDEM_DE_CARGA))
