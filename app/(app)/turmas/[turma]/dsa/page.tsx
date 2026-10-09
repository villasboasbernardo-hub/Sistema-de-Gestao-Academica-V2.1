/**
 * A semana do Detalhe Semanal de Aula (`RF-DSA-01`, `RF-DSA-02`, `RF-HOR-04`, `RF-HOR-06`,
 * `RN-2027-09`, `RN-EVT-02`, `RN-DEG-01`, `RF-NAV-04` · spec 013, PR 1, PR 2 e PR 3).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** Só a navegação da semana e o painel de lançamento são folhas; a
 * grade é servidor — uma semana do `C-Ap-HN` tem 9 TA × 6 dias com blocos dentro, e levar isso ao
 * bundle seria o gotcha 1 com o maior conteúdo da aplicação.
 *
 * ⚠️ **A LEITURA SAIU DAQUI NO PR 3, e a razão é a razão de ser da spec.** Ela vive agora em
 * `leitura.ts`, **compartilhada com a rota de impressão**: o papel precisa da **mesma** semana que
 * a tela mostra. Com dois leitores, a primeira divergência entre tela e papel seria **invisível** —
 * é o `D-5` e o `D-6` da planilha, onde o ESPELHO e a IMPRESSÃO liam linhas diferentes do mesmo
 * dado e ninguém via, até a inspeção da CAC contar 11.918 erros.
 *
 * ⚠️ **OS AVISOS DE DADO FALTANTE SÃO DESTA TELA, NÃO DO PAPEL** (`FR-039`, `SC-015`): *"dado
 * faltante vira aviso na tela, ao lado do botão Imprimir, ANTES de abrir a impressão"*. O que
 * acontece quando o aviso vai junto está medido: *"VERIFICAR Nº DE TA"* saiu **impresso** em 10 das
 * 15 planilhas (`D-2`).
 */
import Link from "next/link";
import { notFound } from "next/navigation";

import { atualizar, excluir, lancar, lancarEstudoIndividualDaSemana, mover } from "@/lib/acoes/dsa";
import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import {
  diasForaDaEtapa,
  etapaDaSemana,
  TEXTO_DA_ETAPA_A_DISTANCIA,
  type TurmaParaEtapa,
} from "@/lib/dominio/dsa/etapa-presencial";
import { AVISO_DE_TURMA_EAD } from "@/lib/dominio/dsa/ead-puro";
import { avisosAntesDeImprimir } from "@/lib/dominio/dsa/impressao";
import { motivoDoNumeroAusente, numeroDoDsa } from "@/lib/dominio/dsa/numero-do-dsa";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { dataComDiaDaSemana, dataParaLeitura } from "@/lib/formato/data";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";
import { CONTRATO } from "@/lib/navegacao/contrato";
import { lerParametros } from "@/lib/navegacao/esquema";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import { montarDocumentoDoDsa } from "../../../../print/dsa/documento";
import { alcanceDoPerfil } from "../../../cursos/consulta";
import { codigoDaFicha, mensagemDeTurmaNaoEncontrada } from "../consulta";
import {
  COLUNAS_DA_TURMA_DO_DSA,
  ehEadPuro,
  quadrosDaSemana,
  rotuloDaSemana,
  ROTA_DO_DSA,
  semanaEscolhida,
} from "./consulta";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "./leitura";
import { BotaoImprimir, EdicaoDasAssinaturasNaTela } from "./AssinaturasEditaveis";
import { CabecalhoDaSemana, RodapeDaSemana } from "./DocumentoNaTela";
import { NavegacaoDaSemana } from "./NavegacaoDaSemana";
import { PainelDeLancamento } from "./PainelDeLancamento";
import { PainelDeSituacao } from "./PainelDeSituacao";

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
  /*
   * O que o contrato descartou, dito em português — é o aviso da `RN-DEG-01`. ⚠️ **O AVISO INTEIRO
   * SAI DA ESCOLHA, inclusive a consequência** (conferência do PR #40, 08/10/2026): a página colava
   * *"Abrimos a semana corrente"* a qualquer descarte, e `?semana=22&ano=2019` abria a semana 22.
   */
  const escolha = semanaEscolhida({
    semana: Number(valores.semana ?? 0),
    ano: Number(valores.ano ?? 0),
    hoje,
    descartes,
    faixas: CONTRATO[ROTA_DO_DSA].parametros,
  });
  const aviso = escolha.aviso;

  /*
   * ⚠️ **O DSA NÃO SE APLICA A EAD PURO** (`Q-13`, decisão de Bernardo Villas Boas de 05/10/2026).
   * Semipresencial **tem** DSA — ele cobre a semana presencial. A tela diz isso e para aqui, em vez
   * de desenhar uma grade de nove tempos para uma turma que não tem TA presencial nenhum.
   * ⚠️ **A FRASE É A MESMA DA FICHA, DA LISTA E DO `/inicio`** (item 9 da conferência do PR #40,
   * 08/10/2026): elas já não oferecem o botão, e quem chega pelo endereço lê o mesmo aviso.
   */
  if (ehEadPuro(turma.modalidade as string | null)) {
    return (
      <section className="flex flex-col gap-3">
        <CabecalhoDoDsa codigo={codigo} rotulo={null} ano={escolha.ano} />
        <p role="status" className="max-w-prose text-texto" data-slot="dsa-nao-se-aplica">
          {AVISO_DE_TURMA_EAD}
        </p>
      </section>
    );
  }

  const turmaId = turma.id as string;
  const cursoId = turma.curso_id as string;

  /*
   * ⚠️ **`D-DSA-2`: A TURMA SEMIPRESENCIAL SÓ TEM DSA NA ETAPA PRESENCIAL** (decisão de Bernardo Villas
   * Boas, 08/10/2026). Semana sem nenhum dia na janela não tem DSA — a tela diz e para aqui, mas
   * MANTÉM a navegação, para se chegar às semanas que têm. ⚠️ Quem decide é `etapaDaSemana`, a mesma
   * regra da Server Action e do papel; os dias são os seis da semana ISO (o sábado entra).
   */
  const paraEtapa: TurmaParaEtapa = {
    modalidade: (turma.modalidade as string | null) ?? null,
    inicioEtapaPresencial: (turma.inicio_etapa_presencial as string | null) ?? null,
    terminoEtapaPresencial: (turma.termino_etapa_presencial as string | null) ?? null,
  };
  const diasDaSemanaIso = datasDaSemanaIso(escolha.ano, escolha.numero).slice(0, 6);
  const etapa = etapaDaSemana(paraEtapa, diasDaSemanaIso);
  if (etapa.tipo === "fora") {
    return (
      <section className="flex min-w-0 flex-col gap-3">
        <CabecalhoDoDsa
          codigo={codigo}
          rotulo={rotuloDaSemana(diasDaSemanaIso)}
          ano={escolha.ano}
        />
        <NavegacaoDaSemana
          codigo={codigo}
          ano={escolha.ano}
          semana={escolha.numero}
          sabadoAberto={false}
        />
        <div
          role="status"
          className="rounded-ciaara border-borda bg-superficie flex max-w-prose flex-col gap-1 border p-3"
          data-slot="dsa-etapa-a-distancia"
        >
          <p className="font-medium text-texto">{TEXTO_DA_ETAPA_A_DISTANCIA}</p>
          <p className="text-sm text-texto-suave">
            A etapa presencial desta turma vai de {dataParaLeitura(etapa.janela.inicio)} a{" "}
            {dataParaLeitura(etapa.janela.termino)}. Fora dela não se lança no DSA.{" "}
            <Link
              href={enderecoDaTurma(codigo)}
              className="underline underline-offset-2 hover:text-texto"
            >
              Ajustar a etapa presencial na ficha da turma.
            </Link>
          </p>
        </div>
      </section>
    );
  }
  const diasADistancia = diasForaDaEtapa(paraEtapa, diasDaSemanaIso);

  /* ⚠️ As duas leituras são independentes: uma rodada só, nenhum `await` em sequência inútil. */
  const [lida, extras] = await Promise.all([
    lerSemanaDoDsa(supabase, {
      turmaId,
      cursoId,
      ano: escolha.ano,
      numero: escolha.numero,
      sabadoPedido: valores.sabado === "sim",
      hoje,
    }),
    lerExtrasDaImpressao(supabase, { turmaId, cursoId }),
  ]);

  const semRelogio = lida.relogio === null;
  const podeLancar = pode(permissoes, "registros_aula", "criar");

  /*
   * ⚠️ **OS AVISOS SÃO CALCULADOS COM AS MESMAS FUNÇÕES QUE O PAPEL USA.** O número do DSA, as
   * assinaturas e as linhas impressas saem de `lib/dominio/dsa/`, e é por isso que o aviso diz a
   * verdade sobre o que **vai** sair — e não um palpite sobre o que talvez saia.
   */
  const entradaDoNumero = {
    datasComLancamento: extras.datasComLancamentoDaTurma,
    dataInicio: (turma.data_inicio as string | null) ?? null,
    semana: { ano: escolha.ano, numero: escolha.numero },
  };
  /* ⚠️ A MESMA montagem da rota `/print/dsa` — a grade da tela e a do papel saem do mesmo objeto. */
  const documento = montarDocumentoDoDsa({
    codigoDaTurma: codigo,
    turma,
    cursoId,
    escolha,
    lida,
    extras,
    hoje,
    /* A tela mostra todas as linhas da semana, para que se possa lançar num tempo que o papel ainda não tem. */
    minimoDeTempos: lida.semana.linhas,
  });
  const assinaturas = documento.assinaturas;
  const impresso = documento.dias;
  /* ⚠️ As linhas de Estudo Individual não contam: elas existem mesmo na semana vazia. */
  const linhasImpressas = impresso.reduce(
    (total, dia) => total + dia.linhas.filter((l) => !l.estudoIndividual).length,
    0,
  );
  /*
   * ⚠️ **SÓ O CONFLITO DE PESSOA FAZ A DISCIPLINA «CONFLITAR»; o alerta de SALA não** — a
   * `RN-CONF-01` separa os dois, e `marcasDeConflito` traz os dois juntos. Contar o alerta de sala
   * aqui marcaria *"Conflitou"* numa disciplina cujo instrutor não tem conflito nenhum, e a tela
   * mandaria procurar o que não existe.
   */
  const emConflito = new Set(
    [...lida.marcasDeConflito.entries()].filter(([, m]) => m.conflito !== null).map(([id]) => id),
  );
  const ultimoDia = lida.dias[lida.dias.length - 1] ?? hoje;
  const quadros = quadrosDaSemana({
    execucao: extras.execucao,
    ocupacao: lida.ocupacaoAcumulada,
    emConflito,
    /* ⚠️ O corte é o FIM da semana selecionada, não hoje (`RN-CRONOS-03`, `Q-2`). */
    ateODia: ultimoDia,
    hoje,
  });

  const avisosDaImpressao = avisosAntesDeImprimir({
    numeroDoDsa: numeroDoDsa(entradaDoNumero),
    motivoDoNumeroAusente: motivoDoNumeroAusente(entradaDoNumero),
    alunos: (turma.alunos as number | null) ?? null,
    semRelogio,
    semAssinaturaEsquerda: assinaturas.esquerda === null,
    semAssinaturaDireita: assinaturas.direita === null,
    linhasImpressas,
  });

  /*
   * ⚠️ **A SEÇÃO É A FOLHA QUE GUARDA A EDIÇÃO DAS ASSINATURAS** (item 4 da conferência do PR #40,
   * 08/10/2026) — o *Imprimir* e o rodapé leem a mesma edição. A `key` zera o que foi editado ao
   * trocar de semana: o Next reaproveitaria o estado, e a edição de uma semana iria para o papel da
   * outra. O conteúdo continua servidor, por `children`.
   */
  return (
    <EdicaoDasAssinaturasNaTela
      key={`${escolha.ano}-${escolha.numero}`}
      className="flex min-w-0 flex-col gap-3"
    >
      <CabecalhoDoDsa codigo={codigo} rotulo={rotuloDaSemana(lida.dias)} ano={escolha.ano} />

      <NavegacaoDaSemana
        codigo={codigo}
        ano={escolha.ano}
        semana={escolha.numero}
        sabadoAberto={lida.sabadoAberto}
      />

      {aviso ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="aviso-de-semana">
          {aviso}
        </p>
      ) : null}

      {/*
        ⚠️ **SEMIPRESENCIAL SEM JANELA: AVISO, SEM BLOQUEIO** (`D-DSA-2`, `RN-DEG-01`). A tela não
           inventa a etapa — mostra o DSA como sempre e diz onde cadastrar.
      */}
      {etapa.tipo === "sem_janela" ? (
        <p
          role="status"
          className="text-sm text-atrasado-tinta"
          data-slot="dsa-sem-etapa-presencial"
        >
          Esta turma é semipresencial e não tem a etapa presencial cadastrada, então todas as
          semanas mostram o DSA.{" "}
          <Link
            href={enderecoDaTurma(codigo)}
            className="underline underline-offset-2 hover:text-texto"
          >
            Cadastre o início e o término da etapa presencial em «Editar turma».
          </Link>
        </p>
      ) : null}

      {/* A semana que a janela corta ao meio: o DSA abre, e os dias de fora são ditos. */}
      {diasADistancia.length > 0 ? (
        <p role="status" className="text-sm text-atrasado-tinta" data-slot="dsa-dias-a-distancia">
          Nesta semana, {diasADistancia.map((d) => dataComDiaDaSemana(d)).join(", ")}{" "}
          {diasADistancia.length === 1 ? "é" : "são"} da etapa a distância: neles não se lança.
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

      {/*
       * ⚠️ **O BOTÃO É UM LINK, e `window.print()` é de quem imprime, não da tela.** Abrir a
       * caixa de impressão sozinha tiraria da pessoa a chance de conferir o papel antes — e é
       * conferir antes que o `D-2` da planilha ensina a fazer.
       */}
      <div
        className="rounded-ciaara border-borda bg-superficie flex flex-col gap-2 border p-3"
        data-slot="barra-de-impressao"
      >
        <div className="flex flex-wrap items-center gap-3">
          {/* ⚠️ Folha de cliente: o endereço leva as assinaturas editadas no rodapé (item 4, 08/10/2026). */}
          <BotaoImprimir
            codigo={codigo}
            semana={escolha.numero}
            ano={escolha.ano}
            sabado={lida.sabadoAberto}
          />
          <span className="text-xs text-texto-suave">
            Uma página A4 paisagem, com as assinaturas da data desta semana.
          </span>
        </div>

        {/*
         * ⚠️ **NENHUM DELES BLOQUEIA O BOTÃO** (`RN-DEG-02`): *"regra normativa vira alerta, nunca
         * bloqueio"*. Quem precisa do papel hoje imprime com o traço no cabeçalho e corrige o
         * cadastro depois.
         */}
        {avisosDaImpressao.length > 0 ? (
          <div role="status" data-slot="avisos-da-impressao" className="flex flex-col gap-1">
            <p className="text-sm font-medium text-atrasado-tinta">
              O papel sai assim ({avisosDaImpressao.length} aviso
              {avisosDaImpressao.length > 1 ? "s" : ""}):
            </p>
            <ul className="list-disc pl-5 text-sm text-atrasado-tinta">
              {avisosDaImpressao.map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-col gap-3">
        <CabecalhoDaSemana dados={documento} />
        <PainelDeLancamento
          semana={lida.semana}
          grade={documento.grade}
          disciplinasDaSemana={documento.quadroDeCh.map((d) => ({
            codigo: d.codigo,
            nome: d.nome,
          }))}
          turmaId={turmaId}
          cursoId={cursoId}
          salaDaTurma={(turma.sala_alocada as string | null) ?? null}
          ano={escolha.ano}
          numeroDaSemana={escolha.numero}
          podeLancar={podeLancar}
          unidades={lida.unidades}
          disciplinas={lida.disciplinas}
          avaliacoesParaVista={lida.avaliacoesParaVista}
          instrutores={lida.instrutores}
          escala={lida.escala}
          tecnicas={lida.tecnicas}
          tiposDeAvaliacao={lida.tiposDeAvaliacao}
          subtipos={lida.subtipos}
          lancar={lancar}
          lancarEstudoIndividual={lancarEstudoIndividualDaSemana}
          mover={mover}
          atualizar={atualizar}
          excluir={excluir}
        />
      </div>

      {/*
        ⚠️ **O PAINEL FICA ABAIXO DA GRADE, EM LARGURA TOTAL** *(item 3 das correções de 08/10/2026,
           decisão de Bernardo Villas Boas)*. Até ali ele ficava ao lado a partir de `xl`, numa coluna
           de 384 px que apertava a grade v4 e cortava os nomes das disciplinas.
        ⚠️ **A CASCATA USA O LANÇADO ATÉ A SEMANA**, o mesmo corte da linha da disciplina — e não o
           lançado da turma inteira, que é o do formulário (`unidadesDaTurma`).
      */}
      <PainelDeSituacao
        quadros={quadros}
        unidades={lida.unidades.map((u) => ({ ...u, lancada: u.lancadaAteASemana }))}
        rotuloDaSemana={rotuloDaSemana(lida.dias)}
      />

      {/*
        ⚠️ **O RODAPÉ DO PAPEL, NA TELA** — carga horária acumulada, técnicas e as assinaturas da
           data da semana, do MESMO objeto do `/print/dsa`, no visual do sistema.
      */}
      <RodapeDaSemana dados={documento} nomeDeQuemImprime={usuario?.nome ?? null} />
    </EdicaoDasAssinaturasNaTela>
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
