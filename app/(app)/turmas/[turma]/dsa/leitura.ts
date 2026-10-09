/**
 * A leitura da semana do DSA no banco — **o ponto único**, para a tela e para o papel
 * (`RF-DSA-01`, `RF-PDF-01` · spec 013, PR 1 e PR 3).
 *
 * ⚠️ **ESTE ARQUIVO NASCEU NO PR 3, E A RAZÃO É A RAZÃO DE SER DA SPEC INTEIRA.** A rota de
 * impressão precisa **da mesma semana** que a tela mostra: a mesma grade, o mesmo relógio, as
 * mesmas três tabelas, o mesmo tratamento de feriado. Com dois leitores, a primeira divergência
 * entre tela e papel seria **invisível** — e é exatamente o `D-5` e o `D-6` da planilha, onde o
 * ESPELHO e a IMPRESSÃO liam linhas diferentes do mesmo dado e **ninguém via**, até a inspeção da
 * CAC contar 11.918 erros.
 *
 * > *"Toda regra de cálculo nasce em `lib/dominio/dsa/` como função PURA […]. Coluna derivada:
 * > `GENERATED ALWAYS` ou VIEW. **Nunca uma segunda fonte de verdade.**"*
 * > — `CLAUDE.md`, restrição `R-1` da spec 013 e convenções de banco
 *
 * ⚠️ **ELE É A FRONTEIRA, E NÃO TEM REGRA DENTRO.** Quem monta a grade é `montarSemana()`, quem
 * deriva o relógio é `relogioDaSemana()`, quem resolve a vigência é `vigenteEm()`, quem monta o
 * nome é `nomeParaDsa()`. Aqui só há `select`, mapa e `Promise.all`. O irmão `consulta.ts` declara
 * as colunas e converte linha → tipo, **sem I/O** — é por isso que ele continua testável sem banco
 * e este arquivo não.
 *
 * ⚠️ **UMA RODADA DE `Promise.all`, E NENHUM `await` DENTRO DE LAÇO.** A única exceção é o catálogo
 * de horários, que **depende** de qual vigência venceu: ele é um `await` a mais, **fora de laço**, e
 * só acontece quando a vigência aponta para uma configuração. Medido em 05/10/2026: **nenhuma** das
 * vigências reais aponta, então hoje esse caminho não roda.
 */
import { escalaDeLinhas, type EscalaDeAntiguidade } from "@/lib/dominio/antiguidade";
import {
  detectarConflitos,
  type MarcaDeConflito,
  type OcupacaoDeTa,
  type OcupacaoPropria,
} from "@/lib/dominio/dsa/conflitos";
import { montarSemana, type FatoDaSemana, type Semana } from "@/lib/dominio/dsa/grade";
import { relogioDaSemana, type Relogio } from "@/lib/dominio/dsa/horario-do-bloco";
import type { ExecucaoDaDisciplina, TecnicaDoCatalogo } from "@/lib/dominio/dsa/impressao";
import { conteudoDaAvaliacao, tecnicaDaVistaDeProva } from "@/lib/dominio/dsa/rotulos";
import type { ResponsavelDoCurso } from "@/lib/dominio/dsa/assinaturas";
import { nomeParaDsa, type InstrutorParaExibir } from "@/lib/dominio/nome-instrutor";
import { emOrdemNaturalDoCodigo } from "@/lib/dominio/ordem-natural";
import { dataParaLeitura } from "@/lib/formato/data";
import type { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  COLUNAS_DA_OCUPACAO,
  COLUNAS_DA_VIGENCIA,
  COLUNAS_DO_CATALOGO,
  COLUNAS_DO_FERIADO,
  diasDaTela,
  fatoDaOcupacao,
  feriadoDoBanco,
  regimeParaRelogio,
  tempoDoCatalogo,
  unidadesDaTurma,
  vigenciaDaSemana,
  vigenciaDoBanco,
  type ConteudoDoFato,
  type LinhaDaOcupacao,
  type LinhaDeFeriado,
  type LinhaDeVigencia,
  type LinhaDoCatalogo,
  type OcupacaoAcumulada,
} from "./consulta";

/** O cliente de servidor, como a rota o cria. Tipo emprestado para não reimplementá-lo. */
type ClienteDeServidor = Awaited<ReturnType<typeof criarClienteDeServidor>>;

/** Uma unidade de ensino oferecida à turma, com a CH prevista, a lançada e a restante (`P-3`). */
export type UnidadeLida = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly disciplinaCodigo: string;
  readonly numero: number;
  readonly topico: string;
  readonly prevista: number;
  /** Lançada pela turma inteira, sem data — o número do formulário. */
  readonly lancada: number;
  readonly restante: number;
  /** Lançada até o fim da semana aberta — o número da cascata do painel de situação. */
  readonly lancadaAteASemana: number;
  readonly tecnicaSugerida: string | null;
  readonly atribuidoId: string | null;
};

/**
 * Uma disciplina da turma, para o formulário de lançamento.
 *
 * ⚠️ **ATÉ 08/10/2026 ESTE TIPO ERA SÓ DA DISCIPLINA ISENTA DE UE** (`Q-1`), a única em que a aula
 * podia ser lançada sem unidade. A `D-DSA-1` abriu o caminho para **qualquer** disciplina, e o
 * formulário passou a pedir a disciplina **antes** da unidade (item 1 do comando de correções).
 */
export type DisciplinaLida = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
};

/**
 * Uma avaliação da turma que pode receber a VISTA DE PROVA (`RF-AVAL-05`, `RN-AVAL-02`).
 *
 * ⚠️ **ELA NÃO É DA SEMANA**: a vista costuma cair dias depois da aplicação, e muitas vezes em outra
 * semana. Por isso a leitura é da turma inteira, e não da janela da grade.
 */
export type AvaliacaoParaVista = {
  readonly id: string;
  readonly disciplinaId: string;
  readonly tipo: string;
  /** `aaaa-mm-dd`. */
  readonly aplicadaEm: string | null;
  readonly titulo: string | null;
  /** `aaaa-mm-dd` quando a vista já foi lançada — escolher de novo a reposiciona. */
  readonly vistaEm: string | null;
};

export type SemanaDoDsa = {
  readonly semana: Semana;
  readonly relogio: Relogio | null;
  readonly dias: readonly string[];
  readonly sabadoAberto: boolean;
  /** As datas desta semana que têm lançamento — insumo do `?sabado=` e do número do DSA. */
  readonly datasComLancamento: readonly string[];
  readonly cursoCodigo: string | null;
  readonly cursoPorCompetencias: boolean;
  readonly unidades: readonly UnidadeLida[];
  /** As disciplinas ATIVAS do curso da turma — a segunda escolha do formulário, depois do tipo. */
  readonly disciplinas: readonly DisciplinaLida[];
  readonly avaliacoesParaVista: readonly AvaliacaoParaVista[];
  readonly instrutores: readonly InstrutorParaExibir[];
  readonly escala: EscalaDeAntiguidade;
  /** Os nomes das técnicas, para o seletor. */
  readonly tecnicas: readonly string[];
  /** As técnicas **com a sigla** dos `metadados` — o que a coluna T/E do papel usa (`T040`). */
  readonly tecnicasComSigla: readonly TecnicaDoCatalogo[];
  readonly tiposDeAvaliacao: readonly string[];
  readonly subtipos: readonly { readonly valor: string; readonly categoria: string | null }[];
  /**
   * Os fatos que são **Estudo Individual**, por `id`.
   *
   * ⚠️ **ELE EXISTE PORQUE `FatoDaSemana` NÃO CARREGA A `categoria_normativa`** — ela é de
   * gravação, e o fato é de exibição. Sem este conjunto, o papel imprimiria o EI **duas vezes**:
   * como linha comum e como a linha fixa do pé do dia. Adivinhá-lo pelo subtipo seria inventar,
   * porque o subtipo é lista administrável.
   */
  readonly idsDeEstudoIndividual: ReadonlySet<string>;
  /**
   * As marcas de conflito, por `fatoId` — **já prontas** (`RN-CONF-01`, `Q-17`).
   *
   * ⚠️ **O CONFLITO É CALCULADO EM MEMÓRIA, SEM TABELA DE CONFLITOS**, e o dado alheio **não** chega
   * aqui: `public.conflitos_da_semana` é `SECURITY DEFINER` e devolve **só** a ocupação (data, TA,
   * instrutor, fiscal, sala) das outras turmas — sem `turma_id` e sem `fato_id`. É o desenho da
   * `Q-17`: o Operador de alcance restrito **vê que há conflito** sem ler o DSA de um curso que não
   * alcança.
   */
  readonly marcasDeConflito: ReadonlyMap<string, MarcaDeConflito>;
  /**
   * A ocupação da turma **de qualquer data até o fim da semana aberta** — o insumo do acumulado.
   *
   * ⚠️ **ELA NÃO É A OCUPAÇÃO DA SEMANA, e a diferença é a `RN-CRONOS-03`:** a CH acumulada é a de
   * **todo** o período até o corte, e a semana aberta é só a janela que se desenha. Reaproveitar a
   * leitura da semana daria um acumulado que recomeça do zero a cada navegação.
   */
  readonly ocupacaoAcumulada: readonly OcupacaoAcumulada[];
};

/**
 * Lê a semana inteira e devolve a grade montada mais o catálogo de itens lançáveis.
 *
 * ⚠️ **A JANELA DA CONSULTA É SEMPRE OS SEIS DIAS, com o sábado incluído** — a consulta **não**
 * pode depender de `?sabado=`: é justamente lendo o sábado que se descobre se há lançamento nele,
 * e, se houver, a coluna aparece mesmo sem o parâmetro (`Q-4`).
 */
export async function lerSemanaDoDsa(
  supabase: ClienteDeServidor,
  entrada: {
    readonly turmaId: string;
    readonly cursoId: string;
    readonly ano: number;
    readonly numero: number;
    readonly sabadoPedido: boolean;
    readonly hoje: string;
  },
): Promise<SemanaDoDsa> {
  const todosOsSeis = diasDaTela({
    ano: entrada.ano,
    numero: entrada.numero,
    sabadoPedido: true,
    datasComLancamento: [],
  }).dias;
  const de = todosOsSeis[0] ?? entrada.hoje;
  const ate = todosOsSeis[todosOsSeis.length - 1] ?? entrada.hoje;
  const { turmaId, cursoId } = entrada;

  const [
    ocupacaoRes,
    aulasRes,
    avaliacoesRes,
    atividadesRes,
    vigenciasRes,
    feriadosRes,
    cursoRes,
    discRes,
    ueExecRes,
    listasRes,
    atribRes,
    instrRes,
    acumuladaRes,
    paraVistaRes,
    curriculoRes,
    aulasPorUeRes,
  ] = await Promise.all([
    /* ⚠️ `turma_id is null` entra: é a atividade GLOBAL, que vale para toda turma (`V-7`). */
    supabase
      .from("vw_ocupacao_ta")
      .select(COLUNAS_DA_OCUPACAO)
      .or(`turma_id.eq.${turmaId},turma_id.is.null`)
      .gte("data", de)
      .lte("data", ate),
    supabase
      .from("registros_aula")
      .select(
        "id, data, ta_inicial, tempos_consumidos, conteudo_resumo, metodologia, status, unidade_ensino_id, disciplina_id",
      )
      .eq("turma_id", turmaId)
      .eq("status", "ativo")
      .gte("data", de)
      .lte("data", ate),
    supabase
      .from("avaliacoes")
      .select(
        "id, data_avaliacao, data_vista_prova, ta_inicial, ta_inicial_vista, tipo_avaliacao, conteudo_resumo, metodologia, nome_fiscal_externo, status",
      )
      .eq("turma_id", turmaId)
      .neq("status", "cancelada")
      .or(
        `and(data_avaliacao.gte.${de},data_avaliacao.lte.${ate}),and(data_vista_prova.gte.${de},data_vista_prova.lte.${ate})`,
      ),
    supabase
      .from("atividades_nao_letivas")
      .select(
        "id, data, ta_inicial, categoria_normativa, subtipo, descricao, responsavel_externo, status, turma_id, disciplina_id",
      )
      .or(`turma_id.eq.${turmaId},turma_id.is.null`)
      .eq("status", "ativo")
      .gte("data", de)
      .lte("data", ate),
    /*
     * ⚠️ TODAS as vigências do curso, e quem escolhe é `vigenteEm` na DATA DA SEMANA
     * (`RN-2027-09`) — ver a nota de `consulta.ts` sobre por que não é a função do banco.
     */
    supabase
      .from("curso_regime_historico")
      .select(COLUNAS_DA_VIGENCIA)
      .eq("curso_id", cursoId)
      .eq("status", "ativo"),
    /*
     * ⚠️ **SÓ O FERIADO ATIVO** (regra 4: exclusão é lógica). Medido em 06/10/2026: um dia
     * inativado no calendário continuava bloqueando a grade e o papel, porque esta leitura não
     * olhava o `status` — e nada na tela dizia por quê.
     */
    supabase
      .from("feriados")
      .select(COLUNAS_DO_FERIADO)
      .eq("status", "ativo")
      .gte("data", de)
      .lte("data", ate),
    supabase.from("cursos").select("codigo, curriculo_modelo").eq("id", cursoId).maybeSingle(),
    supabase
      .from("disciplinas")
      .select("id, cod_disciplina, nome_disciplina, sem_unidades_ensino, status")
      .eq("curso_id", cursoId)
      /* A ordem do campo «Disciplina» do lançamento é a da página do curso. */
      .order("cod_disciplina", { ascending: true }),
    supabase
      .from("vw_unidades_ensino_execucao")
      .select(
        "unidade_ensino_id, disciplina_id, numero_ue, topico, ch_prevista_tempos, ta_executados, ta_saldo, turma_id",
      )
      .eq("turma_id", turmaId),
    supabase
      .from("config_listas")
      .select("lista, valor, ordem, ativo, metadados")
      .in("lista", ["metodologias", "tipos_avaliacao", "tipos_atividade", "escala_antiguidade"])
      .eq("ativo", true)
      .order("ordem"),
    supabase
      .from("turma_disciplina_unidade")
      .select("unidade_ensino_id, instrutor_id, turma_id")
      .eq("turma_id", turmaId),
    /*
     * ⚠️ **A LEITURA VEM DE `vw_instrutores` E PEDE `ordem_antiguidade` AO BANCO** (`SC-002.1`,
     * `RN-ANT-01`, *Risco: Alto*). A guarda é **ampla de propósito** (gotcha 12): ela cobra a ordem
     * de **toda** leitura de lista de instrutor, mesmo quando a tela só monta um mapa de nomes.
     */
    supabase
      .from("vw_instrutores")
      .select("id, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra, ordem_antiguidade")
      .order("ordem_antiguidade"),
    /*
     * ⚠️ **A OCUPAÇÃO ACUMULADA — `data <= ate`, SEM piso** (`RN-CRONOS-03`, `RF-DSA-05`). Ela entra
     * na MESMA rodada de `Promise.all`: é independente das outras doze, e em sequência seria uma
     * ida a mais ao banco por abertura de tela.
     * ⚠️ **E ela NÃO filtra por `hoje`** — é a decisão da `Q-2`: o único corte é o da semana
     * selecionada, e o lançamento futuro **conta**, marcado.
     */
    supabase
      .from("vw_ocupacao_ta")
      .select("fato_id, data, disciplina_id, tempos_consumidos")
      .eq("turma_id", turmaId)
      .lte("data", ate),
    /* As avaliações da turma inteira, para o tipo «Vista de prova» do formulário (item 1). */
    supabase
      .from("avaliacoes")
      .select(
        "id, disciplina_id, tipo_avaliacao, data_avaliacao, conteudo_resumo, data_vista_prova",
      )
      .eq("turma_id", turmaId)
      .neq("status", "cancelada")
      .order("data_avaliacao"),
    /*
     * ⚠️ **AS UNIDADES PARTEM DO CURRÍCULO DO CURSO** — a view de execução, filtrada pela turma,
     * descartava a UE que a turma ainda não deu (ver `unidadesDaTurma`).
     */
    supabase
      .from("unidades_ensino")
      .select("id, disciplina_id, numero_ue, topico, ch_prevista_tempos")
      .eq("curso_id", cursoId)
      .eq("status", "ativo")
      .order("numero_ue", { ascending: true }),
    /* As aulas da turma com UE, até o fim da semana aberta — o corte da cascata do painel (item 3). */
    supabase
      .from("registros_aula")
      .select("unidade_ensino_id, tempos_consumidos")
      .eq("turma_id", turmaId)
      .eq("status", "ativo")
      .not("unidade_ensino_id", "is", null)
      .lte("data", ate),
  ]);

  const vigencias = ((vigenciasRes.data ?? []) as unknown as LinhaDeVigencia[]).map(
    vigenciaDoBanco,
  );
  const primeiroDia = todosOsSeis[0] ?? entrada.hoje;
  const excecao = vigenciaDaSemana(vigencias, "excecao", primeiroDia);
  const padrao = vigenciaDaSemana(vigencias, "padrao", primeiroDia);
  /* A exceção vence a padrão quando as duas cobrem a data — é o desenho de `tipo_regime`. */
  const vigente = excecao ?? padrao;
  const maisRecente = [...vigencias]
    .filter((v) => v.tipo === "padrao")
    .sort((a, b) => b.vigenteDe.localeCompare(a.vigenteDe))[0];

  let catalogo: readonly LinhaDoCatalogo[] = [];
  if (vigente?.configuracaoHorarioId) {
    const { data } = await supabase
      .from("horarios_tempos_aula")
      .select(COLUNAS_DO_CATALOGO)
      .eq("configuracao_id", vigente.configuracaoHorarioId)
      .order("tempo_numero");
    catalogo = (data ?? []) as unknown as LinhaDoCatalogo[];
  }

  const relogio = relogioDaSemana({
    regime: vigente ? regimeParaRelogio(vigente) : null,
    catalogo: catalogo.map(tempoDoCatalogo),
  });

  const disciplinasDoCurso = (discRes.data ?? []) as {
    id: string;
    cod_disciplina: string;
    nome_disciplina: string;
    sem_unidades_ensino: boolean | null;
    status: string;
  }[];
  const disciplinas = new Map(disciplinasDoCurso.map((d) => [d.id, d.cod_disciplina]));

  const linhasDeInstrutor = (instrRes.data ?? []) as {
    id: string;
    posto_graduacao: string;
    esp_hab_obs: string | null;
    nome_completo: string;
    nome_guerra: string | null;
    status?: string;
  }[];
  const instrutoresPorId = new Map(
    linhasDeInstrutor.map((i) => [
      i.id,
      /*
       * ⚠️ No DSA é o NOME DE GUERRA (`nomeParaDsa`, exceção nominal ao `RF-INSTR-15` decidida em
       * 06/10/2026) — pela função ÚNICA, nunca montado à mão aqui.
       */
      nomeParaDsa({
        id: i.id,
        pg: i.posto_graduacao,
        especialidade: i.esp_hab_obs,
        nomeCompleto: i.nome_completo,
        nomeDeGuerra: i.nome_guerra,
      }),
    ]),
  );

  /*
   * ⚠️ **O CATÁLOGO DE TÉCNICAS É LIDO ANTES DOS FATOS** porque a vista de prova precisa dele: a
   * técnica dela é a do catálogo cuja sigla é `EO`, e não a da aplicação, com quem divide a linha.
   */
  const listas = (listasRes.data ?? []) as {
    lista: string;
    valor: string;
    ordem: number;
    metadados: Record<string, unknown> | null;
  }[];
  const daLista = (nome: string) => listas.filter((l) => l.lista === nome);
  const metodologias = daLista("metodologias");
  const tecnicasComSigla: readonly TecnicaDoCatalogo[] = metodologias.map((l) => ({
    nome: l.valor,
    sigla: (l.metadados?.["sigla"] as string | undefined) ?? null,
  }));
  const tecnicaDaVista = tecnicaDaVistaDeProva(tecnicasComSigla);

  /* O tópico e a técnica de cada fato, pelas três tabelas. */
  const conteudos = new Map<string, ConteudoDoFato>();
  for (const a of (aulasRes.data ?? []) as {
    id: string;
    conteudo_resumo: string | null;
    metodologia: string | null;
    unidade_ensino_id: string | null;
    disciplina_id: string | null;
  }[]) {
    conteudos.set(a.id, {
      conteudo: a.conteudo_resumo,
      tecnica: a.metodologia,
      unidadeEnsinoId: a.unidade_ensino_id,
      disciplinaColuna: a.disciplina_id,
    });
  }
  for (const a of (avaliacoesRes.data ?? []) as {
    id: string;
    data_avaliacao: string | null;
    tipo_avaliacao: string | null;
    conteudo_resumo: string | null;
    metodologia: string | null;
    nome_fiscal_externo: string | null;
  }[]) {
    conteudos.set(a.id, {
      /* O fiscal de fora do cadastro: a view da ocupação só traz o `fiscal_id`. */
      fiscalExterno: a.nome_fiscal_externo,
      /* ⚠️ O título gravado quando há; senão o tipo — a regra é de `conteudoDaAvaliacao`. */
      conteudo: conteudoDaAvaliacao(a.conteudo_resumo, a.tipo_avaliacao),
      /* ⚠️ O cru, para o editor: reabrir com o tipo e gravar de novo era o achado do lote. */
      conteudoGravado: a.conteudo_resumo,
      tecnica: a.metodologia,
      /* A vista de prova divide esta linha: leva a data da aplicação como referência, e a EO. */
      aplicadaEm: a.data_avaliacao === null ? null : dataParaLeitura(a.data_avaliacao),
      tecnicaDaVista,
    });
  }
  const atividades = (atividadesRes.data ?? []) as {
    id: string;
    data: string;
    ta_inicial: number | null;
    categoria_normativa: string | null;
    subtipo: string | null;
    descricao: string | null;
    responsavel_externo: string | null;
    disciplina_id: string | null;
  }[];
  for (const n of atividades) {
    /*
     * ⚠️ O SUBTIPO vai no campo da técnica porque é o rótulo que a GRADE mostra na célula. O papel
     * não o imprime na coluna T/E — ver `diaImpresso`, que trata a origem não letiva à parte.
     */
    conteudos.set(n.id, {
      conteudo: n.descricao,
      tecnica: n.subtipo,
      externo: n.responsavel_externo,
      /* A disciplina OPCIONAL da AEC (item 1b): só para exibir — ela não entra na CH da disciplina. */
      disciplinaId: n.disciplina_id,
    });
  }

  const idsDeEstudoIndividual = new Set(
    atividades.filter((n) => n.categoria_normativa === "Estudo_Individual").map((n) => n.id),
  );

  const nomes = { disciplinas, instrutores: instrutoresPorId, conteudos };
  const ocupacao = (ocupacaoRes.data ?? []) as unknown as LinhaDaOcupacao[];
  const posicionados: FatoDaSemana[] = ocupacao.map((l) => fatoDaOcupacao(l, nomes));

  /*
   * ⚠️ **A FAIXA "SEM POSIÇÃO" SAI DAS TRÊS TABELAS, não da view** — a view filtra
   * `ta_inicial is not null`, de propósito (ela é a grade de ocupação). As 1.566 linhas do ETL
   * estão todas sem TA (medido), e é por aqui que elas aparecem em vez de desaparecer.
   */
  const semPosicao: FatoDaSemana[] = [];
  for (const a of (aulasRes.data ?? []) as {
    id: string;
    data: string;
    ta_inicial: number | null;
  }[]) {
    if (a.ta_inicial === null) {
      semPosicao.push(fatoSemTa(a.id, "aula", a.data, conteudos));
    }
  }
  for (const n of atividades) {
    if (n.ta_inicial === null) {
      semPosicao.push(fatoSemTa(n.id, "atividade_nao_letiva", n.data, conteudos));
    }
  }

  /*
   * ⚠️ **O CONFLITO ENTRE TURMAS VEM DO BANCO, pela função com porteiro** (`Q-17`, `T093`). Ela é
   * `SECURITY DEFINER` porque a RLS **esconderia** a turma alheia — e é justamente a existência da
   * sobreposição que precisa ser vista. O que ela **não** devolve é de quem é a aula.
   *
   * ⚠️ **ERRO AQUI DEGRADA PARA «sem marcas», NUNCA PARA EXCEÇÃO** (`RN-DEG-01`): a grade continua
   * desenhada, sem a sinalização. ⚠️ **E isso é um risco DECLARADO, não esquecido:** um conflito
   * deixaria de aparecer em silêncio. Ele é aceitável porque o conflito é **sinalização e nunca
   * bloqueio** (`RN-CONF-01`) — nada depende dele para gravar —, e porque o porteiro da função
   * recusa pelas mesmas duas condições que a página já conferiu antes de chegar aqui.
   */
  const conflitosRes = await supabase.rpc("conflitos_da_semana", {
    p_turma_id: turmaId,
    p_de: de,
    p_ate: ate,
  });
  const alheios: OcupacaoDeTa[] = (
    (conflitosRes.data ?? []) as {
      data: string;
      ta_inicial: number;
      ta_final: number;
      instrutor_id: string | null;
      fiscal_id: string | null;
      local: string | null;
    }[]
  ).map((o) => ({
    data: o.data,
    taInicial: o.ta_inicial,
    taFinal: o.ta_final,
    instrutorId: o.instrutor_id,
    fiscalId: o.fiscal_id,
    local: o.local,
  }));

  /*
   * ⚠️ **A OCUPAÇÃO PRÓPRIA SAI DA VIEW, com o `ta_final` que ELA calcula** — `ta_final` é
   * `GENERATED ALWAYS` no banco (medido: escrevê-lo dá `428C9`). Recalcular `ta_inicial + tempos - 1`
   * aqui seria a segunda fonte de verdade do fim do bloco, e as duas discordariam na primeira linha
   * histórica com `tempos` nulo.
   */
  const meus: OcupacaoPropria[] = ocupacao
    .filter((l) => l.ta_inicial !== null)
    .map((l) => ({
      fatoId: l.fato_id,
      data: l.data,
      taInicial: l.ta_inicial as number,
      taFinal: (l as unknown as { ta_final: number | null }).ta_final ?? (l.ta_inicial as number),
      instrutorId: l.instrutor_id,
      fiscalId: l.fiscal_id,
      local: l.local,
    }));

  const marcasDeConflito = detectarConflitos(meus, alheios);

  const fatos = [...posicionados, ...semPosicao];
  const datasComLancamento = fatos.map((f) => f.data);
  const janela = diasDaTela({
    ano: entrada.ano,
    numero: entrada.numero,
    sabadoPedido: entrada.sabadoPedido,
    datasComLancamento,
  });

  const semana = montarSemana({
    dias: janela.dias,
    relogio,
    /*
     * ⚠️ **SEM VIGÊNCIA NA SEMANA, OS TA AINDA SÃO NUMERADOS — pelo regime mais recente do CURSO.**
     * O número de TA por dia é propriedade do CURSO, não da semana: usá-lo para **numerar** é
     * honesto, e o aviso da tela diz que o RELÓGIO não se aplica àquela semana. Inventar horário
     * seria o que não se pode.
     */
    temposDeclarados: vigente?.regimeTempos ?? maisRecente?.regimeTempos ?? null,
    fatos,
    feriados: ((feriadosRes.data ?? []) as unknown as LinhaDeFeriado[]).map(feriadoDoBanco),
    /* ⚠️ Ele chega PRONTO, de `detectarConflitos` — a grade não calcula nada (`RN-CONF-01`). */
    marcas: marcasDeConflito,
    hoje: entrada.hoje,
    sabadoAberto: janela.sabadoAberto,
  });

  const atribuicaoPorUe = new Map(
    ((atribRes.data ?? []) as { unidade_ensino_id: string; instrutor_id: string | null }[]).map(
      (a) => [a.unidade_ensino_id, a.instrutor_id],
    ),
  );

  const unidades = unidadesDaTurma({
    curriculo: (
      (curriculoRes.data ?? []) as {
        id: string;
        disciplina_id: string;
        numero_ue: number;
        topico: string;
        ch_prevista_tempos: number;
      }[]
    ).map((u) => ({
      id: u.id,
      disciplinaId: u.disciplina_id,
      numero: u.numero_ue,
      topico: u.topico,
      prevista: u.ch_prevista_tempos,
    })),
    execucao: (
      (ueExecRes.data ?? []) as {
        unidade_ensino_id: string;
        ch_prevista_tempos: number;
        ta_executados: number | null;
        ta_saldo: number | null;
      }[]
    ).map((e) => ({
      unidadeId: e.unidade_ensino_id,
      lancada: e.ta_executados ?? 0,
      saldo: e.ta_saldo ?? e.ch_prevista_tempos,
    })),
    aulasAteASemana: (
      (aulasPorUeRes.data ?? []) as {
        unidade_ensino_id: string | null;
        tempos_consumidos: number | null;
      }[]
    ).map((a) => ({ unidadeId: a.unidade_ensino_id, tempos: a.tempos_consumidos })),
  }).map((u) => ({
    ...u,
    disciplinaCodigo: disciplinas.get(u.disciplinaId) ?? "—",
    tecnicaSugerida: null,
    atribuidoId: atribuicaoPorUe.get(u.id) ?? null,
  }));

  const cursoPorCompetencias =
    (cursoRes.data as { curriculo_modelo?: string } | null)?.curriculo_modelo === "competencias";

  return {
    semana,
    relogio,
    dias: janela.dias,
    sabadoAberto: janela.sabadoAberto,
    datasComLancamento,
    cursoCodigo: (cursoRes.data as { codigo?: string } | null)?.codigo ?? null,
    cursoPorCompetencias,
    unidades,
    /*
     * ⚠️ **TODAS AS DISCIPLINAS ATIVAS, e não só as isentas de UE** — a `D-DSA-1` (08/10/2026) abriu a
     * aula sem UE para qualquer disciplina, e o formulário pede a disciplina antes da unidade.
     */
    /* ⚠️ Ordem alfabética NATURAL do código (2 antes de 10) — ajuste 5 do PR #40, o mesmo comparador da situação. */
    disciplinas: emOrdemNaturalDoCodigo(
      disciplinasDoCurso
        .filter((d) => d.status === "ativo")
        .map((d) => ({ id: d.id, codigo: d.cod_disciplina, nome: d.nome_disciplina })),
      (d) => d.codigo,
    ),
    avaliacoesParaVista: (
      (paraVistaRes.data ?? []) as {
        id: string;
        disciplina_id: string;
        tipo_avaliacao: string | null;
        data_avaliacao: string | null;
        conteudo_resumo: string | null;
        data_vista_prova: string | null;
      }[]
    ).map((a) => ({
      id: a.id,
      disciplinaId: a.disciplina_id,
      tipo: a.tipo_avaliacao ?? "Avaliação",
      aplicadaEm: a.data_avaliacao,
      titulo: a.conteudo_resumo,
      vistaEm: a.data_vista_prova,
    })),
    /* ⚠️ Instrutor INATIVO não chega ao seletor (`RN-INST-02`). */
    instrutores: linhasDeInstrutor
      .filter((i) => i.status === undefined || i.status === "ativo")
      .map((i) => ({
        id: i.id,
        pg: i.posto_graduacao,
        especialidade: i.esp_hab_obs,
        nomeCompleto: i.nome_completo,
        nomeDeGuerra: i.nome_guerra,
      })),
    /* ⚠️ A escala de antiguidade é DADO (`RN-ANT-02`): o peso de cada P/G vive em `config_listas`. */
    escala: escalaDeLinhas(
      daLista("escala_antiguidade").map((l) => ({ valor: l.valor, ordem: l.ordem, ativo: true })),
    ),
    tecnicas: metodologias.map((l) => l.valor),
    tecnicasComSigla,
    tiposDeAvaliacao: daLista("tipos_avaliacao").map((l) => l.valor),
    subtipos: daLista("tipos_atividade").map((l) => ({
      valor: l.valor,
      categoria: (l.metadados?.["categoria"] as string | undefined) ?? null,
    })),
    idsDeEstudoIndividual,
    marcasDeConflito,
    ocupacaoAcumulada: (
      (acumuladaRes.data ?? []) as {
        fato_id: string;
        data: string;
        disciplina_id: string | null;
        tempos_consumidos: number | null;
      }[]
    ).map((o) => ({
      fatoId: o.fato_id,
      data: o.data,
      disciplinaId: o.disciplina_id,
      /* ⚠️ `tempos` é nulo em linha histórica — `?? 0` é o padrão da pasta para o que não foi medido. */
      ta: o.tempos_consumidos ?? 0,
    })),
  };
}

function fatoSemTa(
  id: string,
  origem: FatoDaSemana["origem"],
  data: string,
  conteudos: ReadonlyMap<string, ConteudoDoFato>,
): FatoDaSemana {
  return {
    fatoId: id,
    origem,
    data,
    taInicial: null,
    tempos: null,
    herdado: false,
    disciplina: null,
    conteudo: conteudos.get(id)?.conteudo ?? null,
    tecnica: conteudos.get(id)?.tecnica ?? null,
    instrutor: null,
    local: null,
  };
}

export type ExtrasDaImpressao = {
  /**
   * A CH prevista e a cumprida por disciplina — o rodapé corta pelas da semana (`SC-014`), e o
   * painel de situação usa as mesmas linhas (`RF-DSA-05`).
   */
  readonly execucao: readonly (ExecucaoDaDisciplina & {
    readonly disciplinaId: string;
    /** `previsao_inicio_efetiva` — insumo da situação `atrasada` (item 8, 08/10/2026). */
    readonly previsaoInicio: string | null;
    /** `previsao_termino_efetiva` — idem. */
    readonly previsaoTermino: string | null;
  })[];
  /** As linhas de `responsaveis_curso`, já filtradas por `status = 'ativo'`. */
  readonly responsaveis: readonly ResponsavelDoCurso[];
  /**
   * Todas as datas com lançamento da turma — insumo do **Nº do DSA**.
   *
   * ⚠️ **ELAS NÃO SÃO AS DA SEMANA.** O número é a ordem da semana entre as que **têm aula** desde
   * o início da turma (convenção da aba CRONOS, `P-6`): contar só a semana aberta daria sempre 1.
   */
  readonly datasComLancamentoDaTurma: readonly string[];
};

/**
 * As quatro leituras que **só** o papel precisa (`T082`, `T083`).
 *
 * ⚠️ **ELA RODA EM PARALELO COM `lerSemanaDoDsa`, não depois** — as duas são independentes, e a
 * rota as põe no mesmo `Promise.all`. Em sequência seriam duas idas ao banco por impressão.
 */
export async function lerExtrasDaImpressao(
  supabase: ClienteDeServidor,
  entrada: { readonly turmaId: string; readonly cursoId: string },
): Promise<ExtrasDaImpressao> {
  const [execRes, respRes, aulasRes, avalRes] = await Promise.all([
    supabase
      .from("vw_disciplinas_execucao")
      /*
       * ⚠️ `disciplina_id` entra para o quadro de situação casar a ocupação com a previsão.
       * ⚠️ As duas `previsao_*_efetiva` entraram em 08/10/2026 (item 8): são a previsão da turma, ou a
       *    padrão da grade, já resolvidas pela view — resolvê-las aqui seria a segunda tradução.
       */
      .select(
        "disciplina_id, cod_disciplina, nome_disciplina, carga_horaria_tempos, ta_executados, turma_id, previsao_inicio_efetiva, previsao_termino_efetiva",
      )
      .eq("turma_id", entrada.turmaId),
    /*
     * ⚠️ **A LINHA GERAL (`curso_id` nulo) ENTRA, e é ela que existe de verdade** — medido no
     * remoto em 05/10/2026: as **duas** linhas de `responsaveis_curso` são GERAL. Filtrar só pelo
     * curso deixaria o rodapé **sem assinatura nenhuma**, com cara de "não há responsável".
     */
    supabase
      .from("responsaveis_curso")
      .select(
        /*
         * ⚠️ `especialidade` entrou em 08/10/2026 (item 7): é o quadro que a assinatura imprime
         * entre parênteses, e até aqui ele não chegava ao rodapé.
         */
        "papel_assinatura, preenchimento, curso_id, vigente_de, vigente_ate, exibir_no_dsa, ordem, nome_completo, posto_graduacao, especialidade, funcao_descricao",
      )
      .or(`curso_id.eq.${entrada.cursoId},curso_id.is.null`)
      .eq("status", "ativo"),
    supabase
      .from("registros_aula")
      .select("data")
      .eq("turma_id", entrada.turmaId)
      .eq("status", "ativo")
      .not("ta_inicial", "is", null),
    supabase
      .from("avaliacoes")
      .select("data_avaliacao")
      .eq("turma_id", entrada.turmaId)
      .neq("status", "cancelada")
      .not("ta_inicial", "is", null),
  ]);

  const execucao = (
    (execRes.data ?? []) as {
      disciplina_id: string | null;
      cod_disciplina: string | null;
      nome_disciplina: string | null;
      carga_horaria_tempos: number | null;
      ta_executados: number | null;
      previsao_inicio_efetiva: string | null;
      previsao_termino_efetiva: string | null;
    }[]
  ).map((d) => ({
    disciplinaId: d.disciplina_id ?? "",
    codigo: d.cod_disciplina ?? "",
    nome: d.nome_disciplina ?? "",
    prevista: d.carga_horaria_tempos ?? 0,
    /* ⚠️ **SEM corte por data** (`Q-2`) — é o `ta_executados` da view, como ele é. */
    cumprida: d.ta_executados ?? 0,
    previsaoInicio: d.previsao_inicio_efetiva,
    previsaoTermino: d.previsao_termino_efetiva,
  }));

  const responsaveis = (
    (respRes.data ?? []) as {
      papel_assinatura: string;
      preenchimento: string;
      curso_id: string | null;
      vigente_de: string;
      vigente_ate: string | null;
      exibir_no_dsa: boolean | null;
      ordem: number | null;
      nome_completo: string | null;
      posto_graduacao: string | null;
      especialidade: string | null;
      funcao_descricao: string | null;
    }[]
  ).map((r) => ({
    /*
     * ⚠️ **A COLUNA É `papel_assinatura`, E A PRIMEIRA ESCRITA DISTO PEDIU `papel`.** O tipo do
     * domínio chama o campo `papel` — o banco chama a coluna `papel_assinatura`, medido em
     * `lib/tipos/database.ts`. Um `select` com o nome errado devolve **erro do PostgREST**, e o
     * `?? []` seguinte o transformaria em *"nenhum responsável"*: o rodapé sairia **em branco** com
     * cara de "não há responsável cadastrado nesta data", que é afirmação diferente e plausível.
     */
    papel: r.papel_assinatura as ResponsavelDoCurso["papel"],
    preenchimento: (r.preenchimento === "dinamico_usuario_logado"
      ? "dinamico_usuario_logado"
      : "fixo") as ResponsavelDoCurso["preenchimento"],
    cursoId: r.curso_id,
    vigenteDe: r.vigente_de,
    vigenteAte: r.vigente_ate,
    exibirNoDsa: r.exibir_no_dsa !== false,
    ordem: r.ordem ?? 1,
    nomeCompleto: r.nome_completo,
    postoGraduacao: r.posto_graduacao,
    especialidade: r.especialidade,
    funcaoDescricao: r.funcao_descricao ?? "",
  }));

  const datas = [
    ...((aulasRes.data ?? []) as { data: string }[]).map((a) => a.data),
    ...((avalRes.data ?? []) as { data_avaliacao: string }[]).map((a) => a.data_avaliacao),
  ];

  return { execucao, responsaveis, datasComLancamentoDaTurma: datas };
}
