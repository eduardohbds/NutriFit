import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { listaPorSerie } from '../../src/dominio/lista-por-serie';

function recusa(texto: string, quantidade: number): ErroDeValidacao {
  try {
    listaPorSerie('descanso', texto, quantidade);
  } catch (e) {
    expect(e).toBeInstanceOf(ErroDeValidacao);
    return e as ErroDeValidacao;
  }
  throw new Error('esperava ErroDeValidacao');
}

describe('listaPorSerie (seção 11.3, RB06)', () => {
  it('um valor único vale para todas as séries', () => {
    expect(listaPorSerie('descanso', '90', 4)).toEqual(['90', '90', '90', '90']);
  });

  it('a lista com um valor por série é devolvida na ordem', () => {
    expect(listaPorSerie('meta', '12/10/8/falha', 4)).toEqual(['12', '10', '8', 'falha']);
  });

  it('aceita espaços em volta das barras e das pontas', () => {
    expect(listaPorSerie('técnica', ' aquecimento / - / - ', 3)).toEqual(['aquecimento', '-', '-']);
  });

  it('recusa a lista com valores a mais, dizendo o campo, o esperado e o recebido', () => {
    const erro = recusa('90/90/90/120', 3);

    expect(erro.campo).toBe('descanso');
    expect(erro.esperado).toMatch(/3 valores/);
    expect(erro.recebido).toBe('90/90/90/120');
  });

  it('recusa a lista com valores a menos', () => {
    expect(recusa('90/120', 4).esperado).toMatch(/4 valores/);
  });

  it('recusa valor vazio dentro da lista', () => {
    expect(recusa('90//120', 3).recebido).toBe('90//120');
  });
});
