import type * as React from "react";
import { BadgeStatus, BarraDeProgresso } from "ciaara-11-ds";

/*
 * A barra não tem rótulo visível próprio: quem chama escreve o número ao lado, em texto — a cor e a
 * largura nunca comunicam sozinhas.
 */
function Medida({
  turma,
  numero,
  detalhe,
  children,
}: {
  readonly turma: string;
  readonly numero: string;
  readonly detalhe: string;
  readonly children: React.ReactNode;
}) {
  return (
    <div className="flex max-w-md flex-col gap-1">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="text-texto font-medium">{turma}</span>
        <span className="text-texto tabular-nums">{numero}</span>
      </div>
      {children}
      <span className="text-texto-suave text-xs tabular-nums">{detalhe}</span>
    </div>
  );
}

export function EmDia() {
  return (
    <Medida turma="C-Ap-HN 2026" numero="70%" detalhe="816 de 1.165 TA executados">
      <BarraDeProgresso valor={70} rotuloAcessivel="Progresso da turma: 70% da carga prevista" />
    </Medida>
  );
}

export function EmAtraso() {
  return (
    <div className="flex max-w-md flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <BadgeStatus tom="atrasado" rotulo="Em atraso" />
        <span className="text-texto-suave">
          A capacidade restante até o término não cobre a carga que falta.
        </span>
      </div>
      <Medida turma="C-Ap-FR 2026" numero="35%" detalhe="408 de 1.165 TA executados">
        <BarraDeProgresso
          valor={35}
          tom="atrasado"
          rotuloAcessivel="Progresso da turma: 35% da carga prevista"
        />
      </Medida>
    </div>
  );
}

/** Acima de 100% a faixa para na caixa, e o número não: o excesso continua dito. */
export function AcimaDoPrevisto() {
  return (
    <Medida turma="C-Exp-MetocOf 2026" numero="120%" detalhe="96 de 80 TA — acima do previsto">
      <BarraDeProgresso valor={120} rotuloAcessivel="Progresso da turma: 120% da carga prevista" />
    </Medida>
  );
}

/** Sem carga prevista não há percentual: a barra não desenha nada e quem chama diz a frase. */
export function SemPercentual() {
  return (
    <Medida
      turma="C-Espc-FR 2026 · currículo por competências"
      numero="—"
      detalhe="O curso não tem carga curricular lançada em disciplinas."
    >
      <BarraDeProgresso valor={null} rotuloAcessivel="Progresso da turma" />
    </Medida>
  );
}

/** Os quatro casos lado a lado, como no panorama de turmas. */
export function PanoramaDeTurmas() {
  return (
    <div className="flex max-w-md flex-col gap-4">
      <Medida turma="C-Ap-HN 2026" numero="70%" detalhe="816 de 1.165 TA">
        <BarraDeProgresso valor={70} rotuloAcessivel="C-Ap-HN 2026: 70% da carga prevista" />
      </Medida>
      <Medida turma="C-Ap-FR 2026" numero="35%" detalhe="408 de 1.165 TA — em atraso">
        <BarraDeProgresso
          valor={35}
          tom="atrasado"
          rotuloAcessivel="C-Ap-FR 2026: 35% da carga prevista"
        />
      </Medida>
      <Medida turma="C-Exp-MetocOf 2026" numero="120%" detalhe="96 de 80 TA">
        <BarraDeProgresso
          valor={120}
          rotuloAcessivel="C-Exp-MetocOf 2026: 120% da carga prevista"
        />
      </Medida>
      <Medida turma="C-Espc-FR 2026" numero="—" detalhe="Sem carga curricular lançada">
        <BarraDeProgresso valor={null} rotuloAcessivel="C-Espc-FR 2026" />
      </Medida>
    </div>
  );
}
