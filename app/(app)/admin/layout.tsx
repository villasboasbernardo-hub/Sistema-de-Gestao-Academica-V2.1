/**
 * A navegação interna da administração (`SC-002`, `SC-003`, `RF-CURSO-02` por analogia).
 *
 * ⚠️ **ELA EXISTE PORQUE `/admin/permissoes` NÃO ERA ALCANÇÁVEL POR CLIQUE NENHUM.** Medido em
 * 11/09/2026: a tela existia desde o Épico 3 e a única forma de chegar nela era digitar o endereço.
 * O `SC-003` cobra **zero** telas alcançáveis apenas por digitação, e esta era uma.
 *
 * ⚠️ **E ELA NÃO VIRA ENTRADA NO MENU LATERAL, de propósito.** Se Administração é entrada única ou
 * grupo era **uma das três perguntas que só quem vê a v2.0 responde** (`FR-017.1`), e Bernardo
 * respondeu em 11/09/2026: **entrada única**, que é o que está aqui. O `RF-NAV-02` é
 * **[PRESERVADO]**: a troca de mecanismo de estado não autoriza reorganizar o menu. Resolver o
 * alcance sem mexer no menu é o mesmo padrão que o `RF-CURSO-02` manda usar para Avaliações e
 * Relatório — a função é alcançada **pela tela de que ela faz parte**.
 *
 * ⚠️ **SEM MARCADOR DE CLIENTE.** As abas são a folha `AbasDaAdministracao.tsx`, que lê o caminho do
 * navegador — até 17/10/2026 eram desenhadas aqui com o caminho da requisição, e o layout não é
 * redesenhado ao trocar de aba por clique: a aba marcada ficava a de entrada (conferência do PR #67).
 */
import { AbasDaAdministracao } from "./AbasDaAdministracao";

export default function LayoutDaAdministracao({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <AbasDaAdministracao />
      {children}
    </div>
  );
}
