/**
 * A semana do Detalhe Semanal de Aula (`RF-DSA-01`, `RF-DSA-02`, `RF-HOR-04`, `RF-HOR-06`,
 * `RN-2027-09`, `RN-EVT-02`, `RN-DEG-01`, `RF-NAV-04` · spec 013, PR 1).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só a navegação da semana é folha (`NavegacaoDaSemana`), e a
 * grade é servidor — uma semana do `C-Ap-HN` tem 9 TA × 6 dias com blocos dentro, e levar isso ao
 * bundle seria o gotcha 1 com o maior conteúdo da aplicação.
 *
 * ⚠️ **UMA RODADA DE `Promise.all`, E NENHUM `await` DENTRO DE LAÇO.** As oito leituras saem juntas.
 * A única exceção é o catálogo de horários, que **depende** de qual vigência venceu — ele é um
 * `await` a mais, **fora de laço**, e só acontece quando a vigência aponta para uma configuração.
 * Medido em 05/10/2026: **nenhuma** das vigências reais aponta, então hoje esse caminho não roda.
 *
 * ⚠️ **AS TRÊS TABELAS SÃO LIDAS INTEIRAS DA SEMANA, não só o que está «sem posição»**, e isso
 * economiza três leituras: a `vw_ocupacao_ta` entrega *onde* cada fato está, mas não o tópico nem a
 * técnica — e são as mesmas linhas que alimentam a faixa. Duas leituras por tabela diriam a mesma
 * coisa duas vezes.
 *
 * ⚠️ **A ATIVIDADE DE ESCOPO GLOBAL ENTRA PELO FILTRO `turma_id is null`** (`V-7`, e é o que o PR B
 * abriu na view): ela vale para **toda** turma ativa, então a semana de cada uma a mostra. Filtrar
 * só pela turma a esconderia, que é o defeito que a `RF-EXTRA-03` cobrava.
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { montarSemana, type FatoDaSemana } from "@/lib/dominio/dsa/grade";
import { relogioDaSemana } from "@/lib/dominio/dsa/horario-do-bloco";
import { nomeEmTexto } from "@/lib/dominio/nome-instrutor";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { lancar, lancarEstudoIndividualDaSemana } from "@/lib/acoes/dsa";
import { escalaDeLinhas } from "@/lib/dominio/antiguidade";

import { alcanceDoPerfil } from "../../../cursos/consulta";
import { codigoDaFicha, mensagemDeTurmaNaoEncontrada } from "../consulta";
import { NavegacaoDaSemana } from "./NavegacaoDaSemana";
import { PainelDeLancamento } from "./PainelDeLancamento";
import {
  COLUNAS_DA_OCUPACAO,
  COLUNAS_DA_TURMA_DO_DSA,
  COLUNAS_DA_VIGENCIA,
  COLUNAS_DO_CATALOGO,
  COLUNAS_DO_FERIADO,
  diasDaTela,
  ehEadPuro,
  fatoDaOcupacao,
  feriadoDoBanco,
  regimeParaRelogio,
  rotuloDaSemana,
  ROTA_DO_DSA,
  semanaEscolhida,
  tempoDoCatalogo,
  vigenciaDaSemana,
  vigenciaDoBanco,
  type LinhaDaOcupacao,
  type LinhaDeFeriado,
  type LinhaDeVigencia,
  type LinhaDoCatalogo,
} from "./consulta";

export default async function SemanaDoDsa({
  params,
  searchParams,
}: {
  params: Promise<{ turma: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { turma: segmento } = await params;
  const codigo = codigoDaFicha(segmento);
  /*
   * ⚠️ **OS `descartes` SÃO LIDOS, E A PRIMEIRA VERSÃO OS IGNORAVA — com defeito silencioso.** Eu
   * esperava que `?semana=99` chegasse como 99 e fosse recusada por `semanaEscolhida`; medido,
   * **`lerParametros` já a degrada** para o padrão, porque o contrato declara `maximo: 53`. Sem ler
   * os descartes, a tela abria a semana corrente **sem dizer nada** — exatamente o que a
   * `RN-DEG-01` proíbe: *"dependência ausente devolve vazio/neutro COM AVISO"*.
   */
  const { valores, descartes } = lerParametros(ROTA_DO_DSA, await searchParams);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  if (!pode(permissoes, "registros_aula", "ler")) notFound();

  const supabase = await criarClienteDeServidor();
  const { data: turma } = await supabase
    .from("turmas")
    .select(COLUNAS_DA_TURMA_DO_DSA)
    .eq("codigo", codigo)
    .maybeSingle();

  if (!turma) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-lg font-semibold text-texto">Detalhe Semanal de Aula</h1>
        <p role="status" className="text-texto" data-slot="turma-nao-encontrada">
          {mensagemDeTurmaNaoEncontrada(
            codigo,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  const hoje = hojeNaCiaara();
  const escolha = semanaEscolhida({
    semana: Number(valores.semana ?? 0),
    ano: Number(valores.ano ?? 0),
    hoje,
  });
  /* O que o contrato descartou, dito em português — é o aviso da `RN-DEG-01`. */
  const descartado = descartes.find((d) => d.parametro === "semana" || d.parametro === "ano");
  const aviso =
    escolha.aviso ??
    (descartado
      ? `O valor "${descartado.recebido}" não serve para ${descartado.parametro}: ` +
        `a semana vai de 1 a 53 e o ano de 2020 a 2099.`
      : null);

  /*
   * ⚠️ **O DSA NÃO SE APLICA A EAD PURO** (`Q-13`, decisão de Bernardo Villas Boas de 05/10/2026).
   * Semipresencial **tem** DSA — ele cobre a semana presencial. A tela diz isso e para aqui, em vez
   * de desenhar uma grade de nove tempos para uma turma que não tem TA presencial nenhum.
   */
  if (ehEadPuro(turma.modalidade as string | null)) {
    return (
      <section className="flex flex-col gap-3">
        <CabecalhoDoDsa codigo={codigo} rotulo={null} ano={escolha.ano} />
        <p role="status" className="max-w-prose text-texto" data-slot="dsa-nao-se-aplica">
          Esta turma é de <strong>EAD puro</strong>, e o Detalhe Semanal de Aula não se aplica a
          ela: não há Tempo de Aula presencial a detalhar. Turma semipresencial tem DSA — ele cobre
          a semana presencial.
        </p>
      </section>
    );
  }

  /*
   * A janela de datas da CONSULTA: **sempre os seis dias**, com o sábado incluído.
   * ⚠️ A consulta não pode depender de `?sabado=`: é justamente lendo o sábado que se descobre se
   * há lançamento nele — e, se houver, a coluna aparece mesmo sem o parâmetro (`Q-4`).
   */
  const todosOsSeis = diasDaTela({
    ano: escolha.ano,
    numero: escolha.numero,
    sabadoPedido: true,
    datasComLancamento: [],
  }).dias;
  const de = todosOsSeis[0] ?? hoje;
  const ate = todosOsSeis[todosOsSeis.length - 1] ?? hoje;
  const turmaId = turma.id as string;
  const cursoId = turma.curso_id as string;

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
      .select("id, data, ta_inicial, tempos_consumidos, conteudo_resumo, metodologia, status")
      .eq("turma_id", turmaId)
      .eq("status", "ativo")
      .gte("data", de)
      .lte("data", ate),
    supabase
      .from("avaliacoes")
      .select(
        "id, data_avaliacao, data_vista_prova, ta_inicial, ta_inicial_vista, tipo_avaliacao, conteudo_resumo, metodologia, status",
      )
      .eq("turma_id", turmaId)
      .neq("status", "cancelada")
      .or(
        `and(data_avaliacao.gte.${de},data_avaliacao.lte.${ate}),and(data_vista_prova.gte.${de},data_vista_prova.lte.${ate})`,
      ),
    supabase
      .from("atividades_nao_letivas")
      .select("id, data, ta_inicial, categoria_normativa, subtipo, descricao, status, turma_id")
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
    supabase.from("feriados").select(COLUNAS_DO_FERIADO).gte("data", de).lte("data", ate),
    supabase.from("cursos").select("codigo, curriculo_modelo").eq("id", cursoId).maybeSingle(),
    supabase
      .from("disciplinas")
      .select("id, cod_disciplina, nome_disciplina, sem_unidades_ensino, status")
      .eq("curso_id", cursoId),
    /*
     * O catálogo de **itens lançáveis** (`P-3` da planilha): as UEs com a CH prevista, a lançada e
     * a restante. ⚠️ Os três números vêm de `vw_unidades_ensino_execucao`, que já os calcula — somar
     * aqui seria a segunda fonte de verdade da CH executada.
     */
    supabase
      .from("vw_unidades_ensino_execucao")
      .select(
        "unidade_ensino_id, disciplina_id, numero_ue, topico, ch_prevista_tempos, ta_executados, ta_saldo, turma_id",
      )
      .eq("turma_id", turmaId),
    /* As listas administráveis: técnica, tipo de avaliação, subtipo e a escala de antiguidade. */
    supabase
      .from("config_listas")
      .select("lista, valor, ordem, ativo, metadados")
      .in("lista", ["metodologias", "tipos_avaliacao", "tipos_atividade", "escala_antiguidade"])
      .eq("ativo", true)
      .order("ordem"),
    /* Quem está atribuído a esta turma, para o pré-preenchimento do instrutor. */
    supabase
      .from("turma_disciplina_unidade")
      .select("unidade_ensino_id, instrutor_id, turma_id")
      .eq("turma_id", turmaId),
    /*
     * ⚠️ Os 177 instrutores numa leitura só. Filtrar pelos ids em jogo exigiria **uma segunda
     * rodada** (os ids só se conhecem depois de ler a view), e a base é pequena por decisão
     * registrada no `CLAUDE.md` — clareza antes de desempenho.
     *
     * ⚠️ **A LEITURA VEM DE `vw_instrutores` E PEDE `ordem_antiguidade` AO BANCO** (`SC-002.1`,
     * `RN-ANT-01`, *Risco: Alto*). Eu havia lido `instrutores` sem ordem, e
     * `ordenacao-de-instrutor.test.ts` reprovou — a guarda é **ampla de propósito** (gotcha 12):
     * ela cobra a ordem de **toda** leitura de lista de instrutor, mesmo quando a tela só monta
     * um mapa de nomes, porque "esquecer numa tela nova" é exatamente o que ela existe para
     * impedir. Aqui a ordem não muda o mapa; o que ela impede é a próxima tela esquecer.
     */
    supabase
      .from("vw_instrutores")
      .select("id, posto_graduacao, esp_hab_obs, nome_completo, nome_guerra, ordem_antiguidade")
      .order("ordem_antiguidade"),
  ]);

  const vigencias = ((vigenciasRes.data ?? []) as unknown as LinhaDeVigencia[]).map(
    vigenciaDoBanco,
  );
  const primeiroDia = todosOsSeis[0] ?? hoje;
  const excecao = vigenciaDaSemana(vigencias, "excecao", primeiroDia);
  const padrao = vigenciaDaSemana(vigencias, "padrao", primeiroDia);
  /* A exceção vence a padrão quando as duas cobrem a data — é o desenho de `tipo_regime`. */
  const vigente = excecao ?? padrao;
  /*
   * A vigência mais recente do curso, de qualquer data — serve **só** para numerar os TA quando
   * nenhuma cobre a semana. `vigenteEm` já ordena por `vigente_de` decrescente.
   */
  const maisRecente = [...vigencias]
    .filter((v) => v.tipo === "padrao")
    .sort((a, b) => b.vigenteDe.localeCompare(a.vigenteDe))[0];

  /*
   * O catálogo, **só** quando a vigência aponta para uma configuração. É um `await` a mais e fora
   * de laço; medido em 05/10/2026, nenhuma vigência real aponta, então ele não roda hoje.
   */
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

  /* Os nomes legíveis, por mapa — a view entrega identificadores. */
  const disciplinas = new Map(
    ((discRes.data ?? []) as { id: string; cod_disciplina: string }[]).map((d) => [
      d.id,
      d.cod_disciplina,
    ]),
  );
  const instrutores = new Map(
    (
      (instrRes.data ?? []) as {
        id: string;
        posto_graduacao: string;
        esp_hab_obs: string | null;
        nome_completo: string;
        nome_guerra: string | null;
      }[]
    ).map((i) => [
      i.id,
      /* ⚠️ O formato é o do `RF-INSTR-15`, pela função ÚNICA — nunca montado à mão aqui. */
      nomeEmTexto({
        id: i.id,
        pg: i.posto_graduacao,
        especialidade: i.esp_hab_obs,
        nomeCompleto: i.nome_completo,
        nomeDeGuerra: i.nome_guerra,
      }),
    ]),
  );

  /* O tópico e a técnica de cada fato, pelas três tabelas. */
  const conteudos = new Map<string, { conteudo: string | null; tecnica: string | null }>();
  for (const a of (aulasRes.data ?? []) as {
    id: string;
    conteudo_resumo: string | null;
    metodologia: string | null;
  }[]) {
    conteudos.set(a.id, { conteudo: a.conteudo_resumo, tecnica: a.metodologia });
  }
  for (const a of (avaliacoesRes.data ?? []) as {
    id: string;
    tipo_avaliacao: string | null;
    conteudo_resumo: string | null;
    metodologia: string | null;
  }[]) {
    conteudos.set(a.id, {
      conteudo: a.conteudo_resumo ?? a.tipo_avaliacao,
      tecnica: a.metodologia,
    });
  }
  for (const n of (atividadesRes.data ?? []) as {
    id: string;
    descricao: string | null;
    subtipo: string | null;
  }[]) {
    conteudos.set(n.id, { conteudo: n.descricao, tecnica: n.subtipo });
  }

  const nomes = { disciplinas, instrutores, conteudos };
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
      semPosicao.push({
        fatoId: a.id,
        origem: "aula",
        data: a.data,
        taInicial: null,
        tempos: null,
        herdado: false,
        disciplina: null,
        conteudo: conteudos.get(a.id)?.conteudo ?? null,
        tecnica: conteudos.get(a.id)?.tecnica ?? null,
        instrutor: null,
        local: null,
      });
    }
  }
  for (const n of (atividadesRes.data ?? []) as {
    id: string;
    data: string;
    ta_inicial: number | null;
  }[]) {
    if (n.ta_inicial === null) {
      semPosicao.push({
        fatoId: n.id,
        origem: "atividade_nao_letiva",
        data: n.data,
        taInicial: null,
        tempos: null,
        herdado: false,
        disciplina: null,
        conteudo: conteudos.get(n.id)?.conteudo ?? null,
        tecnica: conteudos.get(n.id)?.tecnica ?? null,
        instrutor: null,
        local: null,
      });
    }
  }

  const fatos = [...posicionados, ...semPosicao];
  const datasComLancamento = fatos.map((f) => f.data);
  const janela = diasDaTela({
    ano: escolha.ano,
    numero: escolha.numero,
    sabadoPedido: valores.sabado === "sim",
    datasComLancamento,
  });

  const semana = montarSemana({
    dias: janela.dias,
    relogio,
    /*
     * ⚠️ **SEM VIGÊNCIA NA SEMANA, OS TA AINDA SÃO NUMERADOS — pelo regime mais recente do CURSO.**
     * Medido: com `temposDeclarados: null` o domínio devolve **zero linhas** (e está certo: ele não
     * inventa TA que ninguém declarou). Mas a tela ficaria sem grade nenhuma, e o quickstart pede
     * *"TA numerados, sem relógio"*. O número de TA por dia é propriedade do CURSO, não da semana:
     * usá-lo para **numerar** é honesto, e o aviso acima diz que o RELÓGIO não se aplica àquela
     * semana. Inventar horário seria o que não se pode.
     */
    temposDeclarados: vigente?.regimeTempos ?? maisRecente?.regimeTempos ?? null,
    fatos,
    feriados: ((feriadosRes.data ?? []) as unknown as LinhaDeFeriado[]).map(feriadoDoBanco),
    /* ⚠️ Vazio no PR 1: o conflito entre turmas é do PR 4, e ele chega PRONTO (`RN-CONF-01`). */
    marcas: new Map(),
    hoje,
    sabadoAberto: janela.sabadoAberto,
  });

  const semRelogio = relogio === null;
  const podeLancar = pode(permissoes, "registros_aula", "criar");

  /*
   * O CATÁLOGO DE ITENS LANÇÁVEIS, montado aqui e passado por propriedade.
   *
   * ⚠️ **AS LISTAS SAEM DE `config_listas`, nunca de constante de código** (`RNF-NORM-08`): a
   * técnica, o tipo de avaliação e o subtipo são domínio **administrável**, e a `H2` do analyze pôs
   * a categoria de cada subtipo em `metadados.categoria` — é por ela que o seletor filtra em vez de
   * oferecer a lista inteira, que mistura tipo de aula com não-letivo.
   */
  const listas = (listasRes.data ?? []) as {
    lista: string;
    valor: string;
    ordem: number;
    metadados: Record<string, unknown> | null;
  }[];
  const daLista = (nome: string) => listas.filter((l) => l.lista === nome);
  const tecnicas = daLista("metodologias").map((l) => l.valor);
  const tiposDeAvaliacao = daLista("tipos_avaliacao").map((l) => l.valor);
  const subtipos = daLista("tipos_atividade").map((l) => ({
    valor: l.valor,
    categoria: (l.metadados?.["categoria"] as string | undefined) ?? null,
  }));
  /* ⚠️ A escala de antiguidade é DADO (`RN-ANT-02`): o peso de cada P/G vive em `config_listas`. */
  const escala = escalaDeLinhas(
    /* `ativo` é obrigatório no tipo, e a consulta já filtra `ativo = true` — a escala administrável é a ativa. */
    daLista("escala_antiguidade").map((l) => ({ valor: l.valor, ordem: l.ordem, ativo: true })),
  );

  const atribuicaoPorUe = new Map(
    ((atribRes.data ?? []) as { unidade_ensino_id: string; instrutor_id: string | null }[]).map(
      (a) => [a.unidade_ensino_id, a.instrutor_id],
    ),
  );
  const disciplinasDoCurso = (discRes.data ?? []) as {
    id: string;
    cod_disciplina: string;
    nome_disciplina: string;
    sem_unidades_ensino: boolean | null;
    status: string;
  }[];
  const codigoDaDisciplina = new Map(disciplinasDoCurso.map((d) => [d.id, d.cod_disciplina]));

  const unidades = (
    (ueExecRes.data ?? []) as {
      unidade_ensino_id: string;
      disciplina_id: string;
      numero_ue: number;
      topico: string;
      ch_prevista_tempos: number;
      ta_executados: number | null;
      ta_saldo: number | null;
    }[]
  ).map((u) => ({
    id: u.unidade_ensino_id,
    disciplinaId: u.disciplina_id,
    disciplinaCodigo: codigoDaDisciplina.get(u.disciplina_id) ?? "—",
    numero: u.numero_ue,
    topico: u.topico,
    prevista: u.ch_prevista_tempos,
    lancada: u.ta_executados ?? 0,
    restante: u.ta_saldo ?? u.ch_prevista_tempos,
    tecnicaSugerida: null,
    atribuidoId: atribuicaoPorUe.get(u.unidade_ensino_id) ?? null,
  }));

  /*
   * ⚠️ **AS DISCIPLINAS ISENTAS SÓ APARECEM ONDE A ISENÇÃO VALE** (`Q-1`, `D-10`): curso por
   * competências **ou** disciplina marcada `sem_unidades_ensino`. É a MESMA condição de
   * `app.disciplina_sem_ue`, e a tela a lê para **oferecer** o modo; quem **impõe** é o banco.
   * Oferecê-lo sempre faria a pessoa tentar e receber `23514`.
   */
  /*
   * ⚠️ **O MODELO DO CURRÍCULO É LIDO DO CURSO, e a primeira escrita disto era um `false` fixo** —
   * um valor plausível e inventado, que faria a isenção da `Q-1` nunca aparecer nos dois cursos por
   * competências, que são justamente os que mais precisam dela. O `curriculo_modelo` entra na
   * leitura do curso, na mesma rodada.
   */
  const cursoPorCompetencias =
    (cursoRes.data as { curriculo_modelo?: string } | null)?.curriculo_modelo === "competencias";
  const disciplinasIsentas = disciplinasDoCurso
    .filter((d) => d.status === "ativo" && (d.sem_unidades_ensino === true || cursoPorCompetencias))
    .map((d) => ({
      id: d.id,
      codigo: d.cod_disciplina,
      nome: d.nome_disciplina,
    }));

  /* ⚠️ Instrutor INATIVO não chega ao seletor (`RN-INST-02`). */
  const instrutoresParaEscolher = (
    (instrRes.data ?? []) as {
      id: string;
      posto_graduacao: string;
      esp_hab_obs: string | null;
      nome_completo: string;
      nome_guerra: string | null;
      status?: string;
    }[]
  )
    .filter((i) => i.status === undefined || i.status === "ativo")
    .map((i) => ({
      id: i.id,
      pg: i.posto_graduacao,
      especialidade: i.esp_hab_obs,
      nomeCompleto: i.nome_completo,
      nomeDeGuerra: i.nome_guerra,
    }));

  return (
    <section className="flex min-w-0 flex-col gap-3">
      <CabecalhoDoDsa codigo={codigo} rotulo={rotuloDaSemana(janela.dias)} ano={escolha.ano} />

      <NavegacaoDaSemana
        codigo={codigo}
        ano={escolha.ano}
        semana={escolha.numero}
        sabadoAberto={janela.sabadoAberto}
      />

      {aviso ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="aviso-de-semana">
          {aviso} Abrimos a semana corrente.
        </p>
      ) : null}

      {/*
       * ⚠️ **DEGRADAÇÃO SEGURA, COM O CONSERTO A UM CLIQUE** (`RN-DEG-01`): curso sem vigência de
       * regime não tem relógio, e a grade sai com os TA **numerados**, sem horário — nunca com
       * exceção e nunca vazia. O aviso leva à tela que resolve, em vez de dizer "faltou dado".
       */}
      {semRelogio ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="sem-relogio">
          Este curso não tem vigência de regime que cubra esta semana, então os Tempos de Aula
          aparecem numerados, sem horário.{" "}
          <Link
            href={`${enderecoDaTurma(codigo)}`}
            className="underline underline-offset-2 hover:text-texto"
          >
            Abra o curso para registrar uma nova vigência.
          </Link>
        </p>
      ) : null}

      <PainelDeLancamento
        semana={semana}
        turmaId={turmaId}
        cursoId={cursoId}
        salaDaTurma={(turma.sala_alocada as string | null) ?? null}
        ano={escolha.ano}
        numeroDaSemana={escolha.numero}
        podeLancar={podeLancar}
        unidades={unidades}
        disciplinasIsentas={disciplinasIsentas}
        instrutores={instrutoresParaEscolher}
        escala={escala}
        tecnicas={tecnicas}
        tiposDeAvaliacao={tiposDeAvaliacao}
        subtipos={subtipos}
        lancar={lancar}
        lancarEstudoIndividual={lancarEstudoIndividualDaSemana}
      />
    </section>
  );
}

function CabecalhoDoDsa({
  codigo,
  rotulo,
  ano,
}: {
  readonly codigo: string;
  readonly rotulo: string | null;
  readonly ano: number;
}) {
  return (
    <header className="flex flex-wrap items-baseline justify-between gap-2">
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold text-texto">Detalhe Semanal de Aula</h1>
        <p className="text-sm text-texto-suave">
          {codigo}
          {rotulo ? ` · semana de ${rotulo} · ${ano}` : ""}
        </p>
      </div>
      <Link
        href={enderecoDaTurma(codigo)}
        className="text-sm text-texto-suave underline underline-offset-2 hover:text-texto"
      >
        Voltar à turma
      </Link>
    </header>
  );
}

/*
 * ⚠️ **ESTE ARQUIVO NÃO REEXPORTA NADA, E A PRIMEIRA VERSÃO REEXPORTAVA — com custo.** Ela tinha
 * `export { enderecoDoDsa }` no fim, "para a guarda de caminhos", e o resultado foi um defeito que
 * **só aparece no build de produção**: a tela caía no `error.tsx` com *"Minified React error #130"*
 * (*element type is invalid: got undefined*), enquanto em `next dev` a mesma rota respondia **200**.
 * Módulo de página do Next aceita um conjunto FECHADO de exports — `default`, `metadata`,
 * `generateMetadata`, `revalidate`, `dynamic` e alguns mais —, e um export estranho é transformado
 * de um jeito que devolve `undefined` onde o componente deveria estar.
 * ⚠️ **É o gotcha 1 na forma mais cara**: `tsc` passa, `vitest` passa, `next dev` passa, e só o
 * `next build` + a navegação de verdade mostram. Quem monta endereço é
 * `lib/navegacao/endereco-de-turma.ts`, e a guarda já o lê de lá.
 */
export const metadata = { title: "Detalhe Semanal de Aula" };
