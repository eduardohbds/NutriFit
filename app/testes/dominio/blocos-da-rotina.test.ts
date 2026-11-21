import { blocosDaRotina, levaDiretoAoSeguinte } from '../../src/dominio/blocos-da-rotina';
import type { ItemDaRotina } from '../../src/dominio/ficha';
import { Identificador } from '../../src/dominio/identificador';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';

const gerador = new GeradorDeIdentificadorSequencial();

function item(grupo: string | null, descansos: (number | null)[]): ItemDaRotina {
  return {
    id: gerador.gerar(),
    exercicioId: Identificador.de('00000000-0000-7000-8000-0000000b1001'),
    grupoSequencia: grupo,
    unilateral: false,
    travado: false,
    observacoes: null,
    series: descansos.map((descansoSegundos) => ({
      id: gerador.gerar(),
      meta: { tipo: 'repeticoes', minimo: 15, maximo: null, segundos: null },
      carga: null,
      tecnica: null,
      descansoSegundos,
    })),
  };
}

describe('blocosDaRotina (RB07)', () => {
  it('junta exercícios consecutivos com a mesma letra e deixa os demais cada um no seu bloco', () => {
    const itens = [
      item(null, [90]),
      item('A', [0]),
      item('A', [60]),
      item(null, [90]),
      item('B', [0]),
      item('B', [0]),
      item('B', [90]),
    ];

    const blocos = blocosDaRotina(itens);

    expect(blocos.map((b) => [b.grupo, b.itens.length])).toEqual([
      [null, 1],
      ['A', 2],
      [null, 1],
      ['B', 3],
    ]);
    expect(blocos[1].itens).toEqual([itens[1], itens[2]]);
  });

  it('rotina sem exercícios não tem blocos', () => {
    expect(blocosDaRotina([])).toEqual([]);
  });
});

describe('levaDiretoAoSeguinte (RB07)', () => {
  const bloco = () => blocosDaRotina([item('A', [0, 0, 60]), item('A', [60, 60, 60])])[0];

  it('descanso 0 em exercício que não é o último do bloco leva direto ao seguinte', () => {
    expect(levaDiretoAoSeguinte(bloco(), 0, 0)).toBe(true);
    expect(levaDiretoAoSeguinte(bloco(), 0, 1)).toBe(true);
  });

  it('descanso maior que 0 mantém o descanso, mesmo dentro do bloco', () => {
    expect(levaDiretoAoSeguinte(bloco(), 0, 2)).toBe(false);
    expect(levaDiretoAoSeguinte(bloco(), 1, 0)).toBe(false);
  });

  it('o último exercício do bloco nunca leva direto, nem com descanso 0', () => {
    const ultimo = blocosDaRotina([item('A', [60]), item('A', [0])])[0];

    expect(levaDiretoAoSeguinte(ultimo, 1, 0)).toBe(false);
  });

  it('exercício fora de grupo e série sem descanso informado não levam direto', () => {
    const sozinho = blocosDaRotina([item(null, [0])])[0];
    const semDescanso = blocosDaRotina([item('A', [null]), item('A', [60])])[0];

    expect(levaDiretoAoSeguinte(sozinho, 0, 0)).toBe(false);
    expect(levaDiretoAoSeguinte(semDescanso, 0, 0)).toBe(false);
  });
});
