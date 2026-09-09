/**
 * Casca das rotas SEM sessão.
 *
 * Deliberadamente mínima: login, convite e recuperação não têm menu, não têm cabeçalho e não
 * mostram nada do sistema. Quem chega aqui ainda não é ninguém para o sistema.
 */
export default function LayoutDeAutenticacao({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>;
}
