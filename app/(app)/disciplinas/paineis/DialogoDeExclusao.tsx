/**
 * A exclusão permanente — **um diálogo só, para disciplina e para Unidade de Ensino** (`FR-020` a
 * `FR-024`, D-B1).
 *
 * ⚠️ **UM COMPONENTE, DUAS ENTIDADES, e a decisão é a mesma do botão *Limpar filtros***: a segunda
 * cópia é a que diverge. O que muda entre os dois casos é o **texto** e qual ação chamar — e os dois
 * vêm de fora.
 *
 * ⚠️ **SÃO DOIS PASSOS, e o segundo é digitar o CÓDIGO.** É a única gravação do sistema com dois
 * passos, porque é a única **irreversível**. Confirmar por clique treina a clicar; digitar o código
 * obriga a olhar qual registro está na tela.
 *
 * ⚠️ **QUEM RECUSA É O BANCO, e a recusa vem NOMEANDO os impedimentos.** A RPC confere tudo de novo —
 * inclusive o código — e levanta `23503` com a lista. Este componente lê a lista e escreve a frase;
 * nenhuma regra de "pode ou não pode" mora aqui. Medido em 24/09/2026: das 175 disciplinas reais,
 * **zero** são excluíveis.
 *
 * ⚠️ **A RECUSA OFERECE A SAÍDA** (`FR-022`): *desative em vez de excluir*. Recusar sem próximo passo
 * é o que faz alguém tentar de novo do mesmo jeito.
 */
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { excluirDisciplina } from "@/lib/acoes/disciplina";
import { excluirUnidadeEnsino } from "@/lib/acoes/unidade-ensino";
import { confirmacaoDaGravacao } from "@/lib/dominio/confirmacao-de-gravacao";
import { codigoConfere, type TipoExcluivel } from "@/lib/dominio/exclusao-de-disciplina";

export function DialogoDeExclusao({
  tipo,
  nome,
  codigo,
  identificador,
}: {
  readonly tipo: TipoExcluivel;
  readonly nome: string;
  readonly codigo: string;
  readonly identificador: string;
}) {
  const [digitado, setDigitado] = React.useState("");
  const [erro, setErro] = React.useState<string | null>(null);
  const [excluindo, setExcluindo] = React.useState(false);
  const [aberto, setAberto] = React.useState(false);

  const confirmacao = confirmacaoDaGravacao(
    tipo === "disciplina" ? "excluir_disciplina" : "excluir_unidade_ensino",
    { nome, codigo },
  );

  async function excluir() {
    setErro(null);
    setExcluindo(true);
    const resultado =
      tipo === "disciplina"
        ? await excluirDisciplina({ disciplinaId: identificador, codigoConfirmacao: digitado })
        : await excluirUnidadeEnsino({ unidadeId: identificador, codigoConfirmacao: digitado });

    if (resultado.ok) {
      setAberto(false);
      setDigitado("");
    } else {
      /*
       * ⚠️ **A FRASE VEM PRONTA DA TRADUÇÃO, e este componente não a remonta.** Ela já nomeia os
       * impedimentos e já oferece a saída (*desative em vez de excluir*) — remontá-la aqui seria a
       * segunda redação da mesma recusa, e as duas divergiriam na primeira correção.
       */
      setErro(resultado.erro);
    }
    setExcluindo(false);
  }

  const liberado = codigoConfere(digitado, codigo);

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="ghost" data-slot="abrir-exclusao">
          Excluir
        </Button>
      </DialogTrigger>

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {confirmacao.confirma ? confirmacao.titulo : `Excluir ${nome}?`}
          </DialogTitle>
          <DialogDescription>
            {confirmacao.confirma ? confirmacao.mensagens.join(" ") : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`codigo-${identificador}`}>Digite o código {codigo} para confirmar</Label>
          <Input
            id={`codigo-${identificador}`}
            name="codigo_confirmacao"
            value={digitado}
            onChange={(e) => setDigitado(e.target.value)}
            autoComplete="off"
          />
        </div>

        {erro ? (
          <p role="alert" className="text-conflito-tinta text-sm" data-slot="recusa-da-exclusao">
            {erro}
          </p>
        ) : null}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Cancelar
            </Button>
          </DialogClose>
          <Button
            type="button"
            variant="destructive"
            disabled={!liberado || excluindo}
            onClick={excluir}
            data-slot="confirmar-exclusao"
          >
            {excluindo ? "Excluindo…" : "Excluir permanentemente"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
