import {
  BadgeStatus,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "ciaara-11-ds";

type Situacao = "aguardando_inicio" | "em_andamento" | "concluida" | "conflitou";

const APARENCIA: Readonly<
  Record<
    Situacao,
    {
      readonly rotulo: string;
      readonly tom: "planejado" | "executado" | "conformidade" | "conflito";
    }
  >
> = {
  aguardando_inicio: { rotulo: "Aguardando início", tom: "planejado" },
  em_andamento: { rotulo: "Em andamento", tom: "executado" },
  concluida: { rotulo: "Concluída", tom: "conformidade" },
  conflitou: { rotulo: "Conflitou", tom: "conflito" },
};

const DISCIPLINAS: readonly {
  readonly codigo: string;
  readonly nome: string;
  readonly situacao: Situacao;
  readonly acumulada: number;
  readonly prevista: number;
}[] = [
  { codigo: "IV", nome: "Meteorologia", situacao: "concluida", acumulada: 60, prevista: 60 },
  { codigo: "V", nome: "Navegação", situacao: "em_andamento", acumulada: 65, prevista: 92 },
  { codigo: "IX", nome: "Geodésia", situacao: "conflitou", acumulada: 17, prevista: 70 },
  { codigo: "XI", nome: "Hidrografia", situacao: "aguardando_inicio", acumulada: 0, prevista: 148 },
];

export function Padrao() {
  return (
    <Table>
      <TableCaption>
        C-Ap-HN 2026 · carga horária acumulada até a semana de 05/10/2026, em tempos de aula (TA).
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Disciplina</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead className="text-right">Acumulada</TableHead>
          <TableHead className="text-right">Prevista</TableHead>
          <TableHead className="text-right">Resta</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {DISCIPLINAS.map((d) => (
          <TableRow key={d.codigo}>
            <TableCell>
              <span className="text-texto font-medium">{d.codigo}</span>{" "}
              <span className="text-texto-suave">{d.nome}</span>
            </TableCell>
            <TableCell>
              <BadgeStatus tom={APARENCIA[d.situacao].tom} rotulo={APARENCIA[d.situacao].rotulo} />
            </TableCell>
            <TableCell className="text-right tabular-nums">{d.acumulada}</TableCell>
            <TableCell className="text-right tabular-nums">{d.prevista}</TableCell>
            <TableCell className="text-right tabular-nums">{d.prevista - d.acumulada}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

const COMPOSICAO: readonly {
  readonly sigla: string;
  readonly descricao: string;
  readonly ta: string;
  readonly teto: string;
}[] = [
  { sigla: "CHD", descricao: "Soma das cargas horárias das disciplinas", ta: "1.040", teto: "—" },
  { sigla: "AEC", descricao: "Atividades Extraclasse", ta: "62", teto: "104 (10%)" },
  { sigla: "TAD", descricao: "Tempo para a Administração", ta: "40", teto: "52 (5%)" },
  { sigla: "TR", descricao: "Tempo Reserva", ta: "63", teto: "104 (10%)" },
];

export function ComRodape() {
  return (
    <Table>
      <TableCaption>
        C-Ap-HN 2026 · a CHT soma CHD, AEC, TAD e TR; o Estudo Individual fica fora da soma.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Componente</TableHead>
          <TableHead>Descrição</TableHead>
          <TableHead className="text-right">TA</TableHead>
          <TableHead className="text-right">Teto normativo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {COMPOSICAO.map((c) => (
          <TableRow key={c.sigla}>
            <TableCell className="font-medium">{c.sigla}</TableCell>
            <TableCell className="text-texto-suave">{c.descricao}</TableCell>
            <TableCell className="text-right tabular-nums">{c.ta}</TableCell>
            <TableCell className="text-texto-suave text-right tabular-nums">{c.teto}</TableCell>
          </TableRow>
        ))}
      </TableBody>
      <TableFooter>
        <TableRow>
          <TableCell>CHT</TableCell>
          <TableCell>Carga Horária Total</TableCell>
          <TableCell className="text-right tabular-nums">1.205</TableCell>
          <TableCell />
        </TableRow>
      </TableFooter>
    </Table>
  );
}

const SALAS: readonly {
  readonly sala: string;
  readonly natureza: string;
  readonly ativa: boolean;
  readonly usadaPor: string;
}[] = [
  { sala: "Sala 01", natureza: "Física", ativa: true, usadaPor: "C-Ap-HN 2026" },
  { sala: "Sala 02", natureza: "Física", ativa: true, usadaPor: "C-Ap-FR 2026" },
  { sala: "Biblioteca", natureza: "Física", ativa: true, usadaPor: "C-Ap-HN 2026, C-Esp-ME 2026" },
  { sala: "Sala 03", natureza: "Física", ativa: false, usadaPor: "—" },
];

export function LinhaSelecionada() {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Sala</TableHead>
          <TableHead>Natureza</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead>Turmas que a usam</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {SALAS.map((s) => (
          <TableRow key={s.sala} data-state={s.sala === "Biblioteca" ? "selected" : undefined}>
            <TableCell className="font-medium">{s.sala}</TableCell>
            <TableCell>{s.natureza}</TableCell>
            <TableCell className={s.ativa ? /*cls*/ "text-texto" : /*cls*/ "text-texto-suave"}>
              {s.ativa ? "Ativa" : "Desativada"}
            </TableCell>
            <TableCell>{s.usadaPor}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
