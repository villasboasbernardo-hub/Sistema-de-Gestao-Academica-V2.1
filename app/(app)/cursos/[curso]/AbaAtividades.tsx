/**
 * A aba **Atividades** da página do curso — *"Atividades extraclasse previstas no currículo"* (spec 018, FR-005, C-6;
 * pedido de Bernardo Villas Boas, 19/10/2026: *"o que o currículo prevê de AEC/TAD/TR e afins (o acompanhamento é da
 * turma, não do curso)"*) — componente de servidor.
 *
 * ⚠️ **SÓ O PREVISTO.** Nenhum cumprido, nenhuma turma: o lançamento e o acompanhamento são da ficha da turma. Os
 *    limites vêm de `limiteMaximo` (ponto único, com a origem — currículo ou norma); a referência do Estudo
 *    Individual é **informativa** (não compõe a CHT, `RN-EVT-01`); o catálogo de tipos é o mesmo que o DSA oferece, e
 *    o tipo decide a categoria (`RF-EXTRA-01`).
 * ⚠️ **O TÍTULO DIZ "previstas no currículo"** para não se confundir com o menu *Atividades* (as da turma, em breve).
 * ⚠️ SEM MARCADOR DE CLIENTE.
 */
import {
  CATEGORIAS_DE_ATIVIDADE,
  ROTULO_DA_CATEGORIA_DE_ATIVIDADE,
  categoriaPeloTipo,
  type CategoriaDeAtividade,
  type TipoDeAtividade,
} from "@/lib/dominio/categoria-pelo-tipo";

import { LimitesDoCurso, type LinhaDoLimite } from "./BlocoDeLimites";

const n = (v: number) => v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });

export function AbaAtividades({
  limites,
  ano,
  estudoIndividual,
  tipos,
}: {
  readonly limites: readonly LinhaDoLimite[];
  readonly ano: number;
  /** Os percentuais de referência do Estudo Individual no ano (`config_parametros`); `null` = não cadastrado. */
  readonly estudoIndividual: {
    readonly comEstudoObrigatorio: number | null;
    readonly semEstudoObrigatorio: number | null;
  };
  readonly tipos: readonly TipoDeAtividade[];
}) {
  const porCategoria = new Map<CategoriaDeAtividade, string[]>();
  for (const t of tipos) {
    const categoria = t.ativo ? categoriaPeloTipo(t) : null;
    if (categoria === null) continue;
    porCategoria.set(categoria, [...(porCategoria.get(categoria) ?? []), t.valor]);
  }
  const referencia = (v: number | null) => (v === null ? "não cadastrada" : `${n(v)} %`);

  return (
    <section
      aria-labelledby="titulo-atividades-do-curso"
      className="flex flex-col gap-4"
      data-slot="aba-atividades"
    >
      <div className="flex flex-col gap-1">
        <h2 id="titulo-atividades-do-curso" className="text-texto text-base font-semibold">
          Atividades extraclasse previstas no currículo
        </h2>
        <p className="text-texto-suave text-sm">
          O que o currículo e a norma preveem para o curso. O que cada turma lançou fica na ficha da
          turma.
        </p>
      </div>

      <LimitesDoCurso linhas={limites} ano={ano} />

      <section className="flex flex-col gap-1" data-slot="referencia-do-estudo-individual">
        <h3 className="text-texto text-sm font-semibold">Estudo Individual</h3>
        <p className="text-texto text-sm">
          Referência de {ano}: {referencia(estudoIndividual.comEstudoObrigatorio)} com regime de
          Estudo Obrigatório · {referencia(estudoIndividual.semEstudoObrigatorio)} sem regime de
          Estudo Obrigatório.
        </p>
        <p className="text-texto-suave text-xs">
          Informativa: o Estudo Individual não compõe a CHT (CHT = CHD + AEC + TAD + TR).
        </p>
      </section>

      <section className="flex flex-col gap-1" data-slot="apoio-individualizado-do-curso">
        <h3 className="text-texto text-sm font-semibold">Apoio Individualizado</h3>
        <p className="text-texto text-sm">
          O currículo não prevê quantidade: é lançado pela turma.
        </p>
        <p className="text-texto-suave text-xs">Não compõe a CHT.</p>
      </section>

      <section className="flex flex-col gap-1" data-slot="tipos-de-atividade-do-curso">
        <h3 className="text-texto text-sm font-semibold">Tipos de atividade, por categoria</h3>
        {porCategoria.size === 0 ? (
          <p className="text-texto-suave text-sm">Nenhum tipo de atividade cadastrado.</p>
        ) : (
          <ul className="text-texto flex flex-col gap-0.5 text-sm">
            {CATEGORIAS_DE_ATIVIDADE.filter((c) => porCategoria.has(c)).map((c) => (
              <li key={c} data-categoria={c}>
                <span className="font-medium">{ROTULO_DA_CATEGORIA_DE_ATIVIDADE[c]}:</span>{" "}
                {(porCategoria.get(c) ?? []).join(" · ")}
              </li>
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
