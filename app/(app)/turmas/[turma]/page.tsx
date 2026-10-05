/**
 * A ficha da turma (`FR-031`, `FR-031.4` a `FR-031.6`, `FR-041`).
 *
 * ⚠️ **NÃO HÁ `/editar`** (`FR-031.5`). A ficha **é** o formulário, no modo `edicao`, para quem pode
 * editar; quem só consulta vê os mesmos dados sem campos. Uma rota de edição separada faria a pessoa
 * navegar duas vezes para mudar um efetivo.
 *
 * ⚠️ **O CAMINHO DE VOLTA É O CURSO** (`FR-031.6`): a turma se alcança pela página dele, e é para lá
 * que se volta.
 *
 * ⚠️ **A RPC DE PROTEÇÃO SÓ É LIDA PARA QUEM PODE EDITAR** (`FR-021.8`) — ela tem porteiro próprio, e
 * quem consulta não vai mudar janela nenhuma.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só o formulário é folha.
 */
import Link from "next/link";

import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { andamentoDaTurma } from "@/lib/dominio/andamento-da-turma";
import { avisosDaTurma } from "@/lib/dominio/avisos-da-turma";
import type { TurmaParaLimite } from "@/lib/dominio/limite-de-turmas";
import type { JanelaDeTurma, VigenciaProtegida } from "@/lib/dominio/protecao-de-vigencia";
import { salasParaEscolher, type Sala } from "@/lib/dominio/salas";
import { ROTULO_DO_STATUS_DE_TURMA, TOM_DO_STATUS_DE_TURMA } from "@/lib/dominio/seletor-de-turma";
import { ROTULO_DA_MODALIDADE } from "@/lib/constantes/curso";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { dataParaLeitura } from "@/lib/formato/data";
import {
  ANCORA_DAS_DISCIPLINAS,
  enderecoDasTurmas,
  ROTA_DA_FICHA_DA_TURMA,
} from "@/lib/navegacao/endereco-de-turma";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";
import { BadgeStatus } from "@/components/ciaara/badge-status";

import { alcanceDoPerfil } from "../../cursos/consulta";
import { lerGradeDeDisciplinas } from "../../disciplinas/consulta";
import { DisciplinasDaTurma } from "./DisciplinasDaTurma";
import { EdicaoDaTurma } from "./EdicaoDaTurma";
import { Rotulo } from "./Rotulo";
import { SecaoDeAndamento } from "./SecaoDeAndamento";
import { FormularioDeTurma } from "../FormularioDeTurma";
import {
  codigoDaFicha,
  COLUNAS_DA_CARGA_DA_TURMA,
  COLUNAS_DA_FICHA_DA_TURMA,
  COLUNAS_DO_REGIME_DO_CURSO,
  datasDeFeriado,
  deveLerFeriados,
  deveLerProtecao,
  mensagemDeTurmaNaoEncontrada,
  protecoesDoBanco,
  regimeDoBanco,
} from "./consulta";
import { QuadroDeAvisosDaTurma } from "./QuadroDeAvisosDaTurma";

/*
 * ⚠️ **O "HOJE" LOCAL SAIU DAQUI EM 04/10/2026.** Havia TRÊS fórmulas no repositório: esta cópia,
 *    uma igual na página do curso e um `new Date().toISOString()` em `/disciplinas` — este último
 *    em **UTC**, que divergia das outras duas entre 21h e a meia-noite. Agora todas chamam
 *    `hojeNaCiaara()`, que já existia em `lib/formato/ano-corrente.ts` com um consumidor só.
 */

export default async function FichaDaTurma({
  params,
  searchParams,
}: {
  params: Promise<{ turma: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { turma: segmento } = await params;
  const codigo = codigoDaFicha(segmento);
  /*
   * ⚠️ **A FICHA PASSOU A TER PARÂMETRO, E É UM SÓ:** `aberta`, a linha expandida da seção de
   *    disciplinas. Ele serve ao PRIMEIRO desenho; depois dele quem manda é o gancho na folha.
   */
  const { valores } = lerParametros(ROTA_DA_FICHA_DA_TURMA, await searchParams);

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  const supabase = await criarClienteDeServidor();

  const { data: turma } = await supabase
    .from("turmas")
    .select(COLUNAS_DA_FICHA_DA_TURMA)
    .eq("codigo", codigo)
    .maybeSingle();

  if (!turma) {
    return (
      <section className="flex flex-col gap-3">
        <h1 className="text-texto text-lg font-semibold">Turma</h1>
        <p role="status" className="text-texto" data-slot="turma-nao-encontrada">
          {mensagemDeTurmaNaoEncontrada(
            codigo,
            alcanceDoPerfil(usuario?.perfil, usuario?.escopoCurso),
          )}
        </p>
      </section>
    );
  }

  const podeEditar = pode(permissoes, "turmas", "editar");
  const cursoId = turma.curso_id as string;

  /*
   * ⚠️ A RPC É PROMESSA CONDICIONAL, NÃO `await` SOLTO — ela entra na MESMA rodada das outras três.
   *    Lê-la depois custaria uma ida a mais ao banco por abertura de ficha (`FR-012`).
   */
  const protecaoPromessa = deveLerProtecao(podeEditar)
    ? supabase.rpc("protecao_das_vigencias_por_atividade_global", { p_curso_id: cursoId })
    : null;

  /*
   * ⚠️ **O "HOJE" SUBIU PARA CÁ EM 04/10/2026, e não é arrumação: ele É UM LIMITE DA CONSULTA.** Os
   *    feriados pedidos ao banco são os do intervalo `[hoje, término]`, e lê-lo depois obrigaria a
   *    uma segunda rodada só por causa da data. Continua sendo `hojeNaCiaara()`, a fórmula única.
   */
  const hoje = hojeNaCiaara();
  const dataTermino = turma.data_termino as string | null;

  /*
   * ⚠️ **A CONSULTA DE FERIADOS É PROMESSA CONDICIONAL, PELO MESMO CRITÉRIO DA RPC** (`FR-012`): sem
   *    data de término não há intervalo, a capacidade sai `sem_termino` e a lista seria descartada
   *    pelo domínio. ⚠️ **E ela filtra `impacto` E `status`:** `RN-EVT-02` manda descontar **só**
   *    feriado de dia inteiro, e feriado desativado é exclusão lógica (regra 4) — contá-lo tiraria
   *    capacidade de um dia que voltou a ser útil.
   */
  const feriadosPromessa = deveLerFeriados(dataTermino)
    ? supabase
        .from("feriados")
        .select("data")
        .eq("impacto", "dia_inteiro")
        .eq("status", "ativo")
        .gte("data", hoje)
        .lte("data", dataTermino as string)
    : null;

  const [cursoRes, turmasRes, salasRes, protecaoRes, cargaRes, regimeRes, feriadosRes] =
    await Promise.all([
      supabase
        .from("cursos")
        .select("codigo, nome_curso, limite_turmas_ano")
        .eq("id", cursoId)
        .maybeSingle(),
      supabase
        .from("turmas")
        .select("codigo, turma, ano_letivo, status, data_inicio, data_termino")
        .eq("curso_id", cursoId),
      supabase
        .from("config_listas")
        .select("valor, ativo, metadados")
        .eq("lista", "salas")
        .order("ordem"),
      protecaoPromessa,
      /*
       * ⚠️ **A CH EXECUTADA VEM DA MESMA VIEW QUE O `/inicio` LÊ** — `vw_carga_horaria_turma` —, e é
       *    por isso que os dois números batem. Uma soma própria aqui seria a segunda fonte de verdade
       *    de `chd_executada`, com a `RN-CRONOS-01` para honrar duas vezes.
       */
      supabase
        .from("vw_carga_horaria_turma")
        .select(COLUNAS_DA_CARGA_DA_TURMA)
        .eq("turma_id", turma.id as string)
        .maybeSingle(),
      /*
       * ⚠️ **O TA/DIA NÃO É PARÂMETRO NOVO: ele é o REGIME VIGENTE DO CURSO** (decisão de Bernardo,
       *    04/10/2026, Q1 do clarify). `vw_cursos_regime_vigente` resolve a vigência de hoje, e a
       *    escolha entre `regime_padrao_tempos` e `limite_diario_ead_horas` é da **modalidade da
       *    turma** (`RN-MAT-04`), feita no módulo puro.
       */
      supabase
        .from("vw_cursos_regime_vigente")
        .select(COLUNAS_DO_REGIME_DO_CURSO)
        .eq("curso_id", cursoId)
        .maybeSingle(),
      feriadosPromessa,
    ]);

  const sigla = (cursoRes.data?.codigo as string | undefined) ?? "";

  /*
   * ⚠️ **ERRO DE LEITURA DEGRADA, NÃO ESTOURA** (`RN-DEG-01`): sem a linha da carga o andamento sai
   *    com prevista e executada **zero**, que a seção já sabe dizer (*"o curso não tem carga
   *    curricular lançada"*). A ficha continua editável — é o `FR-033`.
   */
  const andamento = andamentoDaTurma(
    {
      status: turma.status as string,
      modalidade: turma.modalidade as string,
      dataTermino,
      prevista: Number(cargaRes.data?.chr_curricular ?? 0),
      executada: Number(cargaRes.data?.chd_executada ?? 0),
    },
    regimeDoBanco(regimeRes.data ?? null),
    datasDeFeriado(feriadosRes?.data ?? []),
    hoje,
  );

  /*
   * ⚠️ **A GRADE VEM NUMA SEGUNDA RODADA, E O CUSTO ESTÁ DECLARADO:** `lerGradeDeDisciplinas` é
   *    indexada pela **sigla** do curso, e a sigla só existe depois da leitura do curso. São duas
   *    idas ao banco em vez de uma — e a alternativa seria uma consulta paralela por `curso_id`,
   *    que duplicaria a função que a tela de disciplinas já usa. **Duplicar a leitura dos
   *    instrutores é o que custa caro**: é ela que carrega o `.order("ordem_antiguidade")` que a
   *    guarda da `RN-ANT-01` cobra, e uma segunda cópia é um lugar a mais onde esquecê-lo.
   */
  const grade = await lerGradeDeDisciplinas({ cursoCodigo: sigla, turmaCodigo: codigo });
  const naGrade = grade.linhas.filter((l) => l.turmaDisciplinaId !== null);

  const avisos = avisosDaTurma(
    {
      status: turma.status as string,
      dataInicio: turma.data_inicio,
      dataTermino: turma.data_termino,
      sala: turma.sala_alocada,
      alunos: turma.alunos === null ? null : Number(turma.alunos),
      /*
       * ⚠️ **A CONTAGEM PASSOU A SER REAL EM 04/10/2026** (decisão **D6**). Até aqui era `1` fixo,
       *    com o comentário *"a grade da turma é do Épico 6 — declarar 1 mantém o aviso
       *    silencioso"*: a ficha não lia `turma_disciplina` e não tinha o número. Agora lê, e o
       *    aviso `sem_disciplina` passa a **disparar de verdade** em turma sem grade — é mudança
       *    visível, e é o aviso existente passando a dizer a verdade.
       * ⚠️ **NA ABA GRADE DO CURSO O `1` FIXO CONTINUA**, e de propósito: o `FR-012` da spec 009
       *    proíbe consulta por turma naquela lista, que mostra todas as turmas do curso.
       */
      disciplinasAtivas: naGrade.length,
    },
    hoje,
  );

  const todas = turmasRes.data ?? [];
  /* ⚠️ A TURMA EDITADA SAI DA CONTA DO LIMITE — senão o próprio lugar dela viraria excesso. */
  const outras: TurmaParaLimite[] = todas
    .filter((t) => t.codigo !== codigo)
    .map((t) => ({ ano: Number(t.ano_letivo), status: t.status as string }));

  const janelas: JanelaDeTurma[] = todas.map((t) => ({
    codigo: t.codigo as string,
    dataInicio: t.data_inicio,
    dataTermino: t.data_termino,
  }));

  const semRotuloNoAno = todas
    .filter((t) => t.turma === null && t.codigo !== codigo)
    .map((t) => ({ ano: Number(t.ano_letivo), codigo: t.codigo as string }));

  const todasAsSalas: Sala[] = (salasRes.data ?? []).map((s) => ({
    valor: s.valor as string,
    ativo: s.ativo !== false,
    metadados: s.metadados,
  }));
  /* ⚠️ A SALA ATUAL ENTRA MESMO DESATIVADA (`FR-029.4`) — quem decide é `lib/dominio/salas.ts`. */
  const salas = salasParaEscolher(todasAsSalas, turma.sala_alocada);

  const protegidas: VigenciaProtegida[] = protecoesDoBanco(protecaoRes?.data ?? []);

  const texto = (v: string | number | null) => (v === null ? "" : String(v));

  return (
    <section className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <h1 className="text-texto text-xl font-semibold" data-slot="codigo-da-turma">
          {turma.codigo}
        </h1>
        {/*
          ⚠️ **O CAMINHO DE VOLTA É A LISTA, E NÃO O CURSO** (`D-NAV-3`, 04/10/2026). Isto **emenda o
             `FR-031.6`** da spec 009, que escrevia *"o caminho de volta é o curso"* — e escrevia certo
             enquanto a ficha só se alcançava por dentro dele. Agora ela se alcança pela lista, pelo
             curso e pelo endereço antigo de disciplinas; voltar ao curso deixou de ser *o* caminho.
          ⚠️ **E O CURSO NÃO FICOU LONGE:** ele é a linha de baixo, como link. O que mudou é qual dos
             dois é "voltar".
        */}
        <p className="text-sm">
          <Link
            href={enderecoDasTurmas()}
            className="text-marca underline-offset-2 hover:underline"
            data-slot="voltar-a-lista"
          >
            ← Turmas
          </Link>
        </p>

        {sigla ? (
          <p className="text-texto-suave text-sm">
            <Link
              href={`/cursos/${encodeURIComponent(sigla)}`}
              className="text-texto underline-offset-2 hover:underline"
              data-slot="curso-da-turma"
            >
              {sigla} — {cursoRes.data?.nome_curso as string}
            </Link>
          </p>
        ) : null}

        {/*
          ⚠️ **O CABEÇALHO RESUME A TURMA NUM LUGAR SÓ** (`FR-021` da spec 012), e ele vale para quem
             edita e para quem não edita. Antes, quem não editava via estes campos num `<dl>` de
             somente-leitura e quem editava não via nenhum — o formulário mostra campos, não resumo.
          ⚠️ **ELE FICOU COMPACTO EM 05/10/2026** *(decisão de Bernardo, na conferência)*: era uma
             grade de duas colunas e seis linhas, que empurrava o andamento para baixo da dobra.
             Agora é **uma linha que quebra**, e **Início** e **Término** viraram um item só —
             *Período* —, porque as duas datas são lidas juntas e separadas custavam duas linhas.
          ⚠️ **AS DATAS SAEM EM `DD/MM/AAAA`** (decisão do mesmo dia): até aqui esta mesma ficha
             mostrava ISO no cabeçalho e `DD/MM/AAAA` no Andamento, porque só o segundo chamava o
             formatador. ⚠️ **E o `inicial` do formulário, mais abaixo, CONTINUA EM ISO** — ele é
             valor de `<input type="date">`, não exibição, e formatá-lo abriria o campo vazio.
        */}
        <dl
          className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
          data-slot="cabecalho-da-turma"
        >
          <span className="flex items-center gap-2">
            <Rotulo>Situação</Rotulo>
            <dd>
              <BadgeStatus
                tom={TOM_DO_STATUS_DE_TURMA[turma.status as string] ?? "planejado"}
                rotulo={
                  ROTULO_DO_STATUS_DE_TURMA[turma.status as string] ?? (turma.status as string)
                }
              />
            </dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Modalidade</Rotulo>
            <dd className="text-texto">
              {ROTULO_DA_MODALIDADE[turma.modalidade as string] ?? (turma.modalidade as string)}
            </dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Período</Rotulo>
            <dd className="text-texto">
              {dataParaLeitura(turma.data_inicio)} a {dataParaLeitura(dataTermino)}
            </dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Sala</Rotulo>
            <dd className="text-texto">{texto(turma.sala_alocada) || "—"}</dd>
          </span>
          <span className="flex items-center gap-2">
            <Rotulo>Efetivo</Rotulo>
            <dd className="text-texto">{texto(turma.alunos) || "—"}</dd>
          </span>
        </dl>
      </header>

      <QuadroDeAvisosDaTurma avisos={avisos} />

      <SecaoDeAndamento andamento={andamento} dataTermino={dataTermino} />

      {/*
        ⚠️ **A SEÇÃO DE DISCIPLINAS VEIO DE `/disciplinas?turma=` EM 04/10/2026** (`FR-018`), e o
           endereço antigo **redireciona para esta âncora**. O `id` é o destino do `#`, e é por isso
           que ele é fixo e sai do módulo de endereço: um `#disciplinas` escrito à mão aqui e lá
           seriam duas grafias do mesmo destino.
        ⚠️ **O `<dl>` DE SOMENTE-LEITURA SAIU**: o cabeçalho acima mostra os mesmos campos para todo
           mundo, e manter os dois dava a mesma informação duas vezes na mesma tela para quem não
           edita.
      */}
      <section
        id={ANCORA_DAS_DISCIPLINAS}
        aria-labelledby="titulo-das-disciplinas"
        className="flex flex-col gap-2"
        data-slot="disciplinas-da-turma"
      >
        <h2 id="titulo-das-disciplinas" className="text-texto text-base font-semibold">
          Disciplinas
        </h2>
        {naGrade.length === 0 ? (
          <p className="text-texto-suave text-sm" data-slot="turma-sem-grade">
            Esta turma ainda não tem disciplinas na grade.
          </p>
        ) : (
          <DisciplinasDaTurma
            linhas={naGrade}
            turmaCodigo={turma.codigo as string}
            escala={grade.escalaDeAntiguidade}
            podeEditar={pode(permissoes, "disciplinas", "editar")}
            avisoInicioDias={grade.avisoInicioDias}
            hoje={hoje}
            abertaNoEndereco={String(valores.aberta)}
            executadaDaTurma={andamento.executada}
          />
        )}
      </section>

      {/*
        ⚠️ **O FORMULÁRIO DESCEU E FICOU RECOLHIDO EM 05/10/2026** *(decisão de Bernardo, na
           conferência)*: a ficha abre para **ler** — cabeçalho, indicadores, andamento,
           disciplinas — e editar é um ato deliberado, atrás de *"Editar turma"*.
        ⚠️ **ELE CONTINUA SENDO A FICHA, e não uma rota `/editar`** (`FR-031.5` da spec 009): o
           que mudou é que ele não disputa mais a primeira tela com o que se lê. Uma rota
           separada faria navegar duas vezes para mudar um efetivo, que é o que aquele requisito
           recusou.
        ⚠️ **E O QUADRO DE AVISOS FICOU NO TOPO, não desceu com ele.** O cabeçalho de
           `QuadroDeAvisosDaTurma` dizia que ele vinha *"acima do formulário porque a pessoa
           precisa lê-lo antes de salvar"* — com o formulário no fim ele está acima de qualquer
           jeito, e acima de **tudo**, que é onde uma região de alertas pertence (`RNF-USA-04`).
      */}
      {podeEditar ? (
        <EdicaoDaTurma>
          <FormularioDeTurma
            modo="edicao"
            cursoId={cursoId}
            codigoAtual={turma.codigo as string}
            inicial={{
              ano_letivo: texto(turma.ano_letivo),
              status: turma.status as string,
              modalidade: turma.modalidade as string,
              turma: texto(turma.turma),
              data_inicio: texto(turma.data_inicio),
              data_termino: texto(turma.data_termino),
              sala_alocada: texto(turma.sala_alocada),
              alunos: texto(turma.alunos),
            }}
            salas={salas}
            turmasDoCurso={outras}
            limiteDoCurso={
              cursoRes.data?.limite_turmas_ano === null ||
              cursoRes.data?.limite_turmas_ano === undefined
                ? null
                : Number(cursoRes.data.limite_turmas_ano)
            }
            semRotuloNoAno={semRotuloNoAno}
            vigenciasProtegidas={protegidas}
            janelasDoCurso={janelas}
          />
        </EdicaoDaTurma>
      ) : null}
    </section>
  );
}
