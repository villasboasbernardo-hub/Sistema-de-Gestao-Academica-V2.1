/**
 * Carregamento do cadastro de instrutor (`RN-DEG-01`, `FR-045` da spec 008).
 *
 * ⚠️ **SEM `<main>` AQUI.** A casca já desenha o dela, e um segundo produz dois marcos iguais no
 * documento enquanto o segmento carrega — o defeito que a fatia (b) do Épico 4 pagou com dois
 * diagnósticos errados.
 *
 * ⚠️ **A SILHUETA TEM O FORMATO DA TABELA**, e não um giro genérico: quem espera precisa saber que
 * está chegando uma lista.
 */
import { EsqueletoTabela } from "@/components/ciaara/esqueleto-tabela";

export default function CarregandoNovoInstrutor() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col gap-3">
      <span className="sr-only">Carregando o cadastro de instrutor…</span>
      <div className="bg-superficie-2 rounded-ciaara h-7 w-48" />
      <EsqueletoTabela />
    </div>
  );
}
