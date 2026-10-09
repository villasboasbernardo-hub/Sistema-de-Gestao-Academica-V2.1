import * as React from "react";
import {
  BadgeStatus,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DialogoConfirmacao,
  NomeInstrutor,
  type InstrutorParaExibir,
} from "ciaara-11-ds";

/**
 * O diálogo não tem `open`: o gatilho é de quem chama. Para a célula nascer com ele aberto, a
 * prévia faz o clique que a pessoa faria — no botão marcado com `data-abrir`.
 *
 * A margem é da cena: com o diálogo aberto, a trava de rolagem do Radix zera o padding do `body`,
 * e sem ela a tela ao fundo encostaria no canto.
 */
function AbreAoMontar({ children }: { readonly children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.querySelector<HTMLElement>("[data-abrir]")?.click();
  }, []);
  return (
    <div ref={ref} className="p-6">
      {children}
    </div>
  );
}

const INSTRUTOR: InstrutorParaExibir = {
  id: "i-412",
  pg: "CC",
  especialidade: "(T)",
  nomeCompleto: "Paulo Roberto Andrade",
  nomeDeGuerra: "Andrade",
};

/** A ficha do instrutor com a ação de desativar — a composição da vitrine, dentro da tela. */
function FichaDoInstrutor() {
  const [ativo, definirAtivo] = React.useState(true);
  return (
    <Card className="max-w-lg">
      <CardHeader>
        <CardTitle>Ficha do instrutor</CardTitle>
        <CardDescription>
          Código 412 · regime 40h · 3 disciplinas atribuídas em 2026
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-sm">
          <NomeInstrutor instrutor={INSTRUTOR} />
          {ativo ? null : <BadgeStatus tom="inativo" rotulo="Inativo" />}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            Editar
          </Button>
          <DialogoConfirmacao
            titulo="Desativar este instrutor?"
            consequencia="Ele deixa de aparecer nas listagens e nas próximas LIQ. Nada é apagado: a desativação é reversível."
            rotuloConfirmar="Desativar"
            aoConfirmar={() => definirAtivo(false)}
          >
            <Button variant="destructive" size="sm" data-abrir="">
              Desativar
            </Button>
          </DialogoConfirmacao>
        </div>
      </CardContent>
    </Card>
  );
}

export function AbertoDesativarInstrutor() {
  return (
    <AbreAoMontar>
      <FichaDoInstrutor />
    </AbreAoMontar>
  );
}

/** Exclusão permanente de conta (D-USR-3): confirmação simples, sem digitar nada (D-USR-4). */
export function AbertoExcluirConta() {
  return (
    <AbreAoMontar>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Marina Duarte</CardTitle>
          <CardDescription>
            marina.duarte@exemplo.mil.br · Encarregado da Administração Acadêmica · último acesso
            06/10/2026
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm">
            Editar
          </Button>
          <Button variant="outline" size="sm">
            Redefinir senha
          </Button>
          <Button variant="outline" size="sm">
            Desativar
          </Button>
          <DialogoConfirmacao
            titulo="Tem certeza que deseja excluir a conta Marina Duarte (marina.duarte@exemplo.mil.br)?"
            consequencia="A exclusão é permanente."
            rotuloConfirmar="Excluir"
            aoConfirmar={() => {}}
          >
            <Button variant="destructive" size="sm" data-abrir="">
              Excluir
            </Button>
          </DialogoConfirmacao>
        </CardContent>
      </Card>
    </AbreAoMontar>
  );
}

/** A consequência que justifica a confirmação: mexer na CH refaz a carga de gente. */
export function AbertoRecalculaRateio() {
  return (
    <AbreAoMontar>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle>V — Navegação</CardTitle>
          <CardDescription>C-Ap-HN 2026 · modo dividido · 3 instrutores atribuídos</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm">
            Carga horária prevista: <span className="text-texto-suave">92 TA</span> →{" "}
            <strong className="font-semibold">96 TA</strong>
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              Descartar
            </Button>
            <DialogoConfirmacao
              titulo="Alterar a carga horária desta disciplina?"
              consequencia="A mudança de 92 para 96 tempos refaz o rateio de 3 instrutor(es) nas turmas em que ela está. A carga horária prevista de cada um é recalculada — ela sai impressa na LIQ e na ficha de docentes."
              rotuloConfirmar="Alterar"
              aoConfirmar={() => {}}
            >
              <Button size="sm" data-abrir="">
                Gravar
              </Button>
            </DialogoConfirmacao>
          </div>
        </CardContent>
      </Card>
    </AbreAoMontar>
  );
}

/** O gatilho em repouso: o diálogo só existe depois do clique. */
export function Fechado() {
  return <FichaDoInstrutor />;
}
