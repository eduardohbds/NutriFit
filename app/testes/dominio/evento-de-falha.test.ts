import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { EventoDeFalha, type DadosDoEventoDeFalha } from '../../src/dominio/evento-de-falha';
import { InstanteUtc } from '../../src/dominio/instante-utc';

const base: DadosDoEventoDeFalha = {
  quando: InstanteUtc.de('2026-11-10T16:45:00.000Z'),
  nivel: 'erro',
  onde: 'Importacao',
  codigo: 'VALOR_INVALIDO',
  campo: 'cintura',
  esperado: 'número maior que o pescoço',
  versaoApp: '0.0.1',
};

describe('EventoDeFalha (arquitetura 11.1)', () => {
  it('descarta qualquer chave fora das sete do formato', () => {
    const comExtras = {
      ...base,
      comando: 'aumente o supino',
      valor: '85 cm',
    } as DadosDoEventoDeFalha;
    const json = EventoDeFalha.criar(comExtras).paraJson();
    expect(Object.keys(JSON.parse(json))).toEqual([
      'quando',
      'nivel',
      'onde',
      'codigo',
      'campo',
      'esperado',
      'versaoApp',
    ]);
    expect(json).not.toMatch(/supino|85 cm/);
  });

  it('preenche campo e esperado com nulo quando a falha não é de validação', () => {
    const json = EventoDeFalha.criar({ ...base, campo: undefined, esperado: undefined }).paraJson();
    expect(JSON.parse(json)).toMatchObject({ campo: null, esperado: null });
  });

  it.each([
    ['onde com texto livre', { onde: 'aumente o supino em 10 kg' }],
    ['código com texto livre', { codigo: 'token ya29.abc' }],
    ['campo com texto livre', { campo: 'cintura 85 cm' }],
    ['esperado com quebra de linha', { esperado: 'número\n85' }],
    ['esperado longo demais', { esperado: 'x'.repeat(121) }],
    ['versão fora do formato', { versaoApp: 'dev' }],
  ])('recusa %s', (_, alteracao) => {
    expect(() => EventoDeFalha.criar({ ...base, ...alteracao })).toThrow(ErroDeValidacao);
  });
});
