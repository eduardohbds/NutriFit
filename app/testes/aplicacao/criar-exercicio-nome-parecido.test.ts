import { CriarExercicio } from '../../src/aplicacao/casos-de-uso/criar-exercicio';
import type { ExercicioDoCatalogo } from '../../src/dominio/exercicio';
import { Identificador } from '../../src/dominio/identificador';
import { GeradorDeIdentificadorSequencial } from '../dubles/gerador-de-identificador-sequencial';
import { RepositorioDoCatalogoEmMemoria } from '../dubles/repositorio-do-catalogo-em-memoria';

const REMADA = Identificador.de('00000000-0000-7000-8000-0000000a0001');
const PUNHO = Identificador.de('00000000-0000-7000-8000-0000000a0002');
const ANTIGO = Identificador.de('00000000-0000-7000-8000-0000000a0003');

function existente(
  id: Identificador,
  nome: string,
  resto: Partial<ExercicioDoCatalogo> = {},
): ExercicioDoCatalogo {
  return {
    id,
    nome,
    situacao: 'ativo',
    origem: 'inicial',
    unilateral: false,
    equipamento: null,
    sinonimos: [],
    gruposDiretos: ['Costas'],
    gruposIndiretos: [],
    ...resto,
  };
}

function iniciar() {
  const catalogo = new RepositorioDoCatalogoEmMemoria();
  catalogo.semearCatalogo([
    existente(REMADA, 'Remada Curvada'),
    existente(PUNHO, 'Rosca de Punho Inversa', { sinonimos: ['Reverse Wrist Curl'] }),
    existente(ANTIGO, 'Puxada Aberta', { situacao: 'arquivado' }),
  ]);
  const caso = new CriarExercicio(catalogo, new GeradorDeIdentificadorSequencial());
  return { caso, catalogo };
}

const GRUPOS = { gruposDiretos: ['Costas'], gruposIndiretos: [] };

describe('CriarExercicio: nome igual ou parecido (RB35)', () => {
  it('avisa com o exercício existente, sem gravar, quando o nome é igual ao de outro', async () => {
    const { caso, catalogo } = iniciar();

    const resultado = await caso.executar({ nome: '  REMADA curvada ', ...GRUPOS });

    expect(resultado).toEqual({
      criado: false,
      motivo: 'nome_parecido',
      existente: { id: REMADA, nome: 'Remada Curvada' },
    });
    expect(await catalogo.listarExercicios()).toHaveLength(3);
  });

  it('avisa com o dono do sinônimo quando o nome é igual a um sinônimo', async () => {
    const { caso } = iniciar();

    const resultado = await caso.executar({ nome: 'reverse wrist curl', ...GRUPOS });

    expect(resultado).toEqual({
      criado: false,
      motivo: 'nome_parecido',
      existente: { id: PUNHO, nome: 'Rosca de Punho Inversa' },
    });
  });

  it('avisa quando o nome só difere por um erro de digitação', async () => {
    const { caso } = iniciar();

    const resultado = await caso.executar({ nome: 'Remada Curvda', ...GRUPOS });

    expect(resultado).toMatchObject({ criado: false, motivo: 'nome_parecido' });
  });

  it('grava o exercício quando o usuário confirma que quer criar mesmo assim', async () => {
    const { caso, catalogo } = iniciar();

    const resultado = await caso.executar({
      nome: 'Remada Curvada',
      ...GRUPOS,
      confirmouNomeParecido: true,
    });

    expect(resultado.criado).toBe(true);
    expect(await catalogo.listarExercicios()).toHaveLength(4);
  });

  it('grava direto, sem aviso, quando o nome não tem semelhança', async () => {
    const { caso, catalogo } = iniciar();

    const resultado = await caso.executar({ nome: 'Supino Inclinado', ...GRUPOS });

    expect(resultado.criado).toBe(true);
    expect(await catalogo.listarExercicios()).toHaveLength(4);
  });

  it('não avisa por exercício arquivado, que já saiu das escolhas', async () => {
    const { caso } = iniciar();

    const resultado = await caso.executar({ nome: 'Puxada Aberta', ...GRUPOS });

    expect(resultado.criado).toBe(true);
  });
});
