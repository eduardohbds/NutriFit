import type { FichaParaEdicao } from '../../src/aplicacao/casos-de-uso/ler-ficha-para-edicao';
import { comExercicio, comTexto, rascunhoDaFicha } from '../../src/aplicacao/rascunho-da-ficha';
import { Identificador } from '../../src/dominio/identificador';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000e1001');
const REMADA = Identificador.de('00000000-0000-7000-8000-0000000e1002');
const PUNHO = Identificador.de('00000000-0000-7000-8000-0000000e1003');

function fichaLida(): FichaParaEdicao {
  return {
    fichaId: Identificador.de('00000000-0000-7000-8000-0000000e1000'),
    nome: 'Treino A',
    situacao: 'inativa',
    versaoAtual: 2,
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
            listas: {
              quantidade: 4,
              meta: '12/10/8/falha',
              carga: '60',
              tecnica: null,
              descanso: '90/90/90/120',
            },
          },
          {
            ordem: 2,
            exercicioId: REMADA,
            exercicioNome: 'Remada Curvada',
            grupo: 'A',
            unilateral: true,
            observacoes: 'Pegada aberta',
            listas: { quantidade: 3, meta: '10', carga: null, tecnica: null, descanso: null },
          },
        ],
      },
    ],
  };
}

describe('rascunhoDaFicha (US-007c2)', () => {
  it('passa os campos de séries para texto, com o campo sem valor virando texto vazio', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const [supino, remada] = rascunho.rotinas[0].itens;
    expect(supino.textos).toEqual({
      quantidade: '4',
      meta: '12/10/8/falha',
      carga: '60',
      tecnica: '',
      descanso: '90/90/90/120',
    });
    expect(remada.textos).toEqual({
      quantidade: '3',
      meta: '10',
      carga: '',
      tecnica: '',
      descanso: '',
    });
  });

  it('mantém ficha, rotina, exercício, grupo, unilateral e observações como foram lidos', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    expect(rascunho).toMatchObject({ fichaId: fichaLida().fichaId, nome: 'Treino A' });
    expect(rascunho.rotinas[0]).toMatchObject({ nome: 'Segunda', diaDaSemana: 1 });
    expect(rascunho.rotinas[0].itens[1]).toMatchObject({
      exercicioId: REMADA,
      exercicioNome: 'Remada Curvada',
      grupo: 'A',
      unilateral: true,
      observacoes: 'Pegada aberta',
    });
  });
});

describe('comExercicio (US-007c2)', () => {
  it('troca só o exercício da linha escolhida, e os textos dela ficam como estavam', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comExercicio(rascunho, 0, 0, { id: PUNHO, nome: 'Rosca de Punho Inversa' });

    const [primeiro, segundo] = novo.rotinas[0].itens;
    expect(primeiro).toMatchObject({ exercicioId: PUNHO, exercicioNome: 'Rosca de Punho Inversa' });
    expect(primeiro.textos).toEqual(rascunho.rotinas[0].itens[0].textos);
    expect(segundo).toEqual(rascunho.rotinas[0].itens[1]);
  });

  it('devolve um rascunho novo e não altera o anterior', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const antes = structuredClone(rascunho);

    comExercicio(rascunho, 0, 0, { id: PUNHO, nome: 'Rosca de Punho Inversa' });

    expect(rascunho).toEqual(antes);
  });
});

describe('comTexto (US-007c2)', () => {
  it('troca só o campo pedido da linha escolhida, do jeito que foi digitado', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comTexto(rascunho, 0, 1, 'descanso', '90/90/1:30');

    const [primeiro, segundo] = novo.rotinas[0].itens;
    const textosAntes = rascunho.rotinas[0].itens[1].textos;
    expect(segundo.textos).toEqual({ ...textosAntes, descanso: '90/90/1:30' });
    expect(primeiro).toEqual(rascunho.rotinas[0].itens[0]);
  });

  it('aceita texto incompleto ou inválido, porque o rascunho ainda não é uma ficha', () => {
    const rascunho = rascunhoDaFicha(fichaLida());

    const novo = comTexto(comTexto(rascunho, 0, 0, 'carga', '60//'), 0, 0, 'quantidade', 'abc');

    expect(novo.rotinas[0].itens[0].textos).toMatchObject({ carga: '60//', quantidade: 'abc' });
  });

  it('devolve um rascunho novo e não altera o anterior', () => {
    const rascunho = rascunhoDaFicha(fichaLida());
    const antes = structuredClone(rascunho);

    comTexto(rascunho, 0, 0, 'meta', '8-12');

    expect(rascunho).toEqual(antes);
  });
});
