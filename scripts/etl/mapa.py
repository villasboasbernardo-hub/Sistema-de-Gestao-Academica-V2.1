"""O de-para coluna a coluna, em forma declarativa (documento 31).

O QUÊ  : para cada aba da v2.0, qual coluna vira qual coluna do destino, e com que
         transformação.

PARA QUÊ: o documento 30 §5.2 previa **um módulo Python por tabela**. Um registro
         declarativo serve ao mesmo fim, e pela razão que o próprio documento 30 dá em
         §2.6: *"garante que a política seja EXATAMENTE a mesma nas 24 tabelas, e não
         24 variações parecidas"*. Vinte e cinco arquivos com `for` e `insert` à mão
         são vinte e cinco chances de divergir em silêncio.

COMO   : um `MapaDeTabela` por destino. **Coluna descartada é DECLARADA como
         descartada**, nunca omitida — omissão não se distingue de esquecimento, e
         seis meses depois ninguém sabe se a coluna foi analisada ou esquecida.

⚠️ ESTE ARQUIVO É TRANSCRIÇÃO, NÃO INTERPRETAÇÃO. Cada entrada sai do documento 31,
   seção por seção. Onde o documento marca ⚠️ ou 🛑, a nota reproduz o risco.

Fonte: `docs/fase-3/31-Mapa-De-Para-Sheets-PostgreSQL.md` §1 a §25
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class T(str, Enum):
    """As transformações do documento 31, nomeadas uma vez."""

    TEXTO = "btrim"
    TEXTO_OU_NULO = "nullif(btrim(x),'')"
    BRUTO = "copia bruta, intacta"
    INTEIRO = "::int"
    DECIMAL = "virgula->ponto, ::numeric"
    HORA = "::time"
    BOOLEANO = "TRUE/VERDADEIRO/SIM -> true"
    DATA_CIVIL = "date, SEM conversao de fuso (FR-019)"
    INSTANTE = "timestamptz em America/Sao_Paulo (FR-019.1)"
    DOMINIO = "minusculo + underscore, dominio FECHADO"
    STATUS = "vazio -> 'ativo' EXPLICITO (documento 30 §6.3)"
    FK = "JOIN <tabela> ON codigo — orfao ABORTA"
    FK_OPCIONAL = "JOIN; nao resolvido -> NULL + log"
    EMAIL_UUID = "e-mail -> usuarios.id; nao resolvido -> NULL + log"
    PROCEDENCIA = "<tabela_origem>:<chave_original> (FR-002.1)"
    LITERAL = "valor fixo, declarado na nota"
    DERIVADA = "derivada na carga, nao lida da origem"
    DESCARTADA = "NAO migra — declarada, nao omitida"
    GERADA = "GENERATED no banco; o ETL NAO escreve"
    STAGING = "lida para staging, NAO promovida"


@dataclass(frozen=True)
class C:
    origem: str | None
    destino: str | None
    transf: T
    nota: str = ""


@dataclass(frozen=True)
class MapaDeTabela:
    aba: str
    tabela: str
    linhas: int
    colunas: tuple[C, ...]
    obs: str = ""
    dominios: dict[str, dict[str, str]] = field(default_factory=dict)

    def migraveis(self) -> tuple[C, ...]:
        return tuple(c for c in self.colunas if c.transf not in (T.DESCARTADA, T.GERADA, T.STAGING))


_AUD_EDIT = (
    C("Editado_Por", "editado_por", T.EMAIL_UUID),
    C("Timestamp_Edicao", "editado_em", T.INSTANTE),
)
_AUD_CRIA = (
    C("Registrado_Por", "criado_por", T.EMAIL_UUID, "ETL informa explicitamente — o gatilho so preenche se NULL"),
    C("Timestamp_Registro", "criado_em", T.INSTANTE),
)
_MODALIDADE = {"Presencial": "presencial", "EAD": "ead", "Híbrido": "hibrido"}

# =================================================================================
# §21 · Config_Listas -> config_listas   ── É A TABELA Nº 1 DA ORDEM
# =================================================================================
CONFIG_LISTAS = MapaDeTabela(
    aba="Config_Listas", tabela="config_listas", linhas=72,
    obs=("PRIMEIRA a carregar. Quatro gatilhos de registros_aula e avaliacoes validam "
         "valor contra ela; carrega-la depois faz 1.566+111 linhas falharem com 'valor "
         "fora do dominio', e a mensagem NAO diz que o problema e a ordem."),
    colunas=(
        C("Lista", "lista", T.DOMINIO, "⚠️ CHECK '^[a-z][a-z0-9_]*$' — maiuscula ou acento ABORTA"),
        C("Valor", "valor", T.TEXTO, "CHECK nao vazio; UQ(lista,valor)"),
        C("Rotulo_Exibicao", "rotulo_exibicao", T.TEXTO, "vazio -> copia `valor`. Degradacao segura: vazio quebraria a UI sem quebrar a carga"),
        C("Ordem", "ordem", T.INTEIRO, "⚠️ em escala_antiguidade E O PESO da RN-ANT-02, nao ordenacao cosmetica. SC/SCNS = 13"),
        C("Ativo", "ativo", T.BOOLEANO, "desativar sem apagar do historico"),
        C("Observacao", "observacao", T.TEXTO_OU_NULO),
        C("Lista", "origem_migracao_v1", T.PROCEDENCIA, "C-07 — chave natural <Lista>/<Valor>, a aba nao tem ID_*"),
    ),
)

# =================================================================================
# §22 · Config_Parametros -> config_parametros
# =================================================================================
CONFIG_PARAMETROS = MapaDeTabela(
    aba="Config_Parametros", tabela="config_parametros", linhas=18,
    obs=("Tira do codigo os tetos AEC 10% / TAD 5% / TR 10%, as faixas de CH docente e "
         "os limites de TA por dia (RNF-NORM-08). 13 chaves de seed normativo vem da "
         "migration 03, NAO da planilha — e diferenca ESPERADA na R-01."),
    colunas=(
        C("Chave", "chave", T.DOMINIO, "🛑 CHECK '^[a-z][a-z0-9_.]*$' e a v2.0 escreve `TETO_AEC_PCT` — DOMINIO minusculiza, que e o que a chave pede. 🛑 CHECK '^[a-z][a-z0-9_.]*$'. As linhas PRIORIDADE_DISCIPLINA_{ID_Grade} violavam-no em 4 pontos — P-7 RESOLVIDA no Epico 1: virou disciplinas.prioridade_alocacao_peso"),
        C("Valor", "valor", T.TEXTO, "sempre texto; `tipo` diz como interpretar"),
        C("Tipo", "tipo", T.DOMINIO, "CHECK in (numero, percentual, inteiro, texto, booleano)"),
        C("Unidade", "unidade", T.TEXTO_OU_NULO),
        C("Ano_Vigencia", "ano_vigencia", T.INTEIRO, "vazio -> NULL (perene). UQ(chave, coalesce(ano,0)) WHERE ativo"),
        C("Descricao", "descricao", T.TEXTO_OU_NULO),
        C("Fundamento_Normativo", "fundamento_normativo", T.TEXTO_OU_NULO, "RNF-NORM-07 — a norma que autoriza o valor"),
        C("Editavel_Por", "editavel_por", T.DOMINIO),
        C(None, "status", T.LITERAL, "'ativo' — coluna nova, valor inicial explicito"),
        C("Chave", "origem_migracao_v1", T.PROCEDENCIA),
    ),
)

# =================================================================================
# §1 · Cad_Cursos -> cursos
# =================================================================================
CURSOS = MapaDeTabela(
    aba="Cad_Cursos", tabela="cursos", linhas=24,
    obs=("Perde a titularidade dos parametros de regime, que passam a derivar de "
         "curso_regime_historico. As sete colunas de regime sao DESCARTADAS aqui e "
         "reaparecem la — nao se perde dado, muda-se de dono."),
    dominios={"modalidade": _MODALIDADE},
    colunas=(
        C("ID_Curso", "codigo", T.TEXTO, "chave de negocio; alvo de todo JOIN de FK"),
        C("Nome_Curso", "nome_curso", T.TEXTO),
        C(None, "nome_normalizado", T.GERADA, "app.normalizar_texto(nome_curso)"),
        C("Classificacao", "classificacao", T.DOMINIO, "⚠️ CHECK != 'geral'; valor fora do dominio ABORTA (P-5)"),
        C("Modalidade", "modalidade", T.DOMINIO, "⚠️ dominio observado, nao declarado (P-4)"),
        C("Proposito", "proposito", T.TEXTO_OU_NULO),
        C("Limite_Turmas_Ano", "limite_turmas_ano", T.INTEIRO, "default 1; CHECK >= 1"),
        C("Duracao_Semanas", "duracao_semanas", T.DECIMAL, "CHECK > 0"),
        C("Duracao_Dias", "duracao_dias", T.INTEIRO, "CHECK > 0"),
        C("Prioridade_Alocacao", "prioridade_alocacao", T.DOMINIO, "⚠️ dominio nao declarado na v2.0 (P-2)"),
        C("Status", "status", T.STATUS, "gera evento `corrigido` no log"),
        C("Regime_Padrao_Tempos", None, T.DESCARTADA, "FORMULA -> vw_cursos_regime_vigente"),
        C("TA_Padrao", None, T.DESCARTADA, "idem"),
        C("Intervalo_Padrao", None, T.DESCARTADA, "idem"),
        C("Config_Horario_Padrao", None, T.DESCARTADA, "⚠️ coluna das chaves orfas D/E, resolvidas pela FK de curso_regime_historico"),
        C("Regime_Excecao", None, T.DESCARTADA, "vira a linha tipo_regime='excecao'"),
        C("Config_Horario_Excecao", None, T.DESCARTADA, "idem"),
        C("Limite_Diario_EAD", None, T.DESCARTADA, "vira curso_regime_historico.limite_diario_ead_horas"),
        C("ID_Curso", "origem_migracao_v1", T.PROCEDENCIA, "C-07"),
        *_AUD_EDIT,
    ),
)

# =================================================================================
# §3a · Horarios_Tempos_Aula -> configuracoes_horario  (SELECT DISTINCT sobre a aba)
# =================================================================================
CONFIGURACOES_HORARIO = MapaDeTabela(
    aba="Horarios_Tempos_Aula", tabela="configuracoes_horario", linhas=5,
    obs="Uma aba de origem, DUAS tabelas de destino: sem o cabecalho nao ha alvo de FK para 'a configuracao' (documento 21 §3.2).",
    colunas=(
        C("ID_Config", "codigo", T.TEXTO, "DISTINCT. CFG-A1, CFG-A1-v2 — imutavel e versionado"),
        C("Nome_Config", "nome_config", T.TEXTO, "DISTINCT. Descritivo, NUNCA chave"),
        C("Status", "status", T.DOMINIO, "Ativo->ativo, Substituido->substituido"),
        C(None, "substituida_por_id", T.LITERAL, "⚠️ NULL na carga. CHECK exige nao-nulo se status='substituido' — se houver config Substituido na origem, o vinculo precisa de 2a passada. Decisao pendente ate a sondagem"),
        C("ID_Config", "origem_migracao_v1", T.PROCEDENCIA, "guarda o rotulo original: 'A (Normal)', 'C (Curto)'"),
    ),
)

# =================================================================================
# §3b · Horarios_Tempos_Aula -> horarios_tempos_aula
# =================================================================================
HORARIOS_TEMPOS_AULA = MapaDeTabela(
    aba="Horarios_Tempos_Aula", tabela="horarios_tempos_aula", linhas=40,
    colunas=(
        C("ID_Config", "configuracao_id", T.FK, "configuracoes_horario. UNICO ON DELETE CASCADE do schema"),
        C("Tempo_Numero", "tempo_numero", T.INTEIRO, "UQ(configuracao_id,tempo_numero); CHECK 1-12"),
        C("Periodo", "periodo", T.DOMINIO, "Manha->manha, Tarde->tarde. Permite ao DSA desenhar a janela de almoco (RF-HOR-04)"),
        C("Tipo_Tempo", "tipo_tempo", T.DOMINIO, "Normal/Excepcional. `excepcional` = 9o TA — ALERTA, NUNCA BLOQUEIO"),
        C("Hora_Inicio", "hora_inicio", T.HORA),
        C("Hora_Fim", "hora_fim", T.HORA, "CHECK fim > inicio"),
        C("Intervalo_Apos_Min", "intervalo_apos_min", T.INTEIRO, "vazio no ultimo TA. ⚠️ E O CHECK 0-120 QUE IMPEDE A VOLTA DE '1900-03-15'"),
        C("Nome_Config", None, T.DESCARTADA, "vive no cabecalho (3a). Repeti-la seria a segunda fonte de verdade que a normalizacao eliminou"),
        C("Status", None, T.DESCARTADA, "idem — e atributo da configuracao, nao do TA"),
        C("ID_Config", "origem_migracao_v1", T.PROCEDENCIA, "'<ID_Config>#<Tempo_Numero>'"),
    ),
)

# =================================================================================
# §2 · Cad_Cursos_Regime_Historico -> curso_regime_historico
# =================================================================================
CURSO_REGIME_HISTORICO = MapaDeTabela(
    aba="Cad_Cursos_Regime_Historico", tabela="curso_regime_historico", linhas=29,
    obs=("Uma ou duas por curso (Padrao e, quando houver, Excecao). ⚠️ EXCLUDE gist "
         "(curso_id, tipo_regime, daterange) WHERE status='ativo' recusa duas vigencias "
         "ativas sobrepostas — sondagem S-03 antes do corte."),
    colunas=(
        C("ID_Regime", "codigo", T.TEXTO, "REG-NNNNNN"),
        C("ID_Curso", "curso_id", T.FK, "cursos. Orfao aborta a carga"),
        C("Tipo_Regime", "tipo_regime", T.DOMINIO, "Padrao->padrao, Excecao->excecao"),
        C("ID_Config_Horario", "configuracao_horario_id", T.FK_OPCIONAL, "NULL nos 4 cursos EAD puros — LEGITIMO"),
        C("Regime_Tempos", "regime_tempos", T.INTEIRO, "CHECK 1-12. IMUTAVEL POR NORMA (RF-HOR-02)"),
        C("TA_Duracao_Min", "ta_duracao_min", T.INTEIRO, "⚠️ CHECK in (45,50). Valor fora disso ABORTA"),
        C("Intervalo_Manha_Min", "intervalo_manha_min", T.INTEIRO, "CHECK 0-120 — barra a recorrencia de 1900-03-15"),
        C("Intervalo_Tarde_Min", "intervalo_tarde_min", T.INTEIRO, "idem"),
        C("Hora_Inicio_Manha", "hora_inicio_manha", T.HORA),
        C("Hora_Inicio_Tarde", "hora_inicio_tarde", T.HORA, "CHECK tarde > manha"),
        C("Limite_Diario_EAD_Horas", "limite_diario_ead_horas", T.DECIMAL, "CHECK > 0"),
        C("Vigente_A_Partir_De", "vigente_de", T.DATA_CIVIL, "COLUNA CENTRAL DA RN-2027-09"),
        C("Vigente_Ate", "vigente_ate", T.DATA_CIVIL, "⚠️ vazio -> NULL (= vigente). Alimenta o EXCLUDE de sobreposicao"),
        C("Fundamento_Curricular", "fundamento_curricular", T.TEXTO_OU_NULO, "RF-HOR-03"),
        C("Motivo", "motivo", T.TEXTO_OU_NULO, "RF-HOR-09"),
        C("Status", "status", T.DOMINIO, "Ativo/Cancelado. O EXCLUDE so vale WHERE status='ativo'"),
        *_AUD_CRIA, *_AUD_EDIT,
        C("ID_Regime", "origem_migracao_v1", T.PROCEDENCIA, "traz 'Cad_Cursos:{ID}:{Padrao|Excecao}' da v2.0"),
    ),
)

# =================================================================================
# §4 · Turmas_Ativas -> turmas
# =================================================================================
TURMAS = MapaDeTabela(
    aba="Turmas_Ativas", tabela="turmas", linhas=29,
    dominios={"modalidade": _MODALIDADE},
    colunas=(
        C("ID_Turma", "codigo", T.TEXTO, "era formula na v1.0; literal congelado desde a v2.0 (C-04)"),
        C("ID_Curso", "curso_id", T.FK, "cursos"),
        C("Turma", "turma", T.TEXTO, "T1, T2. UQ(curso_id,ano_letivo,turma)"),
        C("Ano_Letivo", "ano_letivo", T.INTEIRO, "CHECK 2020-2099"),
        C("Alunos", "alunos", T.INTEIRO, "CHECK >= 0"),
        C("Modalidade", "modalidade", T.DOMINIO, "⚠️ P-4"),
        C("Data_Inicio", "data_inicio", T.DATA_CIVIL),
        C("Data_Termino", "data_termino", T.DATA_CIVIL, "CHECK termino >= inicio"),
        C("Sala_Alocada", "sala_alocada", T.TEXTO_OU_NULO),
        C("Status", "status", T.DOMINIO, "Planejada/Ativa/Concluida/Cancelada. `arquivada` NAO existe no ENUM — TURMA-1 fechada em 28/08: e filtro de apresentacao"),
        C("Nome_Completo_Curso", None, T.DESCARTADA, "FORMULA -> vw_turmas_rotulo. Depende de outra tabela => view, nao coluna gerada"),
        C("ID_Turma", "origem_migracao_v1", T.PROCEDENCIA),
        *_AUD_EDIT,
    ),
)

# =================================================================================
# §7 · Cad_Instrutor -> instrutores
# =================================================================================
INSTRUTORES = MapaDeTabela(
    aba="Cad_Instrutor", tabela="instrutores", linhas=177,
    obs="Status vazio em 100% na auditoria; a v2.0 atribuiu Ativo a todas, com decisao registrada.",
    colunas=(
        C("ID_Instrutor", "codigo", T.TEXTO, "⚠️ INTEIRO SEM PREFIXO (RN-CRUD-03 b) — dominio diferente das demais chaves"),
        C("Posto_Graduacao", "posto_graduacao", T.TEXTO, "⚠️ D-08 NOT NULL. Ja normalizado na v2.0 (simbolo de grau; SC/SCNS peso 13)"),
        C("Esp_Hab_Obs", "esp_hab_obs", T.TEXTO, "⚠️ D-08 NOT NULL — sondagem S-01"),
        C("Nome_Completo", "nome_completo", T.TEXTO, "⚠️ D-08 NOT NULL"),
        C("Categoria", "categoria", T.TEXTO, "⚠️ D-08 NOT NULL"),
        C("OM", "om", T.TEXTO, "⚠️ D-08 NOT NULL"),
        C("Nome_Guerra", "nome_guerra", T.TEXTO_OU_NULO, "nome da linha de assinatura do DSA"),
        C(None, "nome_normalizado", T.GERADA, "app.normalizar_texto(nome_completo)"),
        C("NIP", "nip", T.TEXTO_OU_NULO, "TEXTO, nao inteiro — pode ter zero a esquerda"),
        C("Data_Nascimento", "data_nascimento", T.DATA_CIVIL),
        C("Dep_Divisao", "dep_divisao", T.TEXTO_OU_NULO, "era 'Dep. / Divisao' na v1.0 — achado (g)"),
        C("Data_Assuncao_Setor", "data_assuncao_setor", T.DATA_CIVIL, "insumo de vw_instrutor_carga_anual"),
        C("Email", "email", T.TEXTO, "lower(btrim). CHECK de formato; UQ parcial WHERE ativo. ⚠️ o documento 31 escreve `E-mail`; a base tem `Email`"),
        C("Regime_Trabalho", "regime_trabalho", T.DOMINIO, "20h/40h/Dedicacao Exclusiva. ⚠️ CORRIGE o defeito historico de usar o NUMERO do regime como teto (RNF-NORM-03). ⚠️ o documento 31 escreve `Regime de trabalho`; a base tem `Regime_Trabalho`"),
        C("Nivel_Escolaridade", "nivel_escolaridade", T.TEXTO_OU_NULO),
        C("Formacao_Principal_Secundaria", "formacao_principal_secundaria", T.TEXTO_OU_NULO),
        C("Capacitacao_Didatica", "capacitacao_didatica", T.TEXTO_OU_NULO, "vazio em 83,6% — ALERTA, NUNCA BLOQUEIO (RNF-NORM-05)"),
        C("Data_Inicio_Docencia_MB", "data_inicio_docencia_mb", T.DATA_CIVIL),
        C("Data_Inicio_Docencia_CIAARA", "data_inicio_docencia_ciaara", T.DATA_CIVIL, "⚠️ CHECK CIAARA >= MB — pode recusar dado inconsistente"),
        # ⚠️ `Ultima_Avaliacao_Desempenho` REMOVIDA do mapa em 08/09/2026: o documento 31
        # dizia "havia script de remocao NAO EXECUTADO — conferir se a coluna ainda existe".
        # Conferido: FOI EXECUTADO. A coluna nao existe mais na base.
        C("Data_Avaliacao", "data_avaliacao_desempenho", T.DATA_CIVIL, "⚠️ o documento 31 escreve `Data_Avaliacao_Desempenho`; a base tem `Data_Avaliacao`"),
        C("Preferencia", "preferencia", T.TEXTO_OU_NULO, "preferencia de horario semanal"),
        C("Disciplinas_Ministradas", "disciplinas_ministradas_legado_v1", T.BRUTO, "⚠️ LEGADO. Texto livre da v1.0. NAO e fonte de atribuicao — a fonte e instrutor_disciplina"),
        C("Antiguidade_Declarada", "antiguidade_declarada", T.BRUTO, "achado (d): dado VIVO (177/177), nao morto. Criterio de desempate da RN-ANT"),
        C(None, "antiguidade_declarada_num", T.GERADA, "digitos extraidos por regex, para ordenacao"),
        C("Status", "status", T.STATUS, "decisao da migracao, nao observacao — evento no log"),
        # ⚠️ `Estado` REMOVIDA do mapa em 08/09/2026: o documento 31 a marcava como P-3
        # ("sem definicao semantica => nao modelada"). Conferido: nao existe mais na base.
        C("Tempo_Setor_Anos", None, T.DESCARTADA, "FORMULA -> vw_instrutor_carga_anual"),
        C("Docente_Ate_2_Disciplinas", None, T.DESCARTADA, "idem"),
        C("Carga_Horaria_Ministrada_Ano", None, T.DESCARTADA, "RN-INST-04: carga e SEMPRE calculada, nunca digitada"),
        # ⚠️ `Instrutor Completo` REMOVIDA do mapa em 08/09/2026: o proprio documento 31
        # registrava que a spec 025 a removeu. Conferido na base: nao existe.
        # -------------------------------------------------------------------------
        # DADOS PESSOAIS — 13 colunas que a base tem e o documento 31 nao conhecia.
        # Vieram da spec de ficha de docentes; sem elas, 177 instrutores x 12 campos
        # ficariam para tras, contra o FR-001.
        # Migradas por AUTORIZACAO DA CIAARA-14.2, 08/09/2026, que liberou a
        # hospedagem de dado pessoal em nuvem comercial.
        # -------------------------------------------------------------------------
        C("CPF", "cpf", T.TEXTO_OU_NULO, "DADO PESSOAL. Texto: preserva zero a esquerda e formatacao"),
        C("RG", "rg", T.TEXTO_OU_NULO, "DADO PESSOAL"),
        C("Orgao_Emissor", "orgao_emissor", T.TEXTO_OU_NULO),
        C("Telefone", "telefone", T.TEXTO_OU_NULO, "DADO PESSOAL"),
        C("RETELMA", "retelma", T.TEXTO_OU_NULO, "rede telefonica da MB — termo institucional"),
        C("Endereco_Logradouro", "endereco_logradouro", T.TEXTO_OU_NULO, "DADO PESSOAL"),
        C("Endereco_Numero", "endereco_numero", T.TEXTO_OU_NULO, "TEXTO: a origem traz 's/n', '12-A', 'KM 5'"),
        C("Endereco_Complemento", "endereco_complemento", T.TEXTO_OU_NULO),
        C("Endereco_Bairro", "endereco_bairro", T.TEXTO_OU_NULO, "DADO PESSOAL"),
        C("Endereco_Cidade", "endereco_cidade", T.TEXTO_OU_NULO),
        C("Endereco_Estado", "endereco_estado", T.TEXTO_OU_NULO),
        C("Endereco_CEP", "endereco_cep", T.TEXTO_OU_NULO, "DADO PESSOAL. Texto: preserva hifen e zero a esquerda"),
        C("Area_Conhecimento", "area_conhecimento", T.TEXTO_OU_NULO, "NAO e dado pessoal; estava no mesmo bloco nao mapeado"),
        C("ID_Instrutor", "origem_migracao_v1", T.PROCEDENCIA),
        *_AUD_EDIT,
    ),
)

# =================================================================================
# §5 · Cad_Disciplinas -> disciplinas
# =================================================================================
DISCIPLINAS = MapaDeTabela(
    aba="Cad_Disciplinas", tabela="disciplinas", linhas=175,
    obs="A spec 033 removeu Instrutores_Selecionados, que estava #ERROR!.",
    colunas=(
        C("ID_Grade", "codigo", T.TEXTO, "⚠️ NAO segue PREFIXO-NNNNNN: e a composta '{ID_Disciplina} - {ID_Curso} - {Cod_Disciplina}' (spec 036)"),
        C("ID_Curso", "curso_id", T.FK, "cursos"),
        C("ID_Disciplina", "id_disciplina_legado", T.TEXTO_OU_NULO, "preservado por rastreabilidade; NAO e chave"),
        C("Cod_Disciplina", "cod_disciplina", T.TEXTO, "UQ PARCIAL (curso_id,cod_disciplina) WHERE status='ativo'"),
        C("Nome_Disciplina", "nome_disciplina", T.TEXTO, "P-14 — 'Disciplina', NUNCA 'Materia'"),
        C(None, "nome_normalizado", T.GERADA, "chave de casamento da RN-AVAL-01"),
        C("ID_Instrutor", "instrutores_atribuidos", T.FK, "CSV -> uuid[] resolvido (doc 30 §2.7a). ⚠️ Codigo que nao resolve SOME do array — verificacao V-ARR-01 e OBRIGATORIA"),
        C("ID_Instrutor", "instrutores_atribuidos_legado_v1", T.BRUTO, "C-07 — e o que torna a conversao REVERSIVEL"),
        C("Carga_Horaria_Tempos", "carga_horaria_tempos", T.INTEIRO, "CHECK > 0. Nome unico canonico (achado (f))"),
        C("Ordem_Sugerida", "ordem_sugerida", T.INTEIRO),
        C("Previsao_Inicio", "previsao_inicio", T.DATA_CIVIL, "PADRAO DA GRADE — a fonte por turma e turma_disciplina (LIQ-1)"),
        C("Previsao_Termino", "previsao_termino", T.DATA_CIVIL, "CHECK termino >= inicio"),
        C("Semanas", "semanas", T.GERADA, "conferida por V-GEN-01"),
        C("CH_Semanal", "ch_semanal", T.GERADA, "⚠️ e a MEDIA INFORMATIVA herdada da v1.0, NAO a distribuicao semanal (RN-DIST-01/02)"),
        C("Modo_Atribuicao_Padrao", "modo_atribuicao_padrao", T.DOMINIO, "Dividido/Simultaneo. CHECK != 'herdar' — o padrao tem de ser concreto"),
        C(None, "tecnica_ensino_sugerida", T.LITERAL, "⚠️ NULL. Coluna nova SEM ORIGEM: a spec 033 confirmou que nao existe na planilha (DISC-1, 15/08)"),
        C(None, "local_padrao", T.LITERAL, "⚠️ NULL, idem"),
        C("Status", "status", T.STATUS, "a duplicata C-Esp-ALH/ALH-II tem 1 ativo + 1 inativo — o indice UQ e PARCIAL por isso"),
        # ⚠️ `Instrutores_Selecionados` REMOVIDA do mapa em 08/09/2026: o documento 31
        # ja registrava que a spec 033 a removeu. Conferido na base: nao existe.
        C(None, "prioridade_alocacao_peso", T.LITERAL, "NULL na carga. ⚠️ P-7 RESOLVIDA no Epico 1 — a coluna existe; a origem em Config_Parametros violava o CHECK de chave"),
        C("ID_Grade", "origem_migracao_v1", T.PROCEDENCIA, "traz o rastro Cad_Materias:* da v1.0"),
        *_AUD_EDIT,
    ),
)

# =================================================================================
# §6 · Turma_Disciplina -> turma_disciplina   ── ALVO DO EPICO 11 (LIQ)
# =================================================================================
TURMA_DISCIPLINA = MapaDeTabela(
    aba="Turma_Disciplina", tabela="turma_disciplina", linhas=210,
    obs=("89 com periodo herdado, 121 em branco. Criada em 20/08/2026 pelo achado LIQ-1, "
         "_Migracao_Log LOG-000508 a LOG-000717. E O ALVO DO EPICO 11."),
    colunas=(
        C("ID_Turma_Disciplina", "codigo", T.TEXTO, "TDI-NNNNNN — prefixo corrigido na spec 036"),
        C("ID_Turma", "turma_id", T.FK, "turmas"),
        C("ID_Grade", "disciplina_id", T.FK, "disciplinas. UQ PARCIAL do par WHERE status='ativo'"),
        C("Previsao_Inicio", "previsao_inicio", T.DATA_CIVIL, "FONTE DE VERDADE do periodo por turma — precedencia sobre a grade"),
        C("Previsao_Termino", "previsao_termino", T.DATA_CIVIL),
        C("Origem_Periodo", "origem_periodo", T.DOMINIO, "⚠️ CHECK correlaciona com as datas: nao_informado EXIGE ambas nulas"),
        C("Status", "status", T.STATUS),
        C("ID_Curso", None, T.DESCARTADA, "leitura humana; redundante com disciplina_id -> curso_id"),
        C("Cod_Disciplina", None, T.DESCARTADA, "idem — o JOIN torna a propagacao desnecessaria"),
        C("Nome_Disciplina", None, T.DESCARTADA, "idem"),
        C("ID_Instrutor", "instrutor_id", T.FK_OPCIONAL, "🛑 SELECAO EFETIVA do instrutor por turma (spec 029). A spec 034 corrigiu bug em producao porque a LIQ lia habilitacao em vez desta. P-6 RESOLVIDA em 08/09/2026: a coluna existe"),
        C("CH_Prevista_Por_Instrutor", "ch_prevista_por_instrutor", T.DECIMAL, "🛑 rateio de CH entre instrutores (spec 032, coluna Q). P-6 RESOLVIDA em 08/09/2026"),
        *_AUD_CRIA, *_AUD_EDIT,
        C("ID_Turma_Disciplina", "origem_migracao_v1", T.PROCEDENCIA),
    ),
)

# =================================================================================
# §8 · Instrutor_Disciplina -> instrutor_disciplina
# =================================================================================
INSTRUTOR_DISCIPLINA = MapaDeTabela(
    aba="Instrutor_Disciplina", tabela="instrutor_disciplina", linhas=798,
    obs="E a HABILITACAO/QUALIFICACAO — distinta da selecao efetiva por turma (§6).",
    colunas=(
        C("ID_Vinculo", "codigo", T.TEXTO, "VIN-NNNNNN"),
        C("ID_Instrutor", "instrutor_id", T.FK, "instrutores"),
        C("ID_Grade", "disciplina_id", T.FK, "disciplinas. UQ PARCIAL do par WHERE ativo"),
        C("ID_Grade_Legado_v1", None, T.DESCARTADA, "so existia para o vinculo orfao VIN-000419, ja corrigido. Se tiver conteudo, vai para migracao_log.valor_antes"),
        C("Modo_Atribuicao", "modo_atribuicao", T.DOMINIO, "Herdar/Dividido/Simultaneo. `herdar` le disciplinas.modo_atribuicao_padrao (RN-MAT-05)"),
        C("Status", "status", T.STATUS),
        C("Instrutor_Descricao", None, T.DESCARTADA, "FORMULA -> vw_instrutor_disciplina_rotulada. ⚠️ o documento 31 escreve `Instrutor (Posto/Grad. e Nome)`"),
        C("Disciplina", None, T.DESCARTADA, "idem. ⚠️ o documento 31 escreve `Matéria` — renomeada pela P-14"),
        C(None, "papel_liq", T.DESCARTADA, "[DEFERIDO] achado LIQ-3 (Titular/Reserva_1/Reserva_2, Anexo C NORMHIDRO 30-23) — decisao de 20/08/2026"),
        C("ID_Vinculo", "origem_migracao_v1", T.PROCEDENCIA),
        # ⚠️ SEM colunas de auditoria: conferido em 08/09/2026, esta aba NAO tem
        # `Editado_Por` nem `Timestamp_Edicao` na base, ao contrario do que o
        # documento 31 mapeia. O quarteto fica a cargo do gatilho set_auditoria().
    ),
)

# =================================================================================
# §19 · Usuarios -> usuarios   ── A TABELA DA ARMADILHA B
# =================================================================================
USUARIOS = MapaDeTabela(
    aba="Usuarios", tabela="usuarios", linhas=3,
    obs="4 linhas -> 3. ⚠️ E A TABELA DA ARMADILHA B do documento 30 §3.2: o gatilho anti-escalonamento bloqueia a propria carga.",
    colunas=(
        C("ID_Usuario", "codigo", T.TEXTO, "⚠️ USR-04 e LINHA-FANTASMA totalmente vazia — descartada com evento `arquivado` no log"),
        C("Email", "email", T.TEXTO, "lower(btrim). CHECK: ja minusculo e sem espaco"),
        C("Nome", "nome", T.TEXTO),
        C(None, "nome_exibicao", T.LITERAL, "NULL — coluna nova; a UI cai para `nome`"),
        C("Perfil", "perfil", T.DOMINIO, "⚠️ substitui o Funcao de 3 valores da v1.0; ENUM de 9 valores"),
        C("Funcao_Legado_v1", None, T.DESCARTADA, "dominio de 3 valores superado por Perfil. ⚠️ o documento 31 escreve `Funcao`; a v2.0 ja a renomeou para `Funcao_Legado_v1`"),
        C("Escopo_Curso", "escopo_curso", T.DOMINIO, "vazio -> geral. CHECK: operador EXIGE escopo. Recorte do Operador na RLS"),
        C("ID_Instrutor_Link", "instrutor_id", T.FK_OPCIONAL, "instrutores — liga a conta ao cadastro docente"),
        C("Status", "status", T.STATUS, "⚠️ inativo faz app.usuario_atual() devolver NULL — PERDA DE ACESSO IMEDIATA (teste T-11)"),
        C("Ultimo_Acesso", "ultimo_acesso", T.INSTANTE),
        C(None, "auth_user_id", T.LITERAL, "⚠️ NULL na carga. Preenchido pelo EPICO 3, no convite. NULL = 'credencial ainda nao criada', e a RLS nega tudo nesse estado, CORRETAMENTE (T-09)"),
        C(None, "observacao", T.LITERAL, "NULL"),
        C("ID_Usuario", "origem_migracao_v1", T.PROCEDENCIA),
        # ⚠️ SEM colunas de auditoria: conferido em 08/09/2026, esta aba NAO tem
        # `Editado_Por` nem `Timestamp_Edicao` na base, ao contrario do que o
        # documento 31 mapeia. O quarteto fica a cargo do gatilho set_auditoria().
    ),
)

# =================================================================================
# §20 · Usuario_Curso -> usuario_curso
# =================================================================================
USUARIO_CURSO = MapaDeTabela(
    aba="Usuario_Curso", tabela="usuario_curso", linhas=0,
    obs="N:N do Encarregado de Curso. Pode nascer VAZIA se nenhum estiver cadastrado — e o caso hoje.",
    colunas=(
        C("ID_Vinculo", "codigo", T.TEXTO),
        C("ID_Usuario", "usuario_id", T.FK, "usuarios"),
        C("ID_Curso", "curso_id", T.FK, "cursos. UQ(usuario_id,curso_id)"),
        C("Status", "status", T.STATUS, "consultado por app.cursos_do_usuario()"),
        C(None, "observacao", T.LITERAL, "NULL"),
        C("ID_Vinculo", "origem_migracao_v1", T.PROCEDENCIA),
    ),
)

# =================================================================================
# §9 · Responsaveis_Curso -> responsaveis_curso
# =================================================================================
RESPONSAVEIS_CURSO = MapaDeTabela(
    aba="Responsaveis_Curso", tabela="responsaveis_curso", linhas=2,
    obs="2 linhas semente. A v1.0 tinha 0 — todo DSA saia sem assinatura.",
    colunas=(
        C("ID_Responsavel", "codigo", T.TEXTO, "RSP-NNNNNN"),
        C("ID_Curso", "curso_id", T.FK_OPCIONAL, "⚠️ D-04: o literal 'GERAL' vira NULL. No Sheets era valor magico em coluna de FK; aqui NULL ja significa 'nao se aplica a um curso'"),
        C("Ordem", "ordem", T.INTEIRO, "CHECK >= 1. Posicao no rodape, esquerda->direita"),
        C("Papel_Assinatura", "papel_assinatura", T.DOMINIO, "elaborador + encarregado_divisao = par minimo (RF-DSA-06)"),
        C("Preenchimento", "preenchimento", T.DOMINIO, "Fixo/Dinamico_Usuario_Logado. E A COLUNA QUE AUTOMATIZA A ASSINATURA"),
        C("Posto_Graduacao", "posto_graduacao", T.TEXTO_OU_NULO, "⚠️ CHECK: obrigatorio se preenchimento='fixo'"),
        C("Especialidade", "especialidade", T.TEXTO_OU_NULO, "(T), (AA) — acompanha o posto na assinatura naval"),
        C("Nome_Guerra", "nome_guerra", T.TEXTO_OU_NULO, "⚠️ idem CHECK de `fixo`"),
        C("Nome_Completo", "nome_completo", T.TEXTO_OU_NULO),
        C("NIP", "nip", T.TEXTO_OU_NULO),
        C("Funcao_Descricao", "funcao_descricao", T.TEXTO, "linha impressa ABAIXO da rubrica"),
        C("ID_Instrutor_Link", "instrutor_id", T.FK_OPCIONAL, "instrutores"),
        C("Email_Usuario", "email_usuario", T.TEXTO, "lower(btrim). Chave de resolucao do modo dinamico"),
        C("Email_Usuario", "usuario_id", T.EMAIL_UUID, "⚠️ FK LOGICA, sem constraint fisica (doc 21 §3.3). CHECK: dinamico exige um dos dois"),
        C("Vigente_A_Partir_De", "vigente_de", T.DATA_CIVIL, "PRESERVA O HISTORICO DE RENDICAO DE ENCARREGADOS (C-08)"),
        C("Vigente_Ate", "vigente_ate", T.DATA_CIVIL, "vazio -> NULL. CHECK >= vigente_de"),
        C("Exibir_No_DSA", "exibir_no_dsa", T.BOOLEANO, "permite cadastrar sem imprimir"),
        C("Status", "status", T.STATUS),
        C("ID_Responsavel", "origem_migracao_v1", T.PROCEDENCIA, "C-07"),
        *_AUD_EDIT,
    ),
)

# =================================================================================
# §12 · Avaliacoes_Planejadas -> avaliacoes_planejadas
# =================================================================================
AVALIACOES_PLANEJADAS = MapaDeTabela(
    aba="Avaliacoes_Planejadas", tabela="avaliacoes_planejadas", linhas=118,
    colunas=(
        C("ID_Item", "codigo", T.TEXTO),
        C("ID_Curso", "curso_id", T.FK, "cursos"),
        C("Nome_Disciplina", "nome_disciplina", T.TEXTO, "era Nome_Materia — P-14"),
        C(None, "nome_normalizado", T.GERADA, "⚠️ NAO HA FK para disciplinas, e e DELIBERADO: a RN-AVAL-01 casa por NOME NORMALIZADO. Criar a FK MUDARIA A REGRA DE NEGOCIO"),
        C("Descricao_Instrumentos", "descricao_instrumentos", T.TEXTO_OU_NULO),
        C("Formula_MF", "formula_mf", T.BRUTO, "⚠️ LEGADO — achado (k). Informativo: RNF-NORM-06 diz que o sistema NAO calcula nota nem media final"),
        C("Carater", "carater", T.BRUTO, "⚠️ idem"),
        C("Observacoes", "observacoes", T.TEXTO_OU_NULO),
        C("Status", "status", T.STATUS),
        C("ID_Item", "origem_migracao_v1", T.PROCEDENCIA),
        # ⚠️ SEM colunas de auditoria: conferido em 08/09/2026, esta aba NAO tem
        # `Editado_Por` nem `Timestamp_Edicao` na base, ao contrario do que o
        # documento 31 mapeia. O quarteto fica a cargo do gatilho set_auditoria().
    ),
)

# =================================================================================
# §10 · Registro_Aulas_E_Atividades -> registros_aula
# =================================================================================
REGISTROS_AULA = MapaDeTabela(
    aba="Registro_Aulas_E_Atividades", tabela="registros_aula", linhas=1566,
    obs=("1.552 Aula Teorica + 14 Aula Pratica. As 186 de avaliacao foram fundidas em "
         "Avaliacoes na v2.0; a unica Evento/Cerimonia foi para Eventos_Extracurriculares. "
         "⚠️ unidade_ensino_id NAO vem desta aba — vem do CRUZAMENTO com a v1.0 (etapa 2-B)."),
    colunas=(
        C("ID_Registro", "codigo", T.TEXTO),
        C("Data", "data", T.DATA_CIVIL, "⚠️ date NAO converte fuso — V-DAT-01 prova"),
        C("ID_Turma", "turma_id", T.FK, "turmas. ⚠️ R-02 (soma de TA por turma) e o que prova que nao trocou"),
        C("ID_Grade", "disciplina_codigo_legado_v1", T.BRUTO, "🛑 ACHADO DE 08/09/2026: `registros_aula` NAO TEM disciplina_id — a rota (b) o eliminou (FR-020, protegido por hasnt_column em 050). A disciplina vem por unidade_ensino_id -> unidades_ensino.disciplina_id. Mas a UE e NULA em 665 dos 1.566, e esses perderiam o vinculo. Vai para QUARENTENA, verbatim: guarda o que foi, nao o que e. Decisao de Bernardo (opcao C)"),
        C(None, "unidade_ensino_id", T.DERIVADA, "⚠️ do cruzamento v1.0 (etapa 2-B). NULO quando o veredito nao for `casado` — amparado pelo CHECK do FR-025.8. E a UNICA via para a disciplina, dai a quarentena acima"),
        C("ID_Instrutor", "instrutor_id", T.FK_OPCIONAL, "instrutores. ⚠️ CHECK: obrigatorio se categoria_normativa='aula' (RN-INST-01)"),
        C("Categoria_Normativa", "categoria_normativa", T.DOMINIO, "Aula->aula; Atividade_Extraclasse->atividade_extraclasse. [REVOGADO] o valor Avaliacao NAO existe mais aqui"),
        C("Tipo_Atividade", "tipo_atividade", T.TEXTO, "⚠️ gatilho valida contra config_listas.tipos_atividade => CONFIG_LISTAS CARREGA ANTES"),
        C("Metodologia", "metodologia", T.TEXTO, "⚠️ idem, contra config_listas.metodologias"),
        C("Tempos_Consumidos", "tempos_consumidos", T.INTEIRO, "CHECK 1-12. E A GRANDEZA DA RECONCILIACAO R-02"),
        C("TA_Inicial", "ta_inicial", T.INTEIRO, "CHECK 1-12"),
        C(None, "ta_final", T.GERADA, "ta_inicial + tempos - 1"),
        C("Conteudo_Resumo", "conteudo_resumo", T.TEXTO_OU_NULO),
        C("Local", "local", T.TEXTO_OU_NULO),
        C("Observacoes", "observacoes", T.TEXTO_OU_NULO),
        C("Status", "status", T.STATUS, "C-05 — nada e apagado"),
        *_AUD_CRIA, *_AUD_EDIT,
        C("ID_Registro", "origem_migracao_v1", T.PROCEDENCIA),
    ),
)

# =================================================================================
# §11 · Avaliacoes -> avaliacoes
# =================================================================================
AVALIACOES = MapaDeTabela(
    aba="Avaliacoes", tabela="avaliacoes", linhas=188,
    obs=("111 linhas + 77 execucoes orfas (linha de base medida e aprovada em 08/09/2026). "
         "Ja e a fonte unica de agendamento E execucao desde a fusao da Missao 3. "
         "Aqui e TRANSPORTE, nao fusao — a fusao ja aconteceu."),
    colunas=(
        C("ID_Avaliacao", "codigo", T.TEXTO, "⚠️ a v2.0 renumerou AVL-M* -> AVA-####; conferir que nao sobrou formato antigo"),
        C("ID_Turma", "turma_id", T.FK, "turmas"),
        C("ID_Grade", "disciplina_id", T.FK, "disciplinas. Validacao cruzada curso<->turma<->disciplina (RN-MAT-01)"),
        C("Tipo_Avaliacao", "tipo_avaliacao", T.TEXTO, "⚠️ gatilho valida contra config_listas.tipos_avaliacao"),
        C("Data_Avaliacao", "data_avaliacao", T.DATA_CIVIL, "agendar NAO consome TA"),
        C("TA_Inicial", "ta_inicial", T.INTEIRO, "⚠️ CHECK: par coerente com tempos_consumidos — ou ambos nulos, ou ambos preenchidos"),
        C("Tempos_Consumidos", "tempos_consumidos", T.INTEIRO, "COMPOE A CHD (RN-EVT-03). `sem_execucao` recebeu 3 na v2.0 — valor INFERIDO"),
        C(None, "ta_final", T.GERADA),
        C("Local", "local", T.TEXTO_OU_NULO),
        C("Data_Vista_Prova", "data_vista_prova", T.DATA_CIVIL, "CHECK >= data_avaliacao. 102 das 111 preenchidas"),
        C("TA_Inicial_Vista", "ta_inicial_vista", T.INTEIRO, "⚠️ CHECK de par coerente"),
        C("Tempos_Consumidos_Vista", "tempos_consumidos_vista", T.INTEIRO, "TAMBEM COMPOE A CHD — a R-02 soma os dois"),
        C(None, "ta_final_vista", T.GERADA),
        C("Local_Vista", "local_vista", T.TEXTO_OU_NULO),
        C("ID_Instrutor_Responsavel", "instrutor_responsavel_id", T.FK, "instrutores. Aplicador — EXIGE habilitacao (RN-INST-01)"),
        C("ID_Fiscal", "fiscal_id", T.FK_OPCIONAL, "instrutores. Fiscal — NAO exige habilitacao (RF-AVAL-06)"),
        C("Nome_Fiscal_Externo", "nome_fiscal_externo", T.TEXTO_OU_NULO, "⚠️ CHECK mutuamente exclusivo com fiscal_id"),
        C("Status", "status", T.DOMINIO, "Planejada->pendente; Aplicada->em_andamento; Vista Realizada->concluida. 88/16/7 na base auditada"),
        C("Status_Vista", None, T.DESCARTADA, "FORMULA -> app.fn_status_vista() + vw_avaliacoes_situacao. DEPENDE DE CURRENT_DATE => nao pode ser coluna gerada"),
        C("ID_Item_Planejado", "item_planejado_id", T.FK_OPCIONAL, "avaliacoes_planejadas. UNICO ON DELETE SET NULL do schema"),
        C("Conteudo_Resumo", "conteudo_resumo", T.TEXTO_OU_NULO, "migrado das execucoes legadas"),
        C("Metodologia", "metodologia", T.TEXTO, "⚠️ gatilho valida contra config_listas.metodologias"),
        C("Observacoes", "observacoes", T.TEXTO_OU_NULO),
        C("Origem_Execucao_v1", "origem_execucao_v1", T.BRUTO, "ID_Registro da execucao conciliada"),
        C("Conciliacao_Migracao", "conciliacao_migracao", T.DOMINIO, "RASTRO DA QUALIDADE DA FUSAO. Alimenta a conferencia humana"),
        *_AUD_CRIA, *_AUD_EDIT,
        C("ID_Avaliacao", "origem_migracao_v1", T.PROCEDENCIA),
    ),
)

# =================================================================================
# §25 · _Arquivo_Avaliacoes_v1 -> arquivo_avaliacoes_v1  ── APPEND-ONLY
# =================================================================================
ARQUIVO_AVALIACOES_V1 = MapaDeTabela(
    aba="_Arquivo_Avaliacoes_v1", tabela="arquivo_avaliacoes_v1", linhas=186,
    obs="Quarentena CONSULTAVEL das execucoes legadas fundidas na Missao 3 (RF-DADOS-05).",
    colunas=(
        C("ID_Registro", "codigo", T.TEXTO, "codigo legado de Registro_Aulas_E_Atividades"),
        C("Data", "data", T.DATA_CIVIL),
        C("ID_Turma", "turma_codigo_v1", T.BRUTO, "⚠️ DELIBERADAMENTE nao resolvido para FK. Quarentena guarda O QUE FOI, nao o que e"),
        C("ID_Grade", "disciplina_codigo_v1", T.BRUTO, "idem"),
        C("ID_Instrutor", "instrutor_codigo_v1", T.BRUTO, "idem"),
        C("Tipo_Atividade", "tipo_atividade_v1", T.BRUTO, "contera 'Avaliacao' — valor que NAO EXISTE mais no dominio ativo"),
        C("Metodologia", "metodologia_v1", T.BRUTO),
        C("Tempos_Consumidos", "tempos_consumidos_v1", T.INTEIRO, "fonte da conferencia de TA antes x depois da fusao"),
        C("TA_Inicial", "ta_inicial_v1", T.INTEIRO),
        C("Conteudo_Resumo", "conteudo_resumo_v1", T.BRUTO),
        C("Local", "local_v1", T.BRUTO),
        C("Observacoes", "observacoes_v1", T.BRUTO),
        C("Registrado_Por", "registrado_por_v1", T.BRUTO, "E-MAIL, nao uuid. Quarentena NAO resolve identidade"),
        C("Timestamp_Registro", "registrado_em_v1", T.BRUTO, "⚠️ TEXTO DE PROPOSITO: guarda o carimbo bruto inclusive malformado. Converter DESTRUIRIA a evidencia que a quarentena existe para guardar"),
        C("ID_Avaliacao_Destino", "avaliacao_destino_id", T.FK_OPCIONAL, "avaliacoes. ⚠️ UNICA FK resolvida aqui — e o elo que torna a fusao auditavel"),
        C("ID_Avaliacao_Destino", "avaliacao_destino_codigo_v1", T.BRUTO, "redundancia deliberada: o codigo sobrevive mesmo se a avaliacao for desativada"),
        C(None, "arquivado_em", T.DERIVADA, "now() da carga"),
        C(None, "arquivado_por", T.LITERAL, "NULL"),
        C(None, "observacao_migracao", T.LITERAL, "'Transportado de _Arquivo_Avaliacoes_v1 (v2.0) na migracao de plataforma v2.1' — cumpre o papel de origem_migracao_v1 nesta tabela"),
    ),
)

# =================================================================================
# §13 · Eventos_Extracurriculares -> atividades_nao_letivas
# =================================================================================
ATIVIDADES_NAO_LETIVAS = MapaDeTabela(
    aba="Eventos_Extracurriculares", tabela="atividades_nao_letivas", linhas=664,
    obs=("663 + a cerimonia transferida de Registro_Aulas_E_Atividades. RENOMEADA: o nome "
         "antigo descrevia UMA das quatro categorias e batizava as quatro. "
         "Estudo Individual 531 · AEC 62 · TAD 60 · TR 11."),
    colunas=(
        C("ID_Evento", "codigo", T.TEXTO, "EVT-/EXT-. ⚠️ a v2.0 renumerou EVT-M* -> EXT-####"),
        C("Categoria_Normativa", "categoria_normativa", T.DOMINIO, "1:1 — o ENUM PRESERVA A CAIXA (AEC,TAD,TR,Estudo_Individual). SEM DEFAULT, dominio estritamente fechado (RN-EVT-01)"),
        C("Subtipo", "subtipo", T.TEXTO_OU_NULO, "lista SUGERIDA, nao restritiva — sem FK, deliberadamente"),
        C("Tipo_Legado_v1", "tipo_legado_v1", T.BRUTO, "⚠️ LEGADO (C-07). E o que torna a recategorizacao auditavel e REVERSIVEL por UPDATE"),
        C("Escopo", "escopo", T.DOMINIO, "Turma->turma; Global->global. 100% `turma` nas linhas migradas"),
        C("ID_Turma", "turma_id", T.FK_OPCIONAL, "turmas. ⚠️ CHECK correlato: turma EXIGE preenchido, global EXIGE NULL"),
        C("Data", "data", T.DATA_CIVIL),
        C("Descricao", "descricao", T.TEXTO),
        C("Tempos_Consumidos", "tempos_consumidos", T.INTEIRO, "CHECK 1-12. Entra na R-02"),
        C("TA_Inicial", "ta_inicial", T.INTEIRO, "nasceu vazia na v2.0 (achado (c)). Degradacao segura no DSA: faixa de rodape"),
        C(None, "ta_final", T.GERADA),
        C("Local", "local", T.TEXTO_OU_NULO, "coluna nova da v2.0, majoritariamente vazia"),
        C("Compoe_CHT", "compoe_cht", T.GERADA, "conferida por V-GEN-02. categoria != 'Estudo_Individual' — MANTEM Estudo Individual FORA de CHT = CHD+AEC+TAD+TR"),
        C("Observacoes", "observacoes", T.TEXTO_OU_NULO),
        C("Status", "status", T.STATUS),
        *_AUD_CRIA, *_AUD_EDIT,
        C("ID_Evento", "origem_migracao_v1", T.PROCEDENCIA),
    ),
)

# =================================================================================
# §14+§15 · feriados  ── FUSAO DE DUAS ABAS EM UMA TABELA
# =================================================================================
FERIADOS = MapaDeTabela(
    aba="Calendario_Feriados", tabela="feriados", linhas=26,
    obs=("⚠️ ACHADO DE 08/09/2026: o documento 31 §14 mapeia `Eventos_Globais` como 'fusao, "
         "parte 1 de 2', mas ESSA ABA NAO EXISTE na base atual — as 24 abas extraidas nao a "
         "contem. A fusao provavelmente ja aconteceu na v2.0. A parte 1 fica registrada aqui "
         "como NAO APLICAVEL, e a colisao de `codigo` entre as duas abas deixa de ser risco. "
         "Aposenta a constante FERIADOS_2027 do Codigo.gs (achado (e), RNF-MAN-04)."),
    colunas=(
        C("ID_Feriado", "codigo", T.TEXTO, "⚠️ o §14 previa colisao com Eventos_Globais; sem aquela aba, nao ha colisao"),
        C("Ano", "ano", T.INTEIRO, "CHECK 2020-2099 E CHECK ano = year(data) — se a origem divergir, ABORTA"),
        C("Data", "data", T.DATA_CIVIL),
        C("Descricao", "descricao", T.TEXTO),
        C("Impacto", "impacto", T.DOMINIO, "Dia_Inteiro/Parcial/Informativo. `dia_inteiro` ZERA O DIA no motor preditivo"),
        C("Abrangencia", "abrangencia", T.TEXTO_OU_NULO),
        C("Origem_PROENS", "origem_proens", T.TEXTO_OU_NULO),
        C("Status", "status", T.STATUS),
        C("ID_Feriado", "origem_migracao_v1", T.PROCEDENCIA),
    ),
)

# =================================================================================
# §16 · Calendario_Janelas_Curso -> janelas_curso
# =================================================================================
JANELAS_CURSO = MapaDeTabela(
    aba="Calendario_Janelas_Curso", tabela="janelas_curso", linhas=27,
    obs="Aposenta a constante SEMENTES_2027.",
    colunas=(
        C("ID_Janela", "codigo", T.TEXTO),
        C("Ano", "ano", T.INTEIRO, "CHECK 2020-2099"),
        C("ID_Curso", "curso_id", T.FK, "cursos. UQ(ano,curso_id,turma_prevista) WHERE ativo"),
        C("Turma_Prevista", "turma_prevista", T.TEXTO_OU_NULO, "⚠️ TEXTO, SEM FK, DELIBERADAMENTE: o PROENS publica a janela ANTES de a turma existir. Amarra-la a `turmas` INVERTERIA A ORDEM REAL DOS FATOS"),
        C("Data_Inicio_Prevista", "data_inicio_prevista", T.DATA_CIVIL),
        C("Data_Termino_Prevista", "data_termino_prevista", T.DATA_CIVIL, "CHECK termino >= inicio"),
        C("Origem_PROENS", "origem_proens", T.TEXTO_OU_NULO),
        C("Status", "status", T.STATUS),
        C("ID_Janela", "origem_migracao_v1", T.PROCEDENCIA, "C-07"),
    ),
)

# =================================================================================
# §17 · Calendario_Reservas -> reservas_proens
# =================================================================================
RESERVAS_PROENS = MapaDeTabela(
    aba="Calendario_Reservas", tabela="reservas_proens", linhas=12,
    obs="Aposenta RESERVAS_PROENS. E o 'previsto' contra o qual vw_conformidade_tetos compara o executado.",
    colunas=(
        C("ID_Reserva", "codigo", T.TEXTO),
        C("Ano", "ano", T.INTEIRO, "CHECK 2020-2099"),
        C("ID_Curso", "curso_id", T.FK, "cursos. UQ(ano,curso_id,tipo_reserva) WHERE ativo"),
        C("Tipo_Reserva", "tipo_reserva", T.DOMINIO, "TAD/TR — CAIXA PRESERVADA. So dois valores; AEC NAO e reserva"),
        C("Tempos_Reservados", "tempos_reservados", T.INTEIRO, "CHECK >= 0"),
        C("Criterio", "criterio", T.TEXTO_OU_NULO),
        C("Origem_PROENS", "origem_proens", T.TEXTO_OU_NULO),
        C("Status", "status", T.STATUS),
        C("ID_Reserva", "origem_migracao_v1", T.PROCEDENCIA, "⚠️ esta aba estava VAZIA em 14/08/2026 e foi populada por script — conferir que continua populada"),
    ),
)

# =================================================================================
# §18 · Planejamento_Anual -> planejamento_anual  ── NASCE VAZIA, E ISSO E CORRETO
# =================================================================================
PLANEJAMENTO_ANUAL = MapaDeTabela(
    aba="Planejamento_Anual", tabela="planejamento_anual", linhas=0,
    obs=("0 linhas migradas, E ISSO E CORRETO. A aba de origem e REGENERADA a cada execucao "
         "do motor; nada nela e historico. O mapa existe para quando o motor da v2.1 gravar "
         "a Versao = 1."),
    colunas=(
        C("ID_Planejamento", "codigo", T.TEXTO, "PLAN-{Ano}-{NNNNNN}. Gerado pelo MOTOR, nao pelo ETL"),
        C("Ano_Letivo", "ano_letivo", T.INTEIRO, "CHECK 2020-2099"),
        C("Versao", "versao", T.INTEIRO, "CHECK >= 1. Gerar de novo cria N+1; NUNCA SOBRESCREVE"),
        C("Status_Previa", "status_previa", T.DOMINIO, "Rascunho/Salvo/Arquivado. ⚠️ gatilho garante 1 `salvo` por ano"),
        C("ID_Curso", "curso_id", T.FK, "cursos"),
        C("ID_Turma_Prevista", "turma_prevista_id", T.FK_OPCIONAL, "turmas. Vazio enquanto a turma nao existir"),
        C("Rotulo_Turma_Prevista", "rotulo_turma_prevista", T.TEXTO_OU_NULO, "T1, T2 provisorios"),
        C("Tipo_Linha", "tipo_linha", T.DOMINIO, "⚠️ CHECK correlato: so `disciplina` admite disciplina_id"),
        C("ID_Grade", "disciplina_id", T.FK_OPCIONAL, "disciplinas. UQ PARCIAL WHERE tipo_linha='disciplina'"),
        C("Semana_Ano", "semana_ano", T.INTEIRO, "CHECK 1-53 E bate com a data"),
        C("Data_Inicio_Semana", "data_inicio_semana", T.DATA_CIVIL, "⚠️ CHECK isodow = 1 — TEM DE SER SEGUNDA-FEIRA"),
        C("Tempos_Alocados", "tempos_alocados", T.INTEIRO, "valor CORRENTE (pode ter sido editado)"),
        C("Tempos_Alocados_Motor", "tempos_alocados_motor", T.INTEIRO, "valor ORIGINAL. Preserva o diff motor x humano"),
        C("Origem_Linha", "origem_linha", T.DOMINIO, "⚠️ GATILHO AUTOMATICO grava `motor_editado` quando os dois tempos divergem"),
        C("Descricao", "descricao", T.TEXTO_OU_NULO, "obrigatoria na pratica para evento_manual"),
        C("Observacoes", "observacoes", T.TEXTO_OU_NULO),
        C("Gerado_Por", "gerado_por", T.EMAIL_UUID),
        C("Timestamp_Geracao", "gerado_em", T.INSTANTE),
        C("Salvo_Por", "salvo_por", T.EMAIL_UUID),
        C("Timestamp_Salvamento", "salvo_em", T.INSTANTE, "carimbo da promocao Rascunho->Salvo"),
        *_AUD_EDIT,
        C(None, "origem_migracao_v1", T.LITERAL, "NULL — nada migrado => sem rastro de origem. E O VALOR HONESTO"),
    ),
)

# =================================================================================
# §24 · _Migracao_Log -> migracao_log  ── APPEND-ONLY, NUMERACAO CONTINUADA
# =================================================================================
MIGRACAO_LOG = MapaDeTabela(
    aba="_Migracao_Log", tabela="migracao_log", linhas=930,
    obs=("⚠️ A NUMERACAO E CONTINUADA, NUNCA REINICIADA. O log da v2.1 e continuacao do da "
         "v2.0. Linha de base medida e aprovada em 08/09/2026: 930 linhas, nao as '717+' "
         "que a spec dizia. UPDATE e DELETE recusados pelo gatilho trg_migracao_log_imutavel, "
         "INCLUSIVE para a chave administrativa. Corrigir e INSERIR EVENTO NOVO."),
    colunas=(
        C("ID_Log", "codigo", T.TEXTO, "LOG-NNNNNN. ⚠️ o ETL segue de max(codigo). A planilha ja passou de LOG-001060 (P-8)"),
        C("Timestamp", "executado_em", T.INSTANTE),
        C("Executado_Por", "executado_por", T.EMAIL_UUID, "muitas linhas historicas sao de script, nao de pessoa => NULL LEGITIMO"),
        C("Aba_Origem", "origem_tabela", T.TEXTO, "RENOMEADA — 'aba' nao existe mais"),
        C("Chave_Origem", "origem_chave", T.TEXTO_OU_NULO),
        C("Aba_Destino", "destino_tabela", T.TEXTO_OU_NULO),
        C("Chave_Destino", "destino_chave", T.TEXTO_OU_NULO),
        C("Acao", "acao", T.DOMINIO, "Transportado/Transformado/Conciliado/Arquivado/Corrigido"),
        C("Regra_Aplicada", "regra_aplicada", T.TEXTO_OU_NULO),
        C("Valor_Antes", "valor_antes", T.BRUTO, "guarda o valor bruto, INCLUSIVE malformado"),
        C("Valor_Depois", "valor_depois", T.BRUTO),
        C(None, "observacao", T.LITERAL, "NULL — coluna nova para eventos da v2.1"),
        C(None, "origem_migracao_v1", T.DESCARTADA, "⚠️ EXCECAO DELIBERADA a C-07: o log E o rastro. Um rastro do rastro seria recursao sem informacao"),
    ),
)

# =================================================================================
# §23 · _Meta_Colunas -> APOSENTADA  (nenhuma linha transportada)
# =================================================================================
META_COLUNAS_APOSENTADA = MapaDeTabela(
    aba="_Meta_Colunas", tabela="(aposentada)", linhas=0,
    obs=("[ABSORVIDO PELA PLATAFORMA] — exemplo canonico do BRIEF §2.1. Existia porque o "
         "Sheets nao tinha contrato de coluna nativo; no PostgreSQL o CATALOGO cumpre esse "
         "papel COM GARANTIA DO MOTOR, e `supabase gen types` leva o mesmo contrato ao "
         "frontend sem ninguem digita-lo. Um requisito nao foi apagado — foi ABSORVIDO, e o "
         "substituto tem nome. NENHUMA linha e transportada: o ETL registra UM evento "
         "acao='arquivado' para a aba inteira, com regra_aplicada='C-02 absorvida pelo "
         "catalogo do PostgreSQL (BRIEF §2.1)'."),
    colunas=(
        C("Aba", None, T.DESCARTADA, "vira information_schema.tables"),
        C("Coluna_Canonica", None, T.DESCARTADA, "vira information_schema.columns"),
        C("Alias_v1", None, T.DESCARTADA, "nao ha mais alias: os cabecalhos foram canonizados na v2.0 (C-01)"),
        C("Tipo", None, T.DESCARTADA, "vira o TIPO REAL da coluna, garantido pelo motor — nao um contrato paralelo que alguem precisa manter"),
        C("Obrigatorio", None, T.DESCARTADA, "vira NOT NULL"),
        C("Dominio", None, T.DESCARTADA, "vira ENUM (dominio normativo fechado) ou FK para config_listas (dominio operacional)"),
        C("Ativo", None, T.DESCARTADA, "coluna inexistente e AUSENCIA REAL, nao uma linha marcada inativa"),
    ),
)


# ---------------------------------------------------------------------------------
# O registro. Tabela sem mapa NAO e carregada, e `carregar.py` reclama por nome —
# silencio aqui produziria tabela vazia com carga verde, o pior desfecho possivel.
# ---------------------------------------------------------------------------------
MAPAS: dict[str, MapaDeTabela] = {
    m.tabela: m
    for m in (
        CONFIG_LISTAS, CONFIG_PARAMETROS, CURSOS, CONFIGURACOES_HORARIO,
        HORARIOS_TEMPOS_AULA, CURSO_REGIME_HISTORICO, TURMAS, INSTRUTORES,
        DISCIPLINAS, TURMA_DISCIPLINA, INSTRUTOR_DISCIPLINA, USUARIOS,
        USUARIO_CURSO, RESPONSAVEIS_CURSO, AVALIACOES_PLANEJADAS, REGISTROS_AULA,
        AVALIACOES, ARQUIVO_AVALIACOES_V1, ATIVIDADES_NAO_LETIVAS, FERIADOS,
        JANELAS_CURSO, RESERVAS_PROENS, PLANEJAMENTO_ANUAL, MIGRACAO_LOG,
    )
}

# `perfil_permissao` esta na ordem de carga e NAO tem de-para no documento 31, por
# uma razao boa: o documento 30 §4 registra que ela "ja e semeada por
# 05_rls_policies.sql; o ETL apenas confere". Declarada aqui para que a ausencia seja
# DELIBERADA E VISIVEL, e nao confundida com esquecimento.
SEM_DE_PARA: dict[str, str] = {
    "perfil_permissao": (
        "Semeada pela migration de RLS do Epico 1 (152 linhas de matriz). O ETL apenas "
        "CONFERE a contagem — nao carrega. Documento 30 §4."
    ),
}

# Aba que existe na origem e NAO vira tabela.
APOSENTADAS: dict[str, MapaDeTabela] = {"_Meta_Colunas": META_COLUNAS_APOSENTADA}


def conferir_cobertura(ordem_de_carga: tuple[str, ...]) -> dict[str, list[str]]:
    """Confere que a ordem de carga e o de-para falam da mesma coisa.

    Executado por `carregar.py` ANTES de qualquer escrita. Tabela na ordem sem mapa,
    ou mapa sem lugar na ordem, sao os dois defeitos que produzem carga verde com
    tabela vazia — e nenhum aparece na contagem, porque a tabela nem chega a ser lida.
    """
    na_ordem = set(ordem_de_carga)
    mapeadas = set(MAPAS) | set(SEM_DE_PARA)
    return {
        "na_ordem_sem_mapa": sorted(na_ordem - mapeadas),
        "mapeadas_fora_da_ordem": sorted(mapeadas - na_ordem),
    }


# =====================================================================================
# DE-PARA DE DOMÍNIO — onde a palavra da origem não é a palavra do ENUM
#
# POR QUE ISTO EXISTE: o `promover.py` resolve sozinho todo valor que, depois de tirar
# acento, minúsculo e trocar espaço/hífen por `_`, coincide com um rótulo real do ENUM.
# Isso cobre a maioria (`Dedicação Exclusiva`→`dedicacao_exclusiva`, `AEC`→`AEC`,
# `Presencial`→`presencial`). O que sobra são casos em que a v2.0 usa OUTRA PALAVRA —
# e adivinhar outra palavra é exatamente o que uma migração não pode fazer em silêncio.
#
# REGRA DE OURO: valor que não resolve sozinho e não está nesta tabela **aborta a carga**
# com o nome do valor e a contagem de linhas. Nunca vira NULL, nunca vira "o mais
# parecido". Ver `promover.conferir_dominios()`.
#
# A chave é `(tabela_destino, coluna_destino)`; a chave interna é o valor da origem
# **verbatim**, como está na planilha.
# =====================================================================================

DE_PARA_DOMINIO: dict[tuple[str, str], dict[str, str]] = {
    # -------------------------------------------------------------------------------
    # `Classificacao` da v2.0 escreve por extenso; o ENUM `escopo_curso` é sintético.
    # ⚠️ `Curso Especial` e `Curso de Aperfeicoamento Avancado` NAO TINHAM DESTINO: o
    #    ENUM foi declarado a partir do BRIEF §3, que nao lista os dois. Sao 7 dos 24
    #    cursos. Os valores foram ACRESCENTADOS ao ENUM pela migration
    #    `20260908083000_dominios_que_a_base_exige.sql` — ver a justificativa la.
    # -------------------------------------------------------------------------------
    ("cursos", "classificacao"): {
        "Curso Regular": "regular",
        "Curso Expedito": "expedito",
        "Estágio de qualificação": "estagio_qualificacao",
        "Curso Especial": "especial",
        "Curso de Aperfeiçoamento Avançado": "aperfeicoamento_avancado",
    },
    # -------------------------------------------------------------------------------
    # Modalidade: a v2.0 nunca fechou o dominio (P-4), e a coluna virou texto livre.
    # As tres formas abaixo sao 1 curso cada. A leitura de cada uma:
    #   · "A Distância"                     → `ead`: e a forma antiga de escrever EAD.
    #   · "A Distância (EAD / Presencial)"   → `semipresencial`: o proprio texto diz que
    #     tem as duas pontas, que e a definicao de semipresencial.
    #   · "Presencial (podendo ser ministrado por videoconferência síncrona)"
    #     → `presencial`: videoconferencia SINCRONA e presenca em tempo real; o
    #     parentese descreve o MEIO, nao muda a modalidade.
    # -------------------------------------------------------------------------------
    ("cursos", "modalidade"): {
        "A Distância": "ead",
        "A Distância (EAD / Presencial)": "semipresencial",
        "Presencial (podendo ser ministrado por videoconferência síncrona)": "presencial",
    },
    ("turmas", "modalidade"): {
        "Semi-Presencial": "semipresencial",
    },
    # -------------------------------------------------------------------------------
    # Os 24 cursos trazem `Padrao`. O comentario do proprio ENUM diz qual e o padrao:
    # "`carga_restante_por_dia_util` e o comportamento atual e fixo da v1.0 (RN-2027-05)
    # e permanece como default, garantindo nao regressao". `Padrao` da v2.0 e, literal-
    # mente, esse comportamento — nao ha segunda leitura possivel.
    # -------------------------------------------------------------------------------
    ("cursos", "prioridade_alocacao"): {
        "Padrao": "carga_restante_por_dia_util",
    },
    # -------------------------------------------------------------------------------
    # `Encarregado_Div_Adm_Academica` (17 linhas) e o nome v2.0 do mesmo perfil. O
    # comentario do ENUM `perfil_usuario` registra que as variacoes "Encarregado/Ajudante
    # por divisao" foram contadas separadamente no BRIEF e unificadas aqui.
    # -------------------------------------------------------------------------------
    ("config_parametros", "editavel_por"): {
        "Encarregado_Div_Adm_Academica": "encarregado_administracao_academica",
    },
    # -------------------------------------------------------------------------------
    # `Consulta` e o rotulo v1.0 do perfil so-leitura. O documento 31 §Cad_Usuarios
    # mapeia `Visualizacao`→`visualizacao`; `Consulta` e a forma anterior da MESMA coisa
    # (o `Funcao` de 3 valores da v1.0 que o `Perfil` substituiu).
    # -------------------------------------------------------------------------------
    ("usuarios", "perfil"): {
        "Consulta": "visualizacao",
    },
    # -------------------------------------------------------------------------------
    # ⚠️ `Adicionado` (2 linhas) e `Descartado` (1) sao verbos da migracao v1.0→v2.0,
    #    registrados no log HISTORICO que estamos transportando. Cinco dos sete verbos
    #    ja coincidem com o ENUM. Traduzir estes dois para o verbo mais proximo seria
    #    REESCREVER LINHA DE LOG JA GRAVADA — o que a regra 5 do CLAUDE.md proibe
    #    explicitamente ("migracao_log e append-only... corrigir e logar evento novo").
    #    Por isso os dois valores foram ACRESCENTADOS ao ENUM, preservando o verbo
    #    verbatim. O mapeamento abaixo e identidade: existe para documentar a decisao.
    # -------------------------------------------------------------------------------
    ("migracao_log", "acao"): {
        "Adicionado": "adicionado",
        "Descartado": "descartado",
    },
    # -------------------------------------------------------------------------------
    # "20h Semanais" → "20h". O ENUM guarda o rotulo curto porque ele e a CHAVE de
    # `config_parametros` onde vivem as faixas (RNF-NORM-08): o join so fecha se o
    # rotulo for identico dos dois lados.
    # -------------------------------------------------------------------------------
    # -------------------------------------------------------------------------------
    # `config_parametros.tipo` NÃO é ENUM — é `text` com CHECK de 5 valores
    # (`numero, percentual, inteiro, texto, booleano`). A v2.0 usa outro conjunto:
    # `INTEIRO`, `DECIMAL`, `HORA`, `TEXTO`. Dois casam depois de minúsculo; dois não:
    #   · `DECIMAL` → `numero`  — é o mesmo conceito com outro nome.
    #   · `HORA`    → `texto`   — o CHECK não tem tipo temporal, e o valor é uma string
    #     de hora ("08:00"). `texto` é o que ele é hoje; classificá-lo como `numero`
    #     seria pior. ⚠️ Se a v2.1 quiser um tipo `hora`, é emenda ao CHECK, não aqui.
    # -------------------------------------------------------------------------------
    ("config_parametros", "tipo"): {
        "DECIMAL": "numero",
        "HORA": "texto",
    },
    ("instrutores", "regime_trabalho"): {
        "20h Semanais": "20h",
        "40h Semanais": "40h",
    },
}


# =====================================================================================
# SENTINELAS DE CHAVE ESTRANGEIRA — o valor que significa "não aponta para nada"
#
# A v2.0 não tinha NULL confortável em planilha, e resolvia a ausência de vínculo com
# uma palavra combinada. `Calendario_Reservas.ID_Curso = 'GERAL'` não é um curso: é
# "reserva válida para a Divisão inteira". Cinco dos seis códigos das 12 reservas são
# cursos de verdade; `GERAL` é este sexto.
#
# ⚠️ POR QUE DECLARAR EM VEZ DE DEIXAR O `LEFT JOIN` RESOLVER: sem esta lista, `GERAL`
#    é indistinguível de uma chave órfã — e chave órfã tem de ABORTAR a carga
#    (documento 30 §2.6). Declarar a sentinela é o que permite ao conferidor de órfãos
#    ser rigoroso com todo o resto.
# =====================================================================================

SENTINELAS_DE_FK: dict[tuple[str, str], frozenset[str]] = {
    ("reservas_proens", "curso_id"): frozenset({"GERAL"}),
    # Mesmo `GERAL`, mesma leitura: responsável que assina por toda a Divisão, não por
    # um curso. São as 2 linhas de `Responsaveis_Curso`, e o `LOG-000399` do próprio
    # log de migração da v2.0 as descreve: "2 sementes GERAL criadas".
    ("responsaveis_curso", "curso_id"): frozenset({"GERAL"}),
}


# =====================================================================================
# COLUNAS MULTIVALORADAS — uma célula da planilha, várias linhas no banco
#
# `Turma_Disciplina.ID_Instrutor` guarda LISTA: `'40, 60'`, `'17, 18, 19, 20, 40, 60,
# 55'`. Seis das 210 linhas. Numa planilha isso é natural; numa FK é impossível — e o
# `LEFT JOIN` por `codigo` devolvia nulo, perdendo até seis atribuições numa linha só,
# sem erro.
#
# A v2.1 já tem a casa certa: `turma_disciplina_instrutor`, a tabela de junção **de onde
# a LIQ lê**. Ela existia no schema e o ETL não a usava.
#
# ⚠️ O QUE CARREGA ONDE, e por quê:
#    · `turma_disciplina_instrutor` recebe **TODAS** as atribuições, uma linha por
#      instrutor — inclusive as de instrutor único. Junção que só tem os casos
#      múltiplos é pior que junção nenhuma: toda consulta feita sobre ela sairia com
#      menos atribuições do que existem, e ninguém notaria.
#    · `turma_disciplina.instrutor_id` continua preenchida **só quando há exatamente
#      um** — é o atalho desnormalizado, e num caso de sete instrutores não há atalho
#      possível. Nula ali significa "olhe a junção", não "não há instrutor".
# =====================================================================================

MULTIVALORADAS: dict[tuple[str, str], str] = {
    ("turma_disciplina", "instrutor_id"): "turma_disciplina_instrutor",
}


# =====================================================================================
# PARÂMETROS OPERACIONAIS — os que NÃO vêm de norma
#
# `config_parametros.natureza` nasce `normativo`, e `normativo` obriga a citar a norma
# (CHECK `config_param_normativo_tem_fundamento`). Esta lista é a declaração explícita
# do contrário — e é curta de propósito: cada entrada aqui é um parâmetro que ninguém
# vai encontrar ao revisar uma norma.
#
# ⚠️ NÃO derivar esta lista de "`Fundamento_Normativo` está vazio". Seria circular: todo
#    parâmetro sem fundamento viraria operacional sozinho e o invariante RNF-NORM-08
#    deixaria de provar coisa alguma.
# =====================================================================================

PARAMETROS_OPERACIONAIS: frozenset[str] = frozenset({
    # ID do template do Google Docs da Ficha de Docentes (spec 022 da v2.0). Operacional
    # e, além disso, APOSENTADO: a v2.1 emite a Ficha por `/print/*`, sem Google Docs.
    # Transportado porque nada é apagado — mas não é norma, e não tem fundamento.
    "id_template_ficha_instrutor",
})


# =====================================================================================
# PARÂMETROS SUPERADOS PELO SEED NORMATIVO DA v2.1
#
# `config_parametros` recebe o mesmo parâmetro normativo por dois caminhos: a migration
# do Épico 1 o semeia com a chave canônica da v2.1 (`teto.aec_percentual_chr`) e o ETL
# o transporta com a chave da v2.0 (`teto_aec_pct`). São **13 pares**, e nos 13 o valor
# é idêntico dos dois lados — é duplicidade de NOME, não de número.
#
# ⚠️ DECISÃO DE BERNARDO, 08/09/2026: "mantenha exclusivamente a chave canônica da v2.1
#    definida no seed normativo, descartando a nomenclatura legada da v2.0".
#
# ⚠️ "DESCARTAR" AQUI É EXCLUSÃO LÓGICA, NÃO REMOÇÃO. A regra 4 do CLAUDE.md é
#    inviolável: nada é apagado. As 13 linhas da v2.0 são transportadas — o FR-001
#    continua exigindo 100% do histórico — e chegam com `status = 'inativo'`. Quem
#    procurar de onde veio o teto de 10% daqui a três anos acha a chave antiga, acha o
#    valor que ela tinha, e vê que ela foi superada. Se fossem removidas, não acharia
#    nada e concluiria que a v2.0 nunca teve o parâmetro.
#
# ⚠️ E SE OS VALORES DIVERGIREM: `promover.conferir_parametros_superados()` **aborta a
#    carga**. Duas chaves com o mesmo significado e números diferentes não são
#    duplicidade de nomenclatura — são um conflito sobre qual é a norma, e desativar um
#    dos lados em silêncio esconderia exatamente a pergunta que precisa ser feita.
#
# A chave é a da v2.0 (que sai de cena); o valor é a canônica da v2.1 (que fica).
# =====================================================================================

PARAMETROS_SUPERADOS_PELO_SEED: dict[str, str] = {
    "teto_aec_pct": "teto.aec_percentual_chr",
    "teto_tad_pct": "teto.tad_percentual_chr",
    "teto_tr_pct": "teto.tr_percentual_chr",
    "ch_docente_20h_min": "ch_docente.20h.min",
    "ch_docente_20h_max": "ch_docente.20h.max",
    "ch_docente_40h_min": "ch_docente.40h.min",
    "ch_docente_40h_max": "ch_docente.40h.max",
    "ch_docente_de_min": "ch_docente.dedicacao_exclusiva.min",
    "ch_docente_de_max": "ch_docente.dedicacao_exclusiva.max",
    "teto_semanal_tfm_ta": "alocacao.teto_tfm_rigido",
    "teto_semanal_recomendado_ta": "alocacao.teto_geral_recomendado",
    "prazo_vista_prova_dias": "avaliacao.prazo_vista_dias",
    "bloco_prova_ta": "avaliacao.ta_padrao_bloco_prova",
    # ⚠️ NÃO ENTRAM AQUI, e o motivo importa: `estudo_obrig_com_regime_pct`,
    #    `estudo_obrig_sem_regime_pct`, `janela_almoco_inicio` e `janela_almoco_fim`
    #    são normativos e **não têm par no seed** — a v2.1 não os declarou. Ficam
    #    ATIVOS com a chave da v2.0, porque desativá-los perderia a norma. E
    #    `id_template_ficha_instrutor` é operacional (ver PARAMETROS_OPERACIONAIS).
}
