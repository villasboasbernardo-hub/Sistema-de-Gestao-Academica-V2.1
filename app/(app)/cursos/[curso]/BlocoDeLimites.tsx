/**
 * *Limites máximos de AEC, TAD e TR* da página do curso (`FR-009`, `FR-005`, `RF-CURSO-06`; spec 014,
 * D-TETO-2).
 *
 * ⚠️ **SÓ O LIMITE, COM A ORIGEM** — sem cumprido e sem previsto, que são da turma. O limite e a origem
 *    vêm de `limiteMaximo` (ponto único); a lista de turmas excedidas vem de `tetosDaTurma`, pelo
 *    auxiliar `tetosExcedidos`. Nenhum segundo cálculo aqui.
 * ⚠️ SEM MARCADOR DE CLIENTE.
 */
import Link from "next/link";

import type { LimiteMaximo } from "@/lib/dominio/limite-maximo";
import { enderecoDaTurma } from "@/lib/navegacao/endereco-de-turma";

import { fraseDoExcedido, type TetoExcedido } from "../../turmas/tetos-excedidos";

export type LinhaDoLimite = {
  readonly sigla: "AEC" | "TAD" | "TR";
  readonly limite: LimiteMaximo;
  readonly pagina: number | null;
  readonly percentual: number | null;
  readonly chCurricular: number | null;
};

const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

function texto(l: LinhaDoLimite, ano: number): string {
  if (l.limite === "sem_ch_curricular")
    return `${l.sigla} — sem CH curricular, máximo não calculável`;
  if (l.limite === "parametro_nao_cadastrado")
    return `${l.sigla} — parâmetro não cadastrado para ${ano}`;
  if (l.limite.origem === "curriculo") {
    return `${l.sigla} — ${n(l.limite.valor)} TA (currículo${l.pagina ? `, p. ${l.pagina}` : ""})`;
  }
  return `${l.sigla} — ${n(l.limite.valor)} TA (norma: ${n(l.percentual ?? 0)} % de ${n(l.chCurricular ?? 0)})`;
}

export function BlocoDeLimites({
  linhas,
  ano,
  excedidos,
}: {
  readonly linhas: readonly LinhaDoLimite[];
  readonly ano: number;
  readonly excedidos: readonly TetoExcedido[];
}) {
  return (
    <section
      aria-labelledby="titulo-dos-limites"
      className="flex flex-col gap-2"
      data-slot="limites-do-curso"
    >
      <h2 id="titulo-dos-limites" className="text-texto text-base font-semibold">
        Limites máximos de AEC, TAD e TR
      </h2>
      <ul className="text-texto flex flex-col gap-0.5 text-sm">
        {linhas.map((l) => (
          <li key={l.sigla} data-limite={l.sigla}>
            {texto(l, ano)}
          </li>
        ))}
      </ul>
      {excedidos.length > 0 ? (
        <div className="flex flex-col gap-1" data-slot="turmas-com-teto-excedido">
          <p className="text-texto-suave text-xs">
            Turmas com teto excedido (alerta, não bloqueia):
          </p>
          <ul role="status" className="flex flex-col gap-0.5 text-sm">
            {excedidos.map((e) => (
              <li key={`${e.turmaCodigo}-${e.categoria}-${e.alerta}`}>
                <Link
                  href={enderecoDaTurma(e.turmaCodigo)}
                  className="text-atrasado-tinta underline-offset-2 hover:underline"
                  data-slot="turma-excedida"
                >
                  {fraseDoExcedido(e)}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
