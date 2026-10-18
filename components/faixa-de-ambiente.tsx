/**
 * A faixa Beta — e, em local e em preview, a marca do ambiente (FR-017; FR-001 da spec 016).
 *
 * > *"Faixa fina e fixa no topo de todas as telas, inclusive login, em todos os ambientes, não
 * > fechável: «Sistema privado – Versão Beta – Esta é uma versão de testes do Sistema de Gestão
 * > Acadêmica». A rota de impressão a esconde."* — item 1.1, Bernardo Villas Boas, 16/10/2026
 *
 * POR QUÊ: a produção do CIAARA-11 é a **v2.0**, até o corte. Enquanto a v2.1 estiver em testes, quem
 * abre a tela tem de saber que esta não é a ferramenta oficial — inclusive na Production da v2.1, que
 * até 16/10/2026 escondia a faixa.
 *
 * ⚠️ **UMA FAIXA SÓ** (Q-15 da spec 016): a faixa de ambiente deixou de ser uma faixa própria. Em
 * local e em preview o ambiente vira **acréscimo** do texto Beta — e só quando **declarado**
 * (`ambienteDeclarado()`, NQ-3): sem a variável, a Production nunca se anuncia como *"ambiente local"*.
 *
 * ⚠️ **FIXA, E SEM BOTÃO DE FECHAR.** `sticky top-0` a mantém no alto em qualquer rolagem. Em tela
 * larga ela tem **uma linha** e a altura de `--altura-da-faixa`, que a lateral fixa desconta
 * (`painel-retratil.tsx`); em tela estreita o texto pode quebrar, e ali a lateral não é fixa.
 *
 * Server Component: lê o ambiente no servidor e não vai para o bundle do cliente.
 */
import { ambienteDeclarado, conferirAmbiente, textoDaFaixa, type Ambiente } from "@/lib/ambiente";

/**
 * ⚠️ AS CORES SAÍRAM DAQUI EM 09/09/2026 (`FR-001`). Eram `#1e3a8a` e `#9a3412` escritos à mão, e
 * a regra de lint da fatia (a) do Épico 4 as barra — cor fora de `app/globals.css` é erro, não
 * divergência que ninguém notou.
 *
 * O local usa o tom **planejado**, que é o do que ainda não aconteceu; a pré-visualização usa
 * **atrasado**, que é o tom de aviso. A Production — e o ambiente não declarado — usa a **marca**: é o
 * sistema falando de si, sem ambiente a distinguir.
 */
const CLASSE_POR_AMBIENTE: Record<Ambiente | "nenhum", string> = {
  local: "bg-planejado-tinta text-planejado-fundo",
  preview: "bg-atrasado-tinta text-atrasado-fundo",
  producao: "bg-marca text-marca-contraste",
  nenhum: "bg-marca text-marca-contraste",
};

export function FaixaDeAmbiente() {
  const ambiente = ambienteDeclarado();
  const texto = textoDaFaixa(ambiente, conferirAmbiente().length);

  return (
    <div
      role="status"
      /*
       * ⚠️ **O `data-slot` NÃO É DECORATIVO: é por ele que a ROTA DE IMPRESSÃO a esconde**
       * (spec 013, PR 3). A faixa é desenhada pelo layout **raiz**, que um layout aninhado envolve
       * em vez de substituir, e Server Component não conhece o caminho da requisição — então quem
       * a tira do documento é uma regra no CSS **daquela rota**, que o Next carrega só quando ela é
       * servida. O contrato da impressão é explícito: *"sem casca, sem menu, sem faixa de ambiente,
       * sem botão: a rota é só o documento"*.
       */
      data-slot="faixa-de-ambiente"
      title={texto}
      className={`sticky top-0 z-40 px-4 py-1.5 text-center text-xs leading-4 font-semibold tracking-wider lg:h-(--altura-da-faixa) lg:overflow-hidden lg:text-ellipsis lg:whitespace-nowrap ${CLASSE_POR_AMBIENTE[ambiente ?? "nenhum"]}`}
    >
      {texto}
    </div>
  );
}
