import * as React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  Button,
  Input,
  Label,
  buttonVariants,
} from "ciaara-11-ds";

const CODIGO = "1042";

/*
 * O padding é da composição, não do cartão: com o diálogo aberto, a trava de rolagem do Radix zera
 * o padding do <body>, e o fundo encostaria no canto da tela.
 */
function FichaAoFundo({ children }: { readonly children: React.ReactNode }) {
  return (
    <div className="flex max-w-3xl items-center justify-between gap-4 p-6">
      <div className="flex flex-col gap-0.5">
        <span className="text-texto text-lg font-semibold">1ºTEN (T) Marina Duarte</span>
        <span className="text-texto-suave text-sm">Instrutora · código {CODIGO}</span>
      </div>
      {children}
    </div>
  );
}

export function Confirmacao() {
  return (
    <FichaAoFundo>
      <AlertDialog defaultOpen>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Desativar
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar este instrutor?</AlertDialogTitle>
            <AlertDialogDescription>
              1ºTEN (T) Marina Duarte deixa de aparecer nas listagens e nas próximas LIQ. Nada é
              apagado: a desativação é reversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction>Desativar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FichaAoFundo>
  );
}

function ExclusaoPermanente({ digitadoDeInicio }: { readonly digitadoDeInicio: string }) {
  const [digitado, definirDigitado] = React.useState(digitadoDeInicio);
  const liberado = digitado.trim() === CODIGO;
  return (
    <FichaAoFundo>
      <AlertDialog defaultOpen>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm">
            Excluir instrutor
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este instrutor permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              A exclusão é permanente e irreversível: o cadastro sai do banco e não há como
              recuperá-lo. Ela só é possível porque este instrutor não tem histórico nenhum — sem
              aula lançada, atribuição, vínculo de habilitação nem conta de acesso.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-1">
            {/* O texto vai num <span> só: o Label é flex com gap-2, e o <strong> solto viraria um
                item separado, com espaço antes da vírgula. */}
            <Label htmlFor="codigo-de-confirmacao">
              <span>
                Digite o código do instrutor, <strong>{CODIGO}</strong>, para confirmar
              </span>
            </Label>
            <Input
              id="codigo-de-confirmacao"
              autoComplete="off"
              value={digitado}
              onChange={(e) => definirDigitado(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={buttonVariants({ variant: "destructive" })}
              disabled={!liberado}
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </FichaAoFundo>
  );
}

export function ExclusaoComCodigo() {
  return <ExclusaoPermanente digitadoDeInicio="" />;
}

export function ExclusaoComCodigoConferido() {
  return <ExclusaoPermanente digitadoDeInicio={CODIGO} />;
}
