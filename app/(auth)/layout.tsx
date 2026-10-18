/**
 * Casca das rotas SEM sessão.
 *
 * Deliberadamente mínima: o login não tem menu, não tem cabeçalho e não
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
  return (
    // ⚠️ A faixa Beta fica acima, no layout raiz (spec 016, 1.1): esta tela ocupa o resto.
    <div className="bg-fundo text-texto flex min-h-[calc(100dvh-var(--altura-da-faixa))] flex-col">
      {children}
    </div>
  );
}
