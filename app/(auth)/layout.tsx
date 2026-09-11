/**
 * Casca das rotas SEM sessão.
 *
 * Deliberadamente mínima: login, convite e recuperação não têm menu, não têm cabeçalho e não
 * mostram nada do sistema. Quem chega aqui ainda não é ninguém para o sistema.
 *
 * ⚠️ **ELA NÃO GANHA A CASCA DE NAVEGAÇÃO, e a ausência é a mesma decisão de sempre.** Um menu aqui
 * ofereceria destinos que a pessoa ainda não pode alcançar — e esconder as entradas depois de
 * mostrá-las é pior que não mostrá-las.
 *
 * ⚠️ **O VOCABULÁRIO VISUAL ENTROU EM 11/09/2026** (`FR-022`). Estas telas nasceram sóbrias por
 * decisão registrada do Épico 3: o vocabulário não existia. Agora existe, e sóbrio passou a
 * significar **token**, não ausência de estilo.
 */
export default function LayoutDeAutenticacao({ children }: { children: React.ReactNode }) {
  return <div className="bg-fundo text-texto flex min-h-screen flex-col">{children}</div>;
}
