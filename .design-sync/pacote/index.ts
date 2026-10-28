/*
 * Entrada do design system CIAARA-11 para o Claude Design (design-sync). NAO e codigo do sistema:
 * so reexporta os componentes de components/ui (shadcn) e components/ciaara, para o conversor
 * empacotar. Ficam de fora: SePodeVer (importa lib/autorizacao/matriz, que e server-only) e, desde
 * 27/10/2026, ExclusaoPermanente e SeletorDeAno (usam useRouter do Next e quebram fora do roteador).
 *
 * O ambiente-do-navegador vem PRIMEIRO: o next/link do BotaoDeIcone le process.env.__NEXT_* ao carregar,
 * e sem ele o bundle inteiro quebra (window.CIAARA vazio) — medido em 27/10/2026.
 */
import "./ambiente-do-navegador";

export * from "../../components/ui/alert";
export * from "../../components/ui/alert-dialog";
export * from "../../components/ui/avatar";
export * from "../../components/ui/badge";
export * from "../../components/ui/button";
export * from "../../components/ui/card";
export * from "../../components/ui/collapsible";
export * from "../../components/ui/dialog";
export * from "../../components/ui/dropdown-menu";
export * from "../../components/ui/input";
export * from "../../components/ui/label";
export * from "../../components/ui/popover";
export * from "../../components/ui/select";
export * from "../../components/ui/skeleton";
export * from "../../components/ui/table";
export * from "../../components/ui/tooltip";
export * from "../../components/ciaara/alerta-conformidade";
export * from "../../components/ciaara/avisos-recolhiveis";
export * from "../../components/ciaara/badge-status";
export * from "../../components/ciaara/badge-teto";
export * from "../../components/ciaara/barra-de-acoes";
export * from "../../components/ciaara/barra-de-progresso";
export * from "../../components/ciaara/botao-de-icone";
export * from "../../components/ciaara/botao-limpar-filtros";
export * from "../../components/ciaara/campo-de-senha";
export * from "../../components/ciaara/campo-obrigatorio";
export * from "../../components/ciaara/card-kpi";
export * from "../../components/ciaara/carrossel";
export * from "../../components/ciaara/dialogo-confirmacao";
export * from "../../components/ciaara/dialogo-de-formulario";
export * from "../../components/ciaara/esqueleto-tabela";
export * from "../../components/ciaara/EstadoVazio";
export * from "../../components/ciaara/filtro-avancado";
export * from "../../components/ciaara/grade-alocacao";
export * from "../../components/ciaara/grade-dsa";
export * from "../../components/ciaara/lista-navegavel";
export * from "../../components/ciaara/nome-instrutor";
export * from "../../components/ciaara/paineis-da-pagina";
export * from "../../components/ciaara/pedido-de-justificativa";
export * from "../../components/ciaara/provedor-de-tema";
export * from "../../components/ciaara/seletor-instrutor";
export * from "../../components/ciaara/seletor-turma";
export * from "../../components/ciaara/tabela-densa";
