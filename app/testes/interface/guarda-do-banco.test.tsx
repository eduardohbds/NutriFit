import { render, screen, waitFor } from '@testing-library/react-native';
import { Text } from 'react-native';

import type { AbrirBanco } from '../../src/aplicacao/casos-de-uso/abrir-banco';
import type { SituacaoDaMigracao } from '../../src/aplicacao/casos-de-uso/migrar-banco';
import { GuardaDoBanco } from '../../src/interface/componentes/guarda-do-banco';
import { textos } from '../../src/interface/textos';

function abrirBancoFalso(situacao: SituacaoDaMigracao) {
  let liberar: () => void = () => {};
  const espera = new Promise<void>((resolve) => (liberar = resolve));
  const abrirBanco = {
    executar: async () => {
      await espera;
      return { situacao };
    },
  } as unknown as AbrirBanco;
  return { abrirBanco, liberar };
}

describe('GuardaDoBanco (CE63: nenhuma tela usa o banco antes da migração)', () => {
  it('não mostra as telas enquanto o banco está sendo aberto e migrado', async () => {
    const { abrirBanco } = abrirBancoFalso('migrado');
    await render(
      <GuardaDoBanco abrirBanco={abrirBanco}>
        <Text>tela do treino</Text>
      </GuardaDoBanco>,
    );
    expect(screen.queryByText('tela do treino')).toBeNull();
  });

  it('mostra as telas sem aviso depois de migrar', async () => {
    const { abrirBanco, liberar } = abrirBancoFalso('migrado');
    await render(
      <GuardaDoBanco abrirBanco={abrirBanco}>
        <Text>tela do treino</Text>
      </GuardaDoBanco>,
    );
    liberar();
    expect(await screen.findByText('tela do treino')).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('mostra o aviso e as telas quando a migração foi revertida', async () => {
    const { abrirBanco, liberar } = abrirBancoFalso('revertido');
    await render(
      <GuardaDoBanco abrirBanco={abrirBanco}>
        <Text>tela do treino</Text>
      </GuardaDoBanco>,
    );
    liberar();
    await waitFor(() => expect(screen.getByText(textos.migracao.revertida)).toBeTruthy());
    expect(screen.getByText('tela do treino')).toBeTruthy();
  });
});
