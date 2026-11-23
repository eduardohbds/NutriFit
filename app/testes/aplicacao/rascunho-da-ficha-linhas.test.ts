import type { FichaParaEdicao } from '../../src/aplicacao/casos-de-uso/ler-ficha-para-edicao';
import {
  comLinhaMovida,
  comLinhaNova,
  pedidoDoRascunho,
  rascunhoDaFicha,
  semLinha,
} from '../../src/aplicacao/rascunho-da-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000b3001');
const REMADA = Identificador.de('00000000-0000-7000-8000-0000000b3002');
const CORRIDA = Identificador.de('00000000-0000-7000-8000-0000000b3003');

function fichaLida(): FichaParaEdicao {
  const listas = { quantidade: 4, meta: '8-12', carga: '60', tecnica: null, descanso: '90' };
  const linha = (ordem: number, exercicioId: Identificador, exercicioNome: string) => ({
    ordem,
    exercicioId,
    exercicioNome,
    grupo: null,
    unilateral: false,
    observacoes: null,
    listas,
  });
  return {
    fichaId: Identificador.de('00000000-0000-7000-8000-0000000b3000'),
    nome: 'Treino A',
    situacao: 'inativa',
    versaoAtual: 1,
    rotinas: [
      { nome: 'Segunda', diaDaSemana: 1, itens: [linha(1, SUPINO, 'Supino Reto')] },
      {
        nome: 'Terça',
        diaDaSemana: 2,
        itens: [linha(1, REMADA, 'Remada Curvada'), linha(2, SUPINO, 'Supino Reto')],
      },
    ],
  };
}

const nomesDe = (rascunho: ReturnType<typeof rascunhoDaFicha>, rotina: number) =>
  rascunho.rotinas[rotina].itens.map((i) => i.exercicioNome);

describe('comLinhaNova (US-007d2)', () => {
  it('põe a linha no fim da rotina, com 3 séries, meta 10 e os demais campos vazios', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comLinhaNova(rascunho, 1, { id: CORRIDA, nome: 'Corrida' });

    expect(nomesDe(novo, 1)).toEqual(['Remada Curvada', 'Supino Reto', 'Corrida']);
    expect(novo.rotinas[1].itens[2]).toEqual({
      exercicioId: CORRIDA,
      exercicioNome: 'Corrida',
      grupo: '',
      unilateral: false,
      observacoes: '',
      textos: { quantidade: '3', meta: '10', carga: '', tecnica: '', descanso: '' },
    });
    expect(nomesDe(novo, 0)).toEqual(['Supino Reto']);
  });

  it('devolve um rascunho novo e não altera o anterior', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const antes = structuredClone(rascunho);

    comLinhaNova(rascunho, 0, { id: CORRIDA, nome: 'Corrida' });

    expect(rascunho).toEqual(antes);
  });

  it('rotina que não existe é erro de quem chama, e não some em silêncio', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    expect(() => comLinhaNova(rascunho, 5, { id: CORRIDA, nome: 'Corrida' })).toThrow(
      ErroDeValidacao,
    );
  });
});

describe('semLinha (US-007d2)', () => {
  it('tira só a linha pedida, e as seguintes sobem', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = semLinha(rascunho, 1, 0);

    expect(nomesDe(novo, 1)).toEqual(['Supino Reto']);
    expect(nomesDe(novo, 0)).toEqual(['Supino Reto']);
  });

  it('permite tirar a última linha da rotina, que fica vazia até o salvamento barrar', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = semLinha(rascunho, 0, 0);

    expect(novo.rotinas[0].itens).toEqual([]);
  });

  it('devolve um rascunho novo, e linha que não existe é erro', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const antes = structuredClone(rascunho);

    semLinha(rascunho, 1, 0);

    expect(rascunho).toEqual(antes);
    expect(() => semLinha(rascunho, 1, 9)).toThrow(ErroDeValidacao);
  });
});

describe('comLinhaMovida (US-007d2)', () => {
  it('descer troca a linha com a seguinte, levando os campos dela junto', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const comMeta = {
      ...rascunho,
      rotinas: [
        rascunho.rotinas[0],
        {
          ...rascunho.rotinas[1],
          itens: [
            {
              ...rascunho.rotinas[1].itens[0],
              textos: { ...rascunho.rotinas[1].itens[0].textos, meta: '5' },
            },
            rascunho.rotinas[1].itens[1],
          ],
        },
      ],
    };

    const novo = comLinhaMovida(comMeta, 1, 0, 1);

    expect(nomesDe(novo, 1)).toEqual(['Supino Reto', 'Remada Curvada']);
    expect(novo.rotinas[1].itens[1].textos.meta).toBe('5');
  });

  it('subir troca a linha com a anterior', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comLinhaMovida(rascunho, 1, 1, -1);

    expect(nomesDe(novo, 1)).toEqual(['Supino Reto', 'Remada Curvada']);
  });

  it('subir a primeira e descer a última não fazem nada', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    expect(comLinhaMovida(rascunho, 1, 0, -1)).toEqual(rascunho);
    expect(comLinhaMovida(rascunho, 1, 1, 1)).toEqual(rascunho);
  });

  it('devolve um rascunho novo e não altera o anterior', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const antes = structuredClone(rascunho);

    comLinhaMovida(rascunho, 1, 0, 1);

    expect(rascunho).toEqual(antes);
  });
});

describe('pedidoDoRascunho com linhas mexidas (US-007d2)', () => {
  it('a ordem do pedido segue a ordem do rascunho, e a linha nova leva as séries iniciais', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const mexido = comLinhaNova(comLinhaMovida(rascunho, 1, 0, 1), 1, {
      id: CORRIDA,
      nome: 'Corrida',
    });

    const itens = pedidoDoRascunho(mexido, '').rotinas[1].itens;

    expect(itens.map((i) => [i.ordem, i.exercicioId])).toEqual([
      [1, SUPINO],
      [2, REMADA],
      [3, CORRIDA],
    ]);
    expect(itens[2].listas).toEqual({
      quantidade: 3,
      meta: '10',
      carga: null,
      tecnica: null,
      descanso: null,
    });
  });
});
