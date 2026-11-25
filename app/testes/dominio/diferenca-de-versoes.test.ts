import { diferencaDeVersoes, resumoDaDiferenca } from '../../src/dominio/diferenca-de-versoes';
import {
  AGACHAMENTO,
  REMADA,
  SUPINO,
  versaoDeExemplo,
  type LinhaDeExemplo,
  type RotinaDeExemplo,
} from '../apoio/versoes-de-exemplo';

const treino = (...linhas: LinhaDeExemplo[]): RotinaDeExemplo[] => [{ nome: 'Treino A', linhas }];
const supino = (resto: Partial<LinhaDeExemplo> = {}): LinhaDeExemplo => ({
  exercicio: SUPINO,
  ...resto,
});
const remada = (resto: Partial<LinhaDeExemplo> = {}): LinhaDeExemplo => ({
  exercicio: REMADA,
  ...resto,
});

function comparar(antes: RotinaDeExemplo[], depois: RotinaDeExemplo[]) {
  return diferencaDeVersoes(versaoDeExemplo(1, antes), versaoDeExemplo(2, depois));
}

describe('diferencaDeVersoes: versões iguais (US-010a)', () => {
  it('conteúdo igual, mesmo com identificadores diferentes, não tem diferença', () => {
    const diferenca = comparar(treino(supino(), remada()), treino(supino(), remada()));

    expect(diferenca).toEqual({ rotinas: [], linhas: [] });
    expect(resumoDaDiferenca(diferenca)).toBe('Sem diferenças');
  });
});

describe('diferencaDeVersoes: linha alterada (US-010a)', () => {
  it('mesma linha com outra carga é alterada, e o campo que mudou é indicado', () => {
    const diferenca = comparar(
      treino(supino({ cargaEmQuilos: 60 })),
      treino(supino({ cargaEmQuilos: 62.5 })),
    );

    expect(diferenca.linhas).toEqual([
      { rotina: 'Treino A', exercicioId: SUPINO, tipo: 'alterada', campos: ['carga'] },
    ]);
  });

  it.each([
    ['séries', { series: 4 }],
    ['meta', { meta: 12 }],
    ['carga', { cargaEmQuilos: 50 }],
    ['técnica', { tecnica: 'drop-set' }],
    ['descanso', { descanso: 90 }],
    ['grupo', { grupo: 'A' }],
    ['unilateral', { unilateral: true }],
    ['observações', { observacoes: 'pegada fechada' }],
  ] as const)('mudar só %s é alteração desse campo', (campo, mudanca) => {
    const diferenca = comparar(treino(supino()), treino(supino(mudanca)));

    expect(diferenca.linhas.map((l) => l.campos)).toEqual([[campo]]);
  });

  it('vários campos mudados saem na mesma ordem fixa, e viram uma só linha alterada', () => {
    const diferenca = comparar(
      treino(supino({ descanso: 60 })),
      treino(supino({ meta: 12, descanso: 90, observacoes: 'x' })),
    );

    expect(diferenca.linhas).toHaveLength(1);
    expect(diferenca.linhas[0].campos).toEqual(['meta', 'descanso', 'observações']);
  });
});

describe('diferencaDeVersoes: linhas adicionadas, removidas e movidas (US-010a)', () => {
  it('linha nova no fim é adicionada, e linha que sumiu é removida', () => {
    const adicionada = comparar(treino(supino()), treino(supino(), remada()));
    const removida = comparar(treino(supino(), remada()), treino(supino()));

    expect(adicionada.linhas).toEqual([
      { rotina: 'Treino A', exercicioId: REMADA, tipo: 'adicionada', campos: [] },
    ]);
    expect(removida.linhas).toEqual([
      { rotina: 'Treino A', exercicioId: REMADA, tipo: 'removida', campos: [] },
    ]);
  });

  it('trocar um exercício por outro é uma linha removida e uma adicionada', () => {
    const diferenca = comparar(
      treino(supino(), remada()),
      treino(supino(), { exercicio: AGACHAMENTO }),
    );

    expect(diferenca.linhas.map((l) => [l.tipo, l.exercicioId])).toEqual([
      ['removida', REMADA],
      ['adicionada', AGACHAMENTO],
    ]);
  });

  it('linha mudada de lugar conta como removida e adicionada', () => {
    const diferenca = comparar(treino(supino(), remada()), treino(remada(), supino()));

    expect(diferenca.linhas.map((l) => l.tipo).sort()).toEqual(['adicionada', 'removida']);
    expect(diferenca.linhas).toHaveLength(2);
  });

  it('o mesmo exercício duas vezes na rotina casa na ordem, e só a segunda mudou', () => {
    const diferenca = comparar(
      treino(supino({ cargaEmQuilos: 50 }), supino({ cargaEmQuilos: 60 })),
      treino(supino({ cargaEmQuilos: 50 }), supino({ cargaEmQuilos: 70 })),
    );

    expect(diferenca.linhas).toHaveLength(1);
    expect(diferenca.linhas[0]).toMatchObject({ tipo: 'alterada', campos: ['carga'] });
  });
});

describe('diferencaDeVersoes: rotinas (US-010a)', () => {
  const peito = (...linhas: LinhaDeExemplo[]): RotinaDeExemplo => ({ nome: 'Peito', linhas });
  const costas = (...linhas: LinhaDeExemplo[]): RotinaDeExemplo => ({ nome: 'Costas', linhas });

  it('rotina nova é adicionada com as linhas dela, e rotina que sumiu é removida com as dela', () => {
    const nova = comparar([peito(supino())], [peito(supino()), costas(remada(), supino())]);
    const sumida = comparar([peito(supino()), costas(remada())], [peito(supino())]);

    expect(nova.rotinas).toEqual([{ nome: 'Costas', tipo: 'adicionada' }]);
    expect(nova.linhas.map((l) => [l.rotina, l.tipo])).toEqual([
      ['Costas', 'adicionada'],
      ['Costas', 'adicionada'],
    ]);
    expect(sumida.rotinas).toEqual([{ nome: 'Costas', tipo: 'removida' }]);
    expect(sumida.linhas.map((l) => [l.rotina, l.tipo])).toEqual([['Costas', 'removida']]);
  });

  it('as rotinas se casam pelo nome: renomear uma é removê-la e adicionar outra', () => {
    const diferenca = comparar([peito(supino())], [{ nome: 'Tórax', linhas: [supino()] }]);

    expect(diferenca.rotinas).toEqual([
      { nome: 'Peito', tipo: 'removida' },
      { nome: 'Tórax', tipo: 'adicionada' },
    ]);
  });

  it('a mesma linha em rotinas de mesmo nome é comparada dentro da rotina', () => {
    const diferenca = comparar(
      [peito(supino({ meta: 8 })), costas(remada())],
      [peito(supino({ meta: 10 })), costas(remada())],
    );

    expect(diferenca.linhas).toEqual([
      { rotina: 'Peito', exercicioId: SUPINO, tipo: 'alterada', campos: ['meta'] },
    ]);
  });
});

describe('resumoDaDiferenca (US-010a)', () => {
  it('conta alteradas, adicionadas e removidas, nessa ordem, no singular e no plural', () => {
    const diferenca = comparar(
      treino(supino({ meta: 8 }), remada({ meta: 8 }), { exercicio: AGACHAMENTO }),
      treino(
        supino({ meta: 10 }),
        remada({ meta: 10 }),
        { exercicio: AGACHAMENTO, series: 3 },
        supino(),
      ),
    );

    expect(resumoDaDiferenca(diferenca)).toBe('2 linhas alteradas, 1 linha adicionada');
  });

  it('com linha removida e rotinas, cada contagem aparece com o nome certo', () => {
    const remocao = comparar(treino(supino(), remada()), treino(supino()));
    const rotinas = comparar(
      [{ nome: 'Peito', linhas: [supino()] }],
      [
        { nome: 'Peito', linhas: [supino()] },
        { nome: 'Costas', linhas: [remada(), supino()] },
      ],
    );

    expect(resumoDaDiferenca(remocao)).toBe('1 linha removida');
    expect(resumoDaDiferenca(rotinas)).toBe('1 rotina adicionada, 2 linhas adicionadas');
  });

  it('reunindo os três tipos de linha, o resumo segue a ordem alteradas, adicionadas e removidas', () => {
    const diferenca = comparar(
      treino(supino({ meta: 8 }), remada()),
      treino(supino({ meta: 10 }), { exercicio: AGACHAMENTO }),
    );

    expect(resumoDaDiferenca(diferenca)).toBe(
      '1 linha alterada, 1 linha adicionada, 1 linha removida',
    );
  });
});
