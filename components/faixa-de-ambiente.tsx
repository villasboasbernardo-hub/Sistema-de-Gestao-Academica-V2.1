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

const APARENCIA = {
  local: { rotulo: "AMBIENTE LOCAL", fundo: "#1e3a8a" },
  preview: { rotulo: "PRÉ-VISUALIZAÇÃO — dado sintético, não é o sistema real", fundo: "#9a3412" },
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
      style={{
        background: aparencia.fundo,
        color: "white",
        padding: "0.375rem 1rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        letterSpacing: "0.05em",
        textAlign: "center",
      }}
    >
      {aparencia.rotulo}
      {faltas.length > 0 ? ` · ${faltas.length} variável(is) de ambiente por preencher` : null}
    </div>
  );
}
