import type { FichaParaEdicao } from '../../src/aplicacao/casos-de-uso/ler-ficha-para-edicao';
import {
  comRotinaMovida,
  comRotinaNova,
  comRotinaRenomeada,
  pedidoDoRascunho,
  rascunhoDaFicha,
  semRotina,
} from '../../src/aplicacao/rascunho-da-ficha';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import { Identificador } from '../../src/dominio/identificador';

const SUPINO = Identificador.de('00000000-0000-7000-8000-0000000b4001');

function fichaCom(rotinas: { nome: string; dia: number | null }[]): FichaParaEdicao {
  const listas = { quantidade: 3, meta: '10', carga: null, tecnica: null, descanso: null };
  const item = {
    ordem: 1,
    exercicioId: SUPINO,
    exercicioNome: 'Supino Reto',
    grupo: null,
    unilateral: false,
    observacoes: null,
    listas,
  };
  return {
    fichaId: Identificador.de('00000000-0000-7000-8000-0000000b4000'),
    nome: 'Treino',
    situacao: 'inativa',
    versaoAtual: 1,
    rotinas: rotinas.map((r) => ({ nome: r.nome, diaDaSemana: r.dia, itens: [item] })),
  };
}

const porDia = (dias: number[]) =>
  rascunhoDaFicha(
    fichaCom(
      dias.map((dia) => ({
        nome: ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab', 'Dom'][dia - 1],
        dia,
      })),
    ),
  );
const porRotulo = (nomes: string[]) =>
  rascunhoDaFicha(fichaCom(nomes.map((nome) => ({ nome, dia: null }))));
const nomesDas = (rascunho: ReturnType<typeof rascunhoDaFicha>) =>
  rascunho.rotinas.map((r) => r.nome);

describe('tipo de rotina do rascunho (US-007d3, RB01)', () => {
  it('é por dia da semana quando as rotinas da ficha têm dia, e por rotação quando não têm', () => {
    expect(porDia([1, 2]).tipoDeRotina).toBe('dia-da-semana');
    expect(porRotulo(['Treino A']).tipoDeRotina).toBe('rotacao');
  });
});

describe('comRotinaNova (US-007d3)', () => {
  it('na ficha por dia, a rotina nova nasce vazia com o primeiro dia livre e o nome desse dia', () => {
    const novo = comRotinaNova(porDia([1, 2]));

    expect(novo.rotinas[2]).toEqual({ nome: 'Quarta', diaDaSemana: 3, itens: [] });
    expect(novo.rotinas).toHaveLength(3);
  });

  it('na ficha por dia, ocupa o primeiro dia livre mesmo quando há buraco no começo', () => {
    const novo = comRotinaNova(porDia([2, 3]));

    expect(novo.rotinas[2]).toMatchObject({ nome: 'Segunda', diaDaSemana: 1 });
  });

  it('na ficha por dia, sem nenhum dia livre é erro, e a tela esconde o botão', () => {
    const semana = porDia([1, 2, 3, 4, 5, 6, 7]);

    expect(() => comRotinaNova(semana)).toThrow(ErroDeValidacao);
  });

  it('na ficha por rotação, a rotina nova leva o primeiro rótulo Treino ainda não usado', () => {
    expect(comRotinaNova(porRotulo(['Treino A', 'Treino B'])).rotinas[2]).toEqual({
      nome: 'Treino C',
      diaDaSemana: null,
      itens: [],
    });
    expect(comRotinaNova(porRotulo(['Treino B'])).rotinas[1].nome).toBe('Treino A');
    expect(comRotinaNova(porRotulo(['Peito e Tríceps'])).rotinas[1].nome).toBe('Treino A');
  });

  it('devolve um rascunho novo e não altera o anterior', () => {
    const rascunho = porDia([1]);
    const antes = structuredClone(rascunho);

    comRotinaNova(rascunho);

    expect(rascunho).toEqual(antes);
  });
});

describe('semRotina e comRotinaRenomeada (US-007d3)', () => {
  it('semRotina tira só a rotina pedida, e pode tirar todas até o salvamento barrar', () => {
    const rascunho = porDia([1, 2, 3]);

    expect(nomesDas(semRotina(rascunho, 1))).toEqual(['Seg', 'Qua']);
    expect(semRotina(semRotina(semRotina(rascunho, 0), 0), 0).rotinas).toEqual([]);
  });

  it('comRotinaRenomeada troca só o nome, do jeito que foi digitado, e o dia continua', () => {
    const rascunho = porDia([1, 2]);

    const novo = comRotinaRenomeada(rascunho, 1, '  Costas ');

    expect(nomesDas(novo)).toEqual(['Seg', '  Costas ']);
    expect(novo.rotinas[1].diaDaSemana).toBe(2);
    expect(novo.rotinas[1].itens).toEqual(rascunho.rotinas[1].itens);
  });

  it('devolvem um rascunho novo, e rotina que não existe é erro', () => {
    const rascunho = porDia([1, 2]);
    const antes = structuredClone(rascunho);

    semRotina(rascunho, 0);
    comRotinaRenomeada(rascunho, 0, 'X');

    expect(rascunho).toEqual(antes);
    expect(() => semRotina(rascunho, 5)).toThrow(ErroDeValidacao);
    expect(() => comRotinaRenomeada(rascunho, 5, 'X')).toThrow(ErroDeValidacao);
  });
});

describe('comRotinaMovida (US-007d3)', () => {
  it('descer troca a rotina com a seguinte, levando as linhas e o dia junto', () => {
    const novo = comRotinaMovida(porDia([1, 2, 3]), 0, 1);

    expect(nomesDas(novo)).toEqual(['Ter', 'Seg', 'Qua']);
    expect(novo.rotinas.map((r) => r.diaDaSemana)).toEqual([2, 1, 3]);
  });

  it('subir troca a rotina com a anterior', () => {
    expect(nomesDas(comRotinaMovida(porDia([1, 2, 3]), 2, -1))).toEqual(['Seg', 'Qua', 'Ter']);
  });

  it('subir a primeira e descer a última não fazem nada', () => {
    const rascunho = porDia([1, 2, 3]);

    expect(comRotinaMovida(rascunho, 0, -1)).toEqual(rascunho);
    expect(comRotinaMovida(rascunho, 2, 1)).toEqual(rascunho);
  });

  it('devolve um rascunho novo, e rotina que não existe é erro', () => {
    const rascunho = porDia([1, 2]);
    const antes = structuredClone(rascunho);

    comRotinaMovida(rascunho, 0, 1);

    expect(rascunho).toEqual(antes);
    expect(() => comRotinaMovida(rascunho, 5, 1)).toThrow(ErroDeValidacao);
  });
});

describe('pedidoDoRascunho com rotinas mexidas (US-007d3)', () => {
  it('as rotinas vão na ordem do rascunho, e a rotina nova vai vazia para o SalvarFicha barrar', () => {
    const mexido = comRotinaNova(comRotinaMovida(porDia([1, 2]), 0, 1));

    const rotinas = pedidoDoRascunho(mexido, '').rotinas;

    expect(rotinas.map((r) => [r.nome, r.diaDaSemana, r.itens.length])).toEqual([
      ['Ter', 2, 1],
      ['Seg', 1, 1],
      ['Quarta', 3, 0],
    ]);
  });
});
