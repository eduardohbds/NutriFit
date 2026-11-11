import { RegistrarFalha } from '../../src/aplicacao/casos-de-uso/registrar-falha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { RegistroDeFalhasEmMemoria } from '../dubles/registro-de-falhas-em-memoria';
import { RelogioFixo } from '../dubles/relogio-fixo';

function montar() {
  const registro = new RegistroDeFalhasEmMemoria();
  const registrar = new RegistrarFalha(
    registro,
    new RelogioFixo('2026-11-10T16:45:00.000Z'),
    '0.0.1',
  );
  return { registro, registrar };
}

async function linhasJson(registro: RegistroDeFalhasEmMemoria) {
  return (await registro.lerLinhas()).map((linha) => JSON.parse(linha));
}

describe('RegistrarFalha: formato do evento (RNF36)', () => {
  it.each(['Importacao', 'Backup', 'Restauracao', 'IA'])(
    'falha de %s vira JSON com quando, nivel, onde, codigo, campo, esperado e versaoApp',
    async (onde) => {
      const { registro, registrar } = montar();
      await registrar.executar({
        onde,
        erro: new ErroDeValidacao('cintura', 'número maior que o pescoço', '38 cm'),
      });
      expect(await linhasJson(registro)).toEqual([
        {
          quando: '2026-11-10T16:45:00.000Z',
          nivel: 'erro',
          onde,
          codigo: 'VALOR_INVALIDO',
          campo: 'cintura',
          esperado: 'número maior que o pescoço',
          versaoApp: '0.0.1',
        },
      ]);
    },
  );

  it('usa o código informado pelo chamador quando há um', async () => {
    const { registro, registrar } = montar();
    await registrar.executar({
      onde: 'Backup',
      codigo: 'BACKUP_SEM_REDE',
      erro: new Error('rede'),
      nivel: 'aviso',
    });
    expect(await linhasJson(registro)).toEqual([
      expect.objectContaining({
        codigo: 'BACKUP_SEM_REDE',
        nivel: 'aviso',
        campo: null,
        esperado: null,
      }),
    ]);
  });

  it('erro sem código vira ERRO_INESPERADO', async () => {
    const { registro, registrar } = montar();
    await registrar.executar({ onde: 'Interface', erro: new TypeError('x is undefined') });
    expect(await linhasJson(registro)).toEqual([
      expect.objectContaining({ codigo: 'ERRO_INESPERADO' }),
    ]);
  });
});

describe('RegistrarFalha: nada pessoal no registro (SEG13)', () => {
  const PROIBIDOS = [
    'aumente',
    'supino',
    'ya29',
    'segredo-123',
    '85',
    '38 cm',
    'Treino A',
    'Supino Reto',
  ];

  it('falhas provocadas não deixam credencial, comando, medida nem conteúdo de ficha ou sessão', async () => {
    const { registro, registrar } = montar();
    await registrar.executar({
      onde: 'IA',
      erro: new Error('comando "aumente o supino 10%" token ya29.segredo-123'),
    });
    await registrar.executar({
      onde: 'Importacao',
      erro: new ErroDeValidacao('cintura', 'número maior que o pescoço', '38 cm'),
    });
    await registrar.executar({
      onde: 'Restauracao',
      erro: { ficha: 'Treino A', exercicio: 'Supino Reto', cintura: 85 },
    });
    await registrar.executar({ onde: 'Interface', erro: 'cintura 85' });
    const conteudo = (await registro.lerLinhas()).join('\n');
    expect(await registro.lerLinhas()).toHaveLength(4);
    for (const proibido of PROIBIDOS) expect(conteudo).not.toContain(proibido);
  });
});

describe('RegistrarFalha: quando o próprio registro falha', () => {
  it('avisa no console com JSON, sem lançar e sem o detalhe do erro original', async () => {
    const { registro, registrar } = montar();
    registro.falharAoGravar = true;
    const aviso = jest.spyOn(console, 'error').mockImplementation(() => undefined);
    await expect(
      registrar.executar({ onde: 'IA', erro: new Error('comando secreto') }),
    ).resolves.toBeUndefined();
    expect(aviso).toHaveBeenCalledTimes(1);
    const texto = String(aviso.mock.calls[0][0]);
    expect(JSON.parse(texto)).toMatchObject({
      nivel: 'erro',
      onde: 'RegistrarFalha',
      codigo: 'REGISTRO_INDISPONIVEL',
    });
    expect(texto).not.toContain('secreto');
    aviso.mockRestore();
  });
});
