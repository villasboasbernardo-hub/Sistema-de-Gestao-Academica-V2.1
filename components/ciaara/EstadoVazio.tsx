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
 *
 * ⚠️ REVISADO NA FATIA (b) DO ÉPICO 4 (`FR-015`) — e a revisão foi consumir o vocabulário, que não
 * existia quando ele nasceu. Três mudanças, nenhuma delas de comportamento:
 *   1. `opacity-80` virou `text-texto-suave`. Opacidade é cor por outro nome, e ela não acompanha
 *      o tema: no noturno, 80% de um texto claro sobre fundo escuro perde contraste medido.
 *   2. O ícone passa a ser o da biblioteca decidida, em vez de ausência (`FR-003.2`) — e ele
 *      difere nos dois motivos, porque a diferença entre eles é o ponto do componente.
 *   3. Ação sugerida opcional, conforme o contrato de componentes: um vazio que não diz o que
 *      fazer é um beco.
 *
 * ⚠️ SEM MARCADOR DE CLIENTE, e ele é consumido por Server Component desde o Épico 3.
 */
import type * as React from "react";
import { cn } from "cn";
import { InboxIcon, LockIcon } from "lucide-react";

export type MotivoDoVazio = "sem-dado" | "sem-permissao";

const TEXTO: Record<MotivoDoVazio, { titulo: string; detalhe: string; Icone: typeof InboxIcon }> = {
  "sem-dado": {
    titulo: "Nada cadastrado ainda",
    detalhe: "Não há registro para os filtros atuais.",
    Icone: InboxIcon,
  },
  "sem-permissao": {
    titulo: "Você não tem acesso a este conteúdo",
    detalhe:
      "Existe dado aqui — o seu perfil não alcança. Fale com o Admin se precisar deste acesso.",
    Icone: LockIcon,
  },
};

export type EstadoVazioProps = {
  readonly motivo: MotivoDoVazio;
  readonly titulo?: string;
  readonly detalhe?: string;
  /** A ação sugerida — um botão, um vínculo. Opcional: nem todo vazio tem saída. */
  readonly acao?: React.ReactNode;
  readonly className?: string;
};

export function EstadoVazio({ motivo, titulo, detalhe, acao, className }: EstadoVazioProps) {
  const padrao = TEXTO[motivo];
  const Icone = padrao.Icone;

  return (
    <div
      data-slot="estado-vazio"
      data-motivo={motivo}
      role="status"
      className={cn(
        "border-borda rounded-ciaara flex flex-col items-center gap-2 border border-dashed p-6 text-center",
        className,
      )}
    >
      {/* veste: o desenho de apoio do estado vazio — nunca dado (FR-031) */}
      <Icone aria-hidden="true" className="text-texto-tenue size-6" />
      <p className="font-medium">{titulo ?? padrao.titulo}</p>
      <p className="text-texto-suave text-sm">{detalhe ?? padrao.detalhe}</p>
      {acao ? <div className="mt-1">{acao}</div> : null}
    </div>
  );
}
