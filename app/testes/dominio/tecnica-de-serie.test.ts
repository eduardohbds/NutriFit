import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { lerTecnica } from '../../src/dominio/tecnica-de-serie';

describe('lerTecnica (seção 11.2)', () => {
  it.each([
    ['aquecimento', 'aquecimento'],
    ['Drop-Set', 'drop-set'],
    ['rest-pause', 'rest-pause'],
    ['repeticoes parciais', 'repetições parciais'],
    ['negativa', 'negativa'],
    ['isometria', 'isometria'],
    ['  Cluster ', 'cluster'],
  ])('aceita %s e guarda o nome da lista', (texto, esperado) => {
    expect(lerTecnica(texto)).toBe(esperado);
  });

  it.each(['-', '', null])('trata %p como série sem técnica', (texto) => {
    expect(lerTecnica(texto)).toBeNull();
  });

  it('recusa uma técnica fora da lista dizendo o valor recebido e as aceitas', () => {
    const erro = (() => {
      try {
        lerTecnica('supersérie');
      } catch (e) {
        return e;
      }
      return undefined;
    })();

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect(erro).toMatchObject({ campo: 'técnica', recebido: 'supersérie' });
    expect((erro as ErroDeValidacao).esperado).toMatch(/aquecimento/);
  });
});
