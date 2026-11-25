import { comparacaoLadoALado } from '../../src/dominio/diferenca-de-versoes';
import {
  AGACHAMENTO,
  REMADA,
  SUPINO,
  versaoDeExemplo,
  type LinhaDeExemplo,
  type RotinaDeExemplo,
} from '../apoio/versoes-de-exemplo';

const supino = (resto: Partial<LinhaDeExemplo> = {}): LinhaDeExemplo => ({
  exercicio: SUPINO,
  ...resto,
});
const remada = (resto: Partial<LinhaDeExemplo> = {}): LinhaDeExemplo => ({
  exercicio: REMADA,
  ...resto,
});
const treino = (...linhas: LinhaDeExemplo[]): RotinaDeExemplo[] => [{ nome: 'Treino A', linhas }];

function comparar(antes: RotinaDeExemplo[], depois: RotinaDeExemplo[]) {
  return comparacaoLadoALado(versaoDeExemplo(1, antes), versaoDeExemplo(2, depois));
}

const resumo = (linhas: ReturnType<typeof comparar>[number]['linhas']) =>
  linhas.map((l) => [l.tipo, l.antes?.exercicioId, l.depois?.exercicioId]);

describe('comparacaoLadoALado: linhas (US-010c)', () => {
  it('as linhas iguais aparecem dos dois lados, sem marca e sem campos', () => {
    const [rotina] = comparar(treino(supino(), remada()), treino(supino(), remada()));

    expect(rotina).toMatchObject({ nome: 'Treino A', situacao: 'igual' });
    expect(resumo(rotina.linhas)).toEqual([
      ['igual', SUPINO, SUPINO],
      ['igual', REMADA, REMADA],
    ]);
    expect(rotina.linhas.map((l) => l.campos)).toEqual([[], []]);
  });

  it('a linha alterada traz as duas versões dela e os campos que mudaram', () => {
    const [rotina] = comparar(
      treino(supino({ cargaEmQuilos: 60 })),
      treino(supino({ cargaEmQuilos: 62.5, meta: 8 })),
    );

    expect(rotina.linhas).toHaveLength(1);
    expect(rotina.linhas[0]).toMatchObject({ tipo: 'alterada', campos: ['meta', 'carga'] });
    expect(rotina.linhas[0].antes?.series[0].carga?.gramas).toBe(60000);
    expect(rotina.linhas[0].depois?.series[0].carga?.gramas).toBe(62500);
  });

  it('a linha adicionada só tem o lado de depois, e a removida só o de antes', () => {
    const [adicionada] = comparar(treino(supino()), treino(supino(), remada()));
    const [removida] = comparar(treino(supino(), remada()), treino(supino()));

    expect(resumo(adicionada.linhas)).toEqual([
      ['igual', SUPINO, SUPINO],
      ['adicionada', undefined, REMADA],
    ]);
    expect(resumo(removida.linhas)).toEqual([
      ['igual', SUPINO, SUPINO],
      ['removida', REMADA, undefined],
    ]);
  });

  it('trocar um exercício por outro mostra a removida e a adicionada, na ordem das versões', () => {
    const [rotina] = comparar(
      treino(supino(), remada()),
      treino(supino(), { exercicio: AGACHAMENTO }),
    );

    expect(resumo(rotina.linhas)).toEqual([
      ['igual', SUPINO, SUPINO],
      ['removida', REMADA, undefined],
      ['adicionada', undefined, AGACHAMENTO],
    ]);
  });

  it('o lado que falta é nulo, e não ausente', () => {
    const [rotina] = comparar(treino(), treino(supino()));

    expect(rotina.linhas[0].antes).toBeNull();
    expect(rotina.linhas[0].depois).not.toBeNull();
  });
});

describe('comparacaoLadoALado: rotinas (US-010c)', () => {
  const peito = (...linhas: LinhaDeExemplo[]): RotinaDeExemplo => ({ nome: 'Peito', linhas });
  const costas = (...linhas: LinhaDeExemplo[]): RotinaDeExemplo => ({ nome: 'Costas', linhas });

  it('as rotinas se casam pelo nome, na ordem da versão de antes, e a nova vem no fim', () => {
    const rotinas = comparar(
      [peito(supino()), costas(remada())],
      [costas(remada()), peito(supino())],
    );

    expect(rotinas.map((r) => [r.nome, r.situacao])).toEqual([
      ['Peito', 'igual'],
      ['Costas', 'igual'],
    ]);
  });

  it('a rotina nova tem todas as linhas adicionadas, e a que sumiu tem todas removidas', () => {
    const nova = comparar([peito(supino())], [peito(supino()), costas(remada(), supino())]);
    const sumida = comparar([peito(supino()), costas(remada())], [peito(supino())]);

    expect(nova[1]).toMatchObject({ nome: 'Costas', situacao: 'adicionada' });
    expect(nova[1].linhas.map((l) => l.tipo)).toEqual(['adicionada', 'adicionada']);
    expect(sumida[1]).toMatchObject({ nome: 'Costas', situacao: 'removida' });
    expect(sumida[1].linhas.map((l) => l.tipo)).toEqual(['removida']);
    expect(sumida[1].linhas[0].depois).toBeNull();
  });

  it('renomear uma rotina é uma removida e uma adicionada', () => {
    const rotinas = comparar([peito(supino())], [{ nome: 'Tórax', linhas: [supino()] }]);

    expect(rotinas.map((r) => [r.nome, r.situacao])).toEqual([
      ['Peito', 'removida'],
      ['Tórax', 'adicionada'],
    ]);
  });
});
