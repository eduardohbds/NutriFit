import { BuscarExercicios } from '../../src/aplicacao/casos-de-uso/buscar-exercicios';
import { CadastrarSinonimo } from '../../src/aplicacao/casos-de-uso/cadastrar-sinonimo';
import { ErroDeValidacao } from '../../src/dominio/erro-de-validacao';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const PUNHO = Identificador.de('00000000-0000-7000-8000-000000000e01');

function exercicio(id: Identificador, nome: string): ExercicioDoCatalogo {
  return {
    id,
    nome,
    situacao: 'ativo',
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos: [],
    gruposDiretos: ['Antebraço'],
    gruposIndiretos: [],
  };
}

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([exercicio(PUNHO, 'Rosca de Punho Inversa')]);
  return {
    catalogo,
    cadastrar: new CadastrarSinonimo(catalogo),
    buscar: new BuscarExercicios(catalogo),
  };
}

describe('CadastrarSinonimo', () => {
  it('cadastra Reverse Wrist Curl e a busca por qualquer dos dois nomes acha o mesmo exercício', async () => {
    const { cadastrar, buscar } = iniciar();

    await cadastrar.executar({ exercicioId: PUNHO, texto: 'Reverse Wrist Curl' });

    const pelaSigla = await buscar.executar('Reverse Wrist Curl');
    const peloNome = await buscar.executar('Rosca de Punho Inversa');
    expect(pelaSigla.map((e) => e.id)).toEqual([PUNHO]);
    expect(peloNome.map((e) => e.id)).toEqual([PUNHO]);
    expect(pelaSigla[0]?.sinonimos).toEqual(['Reverse Wrist Curl']);
  });

  it('cadastrar de novo o mesmo sinônimo não muda nada, nem com outra caixa, acento ou espaços nas pontas', async () => {
    const { cadastrar, catalogo } = iniciar();
    await cadastrar.executar({ exercicioId: PUNHO, texto: 'Reverse Wrist Curl' });

    await cadastrar.executar({ exercicioId: PUNHO, texto: 'Reverse Wrist Curl' });
    await cadastrar.executar({ exercicioId: PUNHO, texto: '  reverse wrist CURL ' });

    const [guardado] = await catalogo.listarExercicios();
    expect(guardado?.sinonimos).toEqual(['Reverse Wrist Curl']);
  });

  it('texto vazio é recusado dizendo o valor recebido e o formato esperado, sem gravar', async () => {
    const { cadastrar, catalogo } = iniciar();

    const erro = await cadastrar.executar({ exercicioId: PUNHO, texto: '   ' }).then(
      () => undefined,
      (e: unknown) => e,
    );

    expect(erro).toBeInstanceOf(ErroDeValidacao);
    expect(erro).toMatchObject({ campo: 'sinonimo', esperado: 'texto não vazio' });
    expect((await catalogo.listarExercicios())[0]?.sinonimos).toEqual([]);
  });
});
