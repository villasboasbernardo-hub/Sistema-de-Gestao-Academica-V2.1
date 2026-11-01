/**
 * O painel em branco de uma aba que ainda não tem conteúdo — *"em branco com o aviso 'Em breve'"* (Blocos 16 e 17,
 * pedidos de Bernardo Villas Boas de 30/10 e 01/11/2026). Um componente só para as abas APOINST e Palestras do DSA, da
 * turma e de Atividades: a frase e o desenho não divergem de uma tela para a outra.
 *
 * ⚠️ SEM MARCADOR DE CLIENTE: é texto.
 */
export function EmBreve({ slot }: { readonly slot: string }) {
  return (
    <p
      role="status"
      data-slot={slot}
      className="rounded-ciaara border-borda text-texto-suave border border-dashed p-6 text-center text-sm"
    >
      Em breve
    </p>
  );
}
