/**
 * A **montagem** do documento do DSA — uma só, para a tela e para o papel (`RF-PDF-01`,
 * `RF-DSA-06`).
 *
 * ⚠️ **AS DUAS ROTAS CHAMAM ESTA FUNÇÃO, e é isso que impede o `D-5`/`D-6` da planilha** — o
 * ESPELHO e a IMPRESSÃO liam linhas diferentes do mesmo dado e ninguém via. Aqui não há o que
 * divergir: a grade da tela e a do papel saem do mesmo objeto.
 *
 * ⚠️ **NENHUMA REGRA NOVA**: tudo vem de `lib/dominio/dsa` (`documentoImpresso`, `gradeDoPapel`,
 * `tabelaDeCh`, `legendaDeTecnicas`, `taLancadoAFrente`, `numeroDoDsa`, `assinaturasDoDsa`).
 */
import { assinaturasDoDsa, type Assinatura } from "@/lib/dominio/dsa/assinaturas";
import { gradeDoPapel, type GradeDoPapel } from "@/lib/dominio/dsa/grade-do-papel";
import {
  documentoImpresso,
  legendaDeTecnicas,
  tabelaDeCh,
  taLancadoAFrente,
  type DiaImpresso,
  type ExecucaoDaDisciplina,
  type ItemDaLegenda,
} from "@/lib/dominio/dsa/impressao";
import { numeroDoDsa } from "@/lib/dominio/dsa/numero-do-dsa";

import { execucaoAteASemana } from "../../(app)/turmas/[turma]/dsa/consulta";
import type { lerExtrasDaImpressao, lerSemanaDoDsa } from "../../(app)/turmas/[turma]/dsa/leitura";

type SemanaLida = Awaited<ReturnType<typeof lerSemanaDoDsa>>;
type Extras = Awaited<ReturnType<typeof lerExtrasDaImpressao>>;

export type DadosDoDocumento = {
  readonly curso: string;
  readonly numero: number | null;
  readonly semana: { readonly ano: number; readonly numero: number };
  readonly primeiro: string;
  readonly ultimo: string;
  readonly alunos: number | null;
  readonly dias: readonly DiaImpresso[];
  readonly grade: GradeDoPapel | null;
  readonly quadroDeCh: readonly ExecucaoDaDisciplina[];
  readonly legenda: readonly ItemDaLegenda[];
  readonly aFrente: number;
  readonly assinaturas: {
    readonly esquerda: Assinatura | null;
    readonly direita: Assinatura | null;
  };
};

export function montarDocumentoDoDsa(entrada: {
  readonly codigoDaTurma: string;
  readonly turma: { readonly data_inicio?: unknown; readonly alunos?: unknown };
  readonly cursoId: string;
  readonly escolha: { readonly ano: number; readonly numero: number };
  readonly lida: SemanaLida;
  readonly extras: Extras;
  readonly hoje: string;
  /** A tela pede as linhas da semana inteira; o papel não passa nada (`gradeDoPapel`). */
  readonly minimoDeTempos?: number;
}): DadosDoDocumento {
  const { lida, extras, escolha, hoje, cursoId } = entrada;
  const dias = documentoImpresso(lida.semana, {
    tecnicas: lida.tecnicasComSigla,
    idsDeEstudoIndividual: lida.idsDeEstudoIndividual,
  });
  const primeiro = lida.dias[0] ?? hoje;
  const ultimo = lida.dias[lida.dias.length - 1] ?? hoje;
  return {
    curso: lida.cursoCodigo ?? entrada.codigoDaTurma,
    numero: numeroDoDsa({
      datasComLancamento: extras.datasComLancamentoDaTurma,
      dataInicio: (entrada.turma.data_inicio as string | null | undefined) ?? null,
      semana: { ano: escolha.ano, numero: escolha.numero },
    }),
    semana: { ano: escolha.ano, numero: escolha.numero },
    primeiro,
    ultimo,
    alunos: (entrada.turma.alunos as number | null | undefined) ?? null,
    dias,
    grade: gradeDoPapel(
      dias,
      lida.relogio,
      entrada.minimoDeTempos === undefined ? {} : { minimoDeTempos: entrada.minimoDeTempos },
    ),
    /*
     * ⚠️ A CH cumprida é a ACUMULADA ATÉ ESTA SEMANA (`RN-CRONOS-03`), pelo mesmo cálculo do painel
     * de situação da tela.
     */
    quadroDeCh: tabelaDeCh(
      dias,
      execucaoAteASemana({
        execucao: extras.execucao,
        ocupacao: lida.ocupacaoAcumulada,
        ateODia: ultimo,
      }),
    ),
    legenda: legendaDeTecnicas(dias, lida.tecnicasComSigla),
    aFrente: taLancadoAFrente(dias),
    /* ⚠️ Pela data da SEMANA, não a de hoje (`FR-036`, critério 3 do Épico 6). */
    assinaturas: assinaturasDoDsa(extras.responsaveis, { cursoId, data: primeiro }),
  };
}
