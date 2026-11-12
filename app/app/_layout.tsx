import { Stack, type ErrorBoundaryProps } from 'expo-router';

import { abrirBanco, registrarFalha } from '../src/composicao';
import { GuardaDoBanco } from '../src/interface/componentes/guarda-do-banco';
import { TelaDeErro } from '../src/interface/componentes/tela-de-erro';

export default function LayoutRaiz() {
  return (
    <GuardaDoBanco abrirBanco={abrirBanco}>
      <Stack />
    </GuardaDoBanco>
  );
}

// O Expo Router mostra este componente quando qualquer tela abaixo do layout lança um erro.
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <TelaDeErro erro={error} tentarDeNovo={() => void retry()} registrarFalha={registrarFalha} />
  );
}
