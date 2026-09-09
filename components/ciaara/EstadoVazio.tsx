/**
 * Estado vazio que diz QUAL dos dois vazios é.
 *
 * ⚠️ POR QUE ISTO É COMPONENTE E NÃO UM `<p>Nada encontrado</p>`: uma RLS restritiva demais faz a
 * tela abrir vazia, **sem erro**, e o usuário conclui que não há cadastro. É o risco R-03 do
 * documento 20 §11, e o Princípio V o nomeia como obrigação: *"distinguir 'não há dado' de 'há
 * dado que você não pode ver' é parte desta obrigação"*.
 *
 * O componente não decide qual é — quem chama sabe se filtrou por permissão. Ele só torna a
 * distinção impossível de esquecer, porque `motivo` é obrigatório.
 */

export type MotivoDoVazio = "sem-dado" | "sem-permissao";

const TEXTO: Record<MotivoDoVazio, { titulo: string; detalhe: string }> = {
  "sem-dado": {
    titulo: "Nada cadastrado ainda",
    detalhe: "Não há registro para os filtros atuais.",
  },
  "sem-permissao": {
    titulo: "Você não tem acesso a este conteúdo",
    detalhe:
      "Existe dado aqui — o seu perfil não alcança. Fale com o Admin se precisar deste acesso.",
  },
};

export function EstadoVazio({
  motivo,
  detalhe,
}: {
  readonly motivo: MotivoDoVazio;
  readonly detalhe?: string;
}) {
  const padrao = TEXTO[motivo];
  return (
    <div role="status" className="rounded border border-dashed p-6 text-center">
      <p className="font-medium">{padrao.titulo}</p>
      <p className="mt-1 text-sm opacity-80">{detalhe ?? padrao.detalhe}</p>
    </div>
  );
}
