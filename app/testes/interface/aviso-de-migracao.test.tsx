import { render, screen } from '@testing-library/react-native';

import { AvisoDeMigracao } from '../../src/interface/componentes/aviso-de-migracao';
import { textos } from '../../src/interface/textos';

describe('AvisoDeMigracao (CE63: o usuário é informado)', () => {
  it('migração revertida avisa que os dados anteriores foram mantidos', async () => {
    await render(<AvisoDeMigracao situacao="revertido" />);
    expect(screen.getByText(textos.migracao.revertida)).toBeTruthy();
    expect(textos.migracao.revertida).toMatch(/dados/i);
  });

  it('migração que nem começou avisa que nada foi alterado', async () => {
    await render(<AvisoDeMigracao situacao="nao_migrado" />);
    expect(screen.getByText(textos.migracao.naoMigrada)).toBeTruthy();
  });

  it('migração concluída não mostra aviso', async () => {
    const { toJSON } = await render(<AvisoDeMigracao situacao="migrado" />);
    expect(toJSON()).toBeNull();
  });
});
