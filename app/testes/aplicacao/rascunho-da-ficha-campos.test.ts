import type { FichaParaEdicao } from '../../src/aplicacao/casos-de-uso/ler-ficha-para-edicao';
import {
  comGrupo,
  comNome,
  comObservacoes,
  comUnilateral,
  pedidoDoRascunho,
  rascunhoDaFicha,
} from '../../src/aplicacao/rascunho-da-ficha';
import { Identificador } from '../../src/dominio/identificador';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000b2001');
const REMADA = Identificador.de('00000000-0000-7000-8000-0000000b2002');

function fichaLida(): FichaParaEdicao {
  const listas = { quantidade: 3, meta: '10', carga: null, tecnica: null, descanso: null };
  return {
    fichaId: Identificador.de('00000000-0000-7000-8000-0000000b2000'),
    nome: 'Treino A',
    situacao: 'inativa',
    versaoAtual: 1,
    rotinas: [
      {
        nome: 'Segunda',
        diaDaSemana: 1,
        itens: [
          {
            ordem: 1,
            exercicioId: SUPINO,
            exercicioNome: 'Supino Reto',
            grupo: null,
            unilateral: false,
            observacoes: null,
            listas,
          },
          {
            ordem: 2,
            exercicioId: REMADA,
            exercicioNome: 'Remada Curvada',
            grupo: 'A',
            unilateral: true,
            observacoes: 'Pegada aberta',
            listas,
          },
        ],
      },
    ],
  };
}

describe('rascunhoDaFicha: grupo e observações em texto (US-007d1)', () => {
  it('grupo e observações sem valor viram texto vazio, e os preenchidos ficam como estavam', () => {
    const [supino, remada] = rascunhoDaFicha(fichaLida()).rotinas[0].itens;

    expect(supino).toMatchObject({ grupo: '', observacoes: '', unilateral: false });
    expect(remada).toMatchObject({ grupo: 'A', observacoes: 'Pegada aberta', unilateral: true });
  });
});

describe('comGrupo, comObservacoes, comUnilateral e comNome (US-007d1)', () => {
  it('comGrupo troca só o grupo da linha, do jeito que foi digitado', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comGrupo(comGrupo(rascunho, 0, 0, 'b'), 0, 1, '');

    expect(novo.rotinas[0].itens.map((i) => i.grupo)).toEqual(['b', '']);
    expect(novo.rotinas[0].itens[0].textos).toEqual(rascunho.rotinas[0].itens[0].textos);
  });

  it('comObservacoes troca só as observações da linha', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comObservacoes(rascunho, 0, 0, 'Banco inclinado');

    expect(novo.rotinas[0].itens.map((i) => i.observacoes)).toEqual([
      'Banco inclinado',
      'Pegada aberta',
    ]);
  });

  it('comUnilateral troca só o unilateral da linha', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comUnilateral(comUnilateral(rascunho, 0, 0, true), 0, 1, false);

    expect(novo.rotinas[0].itens.map((i) => i.unilateral)).toEqual([true, false]);
  });

  it('comNome troca só o nome da ficha, e o texto em branco é aceito no rascunho', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    expect(comNome(rascunho, 'Treino B').nome).toBe('Treino B');
    expect(comNome(rascunho, '   ').nome).toBe('   ');
    expect(comNome(rascunho, 'Treino B').rotinas).toEqual(rascunho.rotinas);
  });

  it('devolvem um rascunho novo e não alteram o anterior', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const antes = structuredClone(rascunho);

    comGrupo(rascunho, 0, 0, 'C');
    comObservacoes(rascunho, 0, 0, 'x');
    comUnilateral(rascunho, 0, 0, true);
    comNome(rascunho, 'Outro');

    expect(rascunho).toEqual(antes);
  });
});

describe('pedidoDoRascunho: grupo, unilateral, observações e nome (US-007d1)', () => {
  it('grupo e observações vazios viram nulo, e os preenchidos vão ao pedido sem espaços nas pontas', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const alterado = comObservacoes(comGrupo(rascunho, 0, 0, ' B '), 0, 1, '   ');

    const [supino, remada] = pedidoDoRascunho(alterado, '').rotinas[0].itens;

    expect(supino).toMatchObject({ grupo: 'B', observacoes: null, unilateral: false });
    expect(remada).toMatchObject({ grupo: 'A', observacoes: null, unilateral: true });
  });

  it('leva o nome do rascunho ao pedido, e o unilateral alterado também', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const alterado = comUnilateral(comNome(rascunho, 'Treino B'), 0, 0, true);

    const pedido = pedidoDoRascunho(alterado, '');

    expect(pedido.nome).toBe('Treino B');
    expect(pedido.rotinas[0].itens[0].unilateral).toBe(true);
  });
});
