/**
 * Os alertas de vista de prova (spec 014, FR-054, `RF-INI-04`, `RF-CURSO-06`, T182) — componente de servidor, o
 * MESMO na ficha da turma e no `/inicio`.
 *
 * ⚠️ **QUEM DECIDE É `alertasDeVista`**, sobre `situacaoDaAvaliacao` (ponto único, R-8): aqui só se desenha.
 * ⚠️ **INFORMATIVO** (`RN-DEG-02`): nada aqui bloqueia lançamento. Cada linha leva à aba Avaliações da turma, pelo
 *    módulo único de endereço (gotcha 12).
 * ⚠️ Sem alerta, o bloco NÃO aparece: na ficha e no `/inicio` a região de alertas geral já diz «nada exigindo
 *    atenção»; um segundo «nada» repetiria a frase.
 */
import Link from "next/link";

import type { AlertaDeVista } from "@/lib/dominio/avaliacoes/alertas-de-vista";
import { dataParaLeitura } from "@/lib/formato/data";
import { enderecoDasAvaliacoesDaTurma } from "@/lib/navegacao/endereco-de-turma";

export function AlertasDeVista({
  alertas,
  mostrarTurma,
}: {
  readonly alertas: readonly AlertaDeVista[];
  /** No `/inicio` a linha nomeia a turma; na ficha, não. */
  readonly mostrarTurma: boolean;
}) {
  if (alertas.length === 0) return null;
  const atrasadas = alertas.filter((a) => a.tipoDoAlerta === "atrasada").length;
  return (
    <section
      aria-labelledby="titulo-alertas-de-vista"
      className="border-atrasado-borda bg-atrasado-fundo rounded-ciaara flex flex-col gap-1 border p-3"
      data-slot="alertas-de-vista"
      data-atrasadas={atrasadas}
      data-quantidade={alertas.length}
    >
      <h2 id="titulo-alertas-de-vista" className="text-atrasado-tinta text-sm font-semibold">
        Vistas de prova
      </h2>
      <ul role="status" className="flex flex-col gap-0.5 text-sm">
        {alertas.map((a) => (
          <li key={a.id} data-alerta-de-vista={a.tipoDoAlerta}>
            <Link
              href={enderecoDasAvaliacoesDaTurma(a.turma)}
              className="text-atrasado-tinta underline-offset-2 hover:underline"
            >
              {mostrarTurma ? `${a.turma} · ` : ""}
              {a.disciplina} · {a.tipo} de {dataParaLeitura(a.aplicacao)}:{" "}
              {a.tipoDoAlerta === "atrasada"
                ? `vista atrasada (o prazo venceu em ${dataParaLeitura(a.venceEm)})`
                : `a vista vence em ${dataParaLeitura(a.venceEm)}`}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
