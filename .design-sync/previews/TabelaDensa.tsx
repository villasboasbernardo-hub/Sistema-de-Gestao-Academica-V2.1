import * as React from "react";
import { BadgeStatus, TabelaDensa, type Coluna } from "ciaara-11-ds";

type Disciplina = {
  readonly id: string;
  readonly codigo: string;
  readonly nome: string;
  readonly prevista: number;
  readonly cumprida: number;
  readonly situacao: "executado" | "atrasado" | "planejado";
};

const LINHAS: readonly Disciplina[] = [
  {
    id: "d1",
    codigo: "IV",
    nome: "Meteorologia",
    prevista: 60,
    cumprida: 52,
    situacao: "executado",
  },
  { id: "d2", codigo: "V", nome: "Navegação", prevista: 92, cumprida: 65, situacao: "atrasado" },
  {
    id: "d3",
    codigo: "VII",
    nome: "Navegação Astronômica",
    prevista: 56,
    cumprida: 45,
    situacao: "executado",
  },
  { id: "d4", codigo: "IX", nome: "Geodésia", prevista: 70, cumprida: 17, situacao: "atrasado" },
  {
    id: "d5",
    codigo: "XI",
    nome: "Hidrografia",
    prevista: 148,
    cumprida: 46,
    situacao: "planejado",
  },
  { id: "d6", codigo: "XVII", nome: "TFM", prevista: 40, cumprida: 28, situacao: "executado" },
];

const ROTULO: Readonly<Record<Disciplina["situacao"], string>> = {
  executado: "Em dia",
  atrasado: "Em atraso",
  planejado: "Planejada",
};

const COLUNAS: readonly Coluna<Disciplina>[] = [
  {
    chave: "codigo",
    titulo: "Cód.",
    ordenavel: true,
    valor: (l) => l.codigo,
    celula: (l) => l.codigo,
  },
  {
    chave: "nome",
    titulo: "Disciplina",
    ordenavel: true,
    valor: (l) => l.nome,
    celula: (l) => l.nome,
  },
  {
    chave: "prevista",
    titulo: "CH prevista",
    numerica: true,
    ordenavel: true,
    valor: (l) => l.prevista,
    celula: (l) => l.prevista,
  },
  {
    chave: "cumprida",
    titulo: "CH cumprida",
    numerica: true,
    ordenavel: true,
    valor: (l) => l.cumprida,
    celula: (l) => l.cumprida,
  },
  {
    chave: "situacao",
    titulo: "Situação",
    celula: (l) => <BadgeStatus tom={l.situacao} rotulo={ROTULO[l.situacao]} />,
  },
];

export function Padrao() {
  return (
    <TabelaDensa
      linhas={LINHAS}
      colunas={COLUNAS}
      chaveLinha={(l) => l.id}
      rotulo="Disciplinas da turma C-Ap-HN 2026"
    />
  );
}

export function CompactaComBusca() {
  return (
    <TabelaDensa
      linhas={LINHAS}
      colunas={COLUNAS}
      chaveLinha={(l) => l.id}
      rotulo="Disciplinas da turma C-Ap-HN 2026"
      densidade="compacta"
      comBusca
    />
  );
}

export function LinhaExpandida() {
  const [abertas, definirAbertas] = React.useState<readonly string[]>(["d2"]);
  return (
    <TabelaDensa
      linhas={LINHAS}
      colunas={COLUNAS}
      chaveLinha={(l) => l.id}
      rotulo="Disciplinas da turma C-Ap-HN 2026"
      abertas={abertas}
      aoAtivarLinha={(l) => definirAbertas((a) => (a.includes(l.id) ? [] : [l.id]))}
      detalhe={(l) => (
        <span className="text-texto text-sm">
          {l.nome}: faltam {l.prevista - l.cumprida} TA para fechar a carga horária prevista.
        </span>
      )}
    />
  );
}
