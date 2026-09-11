/**
 * Seletor de turma (`RF-CURSO`, `FR-010`).
 *
 * ⚠️ 29 TURMAS NÃO PEDEM BUSCA, e é por isso que ele se constrói sobre o primitivo de seleção e
 * não sobre a lista navegável. O primitivo já traz navegação por teclado, fechamento por `Esc` e
 * anúncio da opção escolhida — construir por cima seria reimplementar pior.
 *
 * ⚠️ ELE NÃO ORDENA POR REGRA DE DOMÍNIO. Turma não tem antiguidade; a ordem é a que chega, e se
 * alguém quiser outra, ordena antes. É a diferença em relação ao seletor de instrutor, e ela não é
 * inconsistência: é que só um dos dois tem uma `RN-` atrás.
 *
 * ⚠️ NUNCA EXIBE IDENTIFICADOR TÉCNICO (`FR-027.3` da spec 006). O `id` é o valor da escolha; o
 * que a pessoa lê é o rótulo.
 *
 * ⚠️ COM MARCADOR DE CLIENTE: abrir, escolher e fechar são comportamento de navegador.
 */
"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { EstadoVazio } from "@/components/ciaara/EstadoVazio";

export type TurmaParaExibir = {
  readonly id: string;
  readonly rotulo: string;
};

export type SeletorTurmaProps = {
  readonly turmas: readonly TurmaParaExibir[];
  readonly valor?: string;
  readonly aoMudar: (id: string) => void;
  readonly rotulo?: string;
  readonly id?: string;
  readonly className?: string;
};

export function SeletorTurma({
  turmas,
  valor,
  aoMudar,
  rotulo = "Turma",
  id,
  className,
}: SeletorTurmaProps) {
  if (turmas.length === 0) {
    // ⚠️ `RN-DEG-01`: lista vazia não é um seletor vazio e mudo. E a distinção entre "não há" e
    // "você não vê" é de quem chama — aqui só se sabe que não veio nada.
    return <EstadoVazio motivo="sem-dado" detalhe="Nenhuma turma disponível para escolher." />;
  }

  return (
    <Select value={valor ?? ""} onValueChange={aoMudar}>
      <SelectTrigger data-slot="seletor-turma" id={id} aria-label={rotulo} className={className}>
        <SelectValue placeholder={`Escolha a ${rotulo.toLocaleLowerCase("pt-BR")}`} />
      </SelectTrigger>
      <SelectContent>
        {turmas.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.rotulo}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
