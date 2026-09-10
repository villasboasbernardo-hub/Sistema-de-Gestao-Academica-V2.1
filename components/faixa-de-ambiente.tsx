/**
 * Faixa de ambiente (FR-017).
 *
 * POR QUÊ: a produção do CIAARA-11 é a **v2.0**, até o corte. Enquanto a v2.1 estiver em
 * pré-visualização, alguém pode abrir a tela errada e lançar DSA de verdade achando que está em
 * homologação — ou o contrário. A faixa existe para que isso seja impossível por distração.
 *
 * Server Component: lê o rótulo no servidor e não vai para o bundle do cliente.
 * Em `producao` a faixa some — o ambiente real não precisa se anunciar.
 */
import { ambienteAtual, conferirAmbiente } from "@/lib/ambiente";

/**
 * ⚠️ AS CORES SAÍRAM DAQUI EM 09/09/2026 (`FR-001`). Eram `#1e3a8a` e `#9a3412` escritos à mão, e
 * a regra de lint da fatia (a) do Épico 4 as barra — cor fora de `app/globals.css` é erro, não
 * divergência que ninguém notou.
 *
 * O local usa o tom **planejado**, que é o do que ainda não aconteceu; a pré-visualização usa
 * **atrasado**, que é o tom de aviso. Os dois são do vocabulário do domínio, e não escolha nova.
 */
const APARENCIA = {
  local: {
    rotulo: "AMBIENTE LOCAL",
    classe: "bg-planejado-tinta text-planejado-fundo",
  },
  preview: {
    rotulo: "PRÉ-VISUALIZAÇÃO — dado sintético, não é o sistema real",
    classe: "bg-atrasado-tinta text-atrasado-fundo",
  },
  producao: null,
} as const;

export function FaixaDeAmbiente() {
  const ambiente = ambienteAtual();
  const aparencia = APARENCIA[ambiente];
  if (aparencia === null) return null;

  const faltas = conferirAmbiente();

  return (
    <div
      role="status"
      className={`px-4 py-1.5 text-center text-xs font-semibold tracking-wider ${aparencia.classe}`}
    >
      {aparencia.rotulo}
      {faltas.length > 0 ? ` · ${faltas.length} variável(is) de ambiente por preencher` : null}
    </div>
  );
}
