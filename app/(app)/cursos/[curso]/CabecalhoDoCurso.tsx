/**
 * O cabeçalho identificador do curso, com o **regime vigente** (`FR-011`, `RF-CURSO-01`).
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** É texto e um vínculo.
 *
 * ⚠️ **O REGIME VEM DE `vw_cursos_regime_vigente`, e não é recalculado aqui.** A vigência é resolvida
 * pelo banco, pelo maior `vigente_de <= hoje`; recalcular na tela criaria uma segunda resposta para
 * "qual regime vale hoje", e as duas divergiriam na fronteira de uma data.
 *
 * ⚠️ **ONDE SE REGISTRA E CORRIGE A VIGÊNCIA É `/cursos/[curso]/editar`** (`FR-013.1`, decisão de
 * 17/09/2026) — o cabeçalho **mostra** e aponta, nunca edita.
 *
 * ⚠️ **REGIME AUSENTE NÃO É ERRO DE TELA.** Todo curso tem vigência `padrao` por gatilho adiado
 * (`FR-019.5`), mas a view pode não trazer a linha num curso recém-criado dentro da mesma transação.
 * A ausência vira um traço, nunca uma exceção (`RN-DEG-01`).
 */
import Link from "next/link";

import { BadgeStatus } from "@/components/ciaara/badge-status";
import { buttonVariants } from "@/components/ui/button";
import {
  ROTULO_DA_CLASSIFICACAO,
  ehClassificacaoDeCurso,
} from "@/lib/dominio/classificacoes-de-curso";

export type RegimeVigente = {
  readonly tempos: number | null;
  readonly duracaoTaMin: number | null;
  readonly horaInicioManha: string | null;
  readonly horaInicioTarde: string | null;
  readonly limiteDiarioEadHoras: number | null;
};

export type CursoNoCabecalho = {
  readonly codigo: string;
  readonly nome: string;
  readonly classificacao: string;
  readonly modalidade: string | null;
  readonly ativo: boolean;
};

const ROTULO_DA_MODALIDADE: Readonly<Record<string, string>> = {
  presencial: "Presencial",
  ead: "EAD",
  semipresencial: "Semipresencial",
};

/** O regime em uma frase — o que a Divisão diria em voz alta. */
function regimeEmPalavras(regime: RegimeVigente | null): string {
  if (regime === null || regime.tempos === null) return "—";
  const partes = [`${regime.tempos} TA por dia`];
  if (regime.duracaoTaMin !== null) partes.push(`${regime.duracaoTaMin} min cada`);
  if (regime.horaInicioManha !== null)
    partes.push(`manhã às ${regime.horaInicioManha.slice(0, 5)}`);
  if (regime.horaInicioTarde !== null)
    partes.push(`tarde às ${regime.horaInicioTarde.slice(0, 5)}`);
  if (regime.limiteDiarioEadHoras !== null) {
    partes.push(`limite diário EAD de ${regime.limiteDiarioEadHoras} h`);
  }
  return partes.join(" · ");
}

export function CabecalhoDoCurso({
  curso,
  regime,
  podeAbrirEdicao,
}: {
  readonly curso: CursoNoCabecalho;
  readonly regime: RegimeVigente | null;
  /**
   * A **mesma** regra de alcance da página de edição: `cursos.editar` **ou** `horarios.criar`.
   *
   * ⚠️ **NÃO É `cursos.editar` SOZINHO, e a diferença tem nome.** `/cursos/[curso]/editar` atende
   *    duas permissões — editar o cadastro é uma, registrar vigência é outra —, e o **Operador**
   *    tem a segunda sem ter a primeira. Um botão preso à primeira o deixaria sem caminho clicável
   *    para o que a policy lhe permite fazer, que é exatamente o defeito que esta prop conserta.
   */
  readonly podeAbrirEdicao: boolean;
}) {
  const classificacao = ehClassificacaoDeCurso(curso.classificacao)
    ? ROTULO_DA_CLASSIFICACAO[curso.classificacao]
    : curso.classificacao;

  return (
    <header className="flex flex-col gap-2" data-slot="cabecalho-do-curso">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h1 className="text-texto text-xl font-semibold" data-slot="sigla-do-curso">
          {curso.codigo}
        </h1>
        <p className="text-texto text-base">{curso.nome}</p>
        {curso.ativo ? null : <BadgeStatus tom="inativo" rotulo="Fora de oferta" />}

        {/*
          ⚠️ **A ENTRADA PARA A EDIÇÃO, NO CABEÇALHO E COM ESTE NOME.** Até 24/09/2026 a única era
             o link *"histórico e correção"*, ao lado do regime — e ninguém lê aquilo como *"editar
             curso"*. A conferência de Bernardo encontrou; o link continua, porque leva ao mesmo
             lugar por outro motivo, mas deixou de ser a única porta.
        */}
        {podeAbrirEdicao ? (
          <Link
            href={`/cursos/${encodeURIComponent(curso.codigo)}/editar`}
            className={buttonVariants({ size: "sm", variant: "outline" })}
            data-slot="ir-para-editar-curso"
          >
            Editar curso
          </Link>
        ) : null}
      </div>

      <p className="text-texto-suave text-sm" data-slot="catalogo-resumido">
        {classificacao}
        {curso.modalidade ? ` · ${ROTULO_DA_MODALIDADE[curso.modalidade] ?? curso.modalidade}` : ""}
      </p>

      <p className="text-sm" data-slot="regime-vigente">
        {/* veste: o rótulo "Regime vigente"; o que vem depois é dado */}
        <span className="text-texto-tenue">Regime vigente:</span>{" "}
        <span className="text-texto-suave">{regimeEmPalavras(regime)}</span>
        {podeAbrirEdicao ? (
          <>
            {" — "}
            <Link
              href={`/cursos/${encodeURIComponent(curso.codigo)}/editar`}
              className="text-texto underline-offset-2 hover:underline"
              data-slot="ir-para-historico-de-regime"
            >
              histórico e correção
            </Link>
          </>
        ) : null}
      </p>
    </header>
  );
}
