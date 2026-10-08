import * as React from "react";
import { AlertaConformidade, BadgeTeto, Button, type Teto } from "ciaara-11-ds";

/*
 * Os tetos chegam por propriedade (no sistema, de `config_parametros`); aqui a prévia faz o papel
 * de quem os carrega. Valores inteiros de propósito: o emblema escreve o número como recebe.
 */
const TETOS: readonly Teto[] = [
  {
    rotulo: "AEC",
    limite: 10,
    medido: 7,
    unidade: "%",
    explicacao: "Atividades Extraclasse: teto de 10% do somatório das CHD.",
  },
  {
    rotulo: "TAD",
    limite: 5,
    medido: 6,
    unidade: "%",
    explicacao: "Tempo para a Administração: teto de 5% da CHR. É alerta, nunca bloqueio.",
  },
  {
    rotulo: "TR",
    limite: 10,
    medido: 10,
    unidade: "%",
    explicacao: "Tempo Reserva: teto de 10% da CHR. No limite, ainda dentro.",
  },
];

const LANCAMENTOS = [
  "Seg 17/08 · 1º e 2º TA · Navegação — aula teórica",
  "Seg 17/08 · 3º e 4º TA · Meteorologia — aula prática",
  "Ter 18/08 · 1º ao 3º TA · Hidrografia — levantamento em campo",
  "Qua 19/08 · 9º TA · Geodésia — reposição",
  "Qui 20/08 · 5º TA · TAD — processamento de resultados",
  "Sex 21/08 · 1º e 2º TA · TFM",
];

/** A região do módulo com a faixa no topo: ela acompanha a rolagem e não impede a gravação. */
export function AcimaDoTeto() {
  const [gravou, definirGravou] = React.useState(false);
  return (
    <div className="border-borda rounded-ciaara relative max-h-64 max-w-2xl overflow-y-auto border">
      <AlertaConformidade
        tom="atrasado"
        titulo="Dois parâmetros normativos acima do teto"
        avisos={[
          "TAD em 6% da CHR — o teto vigente é 5%.",
          "Nono Tempo de Aula lançado na quarta-feira, 19/08/2026.",
        ]}
      />
      <div className="flex flex-col gap-3 p-3">
        <div className="flex flex-wrap gap-2">
          {TETOS.map((t) => (
            <BadgeTeto key={t.rotulo} teto={t} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button size="sm" onClick={() => definirGravou(true)}>
            Gravar lançamento
          </Button>
          <span className="text-texto-suave text-sm">
            {gravou
              ? "Gravado — o alerta não impediu nada."
              : "O botão continua habilitado: é alerta, nunca bloqueio."}
          </span>
        </div>
        <ul className="flex flex-col gap-1">
          {LANCAMENTOS.map((l) => (
            <li key={l} className="text-texto text-sm">
              {l}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function ConflitoDeAlocacao() {
  return (
    <AlertaConformidade
      tom="conflito"
      titulo="Conflito de alocação na semana 34/2026"
      avisos={[
        "Terça-feira, 18/08/2026, 3º TA: o instrutor 000142 também está alocado na C-Ap-FR 2026.",
        "Quinta-feira, 20/08/2026, 5º TA: dois lançamentos de Hidrografia para a mesma turma.",
      ]}
      className="max-w-2xl"
    />
  );
}

/** A região de alertas do Início é sempre visível — inclusive quando não há o que alertar. */
export function SemPendencias() {
  return (
    <AlertaConformidade
      tom="conformidade"
      titulo="Nada exigindo atenção"
      avisos={["Nenhuma turma em andamento com saldo negativo no recorte atual."]}
      className="max-w-2xl"
    />
  );
}

/** Na ficha do instrutor os alertas empilham e não fixam no topo (`static`). */
export function NaFichaDoInstrutor() {
  return (
    <div className="flex max-w-2xl flex-col gap-2">
      <AlertaConformidade
        tom="conformidade"
        titulo="Carga semanal prevista fora da faixa do regime"
        avisos={[
          "Semana 34/2026 (17/08/2026 a 23/08/2026): 26 h, acima da faixa de 16 a 24 h.",
          "Semana 36/2026 (31/08/2026 a 06/09/2026): 12 h, abaixo da faixa de 16 a 24 h.",
        ]}
        className="static"
      />
      <AlertaConformidade
        tom="conformidade"
        titulo="Docência há mais de um ano sem capacitação didática"
        avisos={["Em docência no CIAARA desde 03/02/2025, sem capacitação didática registrada."]}
        className="static"
      />
    </div>
  );
}
