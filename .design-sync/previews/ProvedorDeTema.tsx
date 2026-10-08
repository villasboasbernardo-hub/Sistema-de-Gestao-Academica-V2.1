import {
  BadgeStatus,
  BarraDeProgresso,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  ProvedorDeTema,
} from "ciaara-11-ds";

/**
 * O provedor não desenha nada: ele põe a classe do tema (`light`/`dark`) no `<html>`, segue o
 * sistema por padrão e guarda a escolha em `ciaara-tema`. Ele NÃO aceita tema forçado — só
 * `children`. Para ver o noturno sem mexer no `<html>` da página, a célula aplica a mesma classe
 * `.dark` num contêiner: os papéis de cor são redefinidos sob ela.
 */
function CartaoDaTurma() {
  return (
    <Card className="max-w-sm">
      <CardHeader>
        <CardTitle>C-Ap-FR 2026</CardTitle>
        <CardDescription>
          Aperfeiçoamento de Faroleiro · término previsto em 15/12/2026
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2 text-sm">
          <span>
            <strong className="font-semibold tabular-nums">518</strong> de 1.165 TA executados
          </span>
          <BadgeStatus tom="atrasado" rotulo="Em atraso" />
        </div>
        <BarraDeProgresso valor={44} tom="atrasado" rotuloAcessivel="Carga executada da turma" />
      </CardContent>
      <CardFooter className="gap-2">
        <Button size="sm">Abrir o DSA</Button>
        <Button size="sm" variant="outline">
          Imprimir
        </Button>
      </CardFooter>
    </Card>
  );
}

/** O uso canônico: envolve a aplicação inteira, e o tema segue o do sistema. */
export function SegueOSistema() {
  return (
    <ProvedorDeTema>
      <CartaoDaTurma />
    </ProvedorDeTema>
  );
}

/** A paleta noturna: fundo e superfície escuros, tinta clara — sem reaproveitar o pastel do claro. */
export function PaletaNoturna() {
  return (
    <ProvedorDeTema>
      <div className="dark bg-fundo text-texto rounded-ciaara flex flex-col gap-3 p-6">
        <p className="text-texto-suave text-xs">Classe .dark — a que o provedor põe no html</p>
        <CartaoDaTurma />
      </div>
    </ProvedorDeTema>
  );
}

/**
 * Lado a lado: os mesmos componentes, os mesmos tokens, as duas paletas. Os painéis quebram de
 * linha quando o espaço não comporta os dois, em vez de espremer o cartão.
 */
export function DuasPaletas() {
  return (
    <ProvedorDeTema>
      <div className="flex flex-wrap gap-4">
        <div className="bg-fundo text-texto rounded-ciaara flex w-full max-w-sm flex-col gap-3 p-4">
          <p className="text-texto-suave text-xs">Claro</p>
          <CartaoDaTurma />
        </div>
        <div className="dark bg-fundo text-texto rounded-ciaara flex w-full max-w-sm flex-col gap-3 p-4">
          <p className="text-texto-suave text-xs">Noturno</p>
          <CartaoDaTurma />
        </div>
      </div>
    </ProvedorDeTema>
  );
}
