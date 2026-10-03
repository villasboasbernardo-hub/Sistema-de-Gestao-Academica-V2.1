"use client";

/**
 * As três ações de cada linha da lista: **Redefinir senha**, **Desativar/Reativar** e **Excluir**.
 *
 * ⚠️ **ELAS VOLTARAM À LISTA EM 03/10/2026, e a volta é decisão de Bernardo** na reconferência do
 * PR 2: *"Na LISTA, em cada linha, ações visíveis direto. Clicar no nome abre a página da conta com as
 * informações completas."* O que ele recusou na rodada anterior era **formulário** dentro da linha —
 * trocar perfil, editar nome — e isso continua na página. Botão com diálogo de confirmação não é
 * formulário: é a ação que se faz sem precisar abrir nada.
 *
 * ⚠️ **AS TRÊS CONSEQUÊNCIAS SÃO INVISÍVEIS NA TELA DE QUEM CLICA, e é por isso que as três confirmam.**
 * Redefinir **derruba as sessões abertas** da pessoa; desativar **tira o acesso** na requisição
 * seguinte; excluir **não tem desfazer**. Reativar é o único que não pede nada, porque é o desfazer de
 * outro.
 *
 * ⚠️ **O DIÁLOGO DA EXCLUSÃO DIZ QUAL DOS DOIS CAMINHOS VAI ACONTECER**, e ele pergunta ao servidor
 * antes de abrir. Dizer só *"é permanente"* seria verdade e insuficiente: conta que nunca registrou
 * nada **desaparece**, e conta que registrou **fica como «Conta excluída»** para o histórico continuar
 * tendo autor. As duas são permanentes de maneiras diferentes.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import {
  dependentesDaConta,
  desativar,
  excluirConta,
  reativar,
  redefinirSenha,
} from "@/lib/acoes/usuarios";

type Resposta = {
  ok: boolean;
  erro?: string;
  senha?: string;
  caminho?: string;
  dependentes?: readonly string[];
};

const BOTAO =
  "border-borda-forte text-texto hover:bg-marca-suave rounded-ciaara-sm focus-visible:ring-marca border px-2 py-0.5 text-xs focus-visible:ring-2 focus-visible:outline-none";

export function AcoesDaLinha({
  usuarioId,
  nome,
  ativa,
  temCredencial,
  ehMinhaConta,
}: {
  readonly usuarioId: string;
  readonly nome: string;
  readonly ativa: boolean;
  readonly temCredencial: boolean;
  readonly ehMinhaConta: boolean;
}) {
  const [senha, definirSenha] = useState<string | null>(null);
  const [aviso, definirAviso] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [ocupado, definirOcupado] = useState(false);
  const [dependentes, definirDependentes] = useState<readonly string[] | null>(null);
  const navegador = useRouter();

  async function executar(acao: () => Promise<Resposta>, sucesso: string): Promise<void> {
    definirAviso(null);
    definirErro(null);
    definirOcupado(true);
    const r = await acao();
    if (!r.ok) definirErro(r.erro ?? "Não foi possível concluir.");
    else if (r.senha) definirSenha(r.senha);
    else if (r.caminho) {
      /*
       * ⚠️ **O AVISO VAI PARA A URL, E NÃO PARA O ESTADO DESTA FOLHA — e isto é conserto de um
       *    defeito medido.** Guardá-lo aqui parecia natural e **não funcionava**: a exclusão tira a
       *    conta da lista, a linha é desmontada, e a mensagem desaparecia com ela. Quem excluía não
       *    recebia resposta nenhuma — a conta sumia e pronto.
       */
      navegador.replace(`/admin/usuarios?excluida=${r.caminho}`);
    } else definirAviso(sucesso);
    definirOcupado(false);
  }

  /*
   * ⚠️ **PERGUNTA AO SERVIDOR ANTES DE ABRIR O DIÁLOGO**, para a frase ser sobre esta conta e não
   *    sobre contas em geral. Se a consulta falhar, o diálogo abre mesmo assim com a frase genérica:
   *    impedir a exclusão porque a *explicação* falhou seria trocar um problema por outro.
   */
  async function medirDependentes(): Promise<void> {
    const r = (await dependentesDaConta({ usuarioId })) as Resposta;
    definirDependentes(r.ok ? (r.dependentes ?? []) : []);
  }

  /*
   * ⚠️ **A FRASE É TEXTO, e não JSX, porque `consequencia` é `string` DE PROPÓSITO** no componente
   *    canônico — o contrato dele exige dizer o que muda, e alargar o tipo para `ReactNode` só para
   *    pôr negrito mexeria num componente que outras telas usam. A ênfase vem da ORDEM das frases: a
   *    permanência é a primeira coisa que se lê.
   */
  function frase(): string {
    const inicio = `A exclusão é permanente. A credencial de ${nome} é apagada e ela deixa de entrar no sistema — não há desfazer.`;
    const meio =
      dependentes === null
        ? "O cadastro sai da lista."
        : dependentes.length === 0
          ? "Esta conta não registrou nada no sistema, então o cadastro sai inteiro, e o e-mail fica livre para um novo cadastro."
          : `Esta conta registrou histórico (${dependentes.join(", ")}), então o cadastro fica como «Conta excluída», para os registros antigos continuarem tendo autor. Ele sai da lista, e o e-mail fica livre para um novo cadastro.`;
    return `${inicio} ${meio} Para apenas bloquear o acesso mantendo cadastro e perfil, use Desativar.`;
  }

  if (ehMinhaConta) {
    // veste: a razão de a própria conta não ter ações — texto explicativo, não valor
    return <span className="text-texto-tenue text-xs">sua conta — peça a outro Administrador</span>;
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-1">
        {temCredencial ? (
          <DialogoConfirmacao
            titulo="Redefinir a senha desta conta?"
            consequencia={`O sistema gera uma senha nova para ${nome}, mostra uma vez e ENCERRA todas as sessões abertas dela. No próximo acesso, ela terá de definir outra senha.`}
            rotuloConfirmar="Redefinir senha"
            aoConfirmar={() =>
              void executar(
                () => redefinirSenha({ usuarioId }) as Promise<Resposta>,
                "Senha redefinida.",
              )
            }
          >
            <button type="button" className={BOTAO} disabled={ocupado}>
              Redefinir senha
            </button>
          </DialogoConfirmacao>
        ) : null}

        {ativa ? (
          <DialogoConfirmacao
            titulo="Desativar esta conta?"
            consequencia={`${nome} perde o acesso na requisição seguinte. NADA é apagado: o cadastro e o perfil ficam, e a reativação devolve o acesso. Isto NÃO é exclusão.`}
            rotuloConfirmar="Desativar"
            aoConfirmar={() => void executar(() => desativar({ usuarioId }), "Conta desativada.")}
          >
            <button type="button" className={BOTAO} disabled={ocupado}>
              Desativar
            </button>
          </DialogoConfirmacao>
        ) : (
          // Reativar é desfazer — não pede confirmação, porque não há consequência a avisar.
          <button
            type="button"
            className={BOTAO}
            disabled={ocupado}
            onClick={() => void executar(() => reativar({ usuarioId }), "Conta reativada.")}
          >
            Reativar
          </button>
        )}

        <DialogoConfirmacao
          titulo="Excluir esta conta?"
          consequencia={frase()}
          rotuloConfirmar="Excluir permanentemente"
          aoConfirmar={() =>
            void executar(() => excluirConta({ usuarioId }) as Promise<Resposta>, "")
          }
        >
          <button
            type="button"
            className={BOTAO}
            disabled={ocupado}
            onClick={() => void medirDependentes()}
          >
            Excluir
          </button>
        </DialogoConfirmacao>
      </span>

      {senha ? (
        <span
          role="status"
          className="border-borda-forte bg-superficie-2 rounded-ciaara-sm flex flex-col gap-0.5 border px-2 py-1"
        >
          <span className="text-texto text-xs font-semibold">
            Senha temporária: <code>{senha}</code>
          </span>
          {/* veste: advertência colada na credencial — texto de apoio */}
          <span className="text-texto-suave text-xs">
            Ela aparece <strong>uma vez</strong>. Copie agora e entregue à pessoa.
          </span>
        </span>
      ) : null}

      {aviso ? (
        <span role="status" className="text-texto-suave text-xs">
          {aviso}
        </span>
      ) : null}
      {erro ? (
        <span role="alert" className="text-erro text-xs">
          {erro}
        </span>
      ) : null}
    </span>
  );
}
