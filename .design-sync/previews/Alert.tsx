import { Alert, AlertDescription, AlertTitle } from "ciaara-11-ds";
import { InfoIcon, TriangleAlertIcon } from "lucide-react";

export function Padrao() {
  return (
    <Alert className="max-w-2xl">
      <InfoIcon aria-hidden="true" />
      <AlertTitle>Este curso não está ao seu alcance</AlertTitle>
      <AlertDescription>
        O endereço aponta para um curso que não existe ou que o seu perfil não enxerga. Escolha um
        curso na lista acima.
      </AlertDescription>
    </Alert>
  );
}

export function Destrutivo() {
  return (
    <Alert variant="destructive" className="max-w-2xl">
      <TriangleAlertIcon aria-hidden="true" />
      <AlertTitle>Conflito de instrutor no 3º tempo</AlertTitle>
      <AlertDescription>
        1ºTEN (T) Marina Duarte já tem aula de Navegação na turma C-Ap-FR 2026 em 18/08/2026, no
        mesmo tempo. Escolha outro tempo ou outro instrutor antes de gravar o lançamento.
      </AlertDescription>
    </Alert>
  );
}

export function SemIcone() {
  return (
    <Alert className="max-w-2xl">
      <AlertTitle>Semana sem lançamento</AlertTitle>
      <AlertDescription>
        <p>
          O Detalhe Semanal de Aula da turma C-Ap-HN 2026 ainda não tem nenhum tempo lançado na
          semana 34 (17/08/2026 a 21/08/2026).
        </p>
        <p>Os lançamentos aparecem aqui assim que forem gravados na grade.</p>
      </AlertDescription>
    </Alert>
  );
}
