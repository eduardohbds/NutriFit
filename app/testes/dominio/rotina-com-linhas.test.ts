import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { exigirRotinasComLinhas } from '../../src/dominio/rotina-com-linhas';

function recusa(rotinas: { nome: string; itens: unknown[] }[]): ErroDeValidacao {
  try {
    exigirRotinasComLinhas(rotinas);
  } catch (e) {
    expect(e).toBeInstanceOf(ErroDeValidacao);
    return e as ErroDeValidacao;
  }
  throw new Error('esperava ErroDeValidacao');
}

describe('exigirRotinasComLinhas (US-007d2)', () => {
  it('aceita rotinas com ao menos uma linha', () => {
    const rotinas = [
      { nome: 'Segunda', itens: [1] },
      { nome: 'Terça', itens: [1, 2] },
    ];

    expect(() => exigirRotinasComLinhas(rotinas)).not.toThrow();
  });

  it('recusa a rotina sem linhas, indicando a rotina, o valor recebido e o formato esperado', () => {
    const erro = recusa([
      { nome: 'Segunda', itens: [1] },
      { nome: 'Terça', itens: [] },
    ]);

    expect(erro.campo).toBe('rotina "Terça"');
    expect(erro.recebido).toBe('0 linhas');
    expect(erro.esperado).toBe('ao menos 1 linha');
  });

  it('aponta a primeira rotina vazia quando há mais de uma', () => {
    const erro = recusa([
      { nome: 'Segunda', itens: [] },
      { nome: 'Terça', itens: [] },
    ]);

    expect(erro.campo).toBe('rotina "Segunda"');
  });
});
