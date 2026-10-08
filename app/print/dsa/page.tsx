/**
 * O Detalhe Semanal de Aula **impresso**, no **modelo v4** (grade de dias × tempos) — `/print/dsa?turma=&semana=&ano=&sabado=`
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
import { datasDaSemanaIso } from "@/lib/dominio/carga-semanal";
import { etapaDaSemana, TEXTO_DA_ETAPA_A_DISTANCIA } from "@/lib/dominio/dsa/etapa-presencial";
import { hojeNaCiaara } from "@/lib/formato/ano-corrente";
import { criarClienteDeServidor } from "@/lib/supabase/server";

import {
  COLUNAS_DA_TURMA_DO_DSA,
  ehEadPuro,
  semanaEscolhida,
} from "../../(app)/turmas/[turma]/dsa/consulta";
import { lerExtrasDaImpressao, lerSemanaDoDsa } from "../../(app)/turmas/[turma]/dsa/leitura";
import { montarDocumentoDoDsa } from "./documento";
import { DocumentoDoDsa } from "./DocumentoDoDsa";

import "./impressao.css";

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
   * DELIBERADO.** Num documento, distinguir seria dizer a quem não tem alcance que a turma existe.
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

  /*
   * ⚠️ **`D-DSA-2` TAMBÉM NO PAPEL**: a semana da etapa a distância da turma semipresencial não tem
   * DSA, e imprimir uma grade vazia com assinaturas seria um documento falso. A tela não oferece o
   * botão nessa semana; quem chega pelo endereço lê a mesma frase da tela, pela mesma regra.
   */
  const etapa = etapaDaSemana(
    {
      modalidade: (turma.modalidade as string | null) ?? null,
      inicioEtapaPresencial: (turma.inicio_etapa_presencial as string | null) ?? null,
      terminoEtapaPresencial: (turma.termino_etapa_presencial as string | null) ?? null,
    },
    datasDaSemanaIso(escolha.ano, escolha.numero).slice(0, 6),
  );
  if (etapa.tipo === "fora") {
    return (
      <main className="dsa-impressao" data-slot="dsa-etapa-a-distancia">
        <p>{TEXTO_DA_ETAPA_A_DISTANCIA}</p>
      </main>
    );
  }

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

  const dados = montarDocumentoDoDsa({
    codigoDaTurma: codigo,
    turma,
    cursoId,
    escolha,
    lida,
    extras,
    hoje,
  });

  return (
    <main className="dsa-impressao">
      <DocumentoDoDsa
        dados={dados}
        nomeDeQuemImprime={usuario?.nome ?? null}
        geradoEm={new Date().toISOString()}
      />
    </main>
  );
}

export const metadata = { title: "Detalhe Semanal de Aula — impressão" };
