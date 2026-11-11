import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { renderRouter } from 'expo-router/testing-library';
import { Text } from 'react-native';

import { textos } from '../../src/interface/textos';
import { abrirBancoMigrado, criarFichaComSerie, criarSessaoComSerie } from '../apoio/banco-sqlite';
import { arquivosEmMemoria } from '../apoio/expo-file-system-em-memoria';

jest.mock('expo-file-system', () => require('../apoio/expo-file-system-em-memoria'));

const ARQUIVO = 'file:///documentos/registro-de-falhas.jsonl';

// Uma tela que falha enquanto o erro "existe". O React redesenha um componente que lançou
// erro antes de acionar o limite, então falhar só na primeira vez não chegaria a ele.
const estado = { falhar: true };
function TelaInstavel() {
  if (estado.falhar) throw new Error('cintura 85');
  return <Text>tela recuperada</Text>;
}

describe('limite de erro do app (CE62)', () => {
  beforeEach(() => {
    arquivosEmMemoria.clear();
    estado.falhar = true;
  });

  it('um erro numa tela mostra a mensagem, grava no registro de falhas e se recupera ao tentar de novo', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const layout = require('../../app/_layout');
    await renderRouter({ _layout: layout, index: TelaInstavel });
    expect(await screen.findByText(textos.erroInesperado.mensagem)).toBeTruthy();
    await waitFor(() => expect(arquivosEmMemoria.get(ARQUIVO)).toContain('ERRO_INESPERADO'));
    estado.falhar = false;
    await fireEvent.press(screen.getByRole('button', { name: textos.erroInesperado.tentarDeNovo }));
    expect(await screen.findByText('tela recuperada')).toBeTruthy();
  });

  it('os dados já gravados continuam no banco depois do erro e da recuperação', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => undefined);
    const banco = abrirBancoMigrado();
    criarSessaoComSerie(banco, criarFichaComSerie(banco).exercicio);
    const contar = () => banco.prepare('SELECT COUNT(*) AS total FROM serie_executada').get();
    const antes = contar();
    await renderRouter({ _layout: require('../../app/_layout'), index: TelaInstavel });
    const botao = await screen.findByRole('button', { name: textos.erroInesperado.tentarDeNovo });
    estado.falhar = false;
    await fireEvent.press(botao);
    await screen.findByText('tela recuperada');
    expect(contar()).toEqual(antes);
    expect(antes).toEqual({ total: 1 });
  });
});
