import * as React from "react";
import {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
} from "ciaara-11-ds";

/*
 * O padding é da composição, não do cartão: com o diálogo aberto, a trava de rolagem do Radix zera
 * o padding do <body>, e o gatilho ao fundo encostaria no canto da tela.
 */
function Fundo({ children }: { readonly children: React.ReactNode }) {
  return <div className="p-6">{children}</div>;
}

const DETALHE = [
  ["Disciplina", "V — Navegação"],
  ["Unidade de ensino", "V-2 · Navegação costeira"],
  ["Instrutor", "1ºTEN (T) Marina Duarte"],
  ["Atividade", "Aula Teórica"],
  ["Sala", "Sala 01"],
] as const;

export function DetalheDoLancamento() {
  return (
    <Fundo>
      <Dialog defaultOpen>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            3º e 4º tempos · Navegação
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>3º e 4º tempos · terça-feira, 18/08/2026</DialogTitle>
            <DialogDescription>
              Turma C-Ap-HN 2026 · Detalhe Semanal de Aula da semana 34
            </DialogDescription>
          </DialogHeader>
          <dl className="border-borda border-t text-sm">
            {DETALHE.map(([rotulo, valor]) => (
              <div
                key={rotulo}
                className="border-borda flex items-center justify-between gap-4 border-b py-2"
              >
                <dt className="text-texto-suave">{rotulo}</dt>
                <dd className="text-texto font-medium">{valor}</dd>
              </div>
            ))}
          </dl>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Fechar</Button>
            </DialogClose>
            <Button>Editar lançamento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fundo>
  );
}

const CODIGO = "DIS-000184";

function DialogoDeExclusao({
  digitadoDeInicio,
  recusa,
}: {
  readonly digitadoDeInicio: string;
  readonly recusa: string | null;
}) {
  const [digitado, definirDigitado] = React.useState(digitadoDeInicio);
  const liberado = digitado.trim() === CODIGO;
  return (
    <Fundo>
      <Dialog defaultOpen>
        <DialogTrigger asChild>
          <Button type="button" size="sm" variant="ghost">
            Excluir
          </Button>
        </DialogTrigger>
        <DialogContent
          /*
           * A recusa chega DEPOIS de a pessoa digitar e clicar em excluir: nesse momento o foco não
           * volta ao campo. Sem isto, o foco automático da abertura selecionaria o código digitado.
           */
          {...(recusa ? { onOpenAutoFocus: (e: Event) => e.preventDefault() } : {})}
        >
          <DialogHeader>
            <DialogTitle>Excluir Navegação?</DialogTitle>
            <DialogDescription>
              Excluir a disciplina Navegação é PERMANENTE: a linha sai do banco e não há como
              desfazer. Fica um rastro de quem excluiu, o quê e quando — mas o registro não volta.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-1">
            <Label htmlFor="codigo-confirmacao">Digite o código {CODIGO} para confirmar</Label>
            <Input
              id="codigo-confirmacao"
              autoComplete="off"
              value={digitado}
              onChange={(e) => definirDigitado(e.target.value)}
            />
          </div>

          {recusa ? (
            <p role="alert" className="text-conflito-tinta text-sm">
              {recusa}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" variant="destructive" disabled={!liberado}>
              Excluir permanentemente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Fundo>
  );
}

export function ExclusaoComCodigo() {
  return <DialogoDeExclusao digitadoDeInicio="" recusa={null} />;
}

export function ExclusaoRecusada() {
  return (
    <DialogoDeExclusao
      digitadoDeInicio={CODIGO}
      recusa="Disciplina com histórico não pode ser excluída: tem linha de turma e aula lançada. Desative em vez de excluir — o histórico fica de pé e a desativação é reversível."
    />
  );
}
