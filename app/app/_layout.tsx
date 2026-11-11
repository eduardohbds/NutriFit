import { Stack, type ErrorBoundaryProps } from 'expo-router';

import { registrarFalha } from '../src/composicao';
import { TelaDeErro } from '../src/interface/componentes/tela-de-erro';

export default function LayoutRaiz() {
  return <Stack />;
}

// O Expo Router mostra este componente quando qualquer tela abaixo do layout lança um erro.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <TelaDeErro erro={error} tentarDeNovo={() => void retry()} registrarFalha={registrarFalha} />
  );
}
