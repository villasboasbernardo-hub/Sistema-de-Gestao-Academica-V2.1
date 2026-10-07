/**
 * O Detalhe Semanal de Aula **impresso** — `/print/dsa?turma=&semana=&ano=&sabado=`
 * (`RF-PDF-01`, `RF-DSA-06`, `RF-INSTR-15`, `FR-036`, `FR-036.1`, `RNF-COMP-01` · spec 013, PR 3).
 *
 * ⚠️ **ELA VIVE FORA DE `(app)`, E ISSO É O DESENHO: SEM CASCA, SEM MENU, SEM BOTÃO.** O contrato
 * da impressão diz *"a rota é só o documento"*, e `window.print()` é de quem imprime — abrir a
 * caixa de impressão sozinha tiraria da pessoa a chance de **conferir o papel antes**, que é
 * exatamente o que o `D-2` da planilha ensina a fazer (`#REF!` e *"VERIFICAR Nº DE TA"* saíram
 * impressos em 10 das 15, porque ninguém olhava a aba IMPRESSÃO).
 *
 * ⚠️ **ELA LÊ A MESMA SEMANA QUE A TELA, PELA MESMA FUNÇÃO** (`leitura.ts`). Isso não é economia de
 * código: é a correção do `D-5` e do `D-6`. Na planilha o ESPELHO e a IMPRESSÃO liam linhas
 * diferentes do mesmo dado, e **ninguém via** — a inspeção da CAC contou **11.918** erros de
 * fórmula antes da correção, com *"um bloco inteiro da IMPRESSÃO lendo uma linha acima do
 * ESPELHO"*.
 *
 * ⚠️ **OS PARÂMETROS SÃO HERDADOS «SEM TRADUÇÃO»** (`T078`, documento 25 §1.3 item 2): a turma vem
 * na **consulta**, não no caminho, porque a rota está fora do segmento dinâmico `/turmas/[turma]`.
 * Quem monta o endereço é `enderecoDaImpressaoDoDsa`, no módulo **único** autorizado a escrever
 * `?turma=` (`FR-031.2`) — o código da turma contém espaços, e montá-lo à mão falha **em silêncio**
 * na primeira tela que esquecer de codificar (gotcha 12).
 *
 * ⚠️ **NENHUM AVISO CHEGA AO PAPEL** (`FR-039`, `SC-013`): dado faltante vira aviso **na tela da
 * grade**, ao lado do botão *Imprimir*, **antes** de abrir a impressão. Esta rota recebe o que a
 * tela já validou, e ausência sai como **célula vazia** — nunca `null`, `undefined`, `NaN` ou
 * identificador.
 *
 * ⚠️ **A PERMISSÃO É A MESMA DA TELA DE DESTINO** (`SC-003`): quem não lê `registros_aula` cai em
 * `notFound()`. Uma rota de impressão sem porteiro seria um vazamento de DSA alheio por URL.
 */
import { notFound } from "next/navigation";

import { permissoesDoPerfil, pode } from "@/lib/autorizacao/matriz";
import { usuarioDaSessao } from "@/lib/autorizacao/sessao";
import { assinaturasDoDsa, type Assinatura } from "@/lib/dominio/dsa/assinaturas";
import {
  documentoImpresso,
  legendaDeTecnicas,
  NOTA_DO_ESTUDO_INDIVIDUAL,
  ROTULO_DE_OBSERVACOES,
  tabelaDeCh,
  taLancadoAFrente,
  type DiaImpresso,
  type LinhaImpressa,
} from "@/lib/dominio/dsa/impressao";
import { numeroDoDsa, NUMERO_AUSENTE_NO_CABECALHO } from "@/lib/dominio/dsa/numero-do-dsa";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import {
  dataComDiaDaSemana,
  dataParaLeitura,
  instanteComHoraParaLeitura,
} from "@/lib/formato/data";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  COLUNAS_DA_TURMA_DO_DSA,
  ehEadPuro,
  execucaoAteASemana,
  semanaEscolhida,
} from "../../(app)/turmas/[turma]/dsa/consulta";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "../../(app)/turmas/[turma]/dsa/leitura";

import "./impressao.css";

/** O cabeçalho institucional — **texto fixo do documento oficial** (`praticas-da-planilha.md` §1.2). */
const SIGLA_DA_ORGANIZACAO = "CIAARA";
const NOME_DA_ORGANIZACAO = "CENTRO DE INSTRUÇÃO E ADESTRAMENTO ALMIRANTE RADLER DE AQUINO";

export default async function ImpressaoDoDsa({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const busca = await searchParams;
  const umValor = (nome: string): string => {
    const valor = busca[nome];
    return Array.isArray(valor) ? (valor[0] ?? "") : (valor ?? "");
  };

  /* ⚠️ **SEM TURMA NÃO HÁ DOCUMENTO** (`T078`): `not-found`, e não uma folha em branco. */
  const codigo = umValor("turma").trim();
  if (codigo === "") notFound();

  const usuario = await usuarioDaSessao();
  const permissoes = await permissoesDoPerfil(usuario?.perfil ?? null);
  if (!pode(permissoes, "registros_aula", "ler")) notFound();

  const supabase = await criarClienteDeServidor();
  const { data: turma } = await supabase
    .from("turmas")
    .select(COLUNAS_DA_TURMA_DO_DSA)
    .eq("codigo", codigo)
    .maybeSingle();

  /*
   * ⚠️ **TURMA FORA DO ALCANCE E TURMA INEXISTENTE DÃO O MESMO `not-found`, e aqui isso é
   * DELIBERADO.** Na tela as duas se distinguem, porque quem navega precisa saber se é falta de
   * permissão (gotcha 4). Num documento, distinguir seria dizer a quem não tem alcance que aquela
   * turma existe.
   */
  if (!turma) notFound();
  if (ehEadPuro(turma.modalidade as string | null)) notFound();

  const hoje = hojeNaCiaara();
  const escolha = semanaEscolhida({
    semana: Number(umValor("semana")),
    ano: Number(umValor("ano")),
    hoje,
  });

  const turmaId = turma.id as string;
  const cursoId = turma.curso_id as string;

  /* ⚠️ As duas leituras são independentes: uma rodada só de banco por impressão. */
  const [lida, extras] = await Promise.all([
    lerSemanaDoDsa(supabase, {
      turmaId,
      cursoId,
      ano: escolha.ano,
      numero: escolha.numero,
      sabadoPedido: umValor("sabado") === "sim",
      hoje,
    }),
    lerExtrasDaImpressao(supabase, { turmaId, cursoId }),
  ]);

  const dias = documentoImpresso(lida.semana, {
    tecnicas: lida.tecnicasComSigla,
    idsDeEstudoIndividual: lida.idsDeEstudoIndividual,
  });
  const primeiro = lida.dias[0] ?? hoje;
  const ultimo = lida.dias[lida.dias.length - 1] ?? hoje;

  const numero = numeroDoDsa({
    datasComLancamento: extras.datasComLancamentoDaTurma,
    dataInicio: (turma.data_inicio as string | null) ?? null,
    semana: { ano: escolha.ano, numero: escolha.numero },
  });
  /*
   * ⚠️ **AS ASSINATURAS SÃO RESOLVIDAS PELA DATA DA SEMANA, NÃO PELA DE HOJE** (`FR-036`, critério
   * **3** do Épico 6): *"reimprimir hoje um DSA de março traz quem assinava em março, não quem
   * assina hoje"*. Trocar `primeiro` por `hoje` aqui faria o documento histórico sair com a
   * assinatura errada, **sem erro nenhum**.
   */
  const assinaturas = assinaturasDoDsa(extras.responsaveis, { cursoId, data: primeiro });
  /*
   * ⚠️ **A CH CUMPRIDA DO RODAPÉ É A ACUMULADA ATÉ ESTA SEMANA, não o total da turma**
   * (`RN-CRONOS-03`). `execucaoAteASemana` repassa o acumulado do painel de situação da grade — o
   * MESMO cálculo —, então o papel e a tela não têm mais como discordar. Até 06/10/2026 entrava
   * aqui o `ta_executados` da view, e um DSA da primeira semana saía com a disciplina concluída.
   */
  const quadroDeCh = tabelaDeCh(
    dias,
    execucaoAteASemana({
      execucao: extras.execucao,
      ocupacao: lida.ocupacaoAcumulada,
      ateODia: ultimo,
    }),
  );
  const legenda = legendaDeTecnicas(dias, lida.tecnicasComSigla);
  const alunos = (turma.alunos as number | null) ?? null;
  const aFrente = taLancadoAFrente(dias);

  return (
    <main className="dsa-impresso" data-slot="dsa-impresso">
      <header>
        <div className="dsa-cabecalho">
          <div>{SIGLA_DA_ORGANIZACAO}</div>
          <div>{NOME_DA_ORGANIZACAO}</div>
        </div>
        <div className="dsa-identificacao">
          <span data-slot="dsa-curso">{lida.cursoCodigo ?? codigo}</span>
          <span data-slot="dsa-numero">
            DETALHE SEMANAL DE AULAS Nº {numero === null ? NUMERO_AUSENTE_NO_CABECALHO : numero}
          </span>
          <span data-slot="dsa-intervalo">
            SEMANA DE {dataParaLeitura(primeiro)} A {dataParaLeitura(ultimo)}
          </span>
        </div>
      </header>

      <table data-slot="dsa-corpo">
        <colgroup>
          <col className="dsa-col-dia" />
          <col className="dsa-col-horario" />
          <col className="dsa-col-disciplina" />
          <col className="dsa-col-ta" />
          <col className="dsa-col-conteudo" />
          <col className="dsa-col-local" />
          <col className="dsa-col-te" />
          <col className="dsa-col-instrutor" />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Horário</th>
            <th scope="col">Disciplina</th>
            <th scope="col">TA</th>
            <th scope="col">Unidades de ensino e tópicos</th>
            <th scope="col">Local</th>
            <th scope="col">T/E</th>
            <th scope="col">Instrutor/Professor</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((dia) => (
            <FaixaDoDia key={dia.data} dia={dia} />
          ))}
        </tbody>
      </table>

      <div className="dsa-rodape">
        <div data-slot="dsa-gerado-em">
          Gerado em: {instanteComHoraParaLeitura(new Date().toISOString())}
        </div>
        <div data-slot="dsa-nota-do-ei">{NOTA_DO_ESTUDO_INDIVIDUAL}</div>

        {/*
          ⚠️ **O EFETIVO SAI SÓ QUANDO ESTÁ CADASTRADO** (`RN-DEG-01`). O `D-8` da planilha registra
             *"Nº DE ALUNOS: ASD"* — texto no lugar do número — como defeito a não repetir; omitir é
             honesto, e a tela já avisou antes de imprimir (`FR-039`).
        */}
        {alunos === null ? null : <div data-slot="dsa-alunos">{alunos} ALUNOS</div>}

        {/*
          ⚠️ **O «LANÇADO À FRENTE» É CONTEÚDO DO DOCUMENTO, não aviso de tela** (`Q-2`,
             `FR-028.1`). O DSA sai **antes** da semana — medido: em 05/10/2026 todas as planilhas
             ativas já estavam preenchidas até 09 ou 10/10 —, então o papel quase sempre tem TA que
             ainda não aconteceram. Dizer quantos é o que separa *previsto* de *cumprido*, que é
             exatamente a confusão do `D-5`.
        */}
        {aFrente === 0 ? null : (
          <div data-slot="dsa-a-frente">
            {aFrente} TA desta semana estão lançados para datas que ainda não chegaram.
          </div>
        )}

        <div className="dsa-rodape-quadros">
          {/* ⚠️ **SÓ AS DISCIPLINAS DA SEMANA** (`SC-014`) — listar o currículo inteiro estoura a A4. */}
          {quadroDeCh.length > 0 ? (
            <table data-slot="dsa-quadro-de-ch">
              <thead>
                <tr>
                  <th scope="col">Cód.</th>
                  <th scope="col">Disciplina</th>
                  <th scope="col">CH. prevista</th>
                  <th scope="col">CH. cumprida</th>
                </tr>
              </thead>
              <tbody>
                {quadroDeCh.map((d) => (
                  <tr key={d.codigo}>
                    <td>{d.codigo}</td>
                    <td>{d.nome}</td>
                    <td className="dsa-ta">{d.prevista}</td>
                    <td className="dsa-ta">{d.cumprida}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}

          {/* ⚠️ **SÓ AS SIGLAS USADAS** (`SC-014`); a que imprimiu por extenso não entra. */}
          {legenda.length > 0 ? (
            <div data-slot="dsa-legenda">
              <strong>TÉCNICAS DE ENSINO:</strong>{" "}
              {legenda.map((i) => `${i.sigla} — ${i.nome}`).join("; ")}
            </div>
          ) : null}
        </div>

        {/*
          ⚠️ **A LINHA DE OBSERVAÇÕES SAI EM BRANCO, PARA ESCREVER À MÃO** (`H8`, opção **a**,
             decisão de Bernardo Villas Boas de 05/10/2026). **Nenhum** dos PDFs medidos tem este
             campo, e o `RF-DSA-06` e o `RF-PDF-01` o exigem **literalmente** — a linha vazia
             satisfaz o requisito **[PRESERVADO]** sem inventar conteúdo nem contrariar o documento
             assinado. A divergência está registrada no `spec.md` §11 item 1.
        */}
        <div data-slot="dsa-observacoes">
          <strong>{ROTULO_DE_OBSERVACOES}</strong>
          <div className="dsa-observacoes" />
        </div>
      </div>

      <div className="dsa-assinaturas" data-slot="dsa-assinaturas">
        <Rubrica
          lado="esquerda"
          assinatura={assinaturas.esquerda}
          nomeDeQuemImprime={usuario?.nome ?? null}
        />
        <Rubrica
          lado="direita"
          assinatura={assinaturas.direita}
          nomeDeQuemImprime={usuario?.nome ?? null}
        />
      </div>
    </main>
  );
}

/**
 * Um dia do documento — as linhas, com `DIA` escrito **uma vez** (`rowSpan`).
 *
 * ⚠️ **O FERIADO DE DIA INTEIRO SAI COMO UMA FAIXA COM A DESCRIÇÃO** (`Q-16`), e **sem** a linha
 * FIXA de Estudo Individual: não há estudo individual a oferecer em dia que não houve expediente.
 *
 * ⚠️ **O QUE FOI LANÇADO NAQUELE DIA SAI ABAIXO DA FAIXA** *(decisão de Bernardo Villas Boas,
 * 06/10/2026)* — `diaImpresso` devolve essas linhas, e só elas. O `DIA` continua escrito uma vez,
 * cobrindo a faixa e os lançamentos.
 */
function FaixaDoDia({ dia }: { readonly dia: DiaImpresso }) {
  const rotulo = dataComDiaDaSemana(dia.data);

  if (dia.bloqueio !== null) {
    return (
      <>
        <tr data-slot="dsa-dia-bloqueado">
          <td className="dsa-dia" rowSpan={dia.linhas.length + 1}>
            {rotulo}
          </td>
          <td className="dsa-bloqueio" colSpan={7}>
            {dia.bloqueio}
          </td>
        </tr>
        {dia.linhas.map((linha) => (
          <tr
            key={linha.chave}
            data-slot="dsa-linha"
            data-dia-bloqueado="sim"
            className={linha.estudoIndividual ? "dsa-linha-ei" : undefined}
          >
            <CelulasDaLinha linha={linha} />
          </tr>
        ))}
      </>
    );
  }

  return (
    <>
      {dia.linhas.map((linha, indice) => (
        <tr
          key={linha.chave}
          data-slot="dsa-linha"
          className={linha.estudoIndividual ? "dsa-linha-ei" : undefined}
        >
          {indice === 0 ? (
            <td className="dsa-dia" rowSpan={dia.linhas.length}>
              {rotulo}
            </td>
          ) : null}
          <CelulasDaLinha linha={linha} />
        </tr>
      ))}
    </>
  );
}

/** As sete colunas que vêm depois de `DIA`. */
function CelulasDaLinha({ linha }: { readonly linha: LinhaImpressa }) {
  return (
    <>
      <td className="dsa-horario">
        {/*
          ⚠️ **UM TRECHO POR LINHA — é a correção do `D-3`** (`SC-011`). A planilha imprimia
             *"09:30 as 13:50"* para 4 TA que atravessam o almoço: **64** ocorrências no CAHO e
             **50** no C-Espc-FR, um horário contínuo que inclui o intervalo de almoço.
        */}
        {linha.trechos.map((t) => (
          <span key={`${t.inicio}-${t.fim}`} className="dsa-trecho">
            {t.inicio} às {t.fim}
          </span>
        ))}
      </td>
      <td>{linha.disciplina}</td>
      <td className="dsa-ta">{linha.tempos === null ? "" : linha.tempos}</td>
      <td>{linha.conteudo}</td>
      <td>{linha.local}</td>
      <td className="dsa-te">{linha.te}</td>
      <td>{linha.instrutor}</td>
    </>
  );
}

/**
 * Uma rubrica do rodapé — nome completo, posto/graduação e a função.
 *
 * ⚠️ **SEM RESPONSÁVEL VIGENTE, A LINHA SAI EM BRANCO — NUNCA UM ERRO** (`FR-036`, `RN-DEG-01`): o
 * `comment on column responsaveis_curso.vigente_de` explica por que isto é o comportamento
 * **honesto**, e não degradação — *"um DSA de semana anterior reimprimido sai sem assinatura: naquela
 * data não havia responsável cadastrado"*. Inventar quem assinou é afirmar retroativamente que
 * alguém assinou um documento que saiu em branco.
 *
 * ⚠️ **NO MODO `dinamico_usuario_logado` QUEM ASSINA É QUEM IMPRIME, e a FUNÇÃO continua vindo da
 * LINHA** (`Q-14`): se o cargo viesse da sessão, o rodapé diria que o Ajudante é o Encarregado da
 * Divisão. ⚠️ **E o posto sai VAZIO nesse modo, porque `usuarios` não tem posto** — medido: a tabela
 * guarda nome, e-mail e perfil. Imprimir o posto da linha dinâmica seria imprimir o posto **de outra
 * pessoa**.
 */
function Rubrica({
  lado,
  assinatura,
  nomeDeQuemImprime,
}: {
  readonly lado: "esquerda" | "direita";
  readonly assinatura: Assinatura | null;
  readonly nomeDeQuemImprime: string | null;
}) {
  if (assinatura === null) {
    return (
      <div className="dsa-assinatura" data-slot={`dsa-assinatura-${lado}`}>
        <div className="dsa-rubrica" />
      </div>
    );
  }

  const nome = assinatura.resolvePeloUsuarioLogado
    ? (nomeDeQuemImprime ?? "")
    : (assinatura.nomeCompleto ?? "");
  const posto = assinatura.resolvePeloUsuarioLogado ? "" : (assinatura.postoGraduacao ?? "");

  return (
    <div className="dsa-assinatura" data-slot={`dsa-assinatura-${lado}`}>
      <div className="dsa-rubrica" />
      <div className="dsa-nome-de-guerra">{[posto, nome].filter((p) => p !== "").join(" ")}</div>
      <div>{assinatura.funcaoDescricao}</div>
    </div>
  );
}

export const metadata = { title: "Detalhe Semanal de Aula — impressão" };
