import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { exigirGruposEmSequencia } from '../../src/dominio/grupo-em-sequencia';

function recusa(itens: { ordem: number; grupo: string | null }[]): ErroDeValidacao {
  try {
    exigirGruposEmSequencia('Quarta', itens);
  } catch (e) {
    expect(e).toBeInstanceOf(ErroDeValidacao);
    return e as ErroDeValidacao;
  }
  throw new Error('esperava ErroDeValidacao');
}

describe('exigirGruposEmSequencia (VE17, RB07)', () => {
  it('aceita rotina sem grupo, bi-set e tri-set consecutivos', () => {
    const itens = [
      { ordem: 1, grupo: null },
      { ordem: 2, grupo: 'A' },
      { ordem: 3, grupo: 'A' },
      { ordem: 4, grupo: 'B' },
      { ordem: 5, grupo: 'B' },
      { ordem: 6, grupo: 'B' },
    ];

    expect(() => exigirGruposEmSequencia('Quarta', itens)).not.toThrow();
  });

  it('recusa letra usada em um só exercício, indicando a rotina e a linha', () => {
    const erro = recusa([
      { ordem: 1, grupo: 'A' },
      { ordem: 2, grupo: null },
    ]);

    expect(erro.campo).toBe('Quarta, linha 1: grupo');
    expect(erro.esperado).toMatch(/ao menos dois exercícios consecutivos/);
    expect(erro.recebido).toBe('A');
  });

  it('recusa letra repetida em exercícios que não são consecutivos', () => {
    const erro = recusa([
      { ordem: 1, grupo: 'A' },
      { ordem: 2, grupo: 'A' },
      { ordem: 3, grupo: null },
      { ordem: 4, grupo: 'A' },
    ]);

    expect(erro.campo).toBe('Quarta, linha 4: grupo');
  });

  it.each(['a', '1', 'AB', ''])('recusa %p, que não é uma letra de A a Z', (grupo) => {
    const erro = recusa([
      { ordem: 1, grupo },
      { ordem: 2, grupo },
    ]);

    expect(erro.campo).toBe('Quarta, linha 1: grupo');
    expect(erro.esperado).toMatch(/letra de A a Z/);
    expect(erro.recebido).toBe(grupo);
  });

  it('confere pela ordem, e não pela posição na lista recebida', () => {
    const itens = [
      { ordem: 3, grupo: null },
      { ordem: 2, grupo: 'A' },
      { ordem: 1, grupo: 'A' },
    ];

    expect(() => exigirGruposEmSequencia('Quarta', itens)).not.toThrow();
  });
});
