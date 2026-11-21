import { BuscarExercicios } from '../../src/aplicacao/casos-de-uso/buscar-exercicios';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const ELEVACAO = Identificador.de('00000000-0000-7000-8000-000000000e11');
const REMADA = Identificador.de('00000000-0000-7000-8000-000000000e12');
const ANTIGO = Identificador.de('00000000-0000-7000-8000-000000000e13');

function exercicio(
  id: Identificador,
  nome: string,
  sinonimos: string[] = [],
  situacao: ExercicioDoCatalogo['situacao'] = 'ativo',
): ExercicioDoCatalogo {
  return {
    id,
    nome,
    situacao,
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos,
    gruposDiretos: ['Glúteos'],
    gruposIndiretos: [],
  };
}

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([
    exercicio(ELEVACAO, 'Elevação Pélvica', ['Hip Thrust']),
    exercicio(REMADA, 'Remada Curvada'),
    exercicio(ANTIGO, 'Elevação Antiga', [], 'arquivado'),
  ]);
  return new BuscarExercicios(catalogo);
}

describe('BuscarExercicios', () => {
  it.each([
    ['maiúsculas', 'ELEVAÇÃO PÉLVICA'],
    ['acentos', 'elevacao pelvica'],
    ['espaços nas pontas', '   Elevação Pélvica  '],
    ['sinônimo com outra caixa', 'hip THRUST'],
  ])('acha o mesmo exercício quando o texto difere em %s', async (_caso, texto) => {
    const achados = await iniciar().executar(texto);

    expect(achados.map((e) => e.id)).toEqual([ELEVACAO]);
  });

  it('acha por parte do nome, só entre os ativos', async () => {
    const achados = await iniciar().executar('eleva');

    expect(achados.map((e) => e.id)).toEqual([ELEVACAO]);
  });

  it('devolve lista vazia quando nada corresponde', async () => {
    expect(await iniciar().executar('supino')).toEqual([]);
  });

  it('texto vazio devolve todos os ativos em ordem de nome', async () => {
    const achados = await iniciar().executar('  ');

    expect(achados.map((e) => e.id)).toEqual([ELEVACAO, REMADA]);
  });
});
