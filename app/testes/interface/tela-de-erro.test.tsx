import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { RegistrarFalha } from '../../src/aplicacao/casos-de-uso/registrar-falha';
import { TelaDeErro } from '../../src/interface/componentes/tela-de-erro';
import { textos } from '../../src/interface/textos';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../dubles/relogio-fixo';

async function montar() {
  const registro = new RegistroDeFalhasEmMemoria();
  const registrarFalha = new RegistrarFalha(registro, new RelogioFixo(), '0.0.1');
  const tentarDeNovo = jest.fn();
  await render(
    <TelaDeErro
      erro={new Error('cintura 85')}
      tentarDeNovo={tentarDeNovo}
      registrarFalha={registrarFalha}
    />,
  );
  return { registro, tentarDeNovo };
}

describe('erro inesperado (CE62)', () => {
  it('mostra mensagem simples, sem o detalhe técnico, e a opção de tentar de novo', async () => {
    await montar();
    expect(screen.getByText(textos.erroInesperado.mensagem)).toBeTruthy();
    expect(screen.getByRole('button', { name: textos.erroInesperado.tentarDeNovo })).toBeTruthy();
    expect(screen.queryByText(/cintura 85/)).toBeNull();
  });

  it('cria um registro de falha uma única vez', async () => {
    const { registro } = await montar();
    await waitFor(async () => expect(await registro.lerLinhas()).toHaveLength(1));
    expect(JSON.parse((await registro.lerLinhas())[0])).toMatchObject({
      onde: 'Interface',
      codigo: 'ERRO_INESPERADO',
    });
  });

  it('tentar de novo chama a recuperação', async () => {
    const { tentarDeNovo } = await montar();
    await fireEvent.press(screen.getByRole('button', { name: textos.erroInesperado.tentarDeNovo }));
    expect(tentarDeNovo).toHaveBeenCalledTimes(1);
  });
});
