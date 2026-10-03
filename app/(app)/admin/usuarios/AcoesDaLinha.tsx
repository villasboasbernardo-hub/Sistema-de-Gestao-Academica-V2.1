"use client";

/**
 * As **quatro** ações de cada linha da lista: **Editar**, **Redefinir senha**, **Desativar/Reativar**
 * e **Excluir** *(D-USR-6, de Bernardo Villas Boas, 03/10/2026)*.
 *
 * ⚠️ **ELAS VIVEM NA LINHA, e isso é decisão de Bernardo** na reconferência do PR 2: *"Na LISTA, em
 * cada linha, ações visíveis direto. Clicar no nome abre a página da conta com as informações
 * completas."* O que ele recusou foi **formulário** dentro da linha — trocar perfil, editar nome —, e
 * isso continua na página. Botão com diálogo de confirmação não é formulário.
 *
 * ⚠️ **«EDITAR» É UM LINK, NÃO UM BOTÃO DE AÇÃO**, e é o quarto caminho clicável para
 * `/admin/usuarios/[id]`: clicar no nome continua funcionando, e quem procura o verbo acha o verbo.
 * Ele não confirma nada porque não muda nada — só navega.
 *
 * ⚠️ **AS TRÊS AÇÕES QUE MUDAM ALGO TÊM CONSEQUÊNCIA INVISÍVEL NA TELA DE QUEM CLICA, e é por isso
 * que as três confirmam.** Redefinir **derruba as sessões abertas** da pessoa; desativar **tira o
 * acesso** na requisição seguinte; excluir **não tem desfazer**. Reativar é o único que não pede
 * nada, porque é o desfazer de outro.
 *
 * ⚠️ **A CONFIRMAÇÃO DA EXCLUSÃO É SIMPLES, SEM CAMPO PARA DIGITAR** *(D-USR-4)*. Ela pedia o e-mail
 * digitado por um dia, por analogia com as três exclusões permanentes do domínio acadêmico, que
 * pedem o código do registro. **A analogia foi recusada:** aqui o cartão nomeia a conta e o e-mail
 * dentro da própria pergunta, e é a pergunta que a pessoa lê antes de clicar.
 *
 * ⚠️ **E O CARTÃO NÃO DIZ MAIS QUAL DOS DOIS CAMINHOS VAI ACONTECER.** Ele dizia — conta sem
 * histórico desaparece, conta com histórico fica como «Conta excluída» —, e para isso ele
 * **consultava o servidor antes de abrir**. A consulta saiu junto com o texto: *"A exclusão é
 * permanente"* é verdade nos dois caminhos, e era a frase que Bernardo pediu. **A diferença entre os
 * caminhos continua existindo no banco e continua provada por teste**; ela só não é mais decisão de
 * quem clica.
 */
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { DialogoConfirmacao } from "@/components/ciaara/dialogo-confirmacao";
import { useAvisoDaLista } from "./AvisoDaLista";
import { desativar, excluirConta, reativar, redefinirSenha } from "@/lib/acoes/usuarios";

type Resposta = {
  ok: boolean;
  erro?: string;
  senha?: string;
  caminho?: string;
};

const BOTAO =
  "border-borda-forte text-texto hover:bg-marca-suave rounded-ciaara-sm focus-visible:ring-marca border px-2 py-0.5 text-xs focus-visible:ring-2 focus-visible:outline-none";

export function AcoesDaLinha({
  usuarioId,
  nome,
  email,
  ativa,
  temCredencial,
  ehMinhaConta,
}: {
  readonly usuarioId: string;
  readonly nome: string;
  readonly email: string;
  readonly ativa: boolean;
  readonly temCredencial: boolean;
  readonly ehMinhaConta: boolean;
}) {
  const [senha, definirSenha] = useState<string | null>(null);
  const [aviso, definirAviso] = useState<string | null>(null);
  const [erro, definirErro] = useState<string | null>(null);
  const [ocupado, definirOcupado] = useState(false);
  const navegador = useRouter();
  const { avisar } = useAvisoDaLista();

  async function executar(acao: () => Promise<Resposta>, sucesso: string): Promise<void> {
    definirAviso(null);
    definirErro(null);
    definirOcupado(true);
    const r = await acao();
    /*
     * ⚠️ **A FALHA VAI PARA O AVISO DA LISTA, ACIMA DA TABELA — e é o conserto do defeito que
     *    Bernardo encontrou.** Ela também fica na linha, para quem está olhando ali; mas o que
     *    garante que ninguém a perde é o bloco de cima, que não desaparece quando a linha
     *    desaparece. Ver a nota em `AvisoDaLista.tsx`.
     */
    if (!r.ok) {
      const texto = r.erro ?? "Não foi possível concluir.";
      definirErro(texto);
      avisar({ tom: "erro", texto: `${nome}: ${texto}` });
    } else if (r.senha) definirSenha(r.senha);
    else if (r.caminho) {
      /*
       * ⚠️ **O AVISO VAI PARA A URL, E NÃO PARA O ESTADO DESTA FOLHA — e isto é conserto de um
       *    defeito medido.** Guardá-lo aqui parecia natural e **não funcionava**: a exclusão tira a
       *    conta da lista, a linha é desmontada, e a mensagem desaparecia com ela. Quem excluía não
       *    recebia resposta nenhuma — a conta sumia e pronto.
       */
      navegador.replace(`/admin/usuarios?excluida=${r.caminho}`);
    } else {
      definirAviso(sucesso);
      avisar({ tom: "ok", texto: `${nome}: ${sucesso}` });
    }
    definirOcupado(false);
  }

  if (ehMinhaConta) {
    /*
     * ⚠️ **NEM «EDITAR» APARECE NA PRÓPRIA LINHA, e a ausência é deliberada:** a página da conta
     *    própria não traz formulário nenhum — ela explica que é a sua conta e manda pedir a outro
     *    Administrador. Um «Editar» aqui seria caminho para uma tela que recusa. **A página continua
     *    alcançável pelo nome**, que é link em toda linha, então ninguém perde o acesso a ela.
     */
    // veste: a razão de a própria conta não ter ações — texto explicativo, não valor
    return <span className="text-texto-tenue text-xs">sua conta — peça a outro Administrador</span>;
  }

  return (
    <span className="flex flex-col gap-1">
      <span className="flex flex-wrap items-center gap-1">
        <Link href={`/admin/usuarios/${usuarioId}`} className={BOTAO}>
          Editar
        </Link>

        {/*
          ⚠️ **SEM CREDENCIAL NÃO HÁ SENHA A REDEFINIR, e o botão NÃO APARECE em vez de recusar.**
             Medido no remoto em 03/10/2026: **4 das 5 contas reais não têm credencial** — vieram do
             ETL e do convite antigo, que gravava o cadastro e não emitia o convite. Para dar acesso a
             uma delas, o caminho é excluir e cadastrar o mesmo e-mail de novo: a exclusão **libera o
             endereço**, e o cadastro cria a credencial com senha temporária.
        */}
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
        ) : (
          // veste: a razão de faltar uma das quatro ações — texto explicativo, não valor
          <span className="text-texto-tenue text-xs">sem credencial — não entra</span>
        )}

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

        {/*
          ⚠️ **A PERGUNTA NOMEIA A CONTA E O E-MAIL, e é ela que faz o trabalho que o campo digitado
             fazia.** Quem abriu o diálogo na linha errada lê o nome errado na primeira linha do
             cartão. ⚠️ **E o rótulo é «Excluir», não «Excluir permanentemente»** (D-USR-4) — as
             exclusões de instrutor, disciplina e UE seguem com o rótulo longo e o código digitado,
             e a divergência é escolhida, não descuido.
        */}
        <DialogoConfirmacao
          titulo={`Tem certeza que deseja excluir a conta ${nome} (${email})?`}
          consequencia="A exclusão é permanente."
          rotuloConfirmar="Excluir"
          aoConfirmar={() =>
            void executar(() => excluirConta({ usuarioId }) as Promise<Resposta>, "")
          }
        >
          <button type="button" className={BOTAO} disabled={ocupado}>
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
