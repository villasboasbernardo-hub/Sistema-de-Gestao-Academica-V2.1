import * as React from "react";
import { BadgeTeto, type Teto } from "ciaara-11-ds";

/*
 * Os limites chegam por propriedade — no sistema, de `config_parametros`. Valores inteiros de
 * propósito: o emblema escreve o número como o recebe, e quem chama decide a precisão.
 */
const AEC: Teto = {
  rotulo: "AEC",
  limite: 10,
  medido: 7,
  unidade: "%",
  explicacao: "Atividades Extraclasse: teto de 10% do somatório das CHD.",
};

const TAD: Teto = {
  rotulo: "TAD",
  limite: 5,
  medido: 6,
  unidade: "%",
  explicacao: "Tempo para a Administração: teto de 5% da CHR. É alerta, nunca bloqueio.",
};

const TR: Teto = {
  rotulo: "TR",
  limite: 10,
  medido: 10,
  unidade: "%",
  explicacao: "Tempo Reserva: teto de 10% da CHR. No limite, ainda dentro.",
};

/** Os três tetos de uma turma: dentro, acima (com ícone) e exatamente no limite. */
export function TetosDaTurma() {
  return (
    <div className="flex flex-wrap gap-2">
      <BadgeTeto teto={AEC} />
      <BadgeTeto teto={TAD} />
      <BadgeTeto teto={TR} />
    </div>
  );
}

/**
 * A explicação aparece ao apontar e também ao receber foco pelo teclado. A prévia dá o foco ao
 * emblema ao montar, para a dica ficar à vista.
 */
export function ExplicacaoAoFocar() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-slot="badge-teto"]')?.focus();
  }, []);
  return (
    <div ref={ref} className="flex flex-wrap items-center gap-3 text-sm">
      <span className="text-texto">C-Ap-HN 2026 · semana 34/2026</span>
      <BadgeTeto teto={TAD} />
    </div>
  );
}

const LINHAS: readonly { readonly nome: string; readonly teto: Teto }[] = [
  { nome: "Atividades Extraclasse", teto: AEC },
  { nome: "Tempo para a Administração", teto: TAD },
  { nome: "Tempo Reserva", teto: TR },
];

/** No quadro de carga horária da turma: o nome ao lado, o teto no emblema. */
export function QuadroDeTetos() {
  return (
    <section className="border-borda bg-superficie rounded-ciaara flex max-w-lg flex-col gap-2 border p-3">
      <h2 className="text-texto text-sm font-semibold">Tetos normativos — C-Ap-HN 2026</h2>
      <ul className="flex flex-col gap-2">
        {LINHAS.map((l) => (
          <li key={l.teto.rotulo} className="flex items-center justify-between gap-3 text-sm">
            <span className="text-texto">{l.nome}</span>
            <BadgeTeto teto={l.teto} />
          </li>
        ))}
      </ul>
      <p className="text-texto-suave text-xs">
        Acima do teto o lançamento segue possível — é alerta, nunca bloqueio.
      </p>
    </section>
  );
}
